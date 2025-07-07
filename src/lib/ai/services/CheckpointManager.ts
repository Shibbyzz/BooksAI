import fs from 'fs/promises';
import path from 'path';
import { type StoryBible } from '../agents/chief-editor-agent';
import { type QualityEnhancement } from '../agents/human-quality-enhancer';

export interface FailedSection {
  bookId: string;
  chapterId: string;
  sectionNumber: number;
  reason: string;
  timestamp: Date;
  retryCount: number;
  metadata: {
    consistencyScore?: number;
    qualityScore?: number;
    errorMessage?: string;
    proseSeverity?: 'low' | 'medium' | 'high' | 'critical';
    proseWarnings?: string[];
    proseSuggestions?: string[];
  };
}

export interface GenerationCheckpoint {
  bookId: string;
  storyBible?: StoryBible;
  qualityPlan?: QualityEnhancement;
  completedChapters: number[];
  completedSections: { [chapterId: string]: number[] };
  failedSections: FailedSection[];
  timestamp: Date;
  version: string;
}

export class CheckpointManager {
  private checkpointDir: string;

  constructor(checkpointDir?: string) {
    this.checkpointDir = checkpointDir || path.join(process.cwd(), 'checkpoints');
  }

  /**
   * Save generation checkpoint to disk
   */
  async saveCheckpoint(bookId: string, checkpoint: GenerationCheckpoint): Promise<void> {
    try {
      // Ensure checkpoint directory exists
      await fs.mkdir(this.checkpointDir, { recursive: true });

      const checkpointPath = path.join(this.checkpointDir, `${bookId}-checkpoint.json`);
      
      // Add timestamp and version
      const checkpointData = {
        ...checkpoint,
        timestamp: new Date(),
        version: '1.0'
      };

      await fs.writeFile(checkpointPath, JSON.stringify(checkpointData, null, 2));
      
      console.log(`💾 Checkpoint saved: ${checkpointPath}`);
    } catch (error) {
      console.error('Failed to save checkpoint:', error);
      // Non-critical error - don't throw
    }
  }

  /**
   * Load generation checkpoint from disk
   */
  async loadCheckpoint(bookId: string): Promise<GenerationCheckpoint | null> {
    try {
      const checkpointPath = path.join(this.checkpointDir, `${bookId}-checkpoint.json`);
      
      const checkpointData = await fs.readFile(checkpointPath, 'utf8');
      const checkpoint = JSON.parse(checkpointData) as GenerationCheckpoint;
      
      console.log(`📁 Checkpoint loaded: ${checkpointPath}`);
      return checkpoint;
    } catch (error) {
      console.log(`📁 No checkpoint found for book ${bookId}`);
      return null;
    }
  }

  /**
   * Clear checkpoint after successful completion
   */
  async clearCheckpoint(bookId: string): Promise<void> {
    try {
      const checkpointPath = path.join(this.checkpointDir, `${bookId}-checkpoint.json`);
      await fs.unlink(checkpointPath);
      console.log(`🗑️  Checkpoint cleared: ${checkpointPath}`);
    } catch (error) {
      // Ignore errors - checkpoint might not exist
    }
  }

  /**
   * Create a new checkpoint with basic info
   */
  createCheckpoint(
    bookId: string,
    storyBible?: StoryBible,
    qualityPlan?: QualityEnhancement
  ): GenerationCheckpoint {
    return {
      bookId,
      storyBible,
      qualityPlan,
      completedChapters: [],
      completedSections: {},
      failedSections: [],
      timestamp: new Date(),
      version: '1.0'
    };
  }

