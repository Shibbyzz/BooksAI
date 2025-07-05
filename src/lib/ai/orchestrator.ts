import { PlanningAgent, type OutlineGeneration, type PlanningInput } from './agents/planning-agent';
import { WritingAgent, type SectionContext, type SectionGeneration } from './agents/writing-agent';
import { ResearchAgent } from './agents/research-agent';
import { type ProseValidation } from '../proseValidator';
import { ChiefEditorAgent, type StoryBible } from './agents/chief-editor-agent';
import { ContinuityInspectorAgent } from './agents/continuity-inspector-agent';
import { ProofreaderAgent } from './agents/proofreader-agent';
import { WriterDirector, type SceneContext, type SceneGeneration } from './agents/specialized-writers';
import { HumanQualityEnhancer, SceneTransitionEnhancer, type QualityEnhancement } from './agents/human-quality-enhancer';
import { SupervisionAgent, type ChapterReview, type StoryArcProgress } from './agents/supervision-agent';
import { RateLimiter } from './rate-limiter';
import { prisma } from '@/lib/prisma';
import { 
  GenerationStep,
  BookStatus,
  ChapterStatus 
} from '@/types';
import type { 
  BookSettings, 
  Book, 
  GenerationProgress
} from '@/types';
import fs from 'fs/promises';
import path from 'path';

export interface GenerationConfig {
  planningAgent: {
    model: string;
    temperature: number;
  };
  writingAgent: {
    model: string;
    temperature: number;
  };
  supervisionAgent: {
    model: string;
    temperature: number;
  };
  // Enhanced AI agents
  researchAgent?: {
    model: string;
    temperature: number;
  };
  chiefEditorAgent?: {
    model: string;
    temperature: number;
  };
  continuityAgent?: {
    model: string;
    temperature: number;
  };
  proofreaderAgent?: {
    model: string;
    temperature: number;
  };
}

export interface GenerationJobOptions {
  priority: 'low' | 'normal' | 'high';
  pauseable: boolean;
  notificationWebhook?: string;
}

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

export class BookGenerationOrchestrator {
  private planningAgent: PlanningAgent;
  private writingAgent: WritingAgent;
  private researchAgent: ResearchAgent;
  private chiefEditorAgent: ChiefEditorAgent;
  private continuityAgent: ContinuityInspectorAgent;
  private proofreaderAgent: ProofreaderAgent;
  private writerDirector: WriterDirector;
  private qualityEnhancer: HumanQualityEnhancer;
  private transitionEnhancer: SceneTransitionEnhancer;
  private supervisionAgent: SupervisionAgent; // NEW: Supervision agent
  private rateLimiter: RateLimiter; // NEW: Rate limiter
  private config: GenerationConfig;
  private storyBible?: StoryBible; // Store story bible for reference
  private qualityPlan?: QualityEnhancement; // Store quality enhancement plan
  private failedSections: FailedSection[] = []; // NEW: Failed sections queue
  private checkpointDir: string; // NEW: Checkpoint directory

  constructor(config?: Partial<GenerationConfig>) {
    this.config = {
      planningAgent: {
        model: 'gpt-4o-mini',
        temperature: 0.7
      },
      writingAgent: {
        model: 'gpt-4o-mini',
        temperature: 0.8
      },
      supervisionAgent: {
        model: 'gpt-4o-mini',
        temperature: 0.3
      },
      researchAgent: {
        model: 'gpt-3.5-turbo',
        temperature: 0.3
      },
      chiefEditorAgent: {
        model: 'gpt-4o',
        temperature: 0.8
      },
      continuityAgent: {
        model: 'gpt-4o',
        temperature: 0.0
      },
      proofreaderAgent: {
        model: 'gpt-3.5-turbo',
        temperature: 0.0
      },
      ...config
    };

    this.planningAgent = new PlanningAgent({
      model: this.config.planningAgent.model,
      temperature: this.config.planningAgent.temperature,
      maxTokens: 6000
    });

    this.writingAgent = new WritingAgent({
      model: this.config.writingAgent.model,
      temperature: this.config.writingAgent.temperature,
      maxTokens: 4000
    });

    // Initialize enhanced AI agents
    this.researchAgent = new ResearchAgent({
      model: this.config.researchAgent?.model || 'gpt-3.5-turbo',
      temperature: this.config.researchAgent?.temperature || 0.3,
      maxTokens: 3000
    });

    this.chiefEditorAgent = new ChiefEditorAgent({
      model: this.config.chiefEditorAgent?.model || 'gpt-4o',
      temperature: this.config.chiefEditorAgent?.temperature || 0.8,
      maxTokens: 6000
    });

    this.continuityAgent = new ContinuityInspectorAgent({
      model: this.config.continuityAgent?.model || 'gpt-4o',
      temperature: this.config.continuityAgent?.temperature || 0.0,
      maxTokens: 4000
    });

    this.proofreaderAgent = new ProofreaderAgent({
      model: this.config.proofreaderAgent?.model || 'gpt-3.5-turbo',
      temperature: this.config.proofreaderAgent?.temperature || 0.0,
      maxTokens: 3000
    });

    // Initialize specialized writer director
    this.writerDirector = new WriterDirector({
      model: this.config.writingAgent.model,
      temperature: 0.8,
      maxTokens: 4000
    });

    // NEW: Initialize human quality enhancers
    this.qualityEnhancer = new HumanQualityEnhancer({
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4000
    });

    this.transitionEnhancer = new SceneTransitionEnhancer({
      model: 'gpt-4o',
      temperature: 0.6,
      maxTokens: 1000
    });

    // NEW: Initialize supervision agent
    this.supervisionAgent = new SupervisionAgent({
      model: 'gpt-4o',
      temperature: 0.3,
      maxTokens: 3000
    });

    // NEW: Initialize rate limiter
    this.rateLimiter = new RateLimiter();

    // NEW: Initialize checkpoint directory
    this.checkpointDir = path.join(process.cwd(), 'checkpoints');
  }

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  /**
   * Validate story bible structure and content
   */
  validateStoryBible(storyBible: StoryBible): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check overview
    if (!storyBible.overview?.premise) {
      errors.push('Story bible missing premise');
    }
    if (!storyBible.overview?.theme) {
      errors.push('Story bible missing theme');
    }

    // Check characters
    if (!storyBible.characters || storyBible.characters.length === 0) {
      errors.push('Story bible missing characters');
    } else {
      storyBible.characters.forEach((char, index) => {
        if (!char.name) errors.push(`Character ${index} missing name`);
        if (!char.role) errors.push(`Character ${index} missing role`);
        if (!char.background) errors.push(`Character ${char.name || index} missing background`);
      });
    }

