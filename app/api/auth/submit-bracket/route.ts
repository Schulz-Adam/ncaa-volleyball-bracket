import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const auth = await getAuthFromRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { bracketSubmitted: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.bracketSubmitted) {
      return NextResponse.json(
        { error: 'Bracket already submitted' },
        { status: 400 }
      );
    }

    // Update user to mark bracket as submitted
    const updatedUser = await prisma.user.update({
      where: { id: auth.userId },
      data: {
        bracketSubmitted: true,
        bracketSubmittedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        bracketSubmitted: true,
        bracketSubmittedAt: true,
      },
    });

    return NextResponse.json({
      message: 'Bracket submitted successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Submit bracket error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
