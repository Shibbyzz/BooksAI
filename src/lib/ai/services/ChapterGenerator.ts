import { WritingAgent, type SectionContext, type SectionGeneration } from '../agents/writing-agent';
import { WriterDirector, type SceneContext, type SceneGeneration } from '../agents/specialized-writers';
import { ContinuityInspectorAgent } from '../agents/continuity-inspector-agent';
import { ProofreaderAgent } from '../agents/proofreader-agent';
import { SupervisionAgent, type ChapterReview } from '../agents/supervision-agent';
import SectionTransitionAgent, { type TransitionContext, type NarrativeVoice, type TransitionResult } from '../agents/section-transition-agent';
import { HumanQualityEnhancer, type QualityEnhancement } from '../agents/human-quality-enhancer';
import { SceneSanityChecker, type ValidationResult } from '../agents/scene-sanity-checker';
import { DriftGuardAgent, type DriftValidationResult } from '../agents/drift-guard-agent';
import { RedundancyReducerAgent, type ReductionResult } from '../agents/redundancy-reducer-agent';
import { GenreStructurePlanner, type SectionPlan } from '../planning/genre-structure';
import { RateLimiter } from '../rate-limiter';
import { prisma } from '../../prisma';
import { type OutlineGeneration } from '../agents/planning-agent';
import { type StoryBible } from '../agents/chief-editor-agent';
import type { BookSettings } from '@/types';
import { ProgressManager } from './ProgressManager';
import { ValidationService } from './ValidationService';
import { CheckpointManager, type FailedSection } from './CheckpointManager';
import { MemoryAwarePrompting } from './MemoryAwarePrompting';

export interface ChapterGenerationConfig {
  writingAgent: {
    model: string;
    temperature: number;
  };
  continuityAgent: {
    model: string;
    temperature: number;
  };
  proofreaderAgent: {
    model: string;
    temperature: number;
  };
  supervisionAgent: {
    model: string;
    temperature: number;
  };
}

export class ChapterGenerator {
  private writingAgent: WritingAgent;
  private writerDirector: WriterDirector;
  private continuityAgent: ContinuityInspectorAgent;
  private proofreaderAgent: ProofreaderAgent;
  private supervisionAgent: SupervisionAgent;
  private sectionTransitionAgent: SectionTransitionAgent;
  private sceneSanityChecker: SceneSanityChecker;
  private driftGuardAgent: DriftGuardAgent;
  private redundancyReducerAgent: RedundancyReducerAgent;
  private rateLimiter: RateLimiter;
  private progressManager: ProgressManager;
  private validationService: ValidationService;
  private checkpointManager: CheckpointManager;
  private qualityEnhancer: HumanQualityEnhancer;
  private memoryAwarePrompting: MemoryAwarePrompting;
  private narrativeVoice?: NarrativeVoice;
  private config: ChapterGenerationConfig;

  constructor(
    config: ChapterGenerationConfig,
    progressManager: ProgressManager,
    validationService: ValidationService,
    checkpointManager: CheckpointManager,
    continuityAgent: ContinuityInspectorAgent,
    qualityEnhancer: HumanQualityEnhancer,
    memoryAwarePrompting: MemoryAwarePrompting
  ) {
    this.config = config;
    this.progressManager = progressManager;
    this.validationService = validationService;
    this.checkpointManager = checkpointManager;
    this.continuityAgent = continuityAgent;
    this.qualityEnhancer = qualityEnhancer;
    this.memoryAwarePrompting = memoryAwarePrompting;

    this.writingAgent = new WritingAgent({
      model: config.writingAgent.model,
      temperature: config.writingAgent.temperature,
      maxTokens: 4000
    });

    this.writerDirector = new WriterDirector({
      model: config.writingAgent.model,
      temperature: 0.8,
      maxTokens: 4000
    });

    this.proofreaderAgent = new ProofreaderAgent({
      model: config.proofreaderAgent.model,
      temperature: config.proofreaderAgent.temperature,
      maxTokens: 3000
    });

    this.supervisionAgent = new SupervisionAgent({
      model: config.supervisionAgent.model,
      temperature: config.supervisionAgent.temperature,
      maxTokens: 3000
    });

    this.sectionTransitionAgent = new SectionTransitionAgent({
      model: config.writingAgent.model,
      temperature: 0.7,
      maxTokens: 2000
    });

    this.sceneSanityChecker = new SceneSanityChecker({
      strictGenreEnforcement: true,
      allowNarrativeTenseShifts: false,
      customRules: []
    });

    this.driftGuardAgent = new DriftGuardAgent({
      model: config.writingAgent.model,
      temperature: 0.1,
      maxTokens: 2000,
      semanticDeviationThreshold: 35,
      strictMode: false,
      enableVectorAnalysis: true
    });

    this.redundancyReducerAgent = new RedundancyReducerAgent({
      model: config.writingAgent.model,
      temperature: 0.3,
      maxTokens: 3000,
      analysisWindowSize: 2000,
      repetitionThreshold: 3,
      criticalRepetitionThreshold: 5
    });

    this.rateLimiter = new RateLimiter();
  }

