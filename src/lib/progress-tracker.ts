import { getRedisClient, redisOperation } from './redis';

export interface BookProgress {
  bookId: string;
  status: 'PLANNING' | 'GENERATING' | 'COMPLETE' | 'ERROR';
  generationStep: 'PLANNING' | 'RESEARCH' | 'OUTLINE' | 'STRUCTURE' | 'CHAPTERS' | 'PROOFREADING' | 'COMPLETE';
  currentChapter: number;
  totalChapters: number;
  currentSection: number;
  totalSections: number;
  overallProgress: number; // 0-100
  message: string;
  timestamp: number;
  error?: string;
  startTime?: number;
  estimatedEndTime?: number;
}

export class ProgressTracker {
  private readonly PROGRESS_KEY = 'progress:';
  private readonly EXPIRE_TIME = 24 * 60 * 60; // 24 hours

  // Lazy-load Redis client to prevent interference with database connections
  private getRedis() {
    return getRedisClient();
  }

  /**
   * Update progress for a book generation
   */
  async updateProgress(bookId: string, progress: Partial<BookProgress>): Promise<void> {
    const key = `${this.PROGRESS_KEY}${bookId}`;
    
    await redisOperation(
      async () => {
        const redis = this.getRedis();
        
        // Test connection first
        try {
          await redis.ping();
        } catch (pingError) {
          console.error('❌ Redis connection failed during progress update:', pingError);
          throw new Error('Redis connection unavailable for progress tracking');
        }
        
        // Get existing progress or create new
        const existingData = await redis.get(key);
        const existing: BookProgress = existingData ? JSON.parse(existingData) : {
          bookId,
          status: 'PLANNING',
          generationStep: 'PLANNING',
          currentChapter: 0,
          totalChapters: 0,
          currentSection: 0,
          totalSections: 0,
          overallProgress: 0,
          message: 'Starting generation...',
          timestamp: Date.now(),
        };

        // Merge with new progress
        const updated: BookProgress = {
          ...existing,
          ...progress,
          bookId, // Ensure bookId is always correct
          timestamp: Date.now(),
        };

        // Calculate overall progress if not provided
        if (!progress.overallProgress && updated.totalChapters > 0) {
          const chapterProgress = (updated.currentChapter / updated.totalChapters) * 100;
          updated.overallProgress = Math.round(chapterProgress);
        }

        // Store in Redis with expiration
        await redis.setex(key, this.EXPIRE_TIME, JSON.stringify(updated));
        
        console.log(`📊 Progress updated for ${bookId}: ${updated.overallProgress}% - ${updated.message}`);
        
        // Verify the write was successful
        const verification = await redis.get(key);
        if (!verification) {
          throw new Error('Progress update verification failed - data not written to Redis');
        }
      },
      undefined,
      `Failed to update progress for book ${bookId}`
    );
  }

  /**
   * Get current progress for a book
   */
  async getProgress(bookId: string): Promise<BookProgress | null> {
    const key = `${this.PROGRESS_KEY}${bookId}`;
    
    return await redisOperation(
      async () => {
        const redis = this.getRedis();
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      },
      null,
      `Failed to get progress for book ${bookId}`
    );
  }

  /**
   * Mark book generation as complete
   */
  async markComplete(bookId: string, totalChapters: number): Promise<void> {
    await this.updateProgress(bookId, {
      status: 'COMPLETE',
      generationStep: 'COMPLETE',
      currentChapter: totalChapters,
      totalChapters,
      overallProgress: 100,
      message: 'Book generation completed successfully!',
      estimatedEndTime: Date.now(),
    });
  }

  /**
   * Mark book generation as failed
   */
  async markError(bookId: string, error: string): Promise<void> {
    await this.updateProgress(bookId, {
      status: 'ERROR',
      overallProgress: 0,
      message: 'Generation failed',
      error,
      estimatedEndTime: Date.now(),
    });
  }

  /**
   * Start chapter generation
   */
  async startChapter(bookId: string, chapterNumber: number, totalChapters: number): Promise<void> {
    await this.updateProgress(bookId, {
      status: 'GENERATING',
      generationStep: 'CHAPTERS',
      currentChapter: chapterNumber,
      totalChapters,
      message: `Generating Chapter ${chapterNumber} of ${totalChapters}...`,
    });
  }

  /**
   * Update section progress within a chapter
   */
  async updateSection(bookId: string, sectionNumber: number, totalSections: number): Promise<void> {
    await this.updateProgress(bookId, {
      currentSection: sectionNumber,
      totalSections,
      message: `Writing section ${sectionNumber} of ${totalSections}...`,
    });
  }

  /**
   * Update generation step
   */
  async updateStep(bookId: string, step: BookProgress['generationStep'], message: string): Promise<void> {
    await this.updateProgress(bookId, {
      generationStep: step,
      message,
    });
  }

  /**
   * Clean up expired progress data
   */
  async cleanup(): Promise<void> {
    await redisOperation(
      async () => {
        const redis = this.getRedis();
        const keys = await redis.keys(`${this.PROGRESS_KEY}*`);
        if (keys.length > 0) {
          // Redis will auto-expire, but we can manually clean up if needed
          console.log(`🧹 Found ${keys.length} progress keys in Redis`);
        }
      },
      undefined,
      'Failed to cleanup progress data'
    );
  }

  /**
   * Get all active progress (for debugging)
   */
  async getAllProgress(): Promise<BookProgress[]> {
    return await redisOperation(
      async () => {
        const redis = this.getRedis();
        const keys = await redis.keys(`${this.PROGRESS_KEY}*`);
        const progress = [];
        
        for (const key of keys) {
          const data = await redis.get(key);
          if (data) {
            progress.push(JSON.parse(data));
          }
        }
        
        return progress;
      },
      [],
      'Failed to get all progress data'
    );
  }
}

// Export singleton instance
export const progressTracker = new ProgressTracker(); 