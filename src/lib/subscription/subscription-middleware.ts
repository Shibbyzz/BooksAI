import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-helpers';
import { usageTracker, UsageValidation, UsageTracker } from './usage-tracker';
import { prisma } from '@/lib/prisma';

export interface SubscriptionCheckResult {
  success: boolean;
  user?: any;
  validation?: UsageValidation;
  error?: string;
  statusCode?: number;
}

export interface GenerationRequest {
  wordCount?: number;
  requiresPremium?: boolean;
  requiresBasic?: boolean;
  featureName?: string;
}

/**
 * Middleware to check subscription limits and feature access
 */
export async function checkSubscriptionAccess(
  request: NextRequest,
  generationRequest: GenerationRequest = {}
): Promise<SubscriptionCheckResult> {
  try {
    // Check authentication
    const supabaseUser = await getCurrentUser();
    if (!supabaseUser) {
      return {
        success: false,
        error: 'Authentication required',
        statusCode: 401
      };
    }

    // Get user from database with subscription info
    const user = await prisma.user.findUnique({
      where: { id: supabaseUser.id },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
        booksGenerated: true,
        wordsGenerated: true,
        lastResetDate: true,
        currentPeriodEnd: true
      }
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found in database',
        statusCode: 404
      };
    }

    // Check tier access for premium/basic features
    const tierCheck = checkTierAccess(user.subscriptionTier, generationRequest);
    if (!tierCheck.success) {
      return tierCheck;
    }

    // Check usage limits if this is a generation request
    if (generationRequest.wordCount) {
      const validation = await usageTracker.checkGenerationLimit(
        user.id,
        generationRequest.wordCount
      );

      if (!validation.allowed) {
        return {
          success: false,
          validation,
          error: validation.reason || 'Generation limit exceeded',
          statusCode: 429 // Too Many Requests
        };
      }

      return {
        success: true,
        user,
        validation
      };
    }

    // For non-generation requests, just return user
    return {
      success: true,
      user
    };

  } catch (error) {
    console.error('Subscription check failed:', error);
    return {
      success: false,
      error: 'Subscription validation failed',
      statusCode: 500
    };
  }
}

/**
 * Check if user's tier has access to specific features
 */
function checkTierAccess(
  tier: string,
  request: GenerationRequest
): SubscriptionCheckResult {
  // Check premium feature access
  if (request.requiresPremium && tier !== 'PREMIUM') {
    return {
      success: false,
      error: `${request.featureName || 'This feature'} requires Premium subscription`,
      statusCode: 403
    };
  }

  // Check basic+ feature access
  if (request.requiresBasic && tier === 'FREE') {
    return {
      success: false,
      error: `${request.featureName || 'This feature'} requires Basic or Premium subscription`,
      statusCode: 403
    };
  }

  return { success: true };
}

/**
 * Create a response for subscription errors
 */
export function createSubscriptionErrorResponse(
  result: SubscriptionCheckResult,
  includeUpgradeInfo: boolean = true
): NextResponse {
  const errorData: any = {
    error: result.error,
    code: 'SUBSCRIPTION_ERROR'
  };

  // Add upgrade information for limit errors
  if (includeUpgradeInfo && result.validation) {
    errorData.currentUsage = result.validation.currentUsage;
    errorData.upgradeRequired = result.validation.upgradeRequired;
    
    if (result.validation.upgradeRequired) {
      errorData.upgradeOptions = {
        basic: {
          price: '$9/month',
          booksPerMonth: 10,
          features: ['Proofreading', 'WriterDirector', 'PDF Export']
        },
        premium: {
          price: '$24/month',
          booksPerMonth: 25,
          features: ['All Features', 'Research Agent', 'Continuity Checking', 'Commercial Rights']
        }
      };
    }
  }

  return NextResponse.json(errorData, { status: result.statusCode || 400 });
}

/**
 * Track successful generation after completion
 */
export async function trackSuccessfulGeneration(
  userId: string,
  wordCount: number,
  bookId?: string
): Promise<void> {
  try {
    await usageTracker.trackGeneration(userId, wordCount, bookId);
  } catch (error) {
    console.error('Failed to track generation:', error);
    // Don't throw - tracking shouldn't break the main flow
  }
}

/**
 * Get user usage statistics for dashboard
 */
export async function getUserUsageStats(userId: string) {
  try {
    return await usageTracker.getUserUsage(userId);
  } catch (error) {
    console.error('Failed to get usage stats:', error);
    throw new Error('Failed to get usage statistics');
  }
}

/**
 * Higher-order function to wrap API routes with subscription checking
 */
export function withSubscriptionCheck(
  handler: (
    request: NextRequest,
    context: any,
    subscriptionData: { user: any; validation?: UsageValidation }
  ) => Promise<NextResponse>,
  generationRequest: GenerationRequest = {}
) {
  return async (request: NextRequest, context: any): Promise<NextResponse> => {
    const subscriptionCheck = await checkSubscriptionAccess(request, generationRequest);
    
    if (!subscriptionCheck.success) {
      return createSubscriptionErrorResponse(subscriptionCheck);
    }

    // Call the original handler with subscription data
    return handler(request, context, {
      user: subscriptionCheck.user!,
      validation: subscriptionCheck.validation
    });
  };
}

/**
 * Utility to check if export format is allowed for user's tier
 */
export function isExportFormatAllowed(tier: string, format: string): boolean {
  const limits = UsageTracker.getTierLimits(tier as any);
  return limits.exportFormats.includes(format.toLowerCase());
}

/**
 * Get queue priority for user's tier
 */
export function getQueuePriority(tier: string): 'low' | 'normal' | 'high' {
  const limits = UsageTracker.getTierLimits(tier as any);
  return limits.queuePriority;
}

/**
 * Check if user has commercial rights
 */
export function hasCommercialRights(tier: string): boolean {
  const limits = UsageTracker.getTierLimits(tier as any);
  return limits.commercialRights;
} 