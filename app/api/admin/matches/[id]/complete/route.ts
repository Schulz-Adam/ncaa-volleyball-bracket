import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { calculatePoints } from '@/utils/pointCalculation';
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
    const { winner, team1Sets, team2Sets } = await request.json();

    // Validation
    if (!winner || team1Sets === undefined || team2Sets === undefined) {
      return NextResponse.json(
        { error: 'Winner, team1Sets, and team2Sets are required' },
        { status: 400 }
      );
    }

    if (!['team1', 'team2'].includes(winner)) {
      return NextResponse.json(
        { error: 'Winner must be "team1" or "team2"' },
        { status: 400 }
      );
    }

    // Validate set counts
    if (typeof team1Sets !== 'number' || typeof team2Sets !== 'number') {
      return NextResponse.json(
        { error: 'team1Sets and team2Sets must be numbers' },
        { status: 400 }
      );
    }

    // Validate winner matches set counts (winner should have at least 3 sets)
    const winnerSets = winner === 'team1' ? team1Sets : team2Sets;
    if (winnerSets < 3) {
      return NextResponse.json(
        { error: 'Winner must have won at least 3 sets' },
        { status: 400 }
      );
    }

    // Get match
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

    if (match.completed) {
      return NextResponse.json(
        { error: 'Match already completed' },
        { status: 400 }
      );
    }

    const totalSets = team1Sets + team2Sets;

    // Update match as completed
    await prisma.match.update({
      where: { id },
      data: {
        completed: true,
        winner,
        team1Sets,
        team2Sets,
      },
    });

    // Calculate and update points for all predictions
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
              winner: winner as 'team1' | 'team2',
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
            winner: winner as 'team1' | 'team2',
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
      message: 'Match completed and points calculated',
      match: {
        id: match.id,
        round: match.round,
        matchNumber: match.matchNumber,
        team1: match.team1,
        team2: match.team2,
        winner,
        team1Sets,
        team2Sets,
        totalSets,
        completed: true,
      },
      predictionsUpdated: match.predictions.length,
    });
  } catch (error) {
    console.error('Complete match error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
