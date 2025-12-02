import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { calculatePoints, determineWinner, calculateTotalSets } from '../utils/pointCalculation.js';

/**
 * Update match results and calculate points for all predictions
 * POST /api/admin/matches/:id/complete
 *
 * Body: {
 *   winner: 'team1' | 'team2',
 *   sets: [
 *     { team1Score: 25, team2Score: 20 },
 *     { team1Score: 23, team2Score: 25 },
 *     ...
 *   ]
 * }
 */
export const completeMatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { winner, sets } = req.body;

    // Validation
    if (!winner || !sets || !Array.isArray(sets)) {
      res.status(400).json({ error: 'Winner and sets array are required' });
      return;
    }

    if (!['team1', 'team2'].includes(winner)) {
      res.status(400).json({ error: 'Winner must be "team1" or "team2"' });
      return;
    }

    // Validate sets format
    for (const set of sets) {
      if (typeof set.team1Score !== 'number' || typeof set.team2Score !== 'number') {
        res.status(400).json({ error: 'Each set must have team1Score and team2Score' });
        return;
      }
    }

    // Get match
    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        predictions: true,
      },
    });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    if (match.completed) {
      res.status(400).json({ error: 'Match already completed' });
      return;
    }

    // Verify winner matches set results
    const calculatedWinner = determineWinner(sets);
    if (calculatedWinner !== winner) {
      res.status(400).json({
        error: `Winner "${winner}" does not match set results (calculated: "${calculatedWinner}")`,
      });
      return;
    }

    const totalSets = calculateTotalSets(sets);

    // Update match as completed
    await prisma.match.update({
      where: { id },
      data: {
        completed: true,
        winner,
      },
    });

    // Delete existing sets and create new ones
    await prisma.set.deleteMany({
      where: { matchId: id },
    });

    await prisma.set.createMany({
      data: sets.map((set, index) => ({
        matchId: id,
        setNumber: index + 1,
        team1Score: set.team1Score,
        team2Score: set.team2Score,
      })),
    });

    // Calculate and update points for all predictions
    const pointUpdates = match.predictions.map((prediction) => {
      const points = calculatePoints(
        {
          predictedWinner: prediction.predictedWinner as 'team1' | 'team2',
          predictedTotalSets: prediction.predictedTotalSets,
        },
        {
          winner: winner as 'team1' | 'team2',
          totalSets,
          round: match.round,
        }
      );

      return prisma.prediction.update({
        where: { id: prediction.id },
        data: { pointsEarned: points },
      });
    });

    await Promise.all(pointUpdates);

    res.status(200).json({
      message: 'Match completed and points calculated',
      match: {
        id: match.id,
        round: match.round,
        matchNumber: match.matchNumber,
        team1: match.team1,
        team2: match.team2,
        winner,
        totalSets,
        completed: true,
      },
      predictionsUpdated: match.predictions.length,
    });
  } catch (error) {
    console.error('Complete match error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Recalculate points for a completed match
 * POST /api/admin/matches/:id/recalculate
 *
 * Useful if scoring rules change or there was an error
 */
export const recalculateMatchPoints = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        predictions: true,
        sets: {
          orderBy: { setNumber: 'asc' },
        },
      },
    });

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }

    if (!match.completed || !match.winner) {
      res.status(400).json({ error: 'Match must be completed first' });
      return;
    }

    const totalSets = calculateTotalSets(match.sets);

    // Recalculate points for all predictions
    const pointUpdates = match.predictions.map((prediction) => {
      const points = calculatePoints(
        {
          predictedWinner: prediction.predictedWinner as 'team1' | 'team2',
          predictedTotalSets: prediction.predictedTotalSets,
        },
        {
          winner: match.winner as 'team1' | 'team2',
          totalSets,
          round: match.round,
        }
      );

      return prisma.prediction.update({
        where: { id: prediction.id },
        data: { pointsEarned: points },
      });
    });

    await Promise.all(pointUpdates);

    res.status(200).json({
      message: 'Points recalculated successfully',
      predictionsUpdated: match.predictions.length,
    });
  } catch (error) {
    console.error('Recalculate points error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all completed matches with point statistics
 * GET /api/admin/matches/completed
 */
export const getCompletedMatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const matches = await prisma.match.findMany({
      where: { completed: true },
      include: {
        sets: {
          orderBy: { setNumber: 'asc' },
        },
        predictions: {
          select: {
            id: true,
            pointsEarned: true,
            predictedWinner: true,
            predictedTotalSets: true,
          },
        },
      },
      orderBy: [
        { round: 'asc' },
        { matchNumber: 'asc' },
      ],
    });

    const matchesWithStats = matches.map((match) => {
      const totalPredictions = match.predictions.length;
      const correctWinner = match.predictions.filter(
        (p) => p.predictedWinner === match.winner
      ).length;
      const perfectPredictions = match.predictions.filter(
        (p) => p.pointsEarned && p.pointsEarned > 1
      ).length;

      return {
        ...match,
        stats: {
          totalPredictions,
          correctWinner,
          perfectPredictions,
          accuracy: totalPredictions > 0 ? (correctWinner / totalPredictions) * 100 : 0,
        },
      };
    });

    res.status(200).json(matchesWithStats);
  } catch (error) {
    console.error('Get completed matches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
