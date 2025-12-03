import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

// Helper function to delete a prediction and all dependent predictions in later rounds
async function deletePredictionWithCascade(userId: string, matchId: string, currentRound: number): Promise<void> {
  // Delete the prediction for this match
  await prisma.prediction.deleteMany({
    where: {
      userId,
      matchId,
    },
  });

  // If this is the championship match (round 6), no further cascade needed
  if (currentRound >= 6) {
    return;
  }

  // Get the current match details to find dependent matches
  const currentMatch = await prisma.match.findUnique({
    where: { id: matchId },
  });

  if (!currentMatch) {
    return;
  }

  // Find all matches in the next round that could have received a team from this match
  // Based on bracket structure: match N in round R feeds into match ceil(N/2) in round R+1
  const nextRoundMatchNumber = Math.ceil(currentMatch.matchNumber / 2);

  // Find the match in the next round
  const nextRoundMatch = await prisma.match.findFirst({
    where: {
      round: currentRound + 1,
      matchNumber: nextRoundMatchNumber,
    },
  });

  if (!nextRoundMatch) {
    return;
  }

  // Check if there's a prediction for the next round match
  const nextRoundPrediction = await prisma.prediction.findFirst({
    where: {
      userId,
      matchId: nextRoundMatch.id,
    },
  });

  // If there's a prediction in the next round, recursively delete it and its dependents
  if (nextRoundPrediction) {
    await deletePredictionWithCascade(userId, nextRoundMatch.id, currentRound + 1);
  }
}

export async function PUT(
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
    const { predictedWinner, predictedTotalSets } = await request.json();

    // Find the prediction
    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: {
        match: true,
      },
    });

    if (!prediction) {
      return NextResponse.json(
        { message: 'Prediction not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (prediction.userId !== auth.userId) {
      return NextResponse.json(
        { message: 'Not authorized' },
        { status: 403 }
      );
    }

    // Check if match is completed
    if (prediction.match.completed) {
      return NextResponse.json(
        { message: 'Cannot update prediction for completed match' },
        { status: 400 }
      );
    }

    // Update prediction
    const updatedPrediction = await prisma.prediction.update({
      where: { id },
      data: {
        predictedWinner,
        predictedTotalSets,
      },
    });

    return NextResponse.json(updatedPrediction);
  } catch (error) {
    console.error('Error updating prediction:', error);
    return NextResponse.json(
      { message: 'Failed to update prediction' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check if user has submitted their bracket
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { bracketSubmitted: true },
    });

    if (user?.bracketSubmitted) {
      return NextResponse.json(
        { message: 'Cannot delete predictions after bracket is submitted' },
        { status: 400 }
      );
    }

    // Find the prediction
    const prediction = await prisma.prediction.findUnique({
      where: { id },
      include: {
        match: true,
      },
    });

    if (!prediction) {
      return NextResponse.json(
        { message: 'Prediction not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (prediction.userId !== auth.userId) {
      return NextResponse.json(
        { message: 'Not authorized' },
        { status: 403 }
      );
    }

    // Check if match is completed
    if (prediction.match.completed) {
      return NextResponse.json(
        { message: 'Cannot delete prediction for completed match' },
        { status: 400 }
      );
    }

    // Delete this prediction and cascade to dependent predictions
    await deletePredictionWithCascade(auth.userId, prediction.matchId, prediction.match.round);

    return NextResponse.json({ message: 'Prediction deleted successfully' });
  } catch (error) {
    console.error('Error deleting prediction:', error);
    return NextResponse.json(
      { message: 'Failed to delete prediction' },
      { status: 500 }
    );
  }
}
