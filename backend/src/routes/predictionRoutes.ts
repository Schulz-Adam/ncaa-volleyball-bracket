import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// Get all predictions for the current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.userId;

    const predictions = await prisma.prediction.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(predictions);
  } catch (error) {
    console.error('Error fetching predictions:', error);
    res.status(500).json({ message: 'Failed to fetch predictions' });
  }
});

// Create a new prediction
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.userId;
    const { matchId, predictedWinner, predictedTotalSets } = req.body;

    // Check if user has submitted their bracket
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { bracketSubmitted: true },
    });

    if (user?.bracketSubmitted) {
      return res.status(400).json({ message: 'Cannot make predictions after bracket is submitted' });
    }

    // Validate input
    if (!matchId || !predictedWinner || !predictedTotalSets) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!['team1', 'team2'].includes(predictedWinner)) {
      return res.status(400).json({ message: 'Invalid winner selection' });
    }

    if (![3, 4, 5].includes(predictedTotalSets)) {
      return res.status(400).json({ message: 'Invalid total sets' });
    }

    // Check if match exists and is not completed
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    if (match.completed) {
      return res.status(400).json({ message: 'Cannot predict on completed match' });
    }

    // Check if user has already predicted this match
    const existingPrediction = await prisma.prediction.findUnique({
      where: {
        userId_matchId: {
          userId,
          matchId,
        },
      },
    });

    if (existingPrediction) {
      return res.status(400).json({ message: 'You have already predicted this match' });
    }

    // Create prediction
    const prediction = await prisma.prediction.create({
      data: {
        userId,
        matchId,
        predictedWinner,
        predictedTotalSets,
      },
    });

    res.status(201).json(prediction);
  } catch (error) {
    console.error('Error creating prediction:', error);
    res.status(500).json({ message: 'Failed to create prediction' });
  }
});

// Update a prediction (only before match starts)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.userId;
    const { id } = req.params;
    const { predictedWinner, predictedTotalSets } = req.body;

    // Find the prediction
    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: {
        match: true,
      },
    });

    if (!prediction) {
      return res.status(404).json({ message: 'Prediction not found' });
    }

    // Check ownership
    if (prediction.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if match is completed
    if (prediction.match.completed) {
      return res.status(400).json({ message: 'Cannot update prediction for completed match' });
    }

    // Update prediction
    const updatedPrediction = await prisma.prediction.update({
      where: { id },
      data: {
        predictedWinner,
        predictedTotalSets,
      },
    });

    res.json(updatedPrediction);
  } catch (error) {
    console.error('Error updating prediction:', error);
    res.status(500).json({ message: 'Failed to update prediction' });
  }
});

// Delete a prediction (and cascade to dependent predictions)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = (req as AuthRequest).user!.userId;
    const { id } = req.params;

    // Check if user has submitted their bracket
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { bracketSubmitted: true },
    });

    if (user?.bracketSubmitted) {
      return res.status(400).json({ message: 'Cannot delete predictions after bracket is submitted' });
    }

    // Find the prediction
    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: {
        match: true,
      },
    });

    if (!prediction) {
      return res.status(404).json({ message: 'Prediction not found' });
    }

    // Check ownership
    if (prediction.userId !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if match is completed
    if (prediction.match.completed) {
      return res.status(400).json({ message: 'Cannot delete prediction for completed match' });
    }

    // Delete this prediction (which will cascade to dependent predictions via triggers/logic)
    await prisma.prediction.delete({
      where: { id },
    });

    // TODO: Also delete predictions in later rounds that depend on this prediction
    // For now, we'll just delete this one prediction
    // In a full implementation, you would recursively delete dependent predictions

    res.json({ message: 'Prediction deleted successfully' });
  } catch (error) {
    console.error('Error deleting prediction:', error);
    res.status(500).json({ message: 'Failed to delete prediction' });
  }
});

export default router;
