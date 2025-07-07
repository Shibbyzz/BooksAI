import { NextRequest, NextResponse } from 'next/server';
import { BookGenerationOrchestrator } from '@/lib/ai/orchestrator-v2';
import { getCurrentUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import type { BookSettings } from '@/types';
import { 
  checkSubscriptionAccess, 
  createSubscriptionErrorResponse 
} from '@/lib/subscription/subscription-middleware';

export async function POST(request: NextRequest) {
  try {
    // Parse request body first to get word count for subscription check
    const body = await request.json();
    const { bookId, userPrompt, settings } = body;

    if (!bookId || !userPrompt || !settings) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId, userPrompt, settings' },
        { status: 400 }
      );
    }

    // Check subscription limits (back cover generation is free for all tiers)
    const subscriptionCheck = await checkSubscriptionAccess(request, {
      requiresPremium: false, // Back cover generation available to all
      featureName: 'Back Cover Generation'
    });

    if (!subscriptionCheck.success) {
      return createSubscriptionErrorResponse(subscriptionCheck);
    }

    const user = subscriptionCheck.user!;

    // Verify book ownership
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
      return NextResponse.json(
        { error: 'Book not found or access denied' },
        { status: 404 }
      );
    }

    // Validate settings structure
    const requiredFields = ['genre', 'targetAudience', 'tone', 'language', 'wordCount', 'endingType'];
    for (const field of requiredFields) {
      if (!settings[field]) {
        return NextResponse.json(
          { error: `Missing required setting: ${field}` },
          { status: 400 }
        );
      }
    }

    // Create orchestrator
    const orchestrator = new BookGenerationOrchestrator();

    // Generate back cover
    const backCover = await orchestrator.generateBackCover(
      bookId,
      userPrompt,
      settings as BookSettings
    );

    return NextResponse.json({
      success: true,
      data: {
        backCover,
        bookId
      }
    });

  } catch (error) {
    console.error('Back cover generation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate back cover',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { bookId, refinementRequest } = body;

    if (!bookId || !refinementRequest) {
      return NextResponse.json(
        { error: 'Missing required fields: bookId, refinementRequest' },
        { status: 400 }
      );
    }

    // Verify book ownership and get current back cover
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
      return NextResponse.json(
        { error: 'Book not found or access denied' },
        { status: 404 }
      );
    }

    if (!book.backCover) {
      return NextResponse.json(
        { error: 'No back cover to refine. Generate one first.' },
        { status: 400 }
      );
    }

    if (!book.settings) {
      return NextResponse.json(
        { error: 'Book settings required for refinement' },
        { status: 400 }
      );
    }

    // Create orchestrator
    const orchestrator = new BookGenerationOrchestrator();

    // Refine back cover
    const refinedBackCover = await orchestrator.refineBackCover(
      bookId,
      refinementRequest
    );

    return NextResponse.json({
      success: true,
      data: {
        backCover: refinedBackCover,
        bookId
      }
    });

  } catch (error) {
    console.error('Back cover refinement error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to refine back cover',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 