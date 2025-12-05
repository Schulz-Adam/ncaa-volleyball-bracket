import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const matches = await prisma.match.findMany({
      where: { completed: true },
      include: {
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

    return NextResponse.json(matchesWithStats);
  } catch (error) {
    console.error('Get completed matches error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
