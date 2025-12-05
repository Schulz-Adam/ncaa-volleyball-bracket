import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Fetch user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        bracketSubmitted: true,
        bracketSubmittedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch user's predictions
    const predictions = await prisma.prediction.findMany({
      where: { userId },
      include: {
        match: true,
      },
    });

    return NextResponse.json({
      user,
      predictions,
    });
  } catch (error) {
    console.error('Error fetching user predictions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user predictions' },
      { status: 500 }
    );
  }
}