  /**
   * Update checkpoint with completed chapter
   */
  async updateCheckpointWithChapter(
    bookId: string,
    chapterNumber: number,
    existingCheckpoint?: GenerationCheckpoint
  ): Promise<void> {
    const checkpoint = existingCheckpoint || await this.loadCheckpoint(bookId);
    
    if (!checkpoint) {
      console.warn(`No checkpoint found for book ${bookId}, cannot update`);
      return;
    }

    if (!checkpoint.completedChapters.includes(chapterNumber)) {
      checkpoint.completedChapters.push(chapterNumber);
      checkpoint.completedChapters.sort((a, b) => a - b);
    }

    await this.saveCheckpoint(bookId, checkpoint);
  }

  /**
   * Update checkpoint with completed section
   */
  async updateCheckpointWithSection(
    bookId: string,
    chapterId: string,
    sectionNumber: number,
    existingCheckpoint?: GenerationCheckpoint
  ): Promise<void> {
    const checkpoint = existingCheckpoint || await this.loadCheckpoint(bookId);
    
    if (!checkpoint) {
      console.warn(`No checkpoint found for book ${bookId}, cannot update`);
      return;
    }

    if (!checkpoint.completedSections[chapterId]) {
      checkpoint.completedSections[chapterId] = [];
    }

    if (!checkpoint.completedSections[chapterId].includes(sectionNumber)) {
      checkpoint.completedSections[chapterId].push(sectionNumber);
      checkpoint.completedSections[chapterId].sort((a, b) => a - b);
    }

    await this.saveCheckpoint(bookId, checkpoint);
  }

  /**
   * Add failed section to checkpoint
   */
  async addFailedSection(
    bookId: string,
    failedSection: FailedSection,
    existingCheckpoint?: GenerationCheckpoint
  ): Promise<void> {
    const checkpoint = existingCheckpoint || await this.loadCheckpoint(bookId);
    
    if (!checkpoint) {
      console.warn(`No checkpoint found for book ${bookId}, cannot add failed section`);
      return;
    }

    checkpoint.failedSections.push(failedSection);
    await this.saveCheckpoint(bookId, checkpoint);
  }

  /**
   * Remove failed section from checkpoint
   */
  async removeFailedSection(
    bookId: string,
    chapterId: string,
    sectionNumber: number,
    existingCheckpoint?: GenerationCheckpoint
  ): Promise<void> {
    const checkpoint = existingCheckpoint || await this.loadCheckpoint(bookId);
    
    if (!checkpoint) {
      console.warn(`No checkpoint found for book ${bookId}, cannot remove failed section`);
      return;
    }

    checkpoint.failedSections = checkpoint.failedSections.filter(
      section => !(section.chapterId === chapterId && section.sectionNumber === sectionNumber)
    );

    await this.saveCheckpoint(bookId, checkpoint);
  }

  /**
   * Get checkpoint summary
   */
  async getCheckpointSummary(bookId: string): Promise<{
    exists: boolean;
    completedChapters: number;
    failedSections: number;
    lastUpdated?: Date;
  }> {
    const checkpoint = await this.loadCheckpoint(bookId);
    
    if (!checkpoint) {
      return { exists: false, completedChapters: 0, failedSections: 0 };
    }

    return {
      exists: true,
      completedChapters: checkpoint.completedChapters.length,
      failedSections: checkpoint.failedSections.length,
      lastUpdated: checkpoint.timestamp
    };
  }

  /**
   * List all checkpoints
   */
  async listCheckpoints(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.checkpointDir);
      return files
        .filter(file => file.endsWith('-checkpoint.json'))
        .map(file => file.replace('-checkpoint.json', ''));
    } catch (error) {
      console.log('No checkpoints directory found');
      return [];
    }
  }

  /**
   * Clean up old checkpoints (older than specified days)
   */
  async cleanupOldCheckpoints(daysOld: number = 30): Promise<void> {
    try {
      const files = await fs.readdir(this.checkpointDir);
      const checkpointFiles = files.filter(file => file.endsWith('-checkpoint.json'));
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      for (const file of checkpointFiles) {
        const filePath = path.join(this.checkpointDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath);
          console.log(`🗑️  Cleaned up old checkpoint: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error cleaning up old checkpoints:', error);
    }
  }
} 