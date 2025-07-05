import { NextRequest, NextResponse } from 'next/server';
import { progressTracker } from '@/lib/progress-tracker';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params;

    // Try to get progress from Redis first
    const redisProgress = await progressTracker.getProgress(bookId);
    
    if (redisProgress) {
      // Return Redis progress data
      return NextResponse.json({
        success: true,
        data: {
          bookId: redisProgress.bookId,
          status: redisProgress.status,
          generationStep: redisProgress.generationStep,
          currentChapter: redisProgress.currentChapter,
          totalChapters: redisProgress.totalChapters,
          currentSection: redisProgress.currentSection,
          totalSections: redisProgress.totalSections,
          overallProgress: redisProgress.overallProgress,
          message: redisProgress.message,
          timestamp: redisProgress.timestamp,
          error: redisProgress.error,
          isLive: true, // Indicates this is live progress from Redis
        }
      });
    }

    // Fallback to database if Redis doesn't have progress
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        chapters: {
          include: {
            sections: true
          },
          orderBy: { chapterNumber: 'asc' }
        }
      }
    });

    if (!book) {
      return NextResponse.json({
        success: false,
        error: 'Book not found'
      }, { status: 404 });
    }

    // Calculate progress from database
    const completedChapters = book.chapters.filter(c => c.status === 'COMPLETE').length;
    const totalChapters = book.chapters.length;
    const overallProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

    // Find current chapter being processed
    const currentChapter = book.chapters.find(c => c.status === 'GENERATING')?.chapterNumber || completedChapters;

    // Get section progress for current chapter
    const currentChapterData = book.chapters.find(c => c.chapterNumber === currentChapter);
    const currentSection = currentChapterData?.sections.filter(s => s.content && s.content.length > 0).length || 0;
    const totalSections = currentChapterData?.sections.length || 0;

    // Determine status and message
    let status = book.status;
    let message = 'Processing...';
    
    if (book.status === 'COMPLETE') {
      message = 'Book generation completed successfully!';
    } else if (book.status === 'GENERATING') {
      if (currentChapter > 0) {
        message = `Generating Chapter ${currentChapter} of ${totalChapters}`;
        if (totalSections > 0) {
          message += ` (Section ${currentSection}/${totalSections})`;
        }
      } else {
        message = 'Starting generation...';
      }
    } else if (book.status === 'PLANNING') {
      message = 'Planning and structuring your book...';
    }

    return NextResponse.json({
      success: true,
      data: {
        bookId: book.id,
        status,
        generationStep: book.generationStep,
        currentChapter,
        totalChapters,
        currentSection,
        totalSections,
        overallProgress,
        message,
        timestamp: book.updatedAt.getTime(),
        isLive: false, // Indicates this is fallback data from database
      }
    });

  } catch (error) {
    console.error('Error fetching book progress:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch progress'
    }, { status: 500 });
  }
} 