import { NextRequest, NextResponse } from 'next/server';
import { checkSubscriptionAccess, getUserUsageStats } from '@/lib/subscription/subscription-middleware';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get user
    const subscriptionCheck = await checkSubscriptionAccess(request);
    
    if (!subscriptionCheck.success) {
      return NextResponse.json(
        { 
          error: subscriptionCheck.error,
          code: 'SUBSCRIPTION_ERROR' 
        }, 
        { status: subscriptionCheck.statusCode || 400 }
      );
    }

    const user = subscriptionCheck.user!;

    // Get usage statistics
    const usageStats = await getUserUsageStats(user.id);

    return NextResponse.json({
      success: true,
      data: {
        usage: usageStats,
        tier: user.subscriptionTier,
        user: {
          id: user.id,
          email: user.email,
          subscriptionTier: user.subscriptionTier
        }
      }
    });

  } catch (error) {
    console.error('Usage stats API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get usage statistics',
        code: 'INTERNAL_ERROR'
      }, 
      { status: 500 }
    );
  }
} 