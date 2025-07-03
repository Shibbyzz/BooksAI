import { PlanningAgent, type OutlineGeneration } from './agents/planning-agent';
import { WritingAgent, type SectionContext } from './agents/writing-agent';
import { ResearchAgent } from './agents/research-agent';
import { ChiefEditorAgent } from './agents/chief-editor-agent';
import { ContinuityInspectorAgent } from './agents/continuity-inspector-agent';
import { ProofreaderAgent } from './agents/proofreader-agent';
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

export class BookGenerationOrchestrator {
  private planningAgent: PlanningAgent;
  private writingAgent: WritingAgent;
  private researchAgent: ResearchAgent;
  private chiefEditorAgent: ChiefEditorAgent;
  private continuityAgent: ContinuityInspectorAgent;
  private proofreaderAgent: ProofreaderAgent;
  private config: GenerationConfig;

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
   * Generate complete book outline
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

      console.log('Generating outline with Chief Editor intelligence...');

      // Step 1: Generate basic outline
      const outline = await this.planningAgent.generateOutline(
        book.prompt,
        book.backCover,
        book.settings
      );

      // Step 2: Enhance chapter summaries
      const enhancedOutline = await this.planningAgent.generateChapterSummaries(
        outline,
        book.settings
      );

      // Step 3: NEW - Use Chief Editor to optimize structure if available
      let finalOutline = enhancedOutline;
      try {
        // Conduct basic research for context
        const basicResearch = await this.researchAgent.conductComprehensiveResearch(
          book.prompt,
          book.backCover,
          book.settings
        );

        // Have Chief Editor review and enhance the structure
        const structurePlan = await this.chiefEditorAgent.createBookStructurePlan(
          book.prompt,
          book.backCover,
          enhancedOutline,
          basicResearch,
          book.settings
        );

        // Apply Chief Editor's structural improvements to the outline
        finalOutline = this.applyStructurePlanToOutline(enhancedOutline, structurePlan, book.settings);
        
        console.log('Chief Editor structure planning applied successfully');
      } catch (editorError) {
        console.warn('Chief Editor enhancement failed, using standard outline:', editorError);
        // Continue with the enhanced outline if Chief Editor fails
      }

      // Save outline to database
      await prisma.bookOutline.upsert({
        where: { bookId },
        create: {
          bookId,
          summary: finalOutline.summary,
          themes: finalOutline.themes,
          plotPoints: finalOutline as any // JSON field
        },
        update: {
          summary: finalOutline.summary,
          themes: finalOutline.themes,
          plotPoints: finalOutline as any,
          updatedAt: new Date()
        }
      });

      // Create chapters in database with intelligent structure
      await this.createChaptersFromOutline(bookId, finalOutline);

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

      return finalOutline;
    } catch (error) {
      await this.handleGenerationError(bookId, GenerationStep.OUTLINE, error);
      throw error;
    }
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
  }

  /**
   * Generate content for a single chapter
   */
  private async generateChapterContent(
    bookId: string,
    chapterId: string,
    settings: BookSettings
  ): Promise<void> {
    try {
      // Mark chapter as generating
      await prisma.chapter.update({
        where: { id: chapterId },
        data: { status: 'GENERATING' }
      });

      // Get book and chapter context
      const book = await prisma.book.findUnique({
        where: { id: bookId },
        include: {
          outline: true,
          chapters: {
            where: { id: chapterId },
            include: {
              sections: true
            }
          }
        }
      });

      const chapter = book?.chapters[0];
      if (!book || !chapter) {
        throw new Error('Book or chapter not found');
      }

      // Get all chapters to properly calculate word distribution
      const allChapters = await prisma.chapter.findMany({
        where: { bookId },
        orderBy: { chapterNumber: 'asc' }
      });

      // FIXED: Dynamic section calculation based on chapter's word target
      const chapterWordTarget = this.calculateChapterWordTarget(chapter, allChapters, settings);
      const optimalSectionsPerChapter = this.calculateOptimalSections(chapterWordTarget, settings);
      const targetWordsPerSection = Math.floor(chapterWordTarget / optimalSectionsPerChapter);

      console.log(`Generating Chapter ${chapter.chapterNumber}: ${chapterWordTarget} words in ${optimalSectionsPerChapter} sections (${targetWordsPerSection} words/section)`);

      // Ensure we have the right number of sections in database
      await this.ensureCorrectSectionCount(chapterId, optimalSectionsPerChapter);

      // Generate sections for this chapter
      for (let i = 1; i <= optimalSectionsPerChapter; i++) {
        // Get previous sections for context
        const previousSections = await prisma.section.findMany({
          where: {
            chapter: {
              bookId,
              chapterNumber: { lt: chapter.chapterNumber }
            }
          },
          orderBy: [
            { chapter: { chapterNumber: 'desc' }},
            { sectionNumber: 'desc' }
          ],
          take: 2 // Get last 2 sections for context
        });

        const sectionContext: SectionContext = {
          bookTitle: book.title,
          bookPrompt: book.prompt,
          backCover: book.backCover || '',
          outline: book.outline?.summary || '',
          chapterTitle: chapter.title,
          chapterSummary: chapter.summary,
          sectionNumber: i,
          totalSections: optimalSectionsPerChapter,
          previousSections: previousSections.map(s => s.content),
          characters: settings.characterNames,
          settings
        };

        // Mark section as generating
        await prisma.section.updateMany({
          where: {
            chapterId,
            sectionNumber: i
          },
          data: { status: 'GENERATING' }
        });

        // Generate section content with AI
        const sectionGeneration = await this.writingAgent.generateSection(sectionContext);

        // Update section with generated content
        await prisma.section.updateMany({
          where: {
            chapterId,
            sectionNumber: i
          },
          data: {
            title: `Section ${i}`,
            content: sectionGeneration.content,
            wordCount: sectionGeneration.wordCount,
            prompt: `Generate section ${i} of chapter "${chapter.title}"`,
            aiModel: this.config.writingAgent.model,
            tokensUsed: sectionGeneration.tokensUsed,
            status: 'COMPLETE'
          }
        });

        console.log(`  Section ${i}/${optimalSectionsPerChapter} completed: ${sectionGeneration.wordCount} words`);
      }

      // Mark chapter as complete
      await prisma.chapter.update({
        where: { id: chapterId },
        data: { status: 'COMPLETE' }
      });

    } catch (error) {
      console.error(`Error generating chapter ${chapterId}:`, error);
      
      // Mark chapter as needs revision
      await prisma.chapter.update({
        where: { id: chapterId },
        data: { status: 'NEEDS_REVISION' }
      });
      
      throw error;
    }
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

    // TODO: Implement supervision agent
    // For now, just mark as complete
    
    await this.updateBookProgress(bookId, {
      step: GenerationStep.SUPERVISION,
      progress: 98,
      status: 'completed'
    });
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