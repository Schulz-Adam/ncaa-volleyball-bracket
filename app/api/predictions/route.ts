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

    const predictions = await prisma.prediction.findMany({
      where: { userId: auth.userId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(predictions);
  } catch (error) {
    console.error('Error fetching predictions:', error);
    return NextResponse.json(
      { message: 'Failed to fetch predictions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { matchId, predictedWinner, predictedTotalSets } = await request.json();

    // Check if user has submitted their bracket
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { bracketSubmitted: true },
    });

    if (user?.bracketSubmitted) {
      return NextResponse.json(
        { message: 'Cannot make predictions after bracket is submitted' },
        { status: 400 }
      );
    }

    // Validate input
    if (!matchId || !predictedWinner || !predictedTotalSets) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['team1', 'team2'].includes(predictedWinner)) {
      return NextResponse.json(
        { message: 'Invalid winner selection' },
        { status: 400 }
      );
    }

    if (![3, 4, 5].includes(predictedTotalSets)) {
      return NextResponse.json(
        { message: 'Invalid total sets' },
        { status: 400 }
      );
    }

    // Check if match exists and is not completed
    const match = await prisma.match.findUnique({
      where: { id: matchId },
    });

    if (!match) {
      return NextResponse.json(
        { message: 'Match not found' },
        { status: 404 }
      );
    }

    if (match.completed) {
      return NextResponse.json(
        { message: 'Cannot predict on completed match' },
        { status: 400 }
      );
    }

    // Check if user has already predicted this match
    const existingPrediction = await prisma.prediction.findUnique({
      where: {
        userId_matchId: {
          userId: auth.userId,
          matchId,
        },
      },
    });

    if (existingPrediction) {
      return NextResponse.json(
        { message: 'You have already predicted this match' },
        { status: 400 }
      );
    }

    // Create prediction
    const prediction = await prisma.prediction.create({
      data: {
        userId: auth.userId,
        matchId,
        predictedWinner,
        predictedTotalSets,
      },
    });

    return NextResponse.json(prediction, { status: 201 });
  } catch (error) {
    console.error('Error creating prediction:', error);
    return NextResponse.json(
      { message: 'Failed to create prediction' },
      { status: 500 }
    );
  }
}