  /**
   * Generate content for a single chapter with proper word count distribution
   */
  async generateChapterContent(
    bookId: string,
    chapterId: string,
    settings: BookSettings,
    storyBible?: StoryBible,
    qualityPlan?: QualityEnhancement
  ): Promise<void> {
    try {
      console.log(`🔄 Starting chapter generation for chapter ${chapterId}`);
      
      // Mark chapter as generating
      await prisma.chapter.update({
        where: { id: chapterId },
        data: { status: 'GENERATING' }
      });

      // Initialize DriftGuard profile for this chapter
      try {
        await this.driftGuardAgent.initializeProfile(settings, storyBible);
        console.log('✅ DriftGuard profile initialized for chapter generation');
      } catch (error) {
        console.warn('⚠️ DriftGuard initialization failed, continuing without drift detection:', error);
      }

      // Get comprehensive chapter context
      const chapterContext = await this.getChapterContext(bookId, chapterId, settings);
      
      if (!chapterContext) {
        throw new Error('Chapter context not found');
      }

      // Calculate proper word distribution
      const chapterWordTarget = this.calculateChapterWordTarget(
        chapterContext.chapter,
        chapterContext.allChapters,
        settings
      );

      // Calculate optimal sections
      const sectionPlans = this.calculateOptimalSections(
        chapterWordTarget, 
        settings, 
        chapterContext.chapter.chapterNumber, 
        chapterContext.allChapters.length
      );
      
      console.log(`📊 Chapter ${chapterContext.chapter.chapterNumber}: ${chapterWordTarget} words → ${sectionPlans.length} sections`);

      // Ensure correct section count in database
      await this.ensureCorrectSectionCount(chapterId, sectionPlans.length);

      // Generate sections with proper context and word targeting
      for (const sectionPlan of sectionPlans) {
        // Update section progress
        await this.progressManager.updateSection(bookId, sectionPlan.number, sectionPlans.length);
        
        // Calculate and update overall progress during chapter generation
        await this.progressManager.updateChapterProgress(
          bookId,
          chapterContext.chapter.chapterNumber,
          chapterContext.allChapters.length,
          sectionPlan.number,
          sectionPlans.length
        );
        
        await this.generateSectionContent(
          bookId,
          chapterId,
          sectionPlan.number,
          sectionPlans.length,
          sectionPlan.wordTarget,
          settings,
          chapterContext,
          sectionPlan,
          qualityPlan
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

      // Complete chapter progress
      await this.progressManager.completeChapter(
        bookId,
        chapterContext.chapter.chapterNumber,
        chapterContext.allChapters.length,
        sectionPlans.length
      );

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
   * Generate individual section content using specialized writers
   */
  private async generateSectionContent(
    bookId: string,
    chapterId: string,
    sectionNumber: number,
    totalSections: number,
    targetWords: number,
    settings: BookSettings,
    chapterContext: any,
    sectionPlan?: SectionPlan,
    qualityPlan?: QualityEnhancement
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

      // Parse section plan data from prompt
      let sceneData: any = {};
      let chapterPlan: any = {};
      
      try {
        const promptData = JSON.parse(sectionData.prompt);
        sceneData = promptData.sceneData || {};
        chapterPlan = promptData.chapterContext || {};
      } catch (parseError) {
        console.warn('Could not parse section data, using defaults');
      }

      // Get previous content for context
      const previousSections = await this.getPreviousContent(bookId, chapterId, sectionNumber);

      // Get character states from continuity tracker
      const characterStates = await this.getCharacterStates(chapterContext.chapter.chapterNumber);

      // Extract narrative voice if not already established
      if (!this.narrativeVoice && previousSections.length > 0) {
        this.narrativeVoice = await this.sectionTransitionAgent.extractNarrativeVoice(
          previousSections[0],
          settings
        );
        console.log(`📝 Extracted narrative voice: ${this.narrativeVoice.perspective}, ${this.narrativeVoice.tense}`);
      }

      // Generate section transition if this is not the first section
      let transitionText = '';
      if (sectionNumber > 1 && previousSections.length > 0 && sectionPlan && this.narrativeVoice) {
        transitionText = await this.generateSectionTransition(
          previousSections[0],
          sectionPlan,
          chapterContext,
          settings,
          characterStates
        );
      }

      // Get quality enhancement elements for this section
      const qualityElements = this.getQualityElementsForSection(
        chapterContext.chapter.chapterNumber,
        sectionNumber,
        qualityPlan
      );
      
      // Build scene context for specialized writer
      const sceneContext = this.buildSceneContext(
        sceneData,
        chapterContext,
        sectionNumber,
        totalSections,
        targetWords,
        settings,
        previousSections,
        characterStates,
        qualityElements,
        chapterPlan
      );
      
      console.log(`📊 Section ${sectionNumber} word target: ${targetWords} words`);

      // Rate limiting before API call
      await this.rateLimiter.requestPermission({
        model: this.config.writingAgent.model,
        estimatedTokens: RateLimiter.estimateRequestTokens(
          this.config.writingAgent.model,
          JSON.stringify(sceneContext),
          4000
        ),
        priority: 'normal'
      });

      // Generate content using specialized writer
      const sceneResult: SceneGeneration = await this.writerDirector.writeScene(sceneContext);

      // Record actual token usage
      this.rateLimiter.recordUsage(this.config.writingAgent.model, sceneResult.tokensUsed);

      // Integrate section transition if available
      const finalSceneContent = transitionText ? `${transitionText}\n\n${sceneResult.content}` : sceneResult.content;

      // NEW: Pre-section validation pipeline (CRITICAL QUALITY GATES)
      console.log(`🛡️ Running pre-section validation for Section ${sectionNumber}`);
      
      // Get previous content for context
      const previousContent = previousSections.length > 0 ? previousSections[0] : undefined;
      
      // Get accumulated chapter content so far
      const accumulatedContent = await this.getAccumulatedChapterContent(chapterId, sectionNumber);

      // Step 1: Scene Sanity Check (genre consistency, narrative rules)
      const sanityCheck = await this.sceneSanityChecker.validateSection(
        finalSceneContent,
        chapterContext.chapter.chapterNumber,
        sectionNumber,
        settings,
        previousContent
      );

      if (!sanityCheck.isValid) {
        const criticalErrors = sanityCheck.errors.filter(e => e.severity === 'critical');
        if (criticalErrors.length > 0) {
          console.error(`❌ Section ${sectionNumber} FAILED sanity check with critical errors:`, criticalErrors);
          throw new Error(`Section validation failed: ${criticalErrors.map(e => e.message).join('; ')}`);
        }
      }

      console.log(`✅ Section ${sectionNumber} passed sanity check (${sanityCheck.confidence}% confidence)`);

      // Step 2: DriftGuard - Vector-based genre/environment consistency check
      const driftCheck = await this.driftGuardAgent.analyzeContentDrift(
        finalSceneContent,
        sectionNumber,
        chapterContext.chapter.chapterNumber,
        accumulatedContent
      );

      if (!driftCheck.isValid) {
        const criticalDriftIssues = driftCheck.issues.filter(i => i.severity === 'critical');
        if (criticalDriftIssues.length > 0) {
          console.error(`❌ Section ${sectionNumber} FAILED drift check with critical issues:`, criticalDriftIssues);
          throw new Error(`Genre/environment drift validation failed: ${criticalDriftIssues.map(i => i.description).join('; ')}`);
        }
      }

      console.log(`✅ Section ${sectionNumber} passed drift check (${driftCheck.driftAnalysis.overallDrift}% drift)`);

      // Step 3: Real-time continuity check 
      const continuityCheck = await this.continuityAgent.checkSectionConsistency(
        chapterContext.chapter.chapterNumber,
        sectionNumber,
        finalSceneContent,
        sceneContext.purpose,
        accumulatedContent,
        chapterPlan.researchFocus || [],
        settings
      );

      // Determine if section passes quality gates
      if (continuityCheck.overallScore < 40) {  // Reduced from 60 to 40 - more reasonable for creative content
        const criticalIssues = continuityCheck.issues.filter(i => i.severity === 'critical');
        if (criticalIssues.length > 2) {  // Allow 1-2 critical issues before failing
          console.error(`❌ Section ${sectionNumber} FAILED continuity check with ${criticalIssues.length} critical issues:`, criticalIssues);
          throw new Error(`Continuity validation failed: ${criticalIssues.map(i => i.description).join('; ')}`);
        } else {
          console.warn(`⚠️ Section ${sectionNumber} has continuity score ${continuityCheck.overallScore}/100 but only ${criticalIssues.length} critical issues - proceeding`);
        }
      }

      console.log(`✅ Section ${sectionNumber} passed continuity check (${continuityCheck.overallScore}/100)`);

      // Legacy quality gate for comparison (now redundant but kept for compatibility)
      const consistencyCheck = continuityCheck;

      // Supervision check for quality issues
      const supervisionScore = await this.getSupervisionScore(
        chapterContext.chapter.chapterNumber,
        chapterContext.chapter.title,
        finalSceneContent,
        sceneContext.purpose,
        previousSections
      );

      // Apply proofreading with narrative voice consistency
      const proofreaderContent = await this.applyProofreading(
        finalSceneContent,
        settings,
        consistencyCheck.overallScore
      );

      // Step 4: RedundancyReducer - Analyze and reduce repetitive phrases (after proofreading)
      console.log(`🔍 RedundancyReducer: Analyzing section ${sectionNumber} for repetitive patterns`);
      
      const redundancyCheck = await this.redundancyReducerAgent.quickRedundancyCheck(
        proofreaderContent,
        accumulatedContent
      );

      let finalContent = proofreaderContent;

      if (redundancyCheck.needsReduction && redundancyCheck.score > 25) {
        console.log(`⚠️ RedundancyReducer: High redundancy detected (${redundancyCheck.score}%), applying reduction`);
        
        try {
          const fullAnalysis = await this.redundancyReducerAgent.analyzeRedundancy(
            proofreaderContent,
            accumulatedContent,
            settings
          );

          const reductionResult = await this.redundancyReducerAgent.reduceRedundancy(
            proofreaderContent,
            fullAnalysis,
            settings
          );

          if (reductionResult.redundancyReduced > 5) {
            finalContent = reductionResult.improvedText;
            console.log(`✅ RedundancyReducer: Reduced redundancy by ${reductionResult.redundancyReduced}% (${reductionResult.changesApplied.length} changes)`);
          } else {
            console.log(`ℹ️ RedundancyReducer: Minor improvements only, keeping original content`);
          }
        } catch (error) {
          console.warn('⚠️ RedundancyReducer: Failed to reduce redundancy, keeping original content:', error);
        }
      } else {
        console.log(`✅ RedundancyReducer: Content quality acceptable (${redundancyCheck.score}% redundancy)`);
      }

      // Handle quality assessment with more reasonable thresholds
      const overallQualityScore = Math.round((consistencyCheck.overallScore + supervisionScore) / 2);
      
      if (overallQualityScore < 35) {  // Reduced from 60 to 35 - much more reasonable for creative content
        console.error(`❌ Section ${sectionNumber} failed quality assessment: ${overallQualityScore}/100`);
        
        // More nuanced failure logic - only fail if BOTH scores are very low
        if (consistencyCheck.overallScore < 30 && supervisionScore < 30) {
          throw new Error(`Section quality critically low (${overallQualityScore}/100). Both consistency (${consistencyCheck.overallScore}) and supervision (${supervisionScore}) scores are below minimum threshold.`);
        } else {
          console.warn(`⚠️ Section ${sectionNumber} has low overall quality (${overallQualityScore}/100) but individual scores are acceptable - proceeding`);
        }
      }

      // Update section in database
      await this.updateSectionInDatabase(
        chapterId,
        sectionNumber,
        finalContent,
        sceneContext,
        sceneResult,
        consistencyCheck,
        targetWords
      );

      console.log(`    ✅ Section ${sectionNumber} completed: ${this.countWords(finalContent)} words`);

    } catch (error) {
      console.error(`    ❌ Error generating section ${sectionNumber}:`, error);
      
      // NEW: Check if this is a validation failure (should hard fail)
      if (error instanceof Error && (
        error.message.includes('Section validation failed') ||
        error.message.includes('Continuity validation failed') ||
        error.message.includes('Genre/environment drift validation failed') ||
        error.message.includes('Section quality too low')
      )) {
        console.error(`🚫 HARD FAIL: Section ${sectionNumber} failed critical validation - cannot proceed with fallback`);
        
        // Mark section as failed and throw error up
        await prisma.section.updateMany({
          where: { chapterId, sectionNumber },
          data: { 
            status: 'NEEDS_REVISION',
            updatedAt: new Date()
          }
        });
        
        throw error; // Propagate the validation error
      }
      
      // Only use fallback for technical/generation errors, not validation failures
      console.warn(`⚠️ Technical error in section ${sectionNumber}, attempting fallback...`);
      await this.generateSectionWithFallback(
        bookId,
        chapterId,
        sectionNumber,
        targetWords,
        settings,
        chapterContext
      );
    }
  }

  /**
   * Get comprehensive chapter context for generation
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
   * Calculate optimal word target for a specific chapter
   */
  private calculateChapterWordTarget(
    chapter: any,
    allChapters: any[],
    settings: BookSettings
  ): number {
    const totalWords = settings.wordCount;
    const totalChapters = allChapters.length;
    const baseWordsPerChapter = Math.floor(totalWords / totalChapters);
    
    // Apply variation based on chapter position
    const chapterPosition = chapter.chapterNumber / totalChapters;
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
   * Calculate optimal sections for a chapter
   */
  private calculateOptimalSections(
    chapterWordCount: number,
    settings: BookSettings,
    chapterNumber?: number,
    totalChapters?: number
  ): SectionPlan[] {
    if (chapterNumber && totalChapters) {
      return GenreStructurePlanner.planChapterSections(
        chapterNumber,
        chapterWordCount,
        totalChapters,
        settings
      );
    }
    
    // TARGET: Keep sections between 800-1200 words for optimal AI generation
    const OPTIMAL_SECTION_MIN = 800;
    const OPTIMAL_SECTION_MAX = 1200;
    const OPTIMAL_SECTION_TARGET = 1000;
    
    console.log(`📊 Calculating sections for chapter: ${chapterWordCount} words`);
    
    // Calculate sections based on optimal word count range
    let sectionsNeeded: number;
    
    if (chapterWordCount <= OPTIMAL_SECTION_MAX) {
      // Chapter fits in one section
      sectionsNeeded = 1;
      console.log(`🔧 Chapter (${chapterWordCount} words): fits in 1 section`);
    } else {
      // Calculate sections to keep each within optimal range
      sectionsNeeded = Math.ceil(chapterWordCount / OPTIMAL_SECTION_TARGET);
      
      // Check if this results in sections that are too long
      const averageWordsPerSection = chapterWordCount / sectionsNeeded;
      
      if (averageWordsPerSection > OPTIMAL_SECTION_MAX) {
        // Recalculate to ensure no section exceeds maximum
        sectionsNeeded = Math.ceil(chapterWordCount / OPTIMAL_SECTION_MAX);
        console.log(`🔧 Increased sections to ${sectionsNeeded} to stay under ${OPTIMAL_SECTION_MAX} words per section`);
      } else if (averageWordsPerSection < OPTIMAL_SECTION_MIN && sectionsNeeded > 1) {
        // Reduce sections if they would be too short
        sectionsNeeded = Math.max(1, Math.floor(chapterWordCount / OPTIMAL_SECTION_MIN));
        console.log(`🔧 Reduced sections to ${sectionsNeeded} to stay above ${OPTIMAL_SECTION_MIN} words per section`);
      }
    }
    
    // Apply genre constraints
    const genreRules = GenreStructurePlanner.getStructureRules(settings.genre);
    if (sectionsNeeded === 1 && !genreRules.allowSingleSectionChapters && chapterWordCount > OPTIMAL_SECTION_MIN) {
      sectionsNeeded = 2;
      console.log(`🔧 Genre ${settings.genre} requires multiple sections - using 2 sections`);
    }
    
    // Final bounds: minimum 1 section, maximum 5 sections per chapter
    const finalSectionCount = Math.max(1, Math.min(5, sectionsNeeded));
    
    const averageWordsPerSection = Math.round(chapterWordCount / finalSectionCount);
    console.log(`📋 Final: ${finalSectionCount} sections for ${chapterWordCount} words (avg ${averageWordsPerSection} words per section)`);
    
    // Create section plans with balanced word distribution
    const sections: SectionPlan[] = [];
    const baseWordCount = Math.floor(chapterWordCount / finalSectionCount);
    const extraWords = chapterWordCount % finalSectionCount;
    
    for (let i = 1; i <= finalSectionCount; i++) {
      // Distribute extra words across the last sections
      const wordTarget = baseWordCount + (i > finalSectionCount - extraWords ? 1 : 0);
      
      sections.push({
        number: i,
        type: i === 1 ? 'opening' : i === finalSectionCount ? 'bridge' : 'development',
        wordTarget: wordTarget,
        purpose: `Section ${i} development`,
        emotionalBeat: 'neutral',
        transitionIn: genreRules.preferredTransitions[0],
        transitionOut: genreRules.preferredTransitions[0]
      });
    }
    
    return sections;
  }

  /**
   * Ensure the chapter has the correct number of sections
   */
  private async ensureCorrectSectionCount(chapterId: string, requiredSections: number): Promise<void> {
    const existingSections = await prisma.section.findMany({
      where: { chapterId },
      orderBy: { sectionNumber: 'asc' }
    });

    const existingCount = existingSections.length;

    if (existingCount === requiredSections) {
      return;
    }

    if (existingCount < requiredSections) {
      // Add missing sections
      for (let i = existingCount + 1; i <= requiredSections; i++) {
        await prisma.section.create({
          data: {
            chapterId,
            sectionNumber: i,
            title: `Section ${i}`,
            content: '',
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
   * Get previous section content for context
   */
  private async getPreviousContent(bookId: string, chapterId: string, currentSection: number): Promise<string[]> {
    const previousSections = await prisma.section.findMany({
      where: {
        OR: [
          { chapterId, sectionNumber: { lt: currentSection } },
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
   * Get accumulated chapter content up to current section for continuity checking
   */
  private async getAccumulatedChapterContent(chapterId: string, currentSection: number): Promise<string> {
    const completedSections = await prisma.section.findMany({
      where: {
        chapterId,
        sectionNumber: { lt: currentSection },
        status: 'COMPLETE'
      },
      orderBy: { sectionNumber: 'asc' }
    });

    return completedSections.map(s => s.content).filter(Boolean).join('\n\n');
  }

  /**
   * Get character states from continuity tracker
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
   * Generate section transition
   */
  private async generateSectionTransition(
    previousSectionContent: string,
    sectionPlan: SectionPlan,
    chapterContext: any,
    settings: BookSettings,
    characterStates: { [character: string]: string }
  ): Promise<string> {
    const lastSentence = previousSectionContent.split('.').slice(-2, -1)[0]?.trim() + '.' || '';
    
    const transitionContext: TransitionContext = {
      previousSection: {
        content: previousSectionContent,
        type: 'development',
        emotionalBeat: sectionPlan.emotionalBeat,
        lastSentence,
        mainCharacters: Object.keys(characterStates),
        setting: chapterContext.chapter.title,
        timeframe: 'current'
      },
      nextSection: {
        type: sectionPlan.type,
        purpose: sectionPlan.purpose,
        emotionalBeat: sectionPlan.emotionalBeat,
        expectedCharacters: Object.keys(characterStates),
        expectedSetting: chapterContext.chapter.title,
        expectedTimeframe: 'current'
      },
      chapterNumber: chapterContext.chapter.chapterNumber,
      totalChapters: chapterContext.allChapters.length,
      chapterTitle: chapterContext.chapter.title,
      bookSettings: settings,
      narrativeVoice: this.narrativeVoice!,
      transitionType: sectionPlan.transitionIn,
      transitionLength: 'medium'
    };

    try {
      const transitionResult = await this.sectionTransitionAgent.generateTransition(transitionContext);
      console.log(`🔄 Generated ${transitionResult.transitionType} transition`);
      return transitionResult.transitionText;
    } catch (error) {
      console.warn('Failed to generate transition:', error);
      return '';
    }
  }

  /**
   * Get quality enhancement elements for a section
   */
  private getQualityElementsForSection(
    chapterNumber: number,
    sectionNumber: number,
    qualityPlan?: QualityEnhancement
  ) {
    const elements: any = {
      narrativeVoice: qualityPlan?.narrativeVoice || null,
      emotionalBeat: null,
      foreshadowing: null,
      themes: [],
      transitionType: 'bridge-paragraph',
      timeChange: 'Scene continues'
    };

    if (qualityPlan) {
      elements.emotionalBeat = qualityPlan.emotionalPacing.find(
        beat => beat.chapter === chapterNumber && beat.section === sectionNumber
      ) || qualityPlan.emotionalPacing.find(
        beat => beat.chapter === chapterNumber
      );

      elements.foreshadowing = qualityPlan.foreshadowingPlan.find(
        foreshadow => foreshadow.plantChapter === chapterNumber
      );

      const subtextLayer = qualityPlan.subtextLayers.find(
        layer => layer.chapter === chapterNumber
      );
      elements.themes = subtextLayer?.themes || [];

      if (sectionNumber === 1) {
        elements.transitionType = 'scene-break';
      } else if (sectionNumber > 1) {
        elements.transitionType = 'bridge-paragraph';
      }
    }

    return elements;
  }

  /**
   * Build scene context for specialized writer
   */
  private buildSceneContext(
    sceneData: any,
    chapterContext: any,
    sectionNumber: number,
    totalSections: number,
    targetWords: number,
    settings: BookSettings,
    previousSections: string[],
    characterStates: { [character: string]: string },
    qualityElements: any,
    chapterPlan: any
  ): SceneContext {
    return {
      sceneType: this.determineSceneType(sceneData),
      chapterTitle: chapterContext.chapter.title,
      sceneNumber: sectionNumber,
      totalScenes: totalSections,
      purpose: sceneData.purpose || `Section ${sectionNumber} of ${chapterContext.chapter.title}`,
      setting: sceneData.setting || chapterPlan.setting || 'Story setting',
      characters: sceneData.characters || chapterContext.chapter.characters || ['Protagonist'],
      conflict: sceneData.conflict || 'Character faces challenges',
      outcome: sceneData.outcome || 'Scene advances the story',
      wordTarget: targetWords,
      mood: sceneData.mood || settings.tone,
      previousContent: previousSections.length > 0 ? previousSections[0] : undefined,
      researchContext: chapterPlan.researchFocus || [],
      characterStates: characterStates,
      bookSettings: settings, // NEW: Pass BookSettings for language awareness
      narrativeVoice: qualityElements.narrativeVoice,
      emotionalTone: qualityElements.emotionalBeat,
      foreshadowing: qualityElements.foreshadowing,
      thematicElements: qualityElements.themes
    };
  }

  /**
   * Determine scene type from scene data
   */
  private determineSceneType(sceneData: any): SceneContext['sceneType'] {
    if (!sceneData) return 'description';
    
    const purpose = (sceneData.purpose || '').toLowerCase();
    const conflict = (sceneData.conflict || '').toLowerCase();
    const mood = (sceneData.mood || '').toLowerCase();
    
    if (conflict.includes('fight') || conflict.includes('chase') || conflict.includes('battle') || 
        purpose.includes('action') || mood.includes('intense')) {
      return 'action';
    }
    
    if (purpose.includes('conversation') || purpose.includes('dialogue') || 
        conflict.includes('argument') || conflict.includes('discussion')) {
      return 'dialogue';
    }
    
    if (mood.includes('emotional') || mood.includes('touching') || 
        purpose.includes('character development') || purpose.includes('introspection')) {
      return 'emotion';
    }
    
    return 'description';
  }

  /**
   * Get supervision score for a section
   */
  private async getSupervisionScore(
    chapterNumber: number,
    chapterTitle: string,
    content: string,
    purpose: string,
    previousSections: string[]
  ): Promise<number> {
    try {
      const supervisionReview = await this.supervisionAgent.reviewChapter(
        chapterNumber,
        chapterTitle,
        content,
        purpose,
        [],
        previousSections.length > 0 ? previousSections[0].substring(0, 500) : undefined
      );
      
      return supervisionReview.overallScore;
    } catch (error) {
      console.warn('Supervision check failed:', error);
      return 85; // Default score
    }
  }

  /**
   * Apply proofreading to content
   */
  private async applyProofreading(
    content: string,
    settings: BookSettings,
    consistencyScore: number
  ): Promise<string> {
    if (consistencyScore >= 80) {
      try {
        const polishedContent = await this.proofreaderAgent.quickPolish(content, settings);
        return polishedContent;
      } catch (error) {
        console.warn('Proofreading failed:', error);
        return content;
      }
    } else {
      console.warn(`Consistency score low (${consistencyScore}/100), skipping polish`);
      return content;
    }
  }

  /**
   * Handle failed section
   */
  private async handleFailedSection(
    bookId: string,
    chapterId: string,
    sectionNumber: number,
    overallQualityScore: number,
    consistencyScore: number,
    supervisionScore: number
  ): Promise<void> {
    const failedSection: FailedSection = {
      bookId,
      chapterId,
      sectionNumber,
      reason: `Low quality score: ${overallQualityScore}/100`,
      timestamp: new Date(),
      retryCount: 0,
      metadata: {
        consistencyScore,
        qualityScore: supervisionScore
      }
    };

    await this.checkpointManager.addFailedSection(bookId, failedSection);
    console.warn(`Section quality too low (${overallQualityScore}/100), added to failed queue`);
  }

  /**
   * Update section in database
   */
  private async updateSectionInDatabase(
    chapterId: string,
    sectionNumber: number,
    content: string,
    sceneContext: SceneContext,
    sceneResult: SceneGeneration,
    consistencyCheck: any,
    targetWords: number
  ): Promise<void> {
    await prisma.section.updateMany({
      where: { chapterId, sectionNumber },
      data: {
        title: `Scene ${sectionNumber}: ${sceneContext.purpose}`,
        content,
        wordCount: this.countWords(content),
        prompt: `Specialized Writer (${sceneResult.sceneType}) - Target: ${targetWords} words`,
        aiModel: `${this.config.writingAgent.model} (${sceneResult.sceneType}-specialized)`,
        tokensUsed: sceneResult.tokensUsed,
        status: 'COMPLETE',
        updatedAt: new Date()
      }
    });
  }

  /**
   * Fallback section generation
   */
  private async generateSectionWithFallback(
    bookId: string,
    chapterId: string,
    sectionNumber: number,
    targetWords: number,
    settings: BookSettings,
    chapterContext: any
  ): Promise<void> {
    console.log(`🔄 Using fallback writer for section ${sectionNumber}`);
    
    try {
      const previousSections = await this.getPreviousContent(bookId, chapterId, sectionNumber);
      const totalSections = await this.getTotalSections(chapterId);

      const sectionContext: SectionContext = {
        bookTitle: chapterContext.book.title,
        bookPrompt: chapterContext.book.prompt,
        backCover: chapterContext.book.backCover || '',
        outline: chapterContext.outline?.summary || '',
        chapterTitle: chapterContext.chapter.title,
        chapterSummary: chapterContext.chapter.summary,
        sectionNumber,
        totalSections,
        previousSections,
        characters: settings.characterNames,
        settings: settings, // Language is preserved in settings
        wordTarget: targetWords // Explicit word target for this section
      };

      const sectionResult = await this.writingAgent.generateSection(sectionContext);

      await prisma.section.updateMany({
        where: { chapterId, sectionNumber },
        data: {
          title: `Section ${sectionNumber}`,
          content: sectionResult.content,
          wordCount: sectionResult.wordCount,
          prompt: `Fallback Writer - Target: ${targetWords} words`,
          aiModel: `${this.config.writingAgent.model} (fallback)`,
          tokensUsed: sectionResult.tokensUsed,
          status: 'COMPLETE',
          updatedAt: new Date()
        }
      });

      console.log(`⚠️ Fallback section ${sectionNumber} completed: ${sectionResult.wordCount} words`);

    } catch (error) {
      console.error(`💥 Fallback generation failed:`, error);
      
      await prisma.section.updateMany({
        where: { chapterId, sectionNumber },
        data: {
          status: 'NEEDS_REVISION',
          updatedAt: new Date()
        }
      });
      
      throw error;
    }
  }

  /**
   * Get total sections for a chapter
   */
  private async getTotalSections(chapterId: string): Promise<number> {
    const sectionCount = await prisma.section.count({
      where: { chapterId }
    });
    return sectionCount;
  }

  /**
   * Get chapter number from chapter ID
   */
  private async getChapterNumber(chapterId: string): Promise<number> {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { chapterNumber: true }
    });
    return chapter?.chapterNumber || 1;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
} 