import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { LeaderboardEntry } from '@/types/leaderboard';

export async function GET(request: NextRequest) {
  try {
    // Fetch all users with their predictions
    const users = await prisma.user.findMany({
      include: {
        predictions: {
          select: {
            pointsEarned: true,
          },
        },
      },
    });

    // Calculate stats for each user
    const leaderboardData: LeaderboardEntry[] = users.map((user) => {
      const totalPoints = user.predictions.reduce(
        (sum, pred) => sum + (pred.pointsEarned || 0),
        0
      );

      const correctPredictions = user.predictions.filter(
        (pred) => pred.pointsEarned !== null && pred.pointsEarned > 0
      ).length;

      const totalPredictions = user.predictions.length;

      return {
        userId: user.id,
        displayName: user.displayName || user.email.split('@')[0],
        email: user.email,
        totalPoints,
        correctPredictions,
        totalPredictions,
        rank: 0, // Will be set after sorting
      };
    });

    // Sort by total points (descending), then by correct predictions (descending)
    leaderboardData.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return b.correctPredictions - a.correctPredictions;
    });

    // Assign ranks
    leaderboardData.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return NextResponse.json(leaderboardData);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
