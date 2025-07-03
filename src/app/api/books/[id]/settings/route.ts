import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const bookId = resolvedParams.id;
    const body = await request.json();

    const {
      language = 'en',
      wordCount = 50000,
      genre,
      targetAudience,
      tone,
      endingType,
      structure = 'three-act',
      characterNames = [],
      inspirationBooks = []
    } = body;

    // Validate required fields
    if (!genre || !targetAudience || !tone || !endingType) {
      return NextResponse.json(
        { error: 'Missing required fields: genre, targetAudience, tone, endingType' },
        { status: 400 }
      );
    }

    // Verify book ownership
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        userId: user.id
      }
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found or access denied' }, { status: 404 });
    }

    // Create or update settings
    const settings = await prisma.bookSettings.upsert({
      where: { bookId },
      create: {
        bookId,
        language,
        wordCount,
        genre,
        targetAudience,
        tone,
        endingType,
        structure,
        characterNames,
        inspirationBooks
      },
      update: {
        language,
        wordCount,
        genre,
        targetAudience,
        tone,
        endingType,
        structure,
        characterNames,
        inspirationBooks,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('Settings creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const resolvedParams = await params;
    const bookId = resolvedParams.id;

    // Verify book ownership and get settings
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        userId: user.id
      },
      include: {
        settings: true
      }
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({
      settings: book.settings
    });

  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 