import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { bookId } = await params;

    // Get complete book data
    const book = await prisma.book.findFirst({
      where: {
        id: bookId,
        userId: user.id
      },
      include: {
        settings: true,
        outline: true,
        chapters: {
          include: {
            sections: true
          }
        },
        storyMemory: {
          include: {
            characters: true,
            locations: true,
            timeline: true
          }
        }
      }
    });

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Analysis of what we have vs what we need
    const analysis = {
      hasBasicInfo: !!(book.title && book.prompt),
      hasSettings: !!book.settings,
      hasBackCover: !!book.backCover,
      hasOutline: !!book.outline,
      chaptersCount: book.chapters.length,
      sectionsCount: book.chapters.reduce((total, chapter) => total + chapter.sections.length, 0),
      readyForAI: false
    };

    // Check if ready for AI generation
    analysis.readyForAI = analysis.hasBasicInfo && analysis.hasSettings;

    const nextSteps = [];
    if (!analysis.hasSettings) {
      nextSteps.push('Add book settings (genre, tone, word count, etc.)');
    }
    if (!analysis.hasBackCover) {
      nextSteps.push('Generate back cover using AI');
    }
    if (!analysis.hasOutline) {
      nextSteps.push('Generate book outline');
    }
    if (analysis.chaptersCount === 0) {
      nextSteps.push('Generate chapters');
    }

    return NextResponse.json({
      book: {
        id: book.id,
        title: book.title,
        status: book.status,
        generationStep: book.generationStep,
        prompt: book.prompt,
        backCover: book.backCover,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt
      },
      settings: book.settings,
      outline: book.outline,
      chapters: book.chapters.map(ch => ({
        id: ch.id,
        number: ch.chapterNumber,
        title: ch.title,
        status: ch.status,
        sectionsCount: ch.sections.length
      })),
      analysis,
      nextSteps,
      aiEndpoints: {
        generateBackCover: '/api/ai/generate-backcover',
        generateOutline: '/api/ai/generate-outline (not yet implemented)',
        addSettings: '/api/books/[id]/settings (not yet implemented)'
      }
    });

  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 