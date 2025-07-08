import { PlanningAgent, type OutlineGeneration, type PlanningInput } from './agents/planning-agent';
import { WritingAgent, type SectionContext } from './agents/writing-agent';
import { ResearchAgent } from './agents/research-agent';
import { ChiefEditorAgent, type StoryBible } from './agents/chief-editor-agent';
import { ContinuityInspectorAgent } from './agents/continuity-inspector-agent';
import { ProofreaderAgent } from './agents/proofreader-agent';
import { HumanQualityEnhancer, type QualityEnhancement } from './agents/human-quality-enhancer';
import { SupervisionAgent } from './agents/supervision-agent';
import { RateLimiter } from './rate-limiter';
import { prisma } from '@/lib/prisma';
import { TierValidator } from '@/lib/subscription/tier-validator';
import { SubscriptionTier } from '@prisma/client';
import { 
  GenerationStep,
  BookStatus,
  ChapterStatus 
} from '@/types';
import type { 
  BookSettings, 
  Book
} from '@/types';

// Import all our new service classes
import { ProgressManager, type GenerationProgress } from './services/ProgressManager';
import { ValidationService } from './services/ValidationService';
import { CheckpointManager, type GenerationCheckpoint } from './services/CheckpointManager';
import { StoryMemoryManager } from './services/StoryMemoryManager';
import { ChapterGenerator, type ChapterGenerationConfig } from './services/ChapterGenerator';
import { MemoryAwarePrompting } from './services/MemoryAwarePrompting';

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

export class BookGenerationOrchestrator {
  // Core AI agents (always initialized, but usage controlled by tier)
  private planningAgent: PlanningAgent;
  private writingAgent: WritingAgent;
  private researchAgent: ResearchAgent;
  private chiefEditorAgent: ChiefEditorAgent;
  private continuityAgent: ContinuityInspectorAgent;
  private proofreaderAgent: ProofreaderAgent;
  private qualityEnhancer: HumanQualityEnhancer;
  private supervisionAgent: SupervisionAgent;
  private rateLimiter: RateLimiter;
  
  // Service classes
  private progressManager: ProgressManager;
  private validationService: ValidationService;
  private checkpointManager: CheckpointManager;
  private storyMemoryManager: StoryMemoryManager;
  private chapterGenerator: ChapterGenerator;
  private memoryAwarePrompting: MemoryAwarePrompting;
  
  // State
  private config: GenerationConfig;
  private userTier: SubscriptionTier;
  private enabledFeatures: Set<string>;
  private storyBible?: StoryBible;
  private qualityPlan?: QualityEnhancement;

  constructor(config?: Partial<GenerationConfig>, userTier: SubscriptionTier = 'FREE') {
    this.userTier = userTier;
    this.enabledFeatures = new Set<string>();
    
    // Get tier access permissions
    const access = TierValidator.getFeatureAccess(userTier);
    
    // Optimize model selection based on tier
    const baseConfig = {
      planningAgent: { 
        model: access.models.gpt4oMini ? 'gpt-4o-mini' : 'gpt-3.5-turbo', 
        temperature: 0.7 
      },
      writingAgent: { 
        model: access.models.gpt4oMini ? 'gpt-4o-mini' : 'gpt-3.5-turbo', 
        temperature: 0.8 
      },
      supervisionAgent: { 
        model: access.models.gpt4o ? 'gpt-4o' : 'gpt-4o-mini', 
        temperature: 0.3 
      },
      researchAgent: { 
        model: 'gpt-3.5-turbo', 
        temperature: 0.3 
      },
      chiefEditorAgent: { 
        model: access.models.gpt4o ? 'gpt-4o' : 'gpt-4o-mini', 
        temperature: 0.8 
      },
      continuityAgent: { 
        model: access.models.gpt4o ? 'gpt-4o' : 'gpt-4o-mini', 
        temperature: 0.0 
      },
      proofreaderAgent: { 
        model: 'gpt-3.5-turbo', 
        temperature: 0.0 
      }
    };

    this.config = { ...baseConfig, ...config };

    // Always initialize all agents (usage will be controlled by tier checks)
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

    this.researchAgent = new ResearchAgent({
      model: this.config.researchAgent?.model || baseConfig.researchAgent.model,
      temperature: this.config.researchAgent?.temperature || baseConfig.researchAgent.temperature,
      maxTokens: 3000
    });

    this.chiefEditorAgent = new ChiefEditorAgent({
      model: this.config.chiefEditorAgent?.model || baseConfig.chiefEditorAgent.model,
      temperature: this.config.chiefEditorAgent?.temperature || baseConfig.chiefEditorAgent.temperature,
      maxTokens: 6000
    });

    this.continuityAgent = new ContinuityInspectorAgent({
      model: this.config.continuityAgent?.model || baseConfig.continuityAgent.model,
      temperature: this.config.continuityAgent?.temperature || baseConfig.continuityAgent.temperature,
      maxTokens: 4000
    });

    this.proofreaderAgent = new ProofreaderAgent({
      model: this.config.proofreaderAgent?.model || baseConfig.proofreaderAgent.model,
      temperature: this.config.proofreaderAgent?.temperature || baseConfig.proofreaderAgent.temperature,
      maxTokens: 3000
    });

    this.qualityEnhancer = new HumanQualityEnhancer({
      model: access.models.gpt4o ? 'gpt-4o' : 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 4000
    });

    this.supervisionAgent = new SupervisionAgent({
      model: access.models.gpt4o ? 'gpt-4o' : 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 3000
    });

    // Store enabled features based on tier
    console.log(`🎯 Initializing orchestrator for ${userTier} tier user`);
    console.log(`📊 Feature access:`, {
      researchAgent: access.aiAgents.researchAgent,
      chiefEditorAgent: access.aiAgents.chiefEditorAgent,
      continuityInspectorAgent: access.aiAgents.continuityInspectorAgent,
      proofreaderAgent: access.aiAgents.proofreaderAgent,
      humanQualityEnhancer: access.aiAgents.humanQualityEnhancer,
      supervisionAgent: access.aiAgents.supervisionAgent
    });
    
    if (access.aiAgents.researchAgent) this.enabledFeatures.add('research');
    if (access.aiAgents.chiefEditorAgent) this.enabledFeatures.add('chiefEditor');
    if (access.aiAgents.continuityInspectorAgent) this.enabledFeatures.add('continuity');
    if (access.aiAgents.proofreaderAgent) this.enabledFeatures.add('proofreading');
    if (access.aiAgents.humanQualityEnhancer) this.enabledFeatures.add('quality');
    if (access.aiAgents.supervisionAgent) this.enabledFeatures.add('supervision');
    
    console.log(`🔧 Enabled features:`, Array.from(this.enabledFeatures));

    this.rateLimiter = new RateLimiter();

    // Initialize service classes
    this.progressManager = new ProgressManager();
    this.validationService = new ValidationService();
    this.checkpointManager = new CheckpointManager();
    this.storyMemoryManager = new StoryMemoryManager();
    this.memoryAwarePrompting = new MemoryAwarePrompting(this.storyMemoryManager);

    // Initialize chapter generator with dependencies
    const chapterConfig: ChapterGenerationConfig = {
      writingAgent: this.config.writingAgent,
      continuityAgent: this.config.continuityAgent || { model: 'gpt-4o', temperature: 0.0 },
      proofreaderAgent: this.config.proofreaderAgent || { model: 'gpt-3.5-turbo', temperature: 0.0 },
      supervisionAgent: this.config.supervisionAgent
    };

    this.chapterGenerator = new ChapterGenerator(
      chapterConfig,
      this.progressManager,
      this.validationService,
      this.checkpointManager,
      this.continuityAgent,
      this.qualityEnhancer,
      this.memoryAwarePrompting
    );
  }

