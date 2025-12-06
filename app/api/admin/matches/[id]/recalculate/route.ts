import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { calculatePoints, calculateTotalSets } from '@/utils/pointCalculation';
import { validateBracketPrediction } from '@/utils/validateBracketPrediction';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const match = await prisma.match.findUnique({
      where: { id },
      include: {
        predictions: true,
      },
    });

    if (!match) {
      return NextResponse.json(
        { error: 'Match not found' },
        { status: 404 }
      );
    }

    if (!match.completed || !match.winner) {
      return NextResponse.json(
        { error: 'Match must be completed first' },
        { status: 400 }
      );
    }

    // Calculate total sets from team1Sets and team2Sets
    const totalSets = (match.team1Sets || 0) + (match.team2Sets || 0);

    // Recalculate points for all predictions
    const pointUpdates = match.predictions.map(async (prediction) => {
      let points = 0;

      // For Round 2+, validate that the user predicted the correct matchup
      if (match.round > 1) {
        const isValidPrediction = await validateBracketPrediction(
          prediction.id,
          match.id,
          prediction.userId
        );

        // If they didn't predict the right teams to be in this match, they get 0 points
        if (!isValidPrediction) {
          points = 0;
        } else {
          // Valid matchup, calculate points normally
          points = calculatePoints(
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
        }
      } else {
        // Round 1 - no validation needed
        points = calculatePoints(
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
      }

      return prisma.prediction.update({
        where: { id: prediction.id },
        data: { pointsEarned: points },
      });
    });

    await Promise.all(pointUpdates);

    return NextResponse.json({
      message: 'Points recalculated successfully',
      predictionsUpdated: match.predictions.length,
    });
  } catch (error) {
    console.error('Recalculate points error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
