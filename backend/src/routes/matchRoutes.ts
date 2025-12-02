import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Get all matches
router.get('/', authenticateToken, async (req, res) => {
  try {
    const matches = await prisma.match.findMany({
      include: {
        sets: {
          orderBy: {
            setNumber: 'asc',
          },
        },
      },
      orderBy: [
        { round: 'asc' },
        { matchNumber: 'asc' },
      ],
    });

    res.json(matches);
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ message: 'Failed to fetch matches' });
  }
});

// Get a specific match
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        sets: {
          orderBy: {
            setNumber: 'asc',
          },
        },
      },
    });

    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }

    res.json(match);
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({ message: 'Failed to fetch match' });
  }
});

export default router;
