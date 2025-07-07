import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { BookGenerationOrchestrator } from '@/lib/ai/orchestrator-v2';
import { prisma } from '@/lib/prisma';

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

    // Get story memory data
    const orchestrator = new BookGenerationOrchestrator();
    const storyMemoryData = await orchestrator.getStoryMemoryData(bookId);

    if (!storyMemoryData) {
      return NextResponse.json({ 
        message: 'No story memory data found. This book may not have been generated with the enhanced AI system.',
        hasStoryMemory: false
      });
    }

    return NextResponse.json({
      success: true,
      hasStoryMemory: true,
      data: storyMemoryData
    });

  } catch (error) {
    console.error('Story memory fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch story memory data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 