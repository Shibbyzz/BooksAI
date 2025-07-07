import { prisma } from '@/lib/prisma';
import { SubscriptionTier } from '@prisma/client';

export interface TierLimits {
  booksPerMonth: number;
  wordsPerMonth: number;
  maxWordsPerBook: number;
  dailyBookLimit: number;
  queuePriority: 'low' | 'normal' | 'high';
  exportFormats: string[];
  commercialRights: boolean;
}

export interface UsageStats {
  userId: string;
  tier: SubscriptionTier;
  booksGenerated: number;
  wordsGenerated: number;
  booksRemainingThisMonth: number;
  wordsRemainingThisMonth: number;
  dailyBooksRemaining: number;
  lastResetDate: Date;
  currentPeriodEnd: Date;
  isAtLimit: boolean;
  canGenerateBook: boolean;
  canGenerateWords: number;
}

export interface UsageValidation {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  currentUsage: UsageStats;
}

export class UsageTracker {
  private static readonly TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
    FREE: {
      booksPerMonth: 3,
      wordsPerMonth: 150000, // 3 books × 50k words
      maxWordsPerBook: 50000,
      dailyBookLimit: 1, // Prevent abuse
      queuePriority: 'low',
      exportFormats: ['txt'],
      commercialRights: false
    },
    BASIC: {
      booksPerMonth: 10,
      wordsPerMonth: 750000, // 10 books × 75k words
      maxWordsPerBook: 75000,
      dailyBookLimit: 3,
      queuePriority: 'normal',
      exportFormats: ['txt', 'pdf'],
      commercialRights: false
    },
    PREMIUM: {
      booksPerMonth: 25,
      wordsPerMonth: 5000000, // 25 books × 200k words
      maxWordsPerBook: 200000,
      dailyBookLimit: 2, // Even premium users have daily limits
      queuePriority: 'high',
      exportFormats: ['txt', 'pdf', 'epub', 'docx', 'mobi'],
      commercialRights: true
    }
  };

  /**
   * Get tier limits for a subscription tier
   */
  static getTierLimits(tier: SubscriptionTier): TierLimits {
    return this.TIER_LIMITS[tier];
  }

  /**
   * Check if user can generate a book with specified word count
   */
  async checkGenerationLimit(
    userId: string,
    requestedWords: number
  ): Promise<UsageValidation> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          subscriptionTier: true,
          booksGenerated: true,
          wordsGenerated: true,
          lastResetDate: true,
          currentPeriodEnd: true,
          createdAt: true
        }
      });

      if (!user) {
        return {
          allowed: false,
          reason: 'User not found',
          currentUsage: this.getDefaultUsageStats(userId)
        };
      }

      // Reset usage if new month
      await this.resetUsageIfNeeded(userId, user.lastResetDate);

      // Get fresh user data after potential reset
      const freshUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          subscriptionTier: true,
          booksGenerated: true,
          wordsGenerated: true,
          lastResetDate: true,
          currentPeriodEnd: true,
          createdAt: true
        }
      });

      if (!freshUser) {
        return {
          allowed: false,
          reason: 'User not found after reset',
          currentUsage: this.getDefaultUsageStats(userId)
        };
      }

      const limits = UsageTracker.getTierLimits(freshUser.subscriptionTier);
      const usageStats = await this.calculateUsageStats(freshUser, limits);

      // Check various limits
      const validation = this.validateUsage(usageStats, requestedWords, limits);

      return {
        ...validation,
        currentUsage: usageStats
      };

    } catch (error) {
      console.error('Usage limit check failed:', error);
      return {
        allowed: false,
        reason: 'Usage check failed',
        currentUsage: this.getDefaultUsageStats(userId)
      };
    }
  }

  /**
   * Track book generation usage
   */
  async trackGeneration(
    userId: string,
    wordCount: number,
    bookId?: string
  ): Promise<void> {
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          booksGenerated: { increment: 1 },
          wordsGenerated: { increment: wordCount }
        }
      });

      // Log the generation for analytics
      await this.logUsage(userId, 'book_generated', {
        bookId,
        wordCount,
        timestamp: new Date()
      });

      console.log(`📊 Usage tracked for user ${userId}: +1 book, +${wordCount} words`);

    } catch (error) {
      console.error('Failed to track generation:', error);
      // Don't throw error - usage tracking shouldn't break generation
    }
  }

  /**
   * Get current usage statistics for a user
   */
  async getUserUsage(userId: string): Promise<UsageStats> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          subscriptionTier: true,
          booksGenerated: true,
          wordsGenerated: true,
          lastResetDate: true,
          currentPeriodEnd: true,
          createdAt: true
        }
      });

      if (!user) {
        return this.getDefaultUsageStats(userId);
      }

      // Reset usage if needed
      await this.resetUsageIfNeeded(userId, user.lastResetDate);

      // Get fresh data
      const freshUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          subscriptionTier: true,
          booksGenerated: true,
          wordsGenerated: true,
          lastResetDate: true,
          currentPeriodEnd: true,
          createdAt: true
        }
      });

      if (!freshUser) {
        return this.getDefaultUsageStats(userId);
      }

      const limits = UsageTracker.getTierLimits(freshUser.subscriptionTier);
      return await this.calculateUsageStats(freshUser, limits);

    } catch (error) {
      console.error('Failed to get user usage:', error);
      return this.getDefaultUsageStats(userId);
    }
  }

  /**
   * Reset usage if it's a new month
   */
  private async resetUsageIfNeeded(userId: string, lastResetDate: Date): Promise<void> {
    const now = new Date();
    const resetDate = new Date(lastResetDate);
    
    // Check if it's been more than a month
    const monthsDiff = (now.getFullYear() - resetDate.getFullYear()) * 12 + 
                       (now.getMonth() - resetDate.getMonth());

    if (monthsDiff >= 1) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          booksGenerated: 0,
          wordsGenerated: 0,
          lastResetDate: now
        }
      });

      console.log(`🔄 Usage reset for user ${userId} (${monthsDiff} months passed)`);
    }
  }

  /**
   * Calculate comprehensive usage statistics
   */
  private async calculateUsageStats(
    user: {
      subscriptionTier: SubscriptionTier;
      booksGenerated: number;
      wordsGenerated: number;
      lastResetDate: Date;
      currentPeriodEnd: Date | null;
      createdAt: Date;
    },
    limits: TierLimits
  ): Promise<UsageStats> {
    const now = new Date();
    
    // Calculate daily usage
    const dailyUsage = await this.getDailyUsage(user.subscriptionTier, user.lastResetDate);
    
    // Calculate next period end
    const currentPeriodEnd = user.currentPeriodEnd || this.getNextMonthStart(user.lastResetDate);
    
    return {
      userId: user.subscriptionTier,
      tier: user.subscriptionTier,
      booksGenerated: user.booksGenerated,
      wordsGenerated: user.wordsGenerated,
      booksRemainingThisMonth: Math.max(0, limits.booksPerMonth - user.booksGenerated),
      wordsRemainingThisMonth: Math.max(0, limits.wordsPerMonth - user.wordsGenerated),
      dailyBooksRemaining: Math.max(0, limits.dailyBookLimit - dailyUsage.booksToday),
      lastResetDate: user.lastResetDate,
      currentPeriodEnd,
      isAtLimit: user.booksGenerated >= limits.booksPerMonth || 
                 user.wordsGenerated >= limits.wordsPerMonth,
      canGenerateBook: user.booksGenerated < limits.booksPerMonth && 
                       dailyUsage.booksToday < limits.dailyBookLimit,
      canGenerateWords: Math.max(0, limits.wordsPerMonth - user.wordsGenerated)
    };
  }

  /**
   * Validate if usage request is allowed
   */
  private validateUsage(
    usage: UsageStats,
    requestedWords: number,
    limits: TierLimits
  ): { allowed: boolean; reason?: string; upgradeRequired?: boolean } {
    // Check if already at monthly book limit
    if (usage.booksGenerated >= limits.booksPerMonth) {
      return {
        allowed: false,
        reason: `Monthly book limit reached (${limits.booksPerMonth} books)`,
        upgradeRequired: true
      };
    }

    // Check daily book limit
    if (usage.dailyBooksRemaining <= 0) {
      return {
        allowed: false,
        reason: `Daily book limit reached (${limits.dailyBookLimit} books per day)`,
        upgradeRequired: false
      };
    }

    // Check if requested words exceed remaining monthly words
    if (requestedWords > usage.wordsRemainingThisMonth) {
      return {
        allowed: false,
        reason: `Not enough words remaining (${usage.wordsRemainingThisMonth} left, ${requestedWords} requested)`,
        upgradeRequired: true
      };
    }

    // Check if requested words exceed max per book
    if (requestedWords > limits.maxWordsPerBook) {
      return {
        allowed: false,
        reason: `Book too long (${requestedWords} words, max ${limits.maxWordsPerBook})`,
        upgradeRequired: true
      };
    }

    return { allowed: true };
  }

  /**
   * Get daily usage statistics
   */
  private async getDailyUsage(
    tier: SubscriptionTier,
    lastResetDate: Date
  ): Promise<{ booksToday: number; wordsToday: number }> {
    // For now, return simple calculation
    // In production, you'd query daily usage logs
    const now = new Date();
    const isToday = now.toDateString() === lastResetDate.toDateString();
    
    return {
      booksToday: isToday ? 0 : 0, // Simplified for MVP
      wordsToday: isToday ? 0 : 0
    };
  }

  /**
   * Get next month start date
   */
  private getNextMonthStart(from: Date): Date {
    const next = new Date(from);
    next.setMonth(next.getMonth() + 1);
    next.setDate(1);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  /**
   * Get default usage stats for error cases
   */
  private getDefaultUsageStats(userId: string): UsageStats {
    return {
      userId,
      tier: 'FREE',
      booksGenerated: 0,
      wordsGenerated: 0,
      booksRemainingThisMonth: 3,
      wordsRemainingThisMonth: 150000,
      dailyBooksRemaining: 1,
      lastResetDate: new Date(),
      currentPeriodEnd: this.getNextMonthStart(new Date()),
      isAtLimit: false,
      canGenerateBook: true,
      canGenerateWords: 150000
    };
  }

  /**
   * Log usage for analytics
   */
  private async logUsage(
    userId: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.log.create({
        data: {
          userId,
          action,
          resource: 'subscription',
          details,
          ip: null,
          userAgent: null
        }
      });
    } catch (error) {
      console.error('Failed to log usage:', error);
      // Don't throw - logging shouldn't break the main flow
    }
  }

  /**
   * Get usage analytics for admin/user dashboard
   */
  async getUsageAnalytics(userId: string): Promise<{
    currentMonth: UsageStats;
    previousMonth: UsageStats;
    trends: {
      booksGenerated: number;
      wordsGenerated: number;
      avgWordsPerBook: number;
    };
  }> {
    try {
      const currentUsage = await this.getUserUsage(userId);
      
      // For MVP, return simplified analytics
      return {
        currentMonth: currentUsage,
        previousMonth: currentUsage, // Simplified
        trends: {
          booksGenerated: currentUsage.booksGenerated,
          wordsGenerated: currentUsage.wordsGenerated,
          avgWordsPerBook: currentUsage.booksGenerated > 0 
            ? Math.round(currentUsage.wordsGenerated / currentUsage.booksGenerated)
            : 0
        }
      };
    } catch (error) {
      console.error('Failed to get usage analytics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const usageTracker = new UsageTracker(); 