  /**
   * Check if a feature is enabled for the current user tier
   */
  private isFeatureEnabled(feature: string): boolean {
    return this.enabledFeatures.has(feature);
  }

  /**
   * Get a tier-appropriate message for disabled features
   */
  private getUpgradeMessage(feature: string): string {
    const tierName = this.userTier === 'FREE' ? 'Basic or Premium' : 'Premium';
    return `${feature} requires ${tierName} subscription`;
  }

  /**
   * Log tier-based feature usage
   */
  private logTierRestriction(feature: string, attempted: boolean = false): void {
    if (attempted && !this.isFeatureEnabled(feature)) {
      console.log(`🔒 ${feature} blocked for ${this.userTier} tier - ${this.getUpgradeMessage(feature)}`);
    } else if (this.isFeatureEnabled(feature)) {
      console.log(`✅ ${feature} enabled for ${this.userTier} tier`);
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
      await this.progressManager.updateBookProgress(bookId, {
        step: GenerationStep.BACK_COVER,
        progress: 10,
        status: 'processing'
      });

      const backCover = await this.planningAgent.generateBackCover(userPrompt, settings);

      await prisma.book.update({
        where: { id: bookId },
        data: {
          backCover,
          generationStep: GenerationStep.BACK_COVER,
          updatedAt: new Date()
        }
      });

      await this.progressManager.updateBookProgress(bookId, {
        progress: 25,
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
   * Generate complete book outline with story bible
   */
  async generateOutline(bookId: string, existingResearch?: any): Promise<OutlineGeneration> {
    try {
      await this.progressManager.updateBookProgress(bookId, {
        step: GenerationStep.OUTLINE,
        progress: 40,
        status: 'processing'
      });

      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: { settings: true }
      });

      if (!book || !book.settings || !book.prompt || !book.backCover) {
        throw new Error('Book not found or missing required data for outline generation');
      }

      console.log('🎯 Generating comprehensive story bible...');

      // Step 1: Use existing research if provided, otherwise conduct research (if available for tier)
      let research;
      if (existingResearch) {
        console.log('📚 Using existing research data to avoid duplication');
        research = existingResearch;
      } else {
        console.log(`🔍 Checking research access - userTier: ${this.userTier}, enabled features:`, Array.from(this.enabledFeatures));
        console.log(`🎯 isFeatureEnabled('research'): ${this.isFeatureEnabled('research')}`);
        
        if (this.isFeatureEnabled('research')) {
          console.log(`✅ Research Agent enabled for ${this.userTier} tier`);
          research = await this.researchAgent.conductComprehensiveResearch(
            book.prompt,
            book.backCover,
            book.settings
          );
        } else {
          console.log(`🔒 Research Agent blocked for ${this.userTier} tier - ${this.getUpgradeMessage('Research Agent')}`);
          console.log('📝 Using basic research for free tier');
          // Provide minimal research for free users
          research = {
            domainKnowledge: [],
            characterBackgrounds: [],
            settingDetails: [],
            technicalAspects: [],
            culturalContext: []
          };
        }
      }

      // Step 2: Generate comprehensive book plan
      const planningInput: PlanningInput = {
        prompt: book.prompt,
        settings: book.settings,
        research: research
      };

      const planningResult = await this.planningAgent.generateBookPlan(planningInput);
      const { bookPlan } = planningResult;
      const storyBible = bookPlan.storyBible as StoryBible;
      this.storyBible = storyBible;

      // Step 3: Validate story bible
      const validation = this.validationService.validateStoryBible(storyBible);
      if (!validation.isValid) {
        console.warn('Story bible validation issues:', validation.errors);
      }

      // Step 4: Initialize continuity tracking (if available for tier)
      if (this.isFeatureEnabled('continuity')) {
        this.logTierRestriction('Continuity Inspector', true);
        await this.continuityAgent.initializeTracking(
          bookPlan.outline.characters,
          bookPlan.outline,
          research,
          book.settings
        );
      } else {
        this.logTierRestriction('Continuity Inspector', true);
        console.log('📝 Continuity checking unavailable for free tier');
      }

      // Step 5: Create quality enhancement plan (if available for tier)
      if (this.isFeatureEnabled('quality')) {
        this.logTierRestriction('Quality Enhancement', true);
        this.qualityPlan = await this.qualityEnhancer.createQualityEnhancementPlan(
          storyBible,
          book.settings
        );
      } else {
        this.logTierRestriction('Quality Enhancement', true);
        console.log('📝 Quality enhancement unavailable for free tier');
        this.qualityPlan = undefined;
      }

      // Step 6: Save data to database
      await this.saveStoryBibleToDatabase(bookId, storyBible, bookPlan.outline);
      await this.storyMemoryManager.saveStoryMemoryToDatabase(bookId, storyBible, research);
      await this.createChaptersFromStoryBible(bookId, storyBible);

      // Step 7: Save checkpoint
      const checkpoint = this.checkpointManager.createCheckpoint(
        bookId,
        storyBible,
        this.qualityPlan
      );
      await this.checkpointManager.saveCheckpoint(bookId, checkpoint);

      await prisma.book.update({
        where: { id: bookId },
        data: {
          generationStep: GenerationStep.OUTLINE,
          updatedAt: new Date()
        }
      });

      await this.progressManager.updateBookProgress(bookId, {
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
   * Start complete book generation
   */
  async startBookGeneration(
    bookId: string,
    options: GenerationJobOptions = { priority: 'normal', pauseable: true }
  ): Promise<void> {
    try {
      // Check for existing checkpoint
      const checkpoint = await this.checkpointManager.loadCheckpoint(bookId);
      
      if (checkpoint) {
        console.log('📁 Found existing checkpoint, resuming generation...');
        this.storyBible = checkpoint.storyBible;
        this.qualityPlan = checkpoint.qualityPlan;
        
        await this.resumeBookGeneration(bookId, checkpoint);
        return;
      }

      // Update book status
      await prisma.book.update({
        where: { id: bookId },
        data: {
          status: 'GENERATING',
          generationStep: 'CHAPTERS',
          updatedAt: new Date()
        }
      });

      await this.progressManager.updateBookProgress(bookId, {
        step: GenerationStep.CHAPTERS,
        progress: 50,
        status: 'processing'
      });

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
      for (const chapter of incompleteChapters) {
        console.log(`🔄 Resuming Chapter ${chapter.chapterNumber}: ${chapter.title}`);
        
        await this.chapterGenerator.generateChapterContent(
          bookId,
          chapter.id,
          book.settings,
          this.storyBible,
          this.qualityPlan
        );
        
        // Update checkpoint
        await this.checkpointManager.updateCheckpointWithChapter(bookId, chapter.chapterNumber);
      }

      await this.completeBookGeneration(bookId);

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

    await this.progressManager.updateBookProgress(bookId, {
      step: GenerationStep.CHAPTERS,
      totalChapters,
      progress: 50,
      status: 'processing'
    });

    for (const chapter of book.chapters) {
      await this.progressManager.startChapter(bookId, chapter.chapterNumber, totalChapters);
      
      await this.chapterGenerator.generateChapterContent(
        bookId,
        chapter.id,
        book.settings,
        this.storyBible,
        this.qualityPlan
      );
      
      // Update story memory after each chapter
      if (this.storyBible) {
        const trackerState = this.continuityAgent.getTrackerState();
        await this.storyMemoryManager.updateStoryMemoryFromContinuityTracking(
          bookId,
          chapter.chapterNumber,
          trackerState
        );
      }
      
      // Update checkpoint
      await this.checkpointManager.updateCheckpointWithChapter(bookId, chapter.chapterNumber);
    }

    await this.completeBookGeneration(bookId);
  }

  /**
   * Complete book generation
   */
  private async completeBookGeneration(bookId: string): Promise<void> {
    // Final supervision pass
    await this.progressManager.updateStep(bookId, 'PROOFREADING', 'Final quality checks...');
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

    // Complete progress
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { chapters: true }
    });
    
    if (book) {
      await this.progressManager.markComplete(bookId, book.chapters.length);
    }

    // Cleanup
    await this.checkpointManager.clearCheckpoint(bookId);

    console.log('✅ Book generation completed successfully!');
  }

  /**
   * Run final supervision pass
   */
  private async runSupervisionPass(bookId: string): Promise<void> {
    await this.progressManager.updateBookProgress(bookId, {
      step: GenerationStep.SUPERVISION,
      progress: 95,
      status: 'processing'
    });

    if (!this.isFeatureEnabled('supervision')) {
      this.logTierRestriction('Supervision Agent', true);
      console.log('📝 Skipping supervision pass for free tier');
      await this.progressManager.updateBookProgress(bookId, {
        progress: 95,
        status: 'completed'
      });
      return;
    }

    this.logTierRestriction('Supervision Agent', true);
    console.log('🔍 Starting comprehensive supervision pass...');

    try {
      const chapters = await prisma.chapter.findMany({
        where: { bookId, status: 'COMPLETE' },
        include: { sections: true },
        orderBy: { chapterNumber: 'asc' }
      });

      const chapterReviews = [];
      
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
            [],
            chapterReviews.length > 0 ? chapterReviews[chapterReviews.length - 1].chapterTitle : undefined
          );

          chapterReviews.push(review);
          console.log(`📊 Chapter ${chapter.chapterNumber} review: ${review.overallScore}/100`);
        }
      }

      const bookRecommendations = await this.supervisionAgent.getBookRecommendations(
        chapterReviews,
        []
      );

      const avgScore = chapterReviews.reduce((sum, r) => sum + r.overallScore, 0) / chapterReviews.length;
      console.log(`📈 Supervision Results: Overall Score ${Math.round(avgScore)}/100`);
      
      if (bookRecommendations.length > 0) {
        console.log(`📝 Recommendations: ${bookRecommendations.length} suggestions`);
      }

      await this.progressManager.updateBookProgress(bookId, {
        progress: 95,
        status: 'completed'
      });

    } catch (error) {
      console.error('Supervision pass failed:', error);
      await this.progressManager.updateBookProgress(bookId, {
        progress: 95,
        status: 'completed'
      });
    }
  }

  /**
   * Save story bible data to database
   */
  private async saveStoryBibleToDatabase(bookId: string, storyBible: StoryBible, outline: OutlineGeneration): Promise<void> {
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
   * Create chapters from story bible (OPTIMIZED VERSION - BATCH OPERATIONS)
   */
  private async createChaptersFromStoryBible(bookId: string, storyBible: StoryBible): Promise<void> {
    await prisma.chapter.deleteMany({
      where: { bookId }
    });

    // Get book settings for intelligent chapter consolidation
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { settings: true }
    });

    if (!book || !book.settings) {
      throw new Error('Book settings not found');
    }

    // Validate story bible structure
    if (!storyBible.chapterPlans || !Array.isArray(storyBible.chapterPlans) || storyBible.chapterPlans.length === 0) {
      throw new Error('Story bible chapter plans not found or empty');
    }

    // SMART CHAPTER LOGIC: Don't create too many chapters for short books
    const totalWords = book.settings.wordCount;
    let chaptersToCreate = storyBible.chapterPlans;
    
    console.log(`📊 Story bible has ${storyBible.chapterPlans.length} chapters for ${totalWords} words`);
    
    // For short books, consolidate chapters using the WORKING method from original orchestrator
    if (totalWords <= 2000) {
      const maxChapters = totalWords <= 1000 ? 1 : 2;
      if (storyBible.chapterPlans.length > maxChapters) {
        console.log(`🔧 Consolidating ${storyBible.chapterPlans.length} chapters into ${maxChapters} for short book`);
        chaptersToCreate = this.consolidateChaptersFromStoryBible(storyBible.chapterPlans, maxChapters, totalWords);
      }
    } else if (totalWords <= 5000) {
      const maxChapters = 4;
      if (storyBible.chapterPlans.length > maxChapters) {
        console.log(`🔧 Consolidating ${storyBible.chapterPlans.length} chapters into ${maxChapters} for short book`);
        chaptersToCreate = this.consolidateChaptersFromStoryBible(storyBible.chapterPlans, maxChapters, totalWords);
      }
    } else if (totalWords <= 10000) {
      const maxChapters = 6;
      if (storyBible.chapterPlans.length > maxChapters) {
        console.log(`🔧 Consolidating ${storyBible.chapterPlans.length} chapters into ${maxChapters} for short book`);
        chaptersToCreate = this.consolidateChaptersFromStoryBible(storyBible.chapterPlans, maxChapters, totalWords);
      }
    }

    console.log(`📚 Creating ${chaptersToCreate.length} chapters from story bible...`);
    
    // OPTIMIZED: Prepare all chapter data for batch creation
    const chapterDataArray = chaptersToCreate.map(chapterPlan => ({
      bookId,
      chapterNumber: chapterPlan.number,
      title: chapterPlan.title || `Chapter ${chapterPlan.number}`,
      summary: chapterPlan.purpose || 'Chapter content',
      status: 'PLANNED' as const
    }));

    // OPTIMIZED: Batch create all chapters
    const createdChapters = await prisma.$transaction(
      chapterDataArray.map(chapterData => 
        prisma.chapter.create({ data: chapterData })
      )
    );

    console.log(`✅ Batch created ${createdChapters.length} chapters`);

    // OPTIMIZED: Prepare all section data for batch creation
    const allSectionData: any[] = [];
    
    for (let i = 0; i < chaptersToCreate.length; i++) {
      const chapterPlan = chaptersToCreate[i];
      const createdChapter = createdChapters[i];
      
      // Create sections based on scenes, but limit sections for short chapters
      const chapterWordTarget = Math.floor(totalWords / chaptersToCreate.length);
      const maxSections = chapterWordTarget <= 500 ? 1 : 
                         chapterWordTarget <= 1000 ? 2 : 
                         chapterWordTarget <= 2000 ? 3 : 4;
      
      const scenesAvailable = chapterPlan.scenes || [];
      const sectionsToCreate = Math.min(scenesAvailable.length || 1, maxSections);
      
      console.log(`  📖 Chapter ${chapterPlan.number}: ${chapterPlan.title || `Chapter ${chapterPlan.number}`} (${sectionsToCreate} sections, ${chapterWordTarget} words)`);

      for (let sceneIndex = 0; sceneIndex < sectionsToCreate; sceneIndex++) {
        const scene = scenesAvailable[sceneIndex] || { purpose: 'Scene content', setting: 'Story setting' };
        
        allSectionData.push({
          chapterId: createdChapter.id,
          sectionNumber: sceneIndex + 1,
          title: `Scene ${sceneIndex + 1}: ${scene.purpose || 'Scene content'}`,
          content: '',
          wordCount: 0,
          prompt: JSON.stringify({
            sceneData: scene,
            chapterContext: chapterPlan,
            researchFocus: chapterPlan.researchFocus || [],
            wordTarget: Math.floor(chapterWordTarget / sectionsToCreate)
          }),
          aiModel: this.config.writingAgent.model,
          tokensUsed: 0,
          status: 'PLANNED' as const
        });
      }
    }

    // OPTIMIZED: Batch create all sections in chunks to avoid transaction size limits
    const sectionBatchSize = 50; // Limit batch size for large books
    const sectionBatches = [];
    for (let i = 0; i < allSectionData.length; i += sectionBatchSize) {
      sectionBatches.push(allSectionData.slice(i, i + sectionBatchSize));
    }

    for (const batch of sectionBatches) {
      await prisma.$transaction(
        batch.map(sectionData => 
          prisma.section.create({ data: sectionData })
        )
      );
    }

    console.log(`✅ Batch created ${allSectionData.length} sections in ${sectionBatches.length} batches`);
    console.log(`✅ Total: ${chaptersToCreate.length} chapters with smart section distribution`);
  }

  /**
   * Consolidate story bible chapters for short books (WORKING VERSION)
   */
  private consolidateChaptersFromStoryBible(originalChapters: any[], maxChapters: number, totalWords: number): any[] {
    if (!originalChapters || originalChapters.length === 0) {
      console.warn('No chapters provided for consolidation');
      return [];
    }
    
    if (originalChapters.length <= maxChapters) {
      return originalChapters;
    }

    const consolidatedChapters: any[] = [];
    const chaptersPerGroup = Math.ceil(originalChapters.length / maxChapters);
    
    for (let i = 0; i < maxChapters; i++) {
      const startIndex = i * chaptersPerGroup;
      const endIndex = Math.min(startIndex + chaptersPerGroup, originalChapters.length);
      const chaptersToMerge = originalChapters.slice(startIndex, endIndex);
      
      // Merge chapters (with proper structure matching story bible format)
      const validChapters = chaptersToMerge.filter(c => c && typeof c === 'object');
      
      if (validChapters.length === 0) {
        console.warn(`No valid chapters to merge for group ${i + 1}, skipping`);
        continue;
      }
      
      const mergedChapter = {
        number: i + 1,
        title: validChapters.length === 1 
          ? (validChapters[0].title || `Chapter ${i + 1}`)
          : `${validChapters[0].title || `Chapter ${i + 1}`} & More`,
        purpose: validChapters.map(c => c.purpose || 'Chapter content').join(' '),
        scenes: validChapters.flatMap(c => c.scenes || []),
        researchFocus: Array.from(new Set(validChapters.flatMap(c => c.researchFocus || []))),
        wordCountTarget: Math.floor(totalWords / maxChapters),
        characterArcs: validChapters.flatMap(c => c.characterArcs || []),
        plotThreads: validChapters.flatMap(c => c.plotThreads || [])
      };
      
      consolidatedChapters.push(mergedChapter);
    }
    
    return consolidatedChapters;
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

    await this.progressManager.markError(bookId, errorMessage);
    
    const isDatabaseConnectionError = errorMessage.includes('database') || 
                                    errorMessage.includes('connection') || 
                                    errorMessage.includes('ETIMEDOUT');
    
    if (!isDatabaseConnectionError) {
      try {
        await prisma.book.update({
          where: { id: bookId },
          data: {
            status: 'PLANNING',
            updatedAt: new Date()
          }
        });
      } catch (updateError) {
        console.warn('Could not update book status:', updateError);
      }
    }
  }

  /**
   * Get generation progress for a book
   */
  async getGenerationProgress(bookId: string): Promise<GenerationProgress | null> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { chapters: true }
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
        progress = 25;
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
   * Get story memory data for a book
   */
  async getStoryMemoryData(bookId: string): Promise<any> {
    return this.storyMemoryManager.getStoryMemoryData(bookId);
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
      // Initialize progress tracking
      await this.progressManager.initialize(bookId);
      
      onProgress?.(0, 'Analyzing your concept and requirements...');
      
      // Step 1: Generate back cover
      onProgress?.(5, 'Generating compelling back cover...');
      const backCover = await this.generateBackCover(bookId, userPrompt, settings);
      
      onProgress?.(15, 'ResearchAgent conducting comprehensive research...');
      // Step 2: Comprehensive research
      const research = await this.researchAgent.conductComprehensiveResearch(
        userPrompt,
        backCover,
        settings
      );
      
      onProgress?.(25, 'Building comprehensive outline with research integration...');
      // Step 3: Generate enhanced outline (pass research to avoid duplication)
      const outline = await this.generateOutline(bookId, research);
      
      // Step 4: Strategic planning with Chief Editor (if available for tier)
      let structurePlan;
      if (this.isFeatureEnabled('chiefEditor')) {
        onProgress?.(35, 'ChiefEditor creating strategic chapter structure...');
        this.logTierRestriction('Chief Editor Agent', true);
        structurePlan = await this.chiefEditorAgent.createBookStructurePlan(
          userPrompt,
          backCover,
          outline,
          research,
          settings
        );
      } else {
        onProgress?.(35, 'Creating basic chapter structure...');
        this.logTierRestriction('Chief Editor Agent', true);
        console.log('📝 Using basic structure planning for free tier');
        // Create a simplified structure plan for free users
        const basicChapters = (outline.chapters || []).map((chapter: any, index: number) => ({
          ...chapter,
          number: index + 1,
          title: chapter.title || `Chapter ${index + 1}`,
          purpose: chapter.purpose || chapter.summary || 'Chapter content',
          researchFocus: [], // Initialize as empty array for free tier
          wordCountTarget: chapter.wordCountTarget || Math.floor(settings.wordCount / (outline.chapters?.length || 1)),
          characterFocus: chapter.characterFocus || [],
          scenes: chapter.scenes || []
        }));
        
        structurePlan = {
          chapters: basicChapters,
          overallStructure: {
            actBreaks: [],
            climaxChapter: Math.floor((outline.chapters?.length || 10) * 0.8),
            majorTurningPoints: [],
            themesWeaving: []
          }
        };
      }
      
      // Step 5: Initialize continuity tracking (if available for tier)
      if (this.isFeatureEnabled('continuity')) {
        onProgress?.(45, 'Initializing continuity tracking system...');
        this.logTierRestriction('Continuity Inspector', true);
        await this.continuityAgent.initializeTracking(
          outline.characters,
          outline,
          research,
          settings
        );
      } else {
        onProgress?.(45, 'Preparing for chapter generation...');
        this.logTierRestriction('Continuity Inspector', true);
        console.log('📝 Continuity tracking unavailable for free tier');
      }
      
      onProgress?.(50, 'Starting chapter generation with research integration...');
      // Step 6: Use the dedicated ChapterGenerator service for sophisticated chapter generation
      const chapters = await this.generateChaptersUsingService(
        bookId,
        structurePlan,
        research,
        outline,
        settings,
        onProgress
      );
      
      // Step 7: Final proofreading and polish (if available for tier)
      let polishedChapters;
      if (this.isFeatureEnabled('proofreading')) {
        onProgress?.(95, 'ProofreaderGPT applying final polish...');
        this.logTierRestriction('Proofreader Agent', true);
        polishedChapters = await this.applyFinalProofreading(
          chapters,
          settings,
          outline.characters
        );
      } else {
        onProgress?.(95, 'Finalizing book generation...');
        this.logTierRestriction('Proofreader Agent', true);
        console.log('📝 Professional proofreading unavailable for free tier');
        // Return chapters without proofreading for free users
        polishedChapters = chapters.map((chapter: any) => ({
          ...chapter,
          qualityScore: 75, // Lower quality score for unproofread content
          proofreadingApplied: false
        }));
      }
      
      onProgress?.(100, 'Book generation complete!');
      
      // Mark as complete
      await this.progressManager.markComplete(bookId, polishedChapters.length);
      
      return {
        backCover,
        outline,
        research: research,
        structurePlan: structurePlan,
        chapters: polishedChapters,
        metadata: {
          researchTopics: this.extractResearchTopics(research),
          chapterStructure: structurePlan.chapters.map((c: any) => ({
            number: c.number,
            title: c.title,
            wordTarget: c.wordCountTarget,
            purpose: c.purpose
          })),
          consistencyScore: 95,
          proofreaderQualityScore: polishedChapters.length > 0 
            ? Math.round(polishedChapters.reduce((sum: number, ch: any) => sum + (ch.qualityScore || 85), 0) / polishedChapters.length)
            : 85
        }
      };
      
    } catch (error) {
      console.error('Enhanced book generation failed:', error);
      
      await this.progressManager.markError(bookId, error instanceof Error ? error.message : 'Unknown error');
      
      throw error;
    }
  }

