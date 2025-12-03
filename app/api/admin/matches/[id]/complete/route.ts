import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';
import { calculatePoints, determineWinner, calculateTotalSets } from '@/utils/pointCalculation';

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
    const { winner, sets } = await request.json();

    // Validation
    if (!winner || !sets || !Array.isArray(sets)) {
      return NextResponse.json(
        { error: 'Winner and sets array are required' },
        { status: 400 }
      );
    }

    if (!['team1', 'team2'].includes(winner)) {
      return NextResponse.json(
        { error: 'Winner must be "team1" or "team2"' },
        { status: 400 }
      );
    }

    // Validate sets format
    for (const set of sets) {
      if (typeof set.team1Score !== 'number' || typeof set.team2Score !== 'number') {
        return NextResponse.json(
          { error: 'Each set must have team1Score and team2Score' },
          { status: 400 }
        );
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

    // Verify winner matches set results
    const calculatedWinner = determineWinner(sets);
    if (calculatedWinner !== winner) {
      return NextResponse.json(
        { error: `Winner "${winner}" does not match set results (calculated: "${calculatedWinner}")` },
        { status: 400 }
      );
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
      data: sets.map((set: { team1Score: number; team2Score: number }, index: number) => ({
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

    return NextResponse.json({
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