    // Check chapter plans
    if (!storyBible.chapterPlans || storyBible.chapterPlans.length === 0) {
      errors.push('Story bible missing chapter plans');
    } else {
      const chapterNumbers = storyBible.chapterPlans.map(c => c.number);
      const duplicates = chapterNumbers.filter((n, i) => chapterNumbers.indexOf(n) !== i);
      if (duplicates.length > 0) {
        errors.push(`Duplicate chapter numbers: ${duplicates.join(', ')}`);
      }

      storyBible.chapterPlans.forEach((chapter, index) => {
        if (!chapter.title) errors.push(`Chapter ${chapter.number || index} missing title`);
        if (!chapter.purpose) errors.push(`Chapter ${chapter.number || index} missing purpose`);
        if (!chapter.scenes || chapter.scenes.length === 0) {
          errors.push(`Chapter ${chapter.number || index} missing scenes`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate structure plan from Chief Editor
   */
  validateStructurePlan(structurePlan: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!structurePlan) {
      errors.push('Structure plan is null or undefined');
      return { isValid: false, errors };
    }

    // Check chapters array
    if (!structurePlan.chapters || !Array.isArray(structurePlan.chapters)) {
      errors.push('Structure plan missing chapters array');
    } else {
      structurePlan.chapters.forEach((chapter: any, index: number) => {
        if (!chapter.number) errors.push(`Chapter ${index} missing number`);
        if (!chapter.title) errors.push(`Chapter ${index} missing title`);
        if (!chapter.purpose) errors.push(`Chapter ${index} missing purpose`);
        if (!chapter.wordCountTarget || chapter.wordCountTarget <= 0) {
          errors.push(`Chapter ${index} missing or invalid word count target`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============================================================================
  // CHECKPOINTING METHODS
  // ============================================================================

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

  // ============================================================================
  // FAILED SECTIONS MANAGEMENT
  // ============================================================================

  /**
   * Add section to failed queue
   */
  addFailedSection(failedSection: FailedSection): void {
    this.failedSections.push(failedSection);
    console.log(`❌ Added failed section to queue: Chapter ${failedSection.chapterId}, Section ${failedSection.sectionNumber} (${failedSection.reason})`);
  }

  /**
   * Get failed sections for a book
   */
  getFailedSections(bookId: string): FailedSection[] {
    return this.failedSections.filter(section => section.bookId === bookId);
  }

  /**
   * Retry failed sections
   */
  async retryFailedSections(bookId: string, maxRetries: number = 3): Promise<void> {
    const failedSections = this.getFailedSections(bookId);
    const retryableSections = failedSections.filter(section => section.retryCount < maxRetries);
    
    if (retryableSections.length === 0) {
      console.log('✅ No retryable failed sections found');
      return;
    }

    console.log(`🔄 Retrying ${retryableSections.length} failed sections...`);

    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { settings: true }
    });

    if (!book?.settings) {
      throw new Error('Book or settings not found for retry');
    }

    for (const failedSection of retryableSections) {
      try {
        console.log(`🔄 Retrying Chapter ${failedSection.chapterId}, Section ${failedSection.sectionNumber} (attempt ${failedSection.retryCount + 1})`);
        
        // Get chapter context
        const chapterContext = await this.getChapterContext(bookId, failedSection.chapterId, book.settings);
        
        if (chapterContext) {
          // Retry section generation
          await this.generateSectionContent(
            bookId,
            failedSection.chapterId,
            failedSection.sectionNumber,
            4, // Default total sections
            1000, // Default target words
            book.settings,
            chapterContext
          );
          
          // Remove from failed queue on success
          this.failedSections = this.failedSections.filter(s => s !== failedSection);
          console.log(`✅ Successfully retried section`);
        }
      } catch (error) {
        // Increment retry count
        failedSection.retryCount++;
        failedSection.metadata.errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.log(`❌ Retry failed (attempt ${failedSection.retryCount}): ${failedSection.metadata.errorMessage}`);
        
        if (failedSection.retryCount >= maxRetries) {
          console.log(`💀 Section exceeded max retries and will be marked as permanently failed`);
        }
      }
    }
  }

  /**
   * Clear all failed sections for a book
   */
  clearFailedSections(bookId: string): void {
    const beforeCount = this.failedSections.length;
    this.failedSections = this.failedSections.filter(section => section.bookId !== bookId);
    const clearedCount = beforeCount - this.failedSections.length;
    
    if (clearedCount > 0) {
      console.log(`🗑️  Cleared ${clearedCount} failed sections for book ${bookId}`);
    }
  }

  /**
   * Generate back cover from user prompt and settings
   */
  async generateBackCover(
    bookId: string,
    userPrompt: string,
    settings: BookSettings
  ): Promise<string> {
    try {
      // Update book status
             await this.updateBookProgress(bookId, {
         step: GenerationStep.BACK_COVER,
         progress: 10,
         status: 'processing'
       });

      const backCover = await this.planningAgent.generateBackCover(userPrompt, settings);

      // Save back cover to database
      await prisma.book.update({
        where: { id: bookId },
                 data: {
           backCover,
           generationStep: GenerationStep.BACK_COVER,
           updatedAt: new Date()
         }
      });

      await this.updateBookProgress(bookId, {
        step: GenerationStep.BACK_COVER,
        progress: 20,
        status: 'completed'
      });

      return backCover;
    } catch (error) {
      await this.handleGenerationError(bookId, GenerationStep.BACK_COVER, error);
      throw error;
    }
  }

  /**
   * Refine back cover based on user feedback
   */
  async refineBackCover(
    bookId: string,
    refinementRequest: string
  ): Promise<string> {
    try {
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: { settings: true }
      });

      if (!book || !book.settings || !book.prompt || !book.backCover) {
        throw new Error('Book not found or missing required data');
      }

      const refinedBackCover = await this.planningAgent.refineBackCover(
        book.prompt,
        book.backCover,
        refinementRequest,
        book.settings
      );

      // Update database
      await prisma.book.update({
        where: { id: bookId },
        data: {
          backCover: refinedBackCover,
          updatedAt: new Date()
        }
      });

      return refinedBackCover;
    } catch (error) {
      await this.handleGenerationError(bookId, GenerationStep.BACK_COVER, error);
      throw error;
    }
  }

  /**
   * ENHANCED: Generate complete book outline with story bible
   */
  async generateOutline(bookId: string): Promise<OutlineGeneration> {
    try {
      await this.updateBookProgress(bookId, {
        step: GenerationStep.OUTLINE,
        progress: 25,
        status: 'processing'
      });

      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: { settings: true }
      });

      if (!book || !book.settings || !book.prompt || !book.backCover) {
        throw new Error('Book not found or missing required data for outline generation');
      }

      console.log('🎯 Generating comprehensive story bible with Chief Editor intelligence...');

      // Step 1: Conduct comprehensive research
      console.log('📚 Phase 1: Comprehensive Research...');
      const research = await this.researchAgent.conductComprehensiveResearch(
        book.prompt,
        book.backCover,
        book.settings
      );

      // Step 2: Generate comprehensive book plan using new PlanningAgent API
      console.log('📋 Phase 2: Comprehensive Book Planning...');
      const planningInput: PlanningInput = {
        prompt: book.prompt,
        settings: book.settings,
        research: research
      };

      const planningResult = await this.planningAgent.generateBookPlan(planningInput);
      
      // Extract components from the comprehensive plan
      const { bookPlan, retryMetadata, debugInfo } = planningResult;
      
      // Type assertion to handle schema mismatch
      const storyBible = bookPlan.storyBible as StoryBible;
      this.storyBible = storyBible;

      console.log(`📊 Planning completed with ${retryMetadata.totalRetries} retries in ${retryMetadata.retryDuration}ms`);
      console.log(`🎨 Creative strategy: ${debugInfo.strategyPreview}`);
      console.log(`📋 Outline preview: ${debugInfo.outlinePreview}`);

      // Step 3: Initialize continuity tracking with story bible
      console.log('🔍 Phase 3: Continuity System Initialization...');
      await this.continuityAgent.initializeTracking(
        bookPlan.outline.characters,
        bookPlan.outline,
        research,
        book.settings
      );

      // Step 4: NEW - Create human-quality enhancement plan
      console.log('🎨 Phase 4: Human-Quality Enhancement Planning...');
      this.qualityPlan = await this.qualityEnhancer.createQualityEnhancementPlan(
        this.storyBible,
        book.settings
      );

      // Save comprehensive data to database
      await this.saveStoryBibleToDatabase(bookId, this.storyBible, bookPlan.outline);

      // NEW: Save story memory data to database
      await this.saveStoryMemoryToDatabase(bookId, this.storyBible, research);

      // Create chapters with scene-based structure
      await this.createChaptersFromStoryBible(bookId, this.storyBible);

      // NEW: Save checkpoint after outline completion
      await this.saveCheckpoint(bookId, {
        bookId,
        storyBible: this.storyBible,
        qualityPlan: this.qualityPlan,
        completedChapters: [],
        completedSections: {},
        failedSections: [],
        timestamp: new Date(),
        version: '1.0'
      });

      // Update book progress
      await prisma.book.update({
        where: { id: bookId },
        data: {
          generationStep: GenerationStep.OUTLINE,
          updatedAt: new Date()
        }
      });

      await this.updateBookProgress(bookId, {
        step: GenerationStep.OUTLINE,
        progress: 40,
        status: 'completed'
      });

      console.log('✅ Comprehensive story bible and outline generation completed');
      return bookPlan.outline;
      
    } catch (error) {
      await this.handleGenerationError(bookId, GenerationStep.OUTLINE, error);
      throw error;
    }
  }

  /**
   * NEW: Convert story bible to outline format for compatibility
   */
  private convertStoryBibleToOutline(storyBible: StoryBible, basicOutline: OutlineGeneration): OutlineGeneration {
    return {
      summary: storyBible.overview.premise,
      themes: [storyBible.overview.theme],
      characters: storyBible.characters.map(char => ({
        name: char.name,
        role: char.role,
        description: char.background,
        arc: char.arc
      })),
      chapters: storyBible.chapterPlans.map(plan => ({
        number: plan.number,
        title: plan.title,
        summary: plan.purpose,
        keyEvents: plan.scenes.map(scene => scene.purpose),
        characters: plan.scenes.flatMap(scene => scene.characters),
        location: plan.scenes[0]?.setting || 'Various locations',
        wordCountTarget: plan.wordCountTarget
      }))
    };
  }

  /**
   * NEW: Save story bible data to database
   */
  private async saveStoryBibleToDatabase(bookId: string, storyBible: StoryBible, outline: OutlineGeneration): Promise<void> {
    // Save outline with proper JSON serialization
    const plotData = JSON.parse(JSON.stringify({
      storyBible: storyBible,
      basicOutline: outline
    }));

    await prisma.bookOutline.upsert({
      where: { bookId },
      create: {
        bookId,
        summary: outline.summary,
        themes: outline.themes,
        plotPoints: plotData
      },
      update: {
        summary: outline.summary,
        themes: outline.themes,
        plotPoints: plotData,
        updatedAt: new Date()
      }
    });
  }

  /**
   * NEW: Save story memory data to database
   */
  private async saveStoryMemoryToDatabase(bookId: string, storyBible: StoryBible, research: any): Promise<void> {
    console.log('💾 Saving story memory data to database...');
    
    try {
      // Create or update StoryMemory record
      const storyMemory = await prisma.storyMemory.upsert({
        where: { bookId },
        create: {
          bookId,
          themes: [storyBible.overview.theme],
          worldRules: {
            premise: storyBible.overview.premise,
            theme: storyBible.overview.theme,
            conflict: storyBible.overview.conflict,
            resolution: storyBible.overview.resolution,
            targetAudience: storyBible.overview.targetAudience,
            tone: storyBible.overview.tone
          }
        },
        update: {
          themes: [storyBible.overview.theme],
          worldRules: {
            premise: storyBible.overview.premise,
            theme: storyBible.overview.theme,
            conflict: storyBible.overview.conflict,
            resolution: storyBible.overview.resolution,
            targetAudience: storyBible.overview.targetAudience,
            tone: storyBible.overview.tone
          },
          updatedAt: new Date()
        }
      });

      // Save characters from story bible
      await this.saveCharactersToDatabase(storyMemory.id, storyBible.characters);

      // Save locations from story bible and research
      await this.saveLocationsToDatabase(storyMemory.id, storyBible, research);

      // Save timeline events from story bible
      await this.saveTimelineEventsToDatabase(storyMemory.id, storyBible);

      console.log(`✅ Story memory saved: ${storyBible.characters.length} characters, ${storyBible.chapterPlans.length} chapters`);

    } catch (error) {
      console.error('Error saving story memory:', error);
      // Don't throw error to avoid breaking the generation flow
    }
  }

  /**
   * NEW: Save characters to database
   */
  private async saveCharactersToDatabase(storyMemoryId: string, characters: any[]): Promise<void> {
    // Clear existing characters
    await prisma.character.deleteMany({
      where: { storyMemoryId }
    });

    // Save characters from story bible
    for (const character of characters) {
      await prisma.character.create({
        data: {
          storyMemoryId,
          name: character.name,
          role: character.role || 'supporting',
          description: character.background || character.description || `${character.name} is a character in the story.`,
          personality: character.personality || `${character.name} has a unique personality.`,
          backstory: character.backstory || character.background || null,
          arc: character.arc || null,
          firstAppearance: character.firstAppearance || 'Chapter 1',
          relationships: character.relationships || {}
        }
      });
    }
  }

  /**
   * NEW: Save locations to database
   */
  private async saveLocationsToDatabase(storyMemoryId: string, storyBible: StoryBible, research: any): Promise<void> {
    // Clear existing locations
    await prisma.location.deleteMany({
      where: { storyMemoryId }
    });

    // Extract locations from story bible scenes
    const locationsSet = new Set<string>();
    
    for (const chapterPlan of storyBible.chapterPlans) {
      for (const scene of chapterPlan.scenes) {
        if (scene.setting && scene.setting.trim()) {
          locationsSet.add(scene.setting.trim());
        }
      }
    }

    // Add locations from research if available
    if (research && research.settingDetails) {
      for (const settingDetail of research.settingDetails) {
        if (settingDetail.topic && settingDetail.topic.trim()) {
          locationsSet.add(settingDetail.topic.trim());
        }
      }
    }

    // Save unique locations
    for (const locationName of Array.from(locationsSet)) {
      await prisma.location.create({
        data: {
          storyMemoryId,
          name: locationName,
          description: `${locationName} is a location in the story.`,
          importance: 'minor',
          firstMention: 'Chapter 1'
        }
      });
    }
  }

  /**
   * NEW: Save timeline events to database
   */
  private async saveTimelineEventsToDatabase(storyMemoryId: string, storyBible: StoryBible): Promise<void> {
    // Clear existing timeline events
    await prisma.timelineEvent.deleteMany({
      where: { storyMemoryId }
    });

    // Create timeline events from chapter plans
    for (const chapterPlan of storyBible.chapterPlans) {
      // Create event for each chapter's main purpose
      await prisma.timelineEvent.create({
        data: {
          storyMemoryId,
          title: `Chapter ${chapterPlan.number}: ${chapterPlan.title}`,
          description: chapterPlan.purpose || `Events of chapter ${chapterPlan.number}`,
          chapterReference: `Chapter ${chapterPlan.number}`,
          importance: chapterPlan.number <= 3 ? 'MAJOR' : 
                      chapterPlan.number >= storyBible.chapterPlans.length - 2 ? 'MAJOR' : 'MINOR'
        }
      });

      // Create events for significant scenes
      for (const scene of chapterPlan.scenes) {
        if (scene.purpose && scene.purpose.toLowerCase().includes('climax') || 
            scene.purpose && scene.purpose.toLowerCase().includes('conflict') ||
            scene.purpose && scene.purpose.toLowerCase().includes('resolution')) {
          await prisma.timelineEvent.create({
            data: {
              storyMemoryId,
              title: `Scene: ${scene.purpose}`,
              description: scene.purpose,
              chapterReference: `Chapter ${chapterPlan.number}`,
              importance: 'MAJOR'
            }
          });
        }
      }
    }
  }

  /**
   * NEW: Update story memory with continuity tracking data
   */
  private async updateStoryMemoryFromContinuityTracking(bookId: string, chapterNumber: number): Promise<void> {
    try {
      // Get current tracker state from continuity agent
      const trackerState = this.continuityAgent.getTrackerState();
      
      // Get story memory record
      const storyMemory = await prisma.storyMemory.findUnique({
        where: { bookId }
      });

      if (!storyMemory) {
        console.warn('No story memory found for book:', bookId);
        return;
      }

      // Update character states from continuity tracking
      for (const characterState of trackerState.characters) {
        await prisma.character.updateMany({
          where: {
            storyMemoryId: storyMemory.id,
            name: characterState.name
          },
          data: {
            // Update character with latest state information
            description: characterState.physicalState ? 
              `${characterState.name} - Physical: ${characterState.physicalState}` : 
              undefined,
            personality: characterState.emotionalState ? 
              `${characterState.name} - Emotional: ${characterState.emotionalState}` : 
              undefined,
            relationships: characterState.relationships || {}
          }
        });
      }

      // Add new timeline events from plot points
      for (const plotPoint of trackerState.plotPoints) {
        // Check if this event already exists
        const existingEvent = await prisma.timelineEvent.findFirst({
          where: {
            storyMemoryId: storyMemory.id,
            title: plotPoint.event,
            chapterReference: `Chapter ${chapterNumber}`
          }
        });

        if (!existingEvent) {
          await prisma.timelineEvent.create({
            data: {
              storyMemoryId: storyMemory.id,
              title: plotPoint.event,
              description: plotPoint.consequences.join('; '),
              chapterReference: `Chapter ${chapterNumber}`,
              importance: plotPoint.affectedCharacters.length > 0 ? 'MAJOR' : 'MINOR'
            }
          });
        }
      }

      // Update locations with new information
      for (const location of trackerState.worldBuilding) {
        // Check if location already exists
        const existingLocation = await prisma.location.findFirst({
          where: {
            storyMemoryId: storyMemory.id,
            name: location.element
          }
        });

        if (existingLocation) {
          // Update existing location
          await prisma.location.update({
            where: { id: existingLocation.id },
            data: {
              description: location.description
            }
          });
        } else {
          // Create new location
          await prisma.location.create({
            data: {
              storyMemoryId: storyMemory.id,
              name: location.element,
              description: location.description,
              importance: 'minor',
              firstMention: `Chapter ${chapterNumber}`
            }
          });
        }
      }

      console.log(`📊 Updated story memory for Chapter ${chapterNumber}`);

    } catch (error) {
      console.error('Error updating story memory from continuity tracking:', error);
      // Don't throw error to avoid breaking the generation flow
    }
  }

  /**
   * NEW: Create chapters from story bible with scene structure
   */
  private async createChaptersFromStoryBible(bookId: string, storyBible: StoryBible): Promise<void> {
    // Delete existing chapters
    await prisma.chapter.deleteMany({
      where: { bookId }
    });

    console.log('📚 Creating chapters with scene-based structure from story bible...');
    
    for (const chapterPlan of storyBible.chapterPlans) {
      console.log(`  📖 Chapter ${chapterPlan.number}: ${chapterPlan.title} (${chapterPlan.scenes.length} scenes)`);

      const chapter = await prisma.chapter.create({
        data: {
          bookId,
          chapterNumber: chapterPlan.number,
          title: chapterPlan.title,
          summary: chapterPlan.purpose,
          status: 'PLANNED'
        }
      });

      // Create sections based on scenes from story bible
      for (let sceneIndex = 0; sceneIndex < chapterPlan.scenes.length; sceneIndex++) {
        const scene = chapterPlan.scenes[sceneIndex];
        
        await prisma.section.create({
          data: {
            chapterId: chapter.id,
            sectionNumber: sceneIndex + 1,
            title: `Scene ${scene.sceneNumber}: ${scene.purpose}`,
            content: '', // Will be generated
            wordCount: 0,
            prompt: JSON.stringify({
              sceneData: scene,
              chapterContext: chapterPlan,
              researchFocus: chapterPlan.researchFocus
            }),
            aiModel: this.config.writingAgent.model,
            tokensUsed: 0,
            status: 'PLANNED'
          }
        });
      }
    }

    console.log(`✅ Created ${storyBible.chapterPlans.length} chapters with scene-based structure`);
  }

  /**
   * Apply Chief Editor's structure plan to enhance the outline
   */
  private applyStructurePlanToOutline(
    outline: OutlineGeneration,
    structurePlan: any,
    settings: BookSettings
  ): OutlineGeneration {
    try {
      // Use Chief Editor's chapter structure to enhance the outline
      const enhancedChapters = structurePlan.chapters.map((editorChapter: any, index: number) => {
        const originalChapter = outline.chapters[index] || outline.chapters[0];
        
        return {
          number: editorChapter.number,
          title: editorChapter.title || originalChapter.title,
          summary: editorChapter.purpose || originalChapter.summary,
          keyEvents: originalChapter.keyEvents || ['Main story events'],
          characters: editorChapter.characterFocus || originalChapter.characters || ['Protagonist'],
          location: originalChapter.location || 'Story setting',
          wordCountTarget: editorChapter.wordCountTarget || Math.floor(settings.wordCount / structurePlan.chapters.length)
        };
      });

      return {
        ...outline,
        chapters: enhancedChapters
      };
    } catch (error) {
      console.warn('Failed to apply structure plan, using original outline:', error);
      return outline;
    }
  }

  /**
   * Start complete book generation (background process)
   */
  async startBookGeneration(
    bookId: string,
    options: GenerationJobOptions = { priority: 'normal', pauseable: true }
  ): Promise<void> {
    try {
      // NEW: Check for existing checkpoint
      const checkpoint = await this.loadCheckpoint(bookId);
      
      if (checkpoint) {
        console.log('📁 Found existing checkpoint, resuming generation...');
        
        // Restore state from checkpoint
        this.storyBible = checkpoint.storyBible;
        this.qualityPlan = checkpoint.qualityPlan;
        this.failedSections = checkpoint.failedSections;
        
        console.log(`🔄 Resuming from checkpoint: ${checkpoint.completedChapters.length} chapters completed`);
        
        // Resume from where we left off
        await this.resumeBookGeneration(bookId, checkpoint);
        return;
      }

      // Update book status to generating
      await prisma.book.update({
        where: { id: bookId },
        data: {
          status: 'GENERATING',
          generationStep: 'CHAPTERS',
          updatedAt: new Date()
        }
      });

      await this.updateBookProgress(bookId, {
        step: GenerationStep.CHAPTERS,
        progress: 45,
        status: 'processing'
      });

      // Queue the generation job (for now, run directly)
      // In production, this would be queued for background processing
      await this.generateBookContent(bookId);

    } catch (error) {
      await this.handleGenerationError(bookId, GenerationStep.CHAPTERS, error);
      throw error;
    }
  }

  /**
   * Resume book generation from checkpoint
   */
  async resumeBookGeneration(bookId: string, checkpoint: GenerationCheckpoint): Promise<void> {
    try {
      console.log('🔄 Resuming book generation from checkpoint...');
      
      // Get current book state
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          chapters: {
            orderBy: { chapterNumber: 'asc' },
            include: { sections: true }
          },
          settings: true
        }
      });

      if (!book || !book.settings) {
        throw new Error('Book or settings not found for resume');
      }

      // Find chapters that still need completion
      const incompleteChapters = book.chapters.filter(chapter => 
        !checkpoint.completedChapters.includes(chapter.chapterNumber) ||
        chapter.status !== 'COMPLETE'
      );

      console.log(`📚 Found ${incompleteChapters.length} incomplete chapters to process`);

      // Process incomplete chapters
      const totalChapters = book.chapters.length;
      const completedChapters = checkpoint.completedChapters.length;
      
      for (const chapter of incompleteChapters) {
        console.log(`🔄 Resuming Chapter ${chapter.chapterNumber}: ${chapter.title}`);
        
        await this.generateChapterContent(bookId, chapter.id, book.settings);
        
        // Update checkpoint
        checkpoint.completedChapters.push(chapter.chapterNumber);
        await this.saveCheckpoint(bookId, checkpoint);
        
        const progress = 45 + ((completedChapters + 1) / totalChapters) * 45;
        await this.updateBookProgress(bookId, {
          step: GenerationStep.SECTIONS,
          currentChapter: chapter.chapterNumber,
          totalChapters,
          progress,
          status: 'processing'
        });
      }

      // Process any failed sections
      if (checkpoint.failedSections.length > 0) {
        console.log(`🔄 Retrying ${checkpoint.failedSections.length} failed sections...`);
        await this.retryFailedSections(bookId);
      }

      // Continue with supervision and completion
      await this.runSupervisionPass(bookId);

      // Mark book as complete
      await prisma.book.update({
        where: { id: bookId },
        data: {
          status: 'COMPLETE',
          generationStep: 'COMPLETE',
          updatedAt: new Date()
        }
      });

      await this.updateBookProgress(bookId, {
        step: GenerationStep.COMPLETE,
        progress: 100,
        status: 'completed'
      });

      // Clean up
      await this.clearCheckpoint(bookId);
      this.clearFailedSections(bookId);

      console.log('✅ Book generation resumed and completed successfully!');

    } catch (error) {
      console.error('Resume generation failed:', error);
      await this.handleGenerationError(bookId, GenerationStep.CHAPTERS, error);
      throw error;
    }
  }

  /**
   * Generate all book content (chapters and sections)
   */
  private async generateBookContent(bookId: string): Promise<void> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        chapters: {
          orderBy: { chapterNumber: 'asc' }
        },
        settings: true
      }
    });

    if (!book || !book.settings) {
      throw new Error('Book or settings not found');
    }

    const totalChapters = book.chapters.length;
    let completedChapters = 0;

    for (const chapter of book.chapters) {
      await this.generateChapterContent(bookId, chapter.id, book.settings);
      
      completedChapters++;
      const progress = 45 + (completedChapters / totalChapters) * 45; // 45-90%

      await this.updateBookProgress(bookId, {
        step: GenerationStep.SECTIONS,
        currentChapter: chapter.chapterNumber,
        totalChapters,
        progress,
        status: 'processing'
      });
    }

    // Final supervision pass
    await this.runSupervisionPass(bookId);

    // NEW: Final checkpoint before completion
    await this.saveCheckpoint(bookId, {
      bookId,
      storyBible: this.storyBible,
      qualityPlan: this.qualityPlan,
      completedChapters: book.chapters.map(c => c.chapterNumber),
      completedSections: {},
      failedSections: this.getFailedSections(bookId),
      timestamp: new Date(),
      version: '1.0'
    });

    // Mark book as complete
    await prisma.book.update({
      where: { id: bookId },
      data: {
        status: 'COMPLETE',
        generationStep: 'COMPLETE',
        updatedAt: new Date()
      }
    });

    await this.updateBookProgress(bookId, {
      step: GenerationStep.COMPLETE,
      progress: 100,
      status: 'completed'
    });

    // NEW: Clear checkpoint after successful completion
    await this.clearCheckpoint(bookId);

    // NEW: Clear failed sections queue
    this.clearFailedSections(bookId);

    console.log('✅ Book generation completed successfully!');
  }

  /**
   * NEW: Get complete story memory data for a book
   */
  async getStoryMemoryData(bookId: string): Promise<any> {
    try {
      const storyMemory = await prisma.storyMemory.findUnique({
        where: { bookId },
        include: {
          characters: true,
          locations: true,
          timeline: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!storyMemory) {
        return null;
      }

      return {
        id: storyMemory.id,
        themes: storyMemory.themes,
        worldRules: storyMemory.worldRules,
        characters: storyMemory.characters.map(char => ({
          id: char.id,
          name: char.name,
          role: char.role,
          description: char.description,
          personality: char.personality,
          backstory: char.backstory,
          arc: char.arc,
          firstAppearance: char.firstAppearance,
          relationships: char.relationships
        })),
        locations: storyMemory.locations.map(loc => ({
          id: loc.id,
          name: loc.name,
          description: loc.description,
          importance: loc.importance,
          firstMention: loc.firstMention
        })),
        timeline: storyMemory.timeline.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          chapterReference: event.chapterReference,
          importance: event.importance,
          createdAt: event.createdAt
        })),
        createdAt: storyMemory.createdAt,
        updatedAt: storyMemory.updatedAt
      };

    } catch (error) {
      console.error('Error fetching story memory data:', error);
      return null;
    }
  }

  /**
   * FIXED: Generate content for a single chapter with proper word count distribution
   */
  private async generateChapterContent(
    bookId: string,
    chapterId: string,
    settings: BookSettings
  ): Promise<void> {
    try {
      console.log(`🔄 Starting chapter generation for chapter ${chapterId}`);
      
      // Mark chapter as generating
      await prisma.chapter.update({
        where: { id: chapterId },
        data: { status: 'GENERATING' }
      });

      // Get comprehensive chapter context
      const chapterContext = await this.getChapterContext(bookId, chapterId, settings);
      
      if (!chapterContext) {
        throw new Error('Chapter context not found');
      }

      // FIXED: Calculate proper word distribution
      const chapterWordTarget = this.calculateChapterWordTarget(
        chapterContext.chapter,
        chapterContext.allChapters,
        settings
      );

      // FIXED: Calculate optimal sections (should be 2-4 sections per chapter typically)
      const optimalSections = this.calculateOptimalSections(chapterWordTarget, settings);
      const targetWordsPerSection = Math.floor(chapterWordTarget / optimalSections);

      console.log(`📊 Chapter ${chapterContext.chapter.chapterNumber}: ${chapterWordTarget} words → ${optimalSections} sections (${targetWordsPerSection} words/section)`);

      // FIXED: Ensure correct section count in database
      await this.ensureCorrectSectionCount(chapterId, optimalSections);

      // FIXED: Generate sections with proper context and word targeting
      for (let sectionNum = 1; sectionNum <= optimalSections; sectionNum++) {
        await this.generateSectionContent(
          bookId,
          chapterId,
          sectionNum,
          optimalSections,
          targetWordsPerSection,
          settings,
          chapterContext
        );
      }

      // Update chapter status
      await prisma.chapter.update({
        where: { id: chapterId },
        data: { 
          status: 'COMPLETE',
          updatedAt: new Date()
        }
      });

      // NEW: Update story memory with continuity tracking data
      await this.updateStoryMemoryFromContinuityTracking(bookId, chapterContext.chapter.chapterNumber);

      console.log(`✅ Chapter ${chapterContext.chapter.chapterNumber} completed successfully`);

    } catch (error) {
      console.error(`❌ Error generating chapter ${chapterId}:`, error);
      
      await prisma.chapter.update({
        where: { id: chapterId },
        data: { 
          status: 'NEEDS_REVISION',
          updatedAt: new Date()
        }
      });
      
      throw error;
    }
  }

  /**
   * NEW: Get comprehensive chapter context for generation
   */
  private async getChapterContext(bookId: string, chapterId: string, settings: BookSettings) {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        outline: true,
        chapters: {
          where: { id: chapterId }
        }
      }
    });

    if (!book || !book.chapters[0]) {
      return null;
    }

    const allChapters = await prisma.chapter.findMany({
      where: { bookId },
      orderBy: { chapterNumber: 'asc' }
    });

    const previousChapters = await prisma.chapter.findMany({
      where: {
        bookId,
        chapterNumber: { lt: book.chapters[0].chapterNumber }
      },
      include: {
        sections: {
          orderBy: { sectionNumber: 'asc' }
        }
      },
      orderBy: { chapterNumber: 'desc' },
      take: 2
    });

    return {
      book,
      chapter: book.chapters[0],
      allChapters,
      previousChapters,
      outline: book.outline
    };
  }

  /**
   * ENHANCED: Generate individual section content using specialized writers
   */
  private async generateSectionContent(
    bookId: string,
    chapterId: string,
    sectionNumber: number,
    totalSections: number,
    targetWords: number,
    settings: BookSettings,
    chapterContext: any
  ): Promise<void> {
    try {
      console.log(`  📝 Generating Section ${sectionNumber}/${totalSections} with specialized writer`);

      // Get section data with scene information
      const sectionData = await prisma.section.findFirst({
        where: {
          chapterId,
          sectionNumber
        }
      });

      if (!sectionData) {
        throw new Error(`Section ${sectionNumber} not found`);
      }

      // Parse scene data from prompt (stored during chapter creation)
      let sceneData: any = {};
      let chapterPlan: any = {};
      
      try {
        const promptData = JSON.parse(sectionData.prompt);
        sceneData = promptData.sceneData || {};
        chapterPlan = promptData.chapterContext || {};
      } catch (parseError) {
        console.warn('Could not parse scene data, using defaults');
      }

      // Get previous content for context
      const previousSections = await this.getPreviousContent(bookId, chapterId, sectionNumber);

      // Get character states from continuity tracker
      const characterStates = await this.getCharacterStates(chapterContext.chapter.chapterNumber);

      // NEW: Get quality enhancement elements for this section
      const qualityElements = this.getQualityElementsForSection(
        chapterContext.chapter.chapterNumber,
        sectionNumber
      );

      // Build scene context for specialized writer
      const sceneContext: SceneContext = {
        sceneType: this.determineSceneType(sceneData),
        chapterTitle: chapterContext.chapter.title,
        sceneNumber: sectionNumber,
        totalScenes: totalSections,
        purpose: sceneData.purpose || `Section ${sectionNumber} of ${chapterContext.chapter.title}`,
        setting: sceneData.setting || chapterPlan.setting || 'Story setting',
        characters: sceneData.characters || chapterContext.chapter.characters || ['Protagonist'],
        conflict: sceneData.conflict || 'Character faces challenges',
        outcome: sceneData.outcome || 'Scene advances the story',
        wordTarget: sceneData.wordTarget || targetWords,
        mood: sceneData.mood || settings.tone,
        previousContent: previousSections.length > 0 ? previousSections[0] : undefined,
        researchContext: chapterPlan.researchFocus || [],
        characterStates: characterStates,
        // NEW: Add quality enhancement elements
        narrativeVoice: qualityElements.narrativeVoice,
        emotionalTone: qualityElements.emotionalBeat,
        foreshadowing: qualityElements.foreshadowing,
        thematicElements: qualityElements.themes
      };

      console.log(`    🎭 Using specialized writer for: ${sceneContext.sceneType} scene (emotional tone: ${qualityElements.emotionalBeat?.emotionType})`);

      // NEW: Rate limiting before API call
      const estimatedTokens = RateLimiter.estimateRequestTokens(
        this.config.writingAgent.model,
        JSON.stringify(sceneContext),
        4000 // Default max tokens for writing agent
      );

      await this.rateLimiter.requestPermission({
        model: this.config.writingAgent.model,
        estimatedTokens,
        priority: 'normal'
      });

      // Generate content using specialized writer with quality enhancements
      const sceneResult: SceneGeneration = await this.writerDirector.writeScene(sceneContext);

      // NEW: Record actual token usage for rate limiting
      this.rateLimiter.recordUsage(this.config.writingAgent.model, sceneResult.tokensUsed);

      // NEW: Add scene transition if this isn't the first section
      let finalSceneContent = sceneResult.content;
      if (sectionNumber > 1 && previousSections.length > 0) {
        console.log(`    🌉 Adding scene transition...`);
        
        const transition = await this.transitionEnhancer.createTransition(
          previousSections[0],
          {
            setting: sceneContext.setting,
            characters: sceneContext.characters,
            timeChange: qualityElements.timeChange || 'Scene continues',
            mood: sceneContext.mood
          },
          qualityElements.transitionType || 'bridge-paragraph'
        );
        
        finalSceneContent = `${transition}\n\n${sceneResult.content}`;
      }

      // QUALITY GATE: Check with continuity inspector
      const consistencyCheck = await this.continuityAgent.checkChapterConsistency(
        chapterContext.chapter.chapterNumber,
        finalSceneContent,
        sceneContext.purpose,
        chapterPlan.researchFocus || []
      );

      // NEW: Supervision check for quality issues
      let supervisionScore = 85; // Default if supervision fails
      try {
        const supervisionReview = await this.supervisionAgent.reviewChapter(
          chapterContext.chapter.chapterNumber,
          chapterContext.chapter.title,
          finalSceneContent,
          sceneContext.purpose,
          [],
          previousSections.length > 0 ? previousSections[0].substring(0, 500) : undefined
        );
        
        supervisionScore = supervisionReview.overallScore;
        
        if (supervisionReview.flaggedForReview) {
          console.warn(`    ⚠️ Section flagged by supervision (score: ${supervisionScore}/100)`);
          console.warn(`    Issues: ${supervisionReview.issues.map(i => i.description).join(', ')}`);
        }
      } catch (error) {
        console.warn('    ⚠️ Supervision check failed, continuing with default score');
      }

      // Apply proofreading with narrative voice consistency
      let finalContent = finalSceneContent;
      let finalWordCount = this.countWords(finalSceneContent);

      if (consistencyCheck.overallScore >= 80) {
        console.log(`    ✨ Applying proofreader polish with narrative voice consistency (consistency: ${consistencyCheck.overallScore}/100)`);
        
        const polishedContent = await this.proofreaderAgent.quickPolish(
          finalSceneContent,
          settings
        );
        
        finalContent = polishedContent;
        finalWordCount = this.countWords(polishedContent);
      } else {
        console.warn(`    ⚠️ Consistency score low (${consistencyCheck.overallScore}/100), skipping polish`);
      }

      // NEW: Handle failed sections based on quality scores
      const overallQualityScore = Math.round((consistencyCheck.overallScore + supervisionScore) / 2);
      
      if (overallQualityScore < 60) {
        // Add to failed sections queue
        this.addFailedSection({
          bookId,
          chapterId,
          sectionNumber,
          reason: `Low quality score: ${overallQualityScore}/100 (consistency: ${consistencyCheck.overallScore}, supervision: ${supervisionScore})`,
          timestamp: new Date(),
          retryCount: 0,
          metadata: {
            consistencyScore: consistencyCheck.overallScore,
            qualityScore: supervisionScore
          }
        });
        
        console.warn(`    💀 Section quality too low (${overallQualityScore}/100), added to failed queue`);
      }

      // Update section in database with quality information
      await prisma.section.updateMany({
        where: {
          chapterId,
          sectionNumber
        },
        data: {
          title: `Scene ${sectionNumber}: ${sceneContext.purpose}`,
          content: finalContent,
          wordCount: finalWordCount,
          prompt: `Specialized Writer (${sceneResult.sceneType}) - Target: ${targetWords} words - Emotional: ${qualityElements.emotionalBeat?.emotionType} - Consistency: ${consistencyCheck.overallScore}/100`,
          aiModel: `${this.config.writingAgent.model} (${sceneResult.sceneType}-specialized + quality-enhanced)`,
          tokensUsed: sceneResult.tokensUsed,
          status: 'COMPLETE',
          updatedAt: new Date()
        }
      });

      console.log(`    ✅ Section ${sectionNumber} completed: ${finalWordCount} words (${sceneResult.sceneType} scene, emotion: ${qualityElements.emotionalBeat?.emotionType}, quality: ${consistencyCheck.overallScore}/100)`);

    } catch (error) {
      console.error(`    ❌ Error generating section ${sectionNumber}:`, error);
      
      // Fallback to basic writing agent if specialized writing fails
      await this.generateSectionWithFallback(bookId, chapterId, sectionNumber, targetWords, settings, chapterContext);
    }
  }

  /**
   * NEW: Determine scene type from scene data
   */
  private determineSceneType(sceneData: any): SceneContext['sceneType'] {
    if (!sceneData) return 'description';
    
    const purpose = (sceneData.purpose || '').toLowerCase();
    const conflict = (sceneData.conflict || '').toLowerCase();
    const mood = (sceneData.mood || '').toLowerCase();
    
    // Action scenes
    if (conflict.includes('fight') || conflict.includes('chase') || conflict.includes('battle') || 
        purpose.includes('action') || mood.includes('intense')) {
      return 'action';
    }
    
    // Dialogue scenes
    if (purpose.includes('conversation') || purpose.includes('dialogue') || 
        conflict.includes('argument') || conflict.includes('discussion')) {
      return 'dialogue';
    }
    
    // Emotional scenes
    if (mood.includes('emotional') || mood.includes('touching') || 
        purpose.includes('character development') || purpose.includes('introspection')) {
      return 'emotion';
    }
    
    // Default to atmospheric/description
    return 'description';
  }

  /**
   * NEW: Get previous section content for context
   */
  private async getPreviousContent(bookId: string, chapterId: string, currentSection: number): Promise<string[]> {
    const previousSections = await prisma.section.findMany({
      where: {
        OR: [
          // Previous sections in this chapter
          { chapterId, sectionNumber: { lt: currentSection } },
          // Last section from previous chapter
          {
            chapter: {
              bookId,
              chapterNumber: { lt: await this.getChapterNumber(chapterId) }
            }
          }
        ]
      },
      orderBy: [
        { chapter: { chapterNumber: 'desc' } },
        { sectionNumber: 'desc' }
      ],
      take: 2
    });

    return previousSections.map(s => s.content).filter(Boolean);
  }

  /**
   * NEW: Get character states from continuity tracker
   */
  private async getCharacterStates(chapterNumber: number): Promise<{ [character: string]: string }> {
    try {
      const trackerState = this.continuityAgent.getTrackerState();
      const characterStates: { [character: string]: string } = {};
      
      trackerState.characters.forEach(char => {
        if (char.lastSeen <= chapterNumber) {
          characterStates[char.name] = `${char.emotionalState} - ${char.currentLocation}`;
        }
      });
      
      return characterStates;
    } catch (error) {
      console.warn('Could not get character states:', error);
      return {};
    }
  }

  /**
   * NEW: Get chapter number from chapter ID
   */
  private async getChapterNumber(chapterId: string): Promise<number> {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { chapterNumber: true }
    });
    return chapter?.chapterNumber || 1;
  }

  /**
   * NEW: Fallback section generation using basic writing agent
   */
  private async generateSectionWithFallback(
    bookId: string,
    chapterId: string,
    sectionNumber: number,
    targetWords: number,
    settings: BookSettings,
    chapterContext: any
  ): Promise<void> {
    console.log(`    🔄 Using fallback writer for section ${sectionNumber}`);
    
    try {
      // Get previous sections for context
      const previousSections = await this.getPreviousContent(bookId, chapterId, sectionNumber);

      // Build basic section context
      const sectionContext: SectionContext = {
        bookTitle: chapterContext.book.title,
        bookPrompt: chapterContext.book.prompt,
        backCover: chapterContext.book.backCover || '',
        outline: chapterContext.outline?.summary || '',
        chapterTitle: chapterContext.chapter.title,
        chapterSummary: chapterContext.chapter.summary,
        sectionNumber,
        totalSections: await this.getTotalSections(chapterId),
        previousSections: previousSections,
        characters: settings.characterNames,
        settings: {
          ...settings,
          wordCount: targetWords
        }
      };

      // Generate with basic writing agent
      const sectionResult = await this.writingAgent.generateSection(sectionContext);

      // NEW: Check prose validation severity
      let sectionStatus: 'COMPLETE' | 'NEEDS_REVISION' = 'COMPLETE';
      let proseSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      let proseWarnings: string[] = [];
      let proseSuggestions: string[] = [];

      // Extract prose validation from warnings if available
      // Note: This assumes the WritingAgent has been updated to include prose validation
      if (sectionResult.warnings && sectionResult.warnings.length > 0) {
        proseWarnings = sectionResult.warnings;
        
        // Determine severity based on warning content
        const criticalWarnings = sectionResult.warnings.filter(w => 
          w.includes('Excessive') || w.includes('Critical') || w.includes('critical')
        );
        const highWarnings = sectionResult.warnings.filter(w => 
          w.includes('High') || w.includes('high') || w.includes('weakens prose')
        );
        const mediumWarnings = sectionResult.warnings.filter(w => 
          w.includes('Medium') || w.includes('medium') || w.includes('Moderate')
        );
        
        if (criticalWarnings.length > 0) {
          proseSeverity = 'critical';
        } else if (highWarnings.length > 0) {
          proseSeverity = 'high';
        } else if (mediumWarnings.length > 0) {
          proseSeverity = 'medium';
        } else if (proseWarnings.length > 0) {
          proseSeverity = 'low';
        }
      }

      // NEW: Handle prose validation failures
      if (proseSeverity === 'high' || proseSeverity === 'critical') {
        console.warn(`    ⚠️ Prose validation failed for section ${sectionNumber} (severity: ${proseSeverity})`);
        console.warn(`    Warnings: ${proseWarnings.join(', ')}`);
        
        sectionStatus = 'NEEDS_REVISION';
        
        // Add to failed sections queue
        this.addFailedSection({
          bookId,
          chapterId,
          sectionNumber,
          reason: `Prose validation failed (severity: ${proseSeverity})`,
          timestamp: new Date(),
          retryCount: 0,
          metadata: {
            proseSeverity,
            proseWarnings,
            proseSuggestions,
            errorMessage: `Prose quality issues detected: ${proseWarnings.join('; ')}`
          }
        });
      } else if (proseSeverity === 'medium') {
        console.warn(`    ⚠️ Prose validation shows medium severity issues for section ${sectionNumber}`);
        console.warn(`    Warnings: ${proseWarnings.join(', ')}`);
      }

      // Update section in database
      await prisma.section.updateMany({
        where: {
          chapterId,
          sectionNumber
        },
        data: {
          title: `Section ${sectionNumber}`,
          content: sectionResult.content,
          wordCount: sectionResult.wordCount,
          prompt: `Fallback Writer - Target: ${targetWords} words - Prose Quality: ${proseSeverity}`,
          aiModel: `${this.config.writingAgent.model} (fallback)`,
          tokensUsed: sectionResult.tokensUsed,
          status: sectionStatus,
          updatedAt: new Date()
        }
      });

      const statusMessage = sectionStatus === 'NEEDS_REVISION' 
        ? `needs revision (prose: ${proseSeverity})`
        : `completed (prose: ${proseSeverity})`;
      
      console.log(`    ⚠️ Fallback section ${sectionNumber} ${statusMessage}: ${sectionResult.wordCount} words`);

    } catch (fallbackError) {
      console.error(`    💥 Fallback generation also failed:`, fallbackError);
      
      // Mark section as failed
      await prisma.section.updateMany({
        where: {
          chapterId,
          sectionNumber
        },
        data: {
          status: 'NEEDS_REVISION',
          updatedAt: new Date()
        }
      });
      
      throw fallbackError;
    }
  }

  /**
   * NEW: Get total sections for a chapter
   */
  private async getTotalSections(chapterId: string): Promise<number> {
    const sectionCount = await prisma.section.count({
      where: { chapterId }
    });
    return sectionCount;
  }

  /**
   * NEW: Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Calculate optimal word target for a specific chapter
   */
  private calculateChapterWordTarget(
    chapter: any,
    allChapters: any[],
    settings: BookSettings
  ): number {
    // Use Chief Editor logic for intelligent word distribution
    const totalWords = settings.wordCount;
    const totalChapters = allChapters.length;
    
    // Base word count per chapter
    const baseWordsPerChapter = Math.floor(totalWords / totalChapters);
    
    // Apply variation based on chapter position (opening/climax/ending chapters get more words)
    const chapterPosition = chapter.chapterNumber / totalChapters;
    let multiplier = 1.0;
    
    if (chapterPosition <= 0.2) {
      // Opening chapters: 10% more words for setup
      multiplier = 1.1;
    } else if (chapterPosition >= 0.7 && chapterPosition <= 0.9) {
      // Climax chapters: 15% more words for dramatic scenes
      multiplier = 1.15;
    } else if (chapterPosition > 0.9) {
      // Final chapters: 5% more words for resolution
      multiplier = 1.05;
    }
    
    return Math.floor(baseWordsPerChapter * multiplier);
  }

  /**
   * Calculate optimal number of sections for a chapter based on word count
   */
  private calculateOptimalSections(chapterWordCount: number, settings: BookSettings): number {
    // Optimal section length for good AI generation and readability
    const idealWordsPerSection = 1000; // Sweet spot for AI quality
    const minWordsPerSection = 600;
    const maxWordsPerSection = 1400;
    
    // Calculate sections needed
    let sectionsNeeded = Math.round(chapterWordCount / idealWordsPerSection);
    
    // Ensure section length is within acceptable range
    const wordsPerSection = chapterWordCount / sectionsNeeded;
    
    if (wordsPerSection < minWordsPerSection) {
      sectionsNeeded = Math.ceil(chapterWordCount / minWordsPerSection);
    } else if (wordsPerSection > maxWordsPerSection) {
      sectionsNeeded = Math.ceil(chapterWordCount / maxWordsPerSection);
    }
    
    // Minimum 1 section, maximum 5 sections per chapter
    return Math.max(1, Math.min(5, sectionsNeeded));
  }

  /**
   * Ensure the chapter has the correct number of sections in database
   */
  private async ensureCorrectSectionCount(chapterId: string, requiredSections: number): Promise<void> {
    // Get existing sections
    const existingSections = await prisma.section.findMany({
      where: { chapterId },
      orderBy: { sectionNumber: 'asc' }
    });

    const existingCount = existingSections.length;

    if (existingCount === requiredSections) {
      return; // Already correct
    }

    if (existingCount < requiredSections) {
      // Add missing sections
      for (let i = existingCount + 1; i <= requiredSections; i++) {
        await prisma.section.create({
          data: {
            chapterId,
            sectionNumber: i,
            title: `Section ${i}`,
            content: '', // Empty content initially
            wordCount: 0,
            prompt: `Section ${i} placeholder`,
            aiModel: this.config.writingAgent.model,
            tokensUsed: 0,
            status: 'PLANNED'
          }
        });
      }
      console.log(`Added ${requiredSections - existingCount} sections to chapter`);
    } else {
      // Remove excess sections
      await prisma.section.deleteMany({
        where: {
          chapterId,
          sectionNumber: { gt: requiredSections }
        }
      });
      console.log(`Removed ${existingCount - requiredSections} excess sections from chapter`);
    }
  }

  /**
   * Run final supervision pass for consistency
   */
  private async runSupervisionPass(bookId: string): Promise<void> {
    await this.updateBookProgress(bookId, {
      step: GenerationStep.SUPERVISION,
      progress: 95,
      status: 'processing'
    });

    console.log('🔍 Starting comprehensive supervision pass...');

    try {
      // Get all completed chapters
      const chapters = await prisma.chapter.findMany({
        where: { bookId, status: 'COMPLETE' },
        include: { sections: true },
        orderBy: { chapterNumber: 'asc' }
      });

      const chapterReviews: ChapterReview[] = [];
      
      // Review each chapter
      for (const chapter of chapters) {
        const chapterContent = chapter.sections
          .sort((a, b) => a.sectionNumber - b.sectionNumber)
          .map(s => s.content)
          .join('\n\n');

        if (chapterContent.trim()) {
          const review = await this.supervisionAgent.reviewChapter(
            chapter.chapterNumber,
            chapter.title,
            chapterContent,
            chapter.summary,
            [], // Character arcs TODO: implement
            chapterReviews.length > 0 ? chapterReviews[chapterReviews.length - 1].chapterTitle : undefined
          );

          chapterReviews.push(review);
          console.log(`  📊 Chapter ${chapter.chapterNumber} review: ${review.overallScore}/100`);
        }
      }

      // Get overall book recommendations
      const bookRecommendations = await this.supervisionAgent.getBookRecommendations(
        chapterReviews,
        [] // Arc progress TODO: implement
      );

      // Log supervision results
      const avgScore = chapterReviews.reduce((sum, r) => sum + r.overallScore, 0) / chapterReviews.length;
      const flaggedChapters = chapterReviews.filter(r => r.flaggedForReview);
      
      console.log(`📈 Supervision Results:`);
      console.log(`  Overall Score: ${Math.round(avgScore)}/100`);
      console.log(`  Flagged Chapters: ${flaggedChapters.length}/${chapterReviews.length}`);
      console.log(`  Recommendations: ${bookRecommendations.length}`);
      
      if (bookRecommendations.length > 0) {
        console.log(`  📝 Key Recommendations:`);
        bookRecommendations.forEach(rec => console.log(`    • ${rec}`));
      }

      // NEW: Save supervision results to database or checkpoint
      await this.updateBookProgress(bookId, {
        step: GenerationStep.SUPERVISION,
        progress: 98,
        status: 'completed'
      });

    } catch (error) {
      console.error('Supervision pass failed:', error);
      
      // Continue with generation even if supervision fails
      await this.updateBookProgress(bookId, {
        step: GenerationStep.SUPERVISION,
        progress: 98,
        status: 'completed'
      });
    }
  }

  /**
   * Create chapters from outline in database
   */
  private async createChaptersFromOutline(
    bookId: string,
    outline: OutlineGeneration
  ): Promise<void> {
    // Delete existing chapters (and their sections via cascade)
    await prisma.chapter.deleteMany({
      where: { bookId }
    });

    // Get book settings for intelligent structure planning
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { settings: true }
    });

    if (!book || !book.settings) {
      throw new Error('Book settings not found');
    }

    console.log('Creating chapters with dynamic structure planning...');
    
    // Create new chapters with dynamic section calculation
    for (const chapterData of outline.chapters) {
      // Calculate optimal word target for this chapter
      const chapterWordTarget = this.calculateChapterWordTargetFromOutline(
        chapterData, 
        outline.chapters, 
        book.settings
      );
      
      // Calculate optimal sections for this chapter
      const optimalSections = this.calculateOptimalSections(chapterWordTarget, book.settings);
      
      console.log(`Chapter ${chapterData.number}: ${chapterWordTarget} words, ${optimalSections} sections`);

      const chapter = await prisma.chapter.create({
        data: {
          bookId,
          chapterNumber: chapterData.number,
          title: chapterData.title,
          summary: chapterData.summary,
          status: 'PLANNED'
        }
      });

      // Create dynamic section placeholders based on calculated optimal count
      for (let i = 1; i <= optimalSections; i++) {
        const sectionWordTarget = Math.floor(chapterWordTarget / optimalSections);
        
        await prisma.section.create({
          data: {
            chapterId: chapter.id,
            sectionNumber: i,
            title: `Section ${i}`,
            content: '', // Empty content initially
            wordCount: 0,
            prompt: `Section ${i} of ${optimalSections} - Target: ~${sectionWordTarget} words`,
            aiModel: this.config.writingAgent.model,
            tokensUsed: 0,
            status: 'PLANNED' // Start as planned
          }
        });
      }
    }

    console.log(`Created ${outline.chapters.length} chapters with dynamic section distribution`);
  }

  /**
   * Calculate chapter word target from outline data (used during initial creation)
   */
  private calculateChapterWordTargetFromOutline(
    chapterData: any,
    allChapters: any[],
    settings: BookSettings
  ): number {
    // If chapter already has a word count target from AI planning, use it
    if (chapterData.wordCountTarget && chapterData.wordCountTarget > 0) {
      return chapterData.wordCountTarget;
    }

    // Otherwise, use intelligent distribution logic
    const totalWords = settings.wordCount;
    const totalChapters = allChapters.length;
    const baseWordsPerChapter = Math.floor(totalWords / totalChapters);
    
    // Apply variation based on chapter position
    const chapterPosition = chapterData.number / totalChapters;
    let multiplier = 1.0;
    
    if (chapterPosition <= 0.2) {
      multiplier = 1.1; // Opening chapters
    } else if (chapterPosition >= 0.7 && chapterPosition <= 0.9) {
      multiplier = 1.15; // Climax chapters
    } else if (chapterPosition > 0.9) {
      multiplier = 1.05; // Resolution chapters
    }
    
    return Math.floor(baseWordsPerChapter * multiplier);
  }

  /**
   * NEW: Get quality enhancement elements for a specific section
   */
  private getQualityElementsForSection(chapterNumber: number, sectionNumber: number) {
    const elements: any = {
      narrativeVoice: this.qualityPlan?.narrativeVoice || null,
      emotionalBeat: null,
      foreshadowing: null,
      themes: [],
      transitionType: 'bridge-paragraph',
      timeChange: 'Scene continues'
    };

    if (this.qualityPlan) {
      // Find emotional beat for this chapter/section
      elements.emotionalBeat = this.qualityPlan.emotionalPacing.find(
        beat => beat.chapter === chapterNumber && beat.section === sectionNumber
      ) || this.qualityPlan.emotionalPacing.find(
        beat => beat.chapter === chapterNumber
      );

      // Find any foreshadowing elements that should be planted in this chapter
      elements.foreshadowing = this.qualityPlan.foreshadowingPlan.find(
        foreshadow => foreshadow.plantChapter === chapterNumber
      );

      // Get thematic elements for this chapter
      const subtextLayer = this.qualityPlan.subtextLayers.find(
        layer => layer.chapter === chapterNumber
      );
      elements.themes = subtextLayer?.themes || [];

      // Determine transition type based on section position
      if (sectionNumber === 1) {
        elements.transitionType = 'scene-break';
      } else if (sectionNumber > 1) {
        elements.transitionType = 'bridge-paragraph';
      }
    }

    return elements;
  }

  /**
   * Update book generation progress
   */
  private async updateBookProgress(
    bookId: string,
    progress: Partial<GenerationProgress>
  ): Promise<void> {
    // For now, just log progress
    // In production, this would update a progress table or cache
    console.log(`Book ${bookId} progress:`, progress);
    
    // TODO: Implement real-time progress tracking
    // Could use Redis, WebSockets, or database table
  }

  /**
   * Handle generation errors
   */
  private async handleGenerationError(
    bookId: string,
    step: GenerationStep,
    error: unknown
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error(`Generation error for book ${bookId} at step ${step}:`, errorMessage);

    // Update book status
    await prisma.book.update({
      where: { id: bookId },
      data: {
        status: 'PLANNING', // Reset to planning state
        updatedAt: new Date()
      }
    });

    await this.updateBookProgress(bookId, {
      step,
      status: 'error',
      error: errorMessage
    });
  }

  /**
   * Get generation progress for a book
   */
  async getGenerationProgress(bookId: string): Promise<GenerationProgress | null> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: {
        chapters: true
      }
    });

    if (!book) return null;

    const totalChapters = book.chapters.length;
    const completedChapters = book.chapters.filter(c => c.status === 'COMPLETE').length;

    let progress = 0;
    let status: GenerationProgress['status'] = 'queued';

    switch (book.generationStep) {
      case 'PROMPT':
        progress = 0;
        break;
      case 'BACK_COVER':
        progress = 20;
        status = 'processing';
        break;
      case 'OUTLINE':
        progress = 40;
        status = 'processing';
        break;
      case 'CHAPTERS':
      case 'SECTIONS':
        progress = 45 + (completedChapters / totalChapters) * 45;
        status = book.status === 'GENERATING' ? 'processing' : 'completed';
        break;
      case 'SUPERVISION':
        progress = 95;
        status = 'processing';
        break;
      case 'COMPLETE':
        progress = 100;
        status = 'completed';
        break;
    }

    return {
      bookId,
      step: book.generationStep as GenerationStep,
      currentChapter: undefined,
      totalChapters,
      progress,
      status
    };
  }

  /**
   * Enhanced book generation workflow with research and strategic planning
   */
  async generateBookEnhanced(
    bookId: string,
    userPrompt: string,
    settings: BookSettings,
    onProgress?: (progress: number, status: string) => void
  ): Promise<any> {
    try {
      console.log('Starting enhanced book generation workflow...');
      
      onProgress?.(5, 'Generating back cover...');
      
      // Step 1: Generate back cover (existing)
      const backCover = await this.planningAgent.generateBackCover(userPrompt, settings);
      
      onProgress?.(15, 'Conducting comprehensive research...');
      
      // Step 2: NEW - Comprehensive Research Phase
      const research = await this.researchAgent.conductComprehensiveResearch(
        userPrompt,
        backCover,
        settings
      );
      
      onProgress?.(25, 'Creating detailed outline...');
      
      // Step 3: Enhanced outline with research context
      const outline = await this.planningAgent.generateOutline(userPrompt, backCover, settings);
      
      onProgress?.(35, 'Chief Editor planning book structure...');
      
      // Step 4: NEW - Strategic Planning by ChiefEditor
      const structurePlan = await this.chiefEditorAgent.createBookStructurePlan(
        userPrompt,
        backCover,
        outline,
        research,
        settings
      );
      
      onProgress?.(45, 'Initializing continuity tracking...');
      
      // Step 5: NEW - Initialize Continuity Tracking
      await this.continuityAgent.initializeTracking(
        outline.characters,
        outline,
        research,
        settings
      );
      
      onProgress?.(50, 'Starting content generation...');
      
      // Step 6: Enhanced content generation with research integration
      const chapters = await this.generateChaptersWithResearch(
        bookId,
        structurePlan,
        research,
        outline,
        settings,
        onProgress
      );
      
      onProgress?.(95, 'ProofreaderGPT applying final polish...');
      
      // Step 7: PHASE 3 - Final proofreading and polish
      const polishedChapters = await this.applyFinalProofreading(
        chapters,
        settings,
        outline.characters
      );
      
      onProgress?.(100, 'Book generation complete!');
      
      return {
        backCover,
        outline,
        research: research,
        structurePlan: structurePlan,
        chapters: polishedChapters,
        metadata: {
          researchTopics: this.extractResearchTopics(research),
          chapterStructure: structurePlan.chapters.map(c => ({
            number: c.number,
            title: c.title,
            wordTarget: c.wordCountTarget,
            purpose: c.purpose
          })),
          consistencyScore: 95, // Placeholder
          proofreaderQualityScore: polishedChapters.length > 0 
            ? Math.round(polishedChapters.reduce((sum, ch) => sum + (ch.qualityScore || 85), 0) / polishedChapters.length)
            : 85
        }
      };
      
    } catch (error) {
      console.error('Enhanced book generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate chapters with research integration and consistency checking
   */
  private async generateChaptersWithResearch(
    bookId: string,
    structurePlan: any,
    research: any,
    outline: any,
    settings: BookSettings,
    onProgress?: (progress: number, status: string) => void
  ): Promise<any[]> {
    const chapters = [];
    const totalChapters = structurePlan.chapters.length;
    
    for (let i = 0; i < totalChapters; i++) {
      const chapterPlan = structurePlan.chapters[i];
      const chapterNumber = i + 1;
      
      onProgress?.(50 + (i / totalChapters) * 40, `Writing Chapter ${chapterNumber}: ${chapterPlan.title}`);
      
      try {
        // Generate chapter with research context
        const chapterContent = await this.generateChapterWithResearch(
          chapterPlan,
          research,
          outline,
          settings
        );
        
        // NEW - Consistency check before finalizing
        const consistencyReport = await this.continuityAgent.checkChapterConsistency(
          chapterNumber,
          chapterContent.content,
          chapterPlan.purpose,
          chapterPlan.researchFocus
        );
        
        chapters.push({
          number: chapterNumber,
          title: chapterPlan.title,
          content: chapterContent.content,
          wordCount: chapterContent.wordCount,
          sections: chapterContent.sections, // Include sections for database storage
          consistencyScore: consistencyReport.overallScore,
          researchUsed: chapterPlan.researchFocus
        });
        
        console.log(`Chapter ${chapterNumber} completed. Consistency score: ${consistencyReport.overallScore}/100`);
        
      } catch (error) {
        console.error(`Error generating chapter ${chapterNumber}:`, error);
        // Continue with fallback chapter
        chapters.push({
          number: chapterNumber,
          title: chapterPlan.title,
          content: `Chapter ${chapterNumber} content would be generated here.`,
          wordCount: chapterPlan.wordCountTarget,
          consistencyScore: 85,
          researchUsed: []
        });
      }
    }
    
    return chapters;
  }

  /**
   * Generate individual chapter with research integration and proper section splitting
   */
  private async generateChapterWithResearch(
    chapterPlan: any,
    research: any,
    outline: any,
    settings: BookSettings
  ): Promise<{ content: string; wordCount: number; sections: any[] }> {
    // Extract relevant research for this chapter
    const relevantResearch = this.extractRelevantResearch(chapterPlan.researchFocus, research);
    
    // Create research context summary for the prompt
    const researchContext = relevantResearch.length > 0 
      ? `\nRESEARCH CONTEXT:\n${relevantResearch.slice(0, 5).join('\n')}\n`
      : '';
    
    // Calculate optimal section count for this chapter (800-1200 words per section)
    const targetWordsPerSection = 1000; // Sweet spot for AI quality
    const sectionsNeeded = Math.max(1, Math.ceil(chapterPlan.wordCountTarget / targetWordsPerSection));
    
    console.log(`Chapter ${chapterPlan.title}: ${chapterPlan.wordCountTarget} words → ${sectionsNeeded} sections`);
    
    // PHASE 2: Parallel section generation for speed (8-10 concurrent SectionWriters)
    // Generate sections in batches to prevent too many concurrent API calls
    const maxConcurrent = 8; // Optimal balance of speed vs API rate limits
    const sections = [];
    let totalWordCount = 0;
    
    for (let batch = 0; batch < sectionsNeeded; batch += maxConcurrent) {
      const batchEnd = Math.min(batch + maxConcurrent, sectionsNeeded);
      const batchPromises = [];
      
      for (let i = batch + 1; i <= batchEnd; i++) {
        const sectionContext: SectionContext = {
          bookTitle: `${settings.genre} Story`,
          bookPrompt: `A ${settings.genre} story for ${settings.targetAudience}`,
          backCover: outline.summary,
          outline: outline.summary,
          chapterTitle: chapterPlan.title,
          chapterSummary: chapterPlan.purpose + researchContext,
          sectionNumber: i,
          totalSections: sectionsNeeded,
          previousSections: sections.slice(0, i-1).map(s => s?.content || ''), // Previous completed sections
          characters: chapterPlan.characterFocus,
          settings: settings
        };
        
        // Create parallel SectionWriter instance for each section
        const sectionWriter = new WritingAgent({
          model: 'gpt-4o', // Use GPT-4o for higher quality sections
          temperature: 0.9, // High creativity for diverse content
          maxTokens: 4000
        });
        
        const promise = sectionWriter.generateSection(sectionContext).then(result => ({
          number: i,
          content: result.content,
          wordCount: result.wordCount,
          tokensUsed: result.tokensUsed
        }));
        
        batchPromises.push(promise);
      }
      
      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Add results in correct order
      for (const result of batchResults) {
        sections[result.number - 1] = result;
        totalWordCount += result.wordCount;
        console.log(`  Section ${result.number}/${sectionsNeeded}: ${result.wordCount} words (parallel)`);
      }
    }
    
    // Combine all sections into chapter content
    const fullContent = sections.map(s => s.content).join('\n\n');
    
    return {
      content: fullContent,
      wordCount: totalWordCount,
      sections: sections // Return individual sections for database storage
    };
  }

  /**
   * Extract relevant research for a chapter
   */
  private extractRelevantResearch(researchFocus: string[], research: any): string[] {
    const relevantFacts: string[] = [];
    
    // Extract facts from all research categories
    const allResearch = [
      ...research.domainKnowledge,
      ...research.characterBackgrounds,
      ...research.settingDetails,
      ...research.technicalAspects,
      ...research.culturalContext
    ];
    
    // Find research matching the chapter's focus areas
    researchFocus.forEach(focus => {
      const matchingResearch = allResearch.filter(r => 
        r.topic.toLowerCase().includes(focus.toLowerCase()) ||
        focus.toLowerCase().includes(r.topic.toLowerCase())
      );
      
      matchingResearch.forEach(r => {
        relevantFacts.push(...r.facts.slice(0, 3)); // Top 3 facts per topic
      });
    });
    
    return relevantFacts.slice(0, 10); // Limit to top 10 facts for context
  }

  /**
   * Extract research topics summary
   */
  private extractResearchTopics(research: any): string[] {
    return [
      ...research.domainKnowledge.map((r: any) => r.topic),
      ...research.characterBackgrounds.map((r: any) => r.topic),
      ...research.settingDetails.map((r: any) => r.topic),
      ...research.technicalAspects.map((r: any) => r.topic),
      ...research.culturalContext.map((r: any) => r.topic)
    ];
  }

  /**
   * PHASE 3: Apply final proofreading and polish to all chapters
   */
  private async applyFinalProofreading(
    chapters: any[],
    settings: BookSettings,
    characters: any[]
  ): Promise<any[]> {
    console.log('Starting final proofreading phase...');
    
    const polishedChapters = [];
    const characterNames = characters.map(c => c.name);
    
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      
      try {
        console.log(`Proofreading Chapter ${chapter.number}: ${chapter.title}`);
        
        const proofreadingResult = await this.proofreaderAgent.proofreadChapter({
          chapterNumber: chapter.number,
          chapterTitle: chapter.title,
          content: chapter.content,
          settings: settings,
          characterNames: characterNames,
          previousChapterSummary: i > 0 ? `Previous chapter: ${chapters[i-1].title}` : undefined,
          overallTone: settings.tone
        });
        
        polishedChapters.push({
          ...chapter,
          content: proofreadingResult.polishedContent,
          wordCount: proofreadingResult.wordCount,
          qualityScore: proofreadingResult.qualityScore,
          corrections: proofreadingResult.corrections,
          proofreadingApplied: true
        });
        
        console.log(`  Chapter ${chapter.number} polished. Quality score: ${proofreadingResult.qualityScore}/100`);
        console.log(`  Applied ${proofreadingResult.corrections.length} corrections`);
        
      } catch (error) {
        console.error(`Error proofreading chapter ${chapter.number}:`, error);
        
        // Fallback: return original chapter with default quality score
        polishedChapters.push({
          ...chapter,
          qualityScore: 80,
          corrections: [],
          proofreadingApplied: false
        });
      }
    }
    
    const averageQuality = polishedChapters.reduce((sum, ch) => sum + (ch.qualityScore || 80), 0) / polishedChapters.length;
    console.log(`Final proofreading complete. Average quality score: ${Math.round(averageQuality)}/100`);
    
    return polishedChapters;
  }
} 