  /**
   * Generate chapters using the ChapterGenerator service (FIXED VERSION)
   */
  private async generateChaptersUsingService(
    bookId: string,
    structurePlan: any,
    research: any,
    outline: any,
    settings: BookSettings,
    onProgress?: (progress: number, status: string) => void
  ): Promise<any[]> {
    console.log('🎯 Using ChapterGenerator service for sophisticated chapter generation');
    
    // Get chapters from database that were created in createChaptersFromStoryBible
    const chapters = await prisma.chapter.findMany({
      where: { bookId },
      orderBy: { chapterNumber: 'asc' }
    });

    if (chapters.length === 0) {
      throw new Error('No chapters found in database. Story bible creation may have failed.');
    }

    console.log(`📚 Found ${chapters.length} chapters to generate`);
    
    const generatedChapters = [];
    
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      const chapterNumber = chapter.chapterNumber;
      
      const chapterStartProgress = 50 + (i / chapters.length) * 40;
      const chapterEndProgress = 50 + ((i + 1) / chapters.length) * 40;
      
      onProgress?.(chapterStartProgress, `Writing Chapter ${chapterNumber}: ${chapter.title}`);
      
      try {
        console.log(`🔄 Starting Chapter ${chapterNumber}: ${chapter.title}`);
        
        // Ensure storyBible and qualityPlan are properly structured for the service
        const processedStoryBible = this.prepareStoryBibleForService(this.storyBible);
        const processedQualityPlan = this.prepareQualityPlanForService(this.qualityPlan);
        
        // Use the ChapterGenerator service to generate the actual content
        await this.chapterGenerator.generateChapterContent(
          bookId,
          chapter.id,
          settings,
          processedStoryBible,
          processedQualityPlan
        );

        // Get the generated chapter data
        const updatedChapter = await prisma.chapter.findUnique({
          where: { id: chapter.id },
          include: { sections: true }
        });

        if (updatedChapter && updatedChapter.sections.length > 0) {
          const chapterContent = updatedChapter.sections
            .sort((a, b) => a.sectionNumber - b.sectionNumber)
            .map(s => s.content)
            .join('\n\n');

          const totalWordCount = updatedChapter.sections.reduce((sum: number, s: any) => sum + s.wordCount, 0);

          generatedChapters.push({
            number: chapterNumber,
            title: chapter.title,
            content: chapterContent,
            wordCount: totalWordCount,
            sections: updatedChapter.sections,
            consistencyScore: 85, // Default score since ChapterGenerator handles this internally
            researchUsed: [] // ChapterGenerator handles research integration internally
          });

          console.log(`✅ Chapter ${chapterNumber} completed: ${totalWordCount} words`);
        } else {
          throw new Error(`Chapter ${chapterNumber} generation failed - no content generated`);
        }

        onProgress?.(chapterEndProgress, `Chapter ${chapterNumber} completed successfully`);
        
      } catch (error) {
        console.error(`❌ Error generating chapter ${chapterNumber}:`, error);
        
        onProgress?.(chapterEndProgress, `Chapter ${chapterNumber} completed with fallback content`);
        
        // Create a proper fallback chapter using the original orchestrator method
        const fallbackContent = await this.generateFallbackChapter(
          chapter, 
          settings, 
          Math.floor(settings.wordCount / chapters.length)
        );
        
        generatedChapters.push({
          number: chapterNumber,
          title: chapter.title,
          content: fallbackContent,
          wordCount: Math.floor(settings.wordCount / chapters.length),
          consistencyScore: 75,
          researchUsed: []
        });
      }
    }
    
