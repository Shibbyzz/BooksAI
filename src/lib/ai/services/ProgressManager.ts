import { progressTracker } from '../../progress-tracker';
import { GenerationStep } from '@/types';
import type { BookProgress } from '../../progress-tracker';

export interface GenerationProgress {
  bookId: string;
  step?: GenerationStep;
  currentChapter?: number;
  totalChapters?: number;
  progress?: number;
  status?: 'queued' | 'processing' | 'completed' | 'error';
}

export class ProgressManager {
  constructor() {}

  /**
   * Update book generation progress
   */
  async updateBookProgress(
    bookId: string,
    progress: Partial<GenerationProgress>
  ): Promise<void> {
    // Convert GenerationProgress to BookProgress format for Redis
    const mapGenerationStep = (step?: GenerationStep): BookProgress['generationStep'] => {
      switch (step) {
        case 'PROMPT': return 'PLANNING';
        case 'BACK_COVER': return 'PLANNING';
        case 'OUTLINE': return 'OUTLINE';
        case 'CHAPTERS': return 'CHAPTERS';
        case 'SECTIONS': return 'CHAPTERS';
        case 'SUPERVISION': return 'PROOFREADING';
        case 'COMPLETE': return 'COMPLETE';
        default: return 'CHAPTERS';
      }
    };

    const redisProgress: Partial<BookProgress> = {
      status: progress.status === 'processing' ? 'GENERATING' : 
              progress.status === 'completed' ? 'COMPLETE' : 
              progress.status === 'queued' ? 'PLANNING' : 'GENERATING',
      generationStep: mapGenerationStep(progress.step),
      overallProgress: progress.progress || 0,
      message: this.generateStatusMessage(progress),
      currentChapter: progress.currentChapter || 0,
      totalChapters: progress.totalChapters || 0
    };

    // Update Redis progress
    await progressTracker.updateProgress(bookId, redisProgress);
    
    console.log(`Book ${bookId} progress updated:`, redisProgress);
  }

  /**
   * Start chapter progress tracking
   */
  async startChapter(bookId: string, chapterNumber: number, totalChapters: number): Promise<void> {
    await progressTracker.startChapter(bookId, chapterNumber, totalChapters);
  }

  /**
   * Update section progress
   */
  async updateSection(bookId: string, sectionNumber: number, totalSections: number): Promise<void> {
    await progressTracker.updateSection(bookId, sectionNumber, totalSections);
  }

  /**
   * Update generation step
   */
  async updateStep(bookId: string, step: BookProgress['generationStep'], message: string): Promise<void> {
    await progressTracker.updateStep(bookId, step, message);
  }

  /**
   * Mark book as complete
   */
  async markComplete(bookId: string, totalChapters: number): Promise<void> {
    await progressTracker.markComplete(bookId, totalChapters);
  }

  /**
   * Mark book as error
   */
  async markError(bookId: string, errorMessage: string): Promise<void> {
    await progressTracker.markError(bookId, errorMessage);
  }

  /**
   * Generate meaningful status messages based on progress
   */
  private generateStatusMessage(progress: Partial<GenerationProgress>): string {
    const progressPercent = progress.progress || 0;
    const currentChapter = progress.currentChapter || 0;
    const totalChapters = progress.totalChapters || 0;

    if (progressPercent <= 25) {
      return 'AI analyzing your concept and generating back cover...';
    } else if (progressPercent <= 40) {
      return 'ResearchAgent conducting comprehensive research and building outline...';
    } else if (progressPercent <= 50) {
      return 'ChiefEditor planning optimal book structure and chapters...';
    } else if (progressPercent <= 90 && totalChapters > 0) {
      return `Writing Chapter ${currentChapter} of ${totalChapters} with AI storytelling...`;
    } else if (progressPercent <= 95) {
      return 'ProofreaderGPT applying final polish and quality enhancements...';
    } else if (progressPercent >= 100) {
      return 'Book generation completed successfully! 🎉';
    } else {
      return 'AI is working on your book...';
    }
  }

  /**
   * Initialize progress tracking for a book
   */
  async initialize(bookId: string): Promise<void> {
    await progressTracker.updateProgress(bookId, {
      status: 'GENERATING',
      generationStep: 'PLANNING',
      overallProgress: 0,
      message: 'Starting book generation...'
    });
  }

  /**
   * Update progress with detailed chapter information
   */
  async updateChapterProgress(
    bookId: string,
    chapterNumber: number,
    totalChapters: number,
    sectionNumber: number,
    totalSections: number
  ): Promise<void> {
    // Calculate overall progress during chapter generation
    const overallChapterProgress = (sectionNumber - 1) / totalSections;
    
    // Base progress (50%) + chapter progress (40% of the generation)
    const baseProgress = 50;
    const chapterProgressRange = 40;
    const chapterProgressContribution = (chapterNumber - 1) / totalChapters * chapterProgressRange;
    const currentChapterProgressContribution = (1 / totalChapters) * chapterProgressRange * overallChapterProgress;
    const totalProgress = baseProgress + chapterProgressContribution + currentChapterProgressContribution;
    
    // Update overall progress in Redis
    await progressTracker.updateProgress(bookId, {
      overallProgress: Math.round(totalProgress),
      message: `Writing Chapter ${chapterNumber} of ${totalChapters} - Section ${sectionNumber} of ${totalSections}...`,
      currentChapter: chapterNumber,
      totalChapters: totalChapters
    });
  }

  /**
   * Complete chapter progress
   */
  async completeChapter(
    bookId: string,
    chapterNumber: number,
    totalChapters: number,
    totalSections: number
  ): Promise<void> {
    const baseProgress = 50;
    const chapterProgressRange = 40;
    const chapterProgressContribution = (chapterNumber - 1) / totalChapters * chapterProgressRange;
    const finalSectionProgress = baseProgress + chapterProgressContribution + (1 / totalChapters) * chapterProgressRange;
    
    await progressTracker.updateProgress(bookId, {
      overallProgress: Math.round(finalSectionProgress),
      message: `Chapter ${chapterNumber} of ${totalChapters} completed!`,
      currentChapter: chapterNumber,
      totalChapters: totalChapters
    });
  }
} 