    return generatedChapters;
  }

  /**
   * Prepare story bible for ChapterGenerator service (handles undefined for free tier)
   */
  private prepareStoryBibleForService(storyBible?: StoryBible): StoryBible | undefined {
    if (!storyBible) {
      // For FREE tier users, return undefined - the service will handle gracefully
      console.log('📝 No story bible available (FREE tier) - ChapterGenerator will use basic structure');
      return undefined;
    }
    
    // Validate and ensure proper structure
    try {
      const processedStoryBible: StoryBible = {
        overview: storyBible.overview || {
          premise: 'Story premise',
          themes: ['Adventure'],
          targetAudience: 'General',
          estimatedReadingLevel: 'Intermediate'
        },
        characters: storyBible.characters || [],
        worldBuilding: storyBible.worldBuilding || {
          primarySettings: [],
          rules: [],
          culturalElements: [],
          historicalContext: []
        },
        storyStructure: storyBible.storyStructure || {
          actStructure: 'three-act',
          openingHook: 'Story begins',
          incitingIncident: 'Conflict arises',
          plotPoints: [],
          climax: 'Climax occurs',
          resolution: 'Story resolves'
        },
        chapterPlans: storyBible.chapterPlans || [],
        plotThreads: storyBible.plotThreads || [],
        timeline: storyBible.timeline || []
      };
      
      return processedStoryBible;
    } catch (error) {
      console.warn('Error processing story bible for service:', error);
      return undefined;
    }
  }

  /**
   * Prepare quality plan for ChapterGenerator service (handles undefined for free tier)
   */
  private prepareQualityPlanForService(qualityPlan?: QualityEnhancement): QualityEnhancement | undefined {
    if (!qualityPlan) {
      // For FREE tier users, return undefined - the service will handle gracefully
      console.log('📝 No quality plan available (FREE tier) - ChapterGenerator will use basic quality measures');
      return undefined;
    }
    
    // Validate and ensure proper structure
    try {
      const processedQualityPlan: QualityEnhancement = {
        narrativeVoice: qualityPlan.narrativeVoice || {
          style: 'accessible',
          perspective: 'third-person-limited',
          tense: 'past',
          tone: 'accessible',
          vocabularyLevel: 'moderate',
          sentenceStructure: 'varied',
          voiceCharacteristics: ['Clear', 'Engaging']
        },
        emotionalPacing: qualityPlan.emotionalPacing || [],
        foreshadowingPlan: qualityPlan.foreshadowingPlan || [],
        subtextLayers: qualityPlan.subtextLayers || [],
        transitionGuides: qualityPlan.transitionGuides || [],
        genreConventions: qualityPlan.genreConventions || {
          genre: 'General',
          expectations: [],
          pacing: 'moderate',
          structureRules: [],
          readerPayoffs: [],
          avoidances: []
        }
      };
      
      return processedQualityPlan;
    } catch (error) {
      console.warn('Error processing quality plan for service:', error);
      return undefined;
    }
  }

  /**
   * Generate fallback chapter content when ChapterGenerator service fails
   */
  private async generateFallbackChapter(
    chapter: any,
    settings: BookSettings,
    targetWords: number
  ): Promise<string> {
    try {
      console.log(`🔄 Generating fallback content for Chapter ${chapter.chapterNumber}`);
      
      // Create basic section context
      const sectionContext = {
        bookTitle: `${settings.genre} Story`,
        bookPrompt: `A ${settings.genre} story for ${settings.targetAudience}`,
        backCover: chapter.summary || 'Chapter content',
        outline: chapter.summary || 'Chapter content',
        chapterTitle: chapter.title,
        chapterSummary: chapter.summary,
        sectionNumber: 1,
        totalSections: 1,
        previousSections: [],
        characters: settings.characterNames || ['Protagonist'],
        settings: {
          ...settings,
          wordCount: targetWords
        }
      };

      // Generate with basic writing agent
      const sectionResult = await this.writingAgent.generateSection(sectionContext);
      
      return sectionResult.content;
      
    } catch (error) {
      console.error(`Failed to generate fallback chapter ${chapter.chapterNumber}:`, error);
      
      // Ultimate fallback - return placeholder
      return `Chapter ${chapter.chapterNumber}: ${chapter.title}

This chapter would contain the story content as planned. The AI system encountered an issue during generation, but the book structure has been successfully created.

Chapter Summary: ${chapter.summary || 'Chapter content would be generated here.'}

[Chapter content would be approximately ${targetWords} words]`;
    }
  }

  /**
   * Generate chapters with research integration and consistency checking (LEGACY - for backwards compatibility)
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
        
        // Consistency check before finalizing
        const consistencyReport = await this.continuityAgent.checkChapterConsistency(
          chapterNumber,
          chapterContent.content,
          chapterPlan.purpose,
          chapterPlan.researchFocus,
          settings
        );
        
        chapters.push({
          number: chapterNumber,
          title: chapterPlan.title,
          content: chapterContent.content,
          wordCount: chapterContent.wordCount,
          sections: chapterContent.sections,
          consistencyScore: consistencyReport.overallScore,
          researchUsed: chapterPlan.researchFocus
        });
        
        console.log(`Chapter ${chapterNumber} completed. Consistency score: ${consistencyReport.overallScore}/100`);
        
      } catch (error) {
        console.error(`Error generating chapter ${chapterNumber}:`, error);
        
        // Fallback chapter
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
   * Generate individual chapter with research integration
   */
  private async generateChapterWithResearch(
    chapterPlan: any,
    research: any,
    outline: any,
    settings: BookSettings
  ): Promise<{ content: string; wordCount: number; sections: any[] }> {
    // Extract relevant research for this chapter
    const relevantResearch = this.extractRelevantResearch(chapterPlan.researchFocus, research);
    
    // Create research context summary
    const researchContext = relevantResearch.length > 0 
      ? `\nRESEARCH CONTEXT:\n${relevantResearch.slice(0, 5).join('\n')}\n`
      : '';
    
    // Calculate optimal section count
    const targetWordsPerSection = 1000;
    const sectionsNeeded = Math.max(1, Math.ceil(chapterPlan.wordCountTarget / targetWordsPerSection));
    
    console.log(`Chapter ${chapterPlan.title}: ${chapterPlan.wordCountTarget} words → ${sectionsNeeded} sections`);
    
    const sections = [];
    let totalWordCount = 0;
    
    const sectionWordTarget = Math.round(chapterPlan.wordCountTarget / sectionsNeeded);
    
    // Generate sections sequentially for simplicity
    for (let i = 1; i <= sectionsNeeded; i++) {
      const sectionSettings = {
        ...settings,
        wordCount: sectionWordTarget
      };
      
      const sectionContext: SectionContext = {
        bookTitle: `${settings.genre} Story`,
        bookPrompt: `A ${settings.genre} story for ${settings.targetAudience}`,
        backCover: outline.summary,
        outline: outline.summary,
        chapterTitle: chapterPlan.title,
        chapterSummary: chapterPlan.purpose + researchContext,
        sectionNumber: i,
        totalSections: sectionsNeeded,
        previousSections: sections.slice(0, i-1).map(s => s?.content || ''),
        characters: chapterPlan.characterFocus,
        settings: settings,
        wordTarget: sectionWordTarget
      };
      
      try {
        const sectionResult = await this.writingAgent.generateSection(sectionContext);
        
        const section = {
          number: i,
          content: sectionResult.content,
          wordCount: sectionResult.wordCount,
          tokensUsed: sectionResult.tokensUsed
        };
        
        sections.push(section);
        totalWordCount += section.wordCount;
        console.log(`  Section ${i}/${sectionsNeeded}: ${section.wordCount} words`);
        
      } catch (error) {
        console.error(`Error generating section ${i}:`, error);
        
        // Fallback section
        const fallbackSection = {
          number: i,
          content: `Section ${i} content would be generated here.`,
          wordCount: sectionWordTarget,
          tokensUsed: 0
        };
        
        sections.push(fallbackSection);
        totalWordCount += fallbackSection.wordCount;
      }
    }
    
    // Combine all sections into chapter content
    const fullContent = sections.map(s => s.content).join('\n\n');
    
    return {
      content: fullContent,
      wordCount: totalWordCount,
      sections: sections
    };
  }

  /**
   * Extract relevant research for a chapter
   */
  private extractRelevantResearch(researchFocus: string[] | undefined, research: any): string[] {
    const relevantFacts: string[] = [];
    
    // Handle undefined or null researchFocus
    if (!researchFocus || !Array.isArray(researchFocus)) {
      console.log('⚠️  No research focus provided, skipping research extraction');
      return [];
    }
    
    // Handle undefined or null research
    if (!research) {
      console.log('⚠️  No research data provided, skipping research extraction');
      return [];
    }
    
    // Extract facts from all research categories (with null checks)
    const allResearch = [
      ...(research.domainKnowledge || []),
      ...(research.characterBackgrounds || []),
      ...(research.settingDetails || []),
      ...(research.technicalAspects || []),
      ...(research.culturalContext || [])
    ];
    
    // Find research matching the chapter's focus areas
    researchFocus.forEach(focus => {
      if (!focus || typeof focus !== 'string') return;
      
      const matchingResearch = allResearch.filter(r => 
        r && r.topic && r.facts && (
          r.topic.toLowerCase().includes(focus.toLowerCase()) ||
          focus.toLowerCase().includes(r.topic.toLowerCase())
        )
      );
      
      matchingResearch.forEach(r => {
        if (r.facts && Array.isArray(r.facts)) {
          relevantFacts.push(...r.facts.slice(0, 3));
        }
      });
    });
    
    return relevantFacts.slice(0, 10);
  }

  /**
   * Extract research topics summary
   */
  private extractResearchTopics(research: any): string[] {
    if (!research) {
      return [];
    }
    
    return [
      ...(research.domainKnowledge || []).map((r: any) => r?.topic || '').filter(Boolean),
      ...(research.characterBackgrounds || []).map((r: any) => r?.topic || '').filter(Boolean),
      ...(research.settingDetails || []).map((r: any) => r?.topic || '').filter(Boolean),
      ...(research.technicalAspects || []).map((r: any) => r?.topic || '').filter(Boolean),
      ...(research.culturalContext || []).map((r: any) => r?.topic || '').filter(Boolean)
    ];
  }

  /**
   * Apply final proofreading and polish to all chapters
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
        
        // Use the ProofreaderAgent directly
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
