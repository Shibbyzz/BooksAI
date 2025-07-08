import { z } from 'zod';
import { generateAIText } from '@/lib/openai';
import { 
  createBackCoverPrompt, 
  createOutlinePrompt, 
  createRefinementPrompt 
} from '../prompts/planning-prompts';
import { ChiefEditorAgent } from './chief-editor-agent';
import type { BookSettings } from '@/types';
import type { ComprehensiveResearch } from '../validators/research';
import type { BookStructurePlan, StoryBible, ChapterStructure } from './chief-editor-agent';
import { LanguageManager } from '../language/language-utils';
import { LanguagePrompts } from '../language/language-prompts';
import { CharacterNameContinuityAgent } from '../services/CharacterNameContinuityAgent';

// Zod schemas for validation
const PlanningInputSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  settings: z.object({
    id: z.string(),
    bookId: z.string(),
    language: z.string(),
    wordCount: z.number().min(1000).max(200000),
    genre: z.string().min(1),
    targetAudience: z.string().min(1),
    tone: z.string().min(1),
    endingType: z.string().min(1),
    structure: z.string().min(1),
    characterNames: z.array(z.string()),
    inspirationBooks: z.array(z.string()),
    createdAt: z.date(),
    updatedAt: z.date()
  }),
  research: z.object({
    domainKnowledge: z.array(z.any()),
    characterBackgrounds: z.array(z.any()),
    settingDetails: z.array(z.any()),
    technicalAspects: z.array(z.any()),
    culturalContext: z.array(z.any())
  })
});

const CreativeStrategySchema = z.object({
  overallApproach: z.string().min(50),
  pacing: z.string().min(20),
  characterDevelopment: z.string().min(20),
  themeIntegration: z.string().min(20),
  structuralChoices: z.string().min(20),
  researchIntegration: z.string().min(20),
  qualityMeasures: z.array(z.string()).min(3)
});

const BookOutlineSchema = z.object({
  summary: z.string().min(100),
  themes: z.array(z.string()).min(1),
  characters: z.array(z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    description: z.string().min(20),
    arc: z.string().min(20)
  })).min(1),
  chapters: z.array(z.object({
    number: z.number().min(1),
    title: z.string().min(1),
    summary: z.string().min(50),
    keyEvents: z.array(z.string()).min(1),
    characters: z.array(z.string()).min(1),
    location: z.string().min(1),
    wordCountTarget: z.number().min(500)
  })).min(1)
});

const BookPlanSchema = z.object({
  creativeStrategy: CreativeStrategySchema,
  outline: BookOutlineSchema,
  structurePlan: z.object({
    overallStructure: z.object({
      actBreaks: z.array(z.number()),
      climaxChapter: z.number(),
      majorTurningPoints: z.array(z.object({
        chapter: z.number(),
        description: z.string()
      })),
      themesWeaving: z.array(z.object({
        theme: z.string(),
        chapters: z.array(z.number())
      }))
    }),
    chapters: z.array(z.any()),
    researchIntegrationStrategy: z.any(),
    pacingStrategy: z.any(),
    qualityCheckpoints: z.array(z.any())
  }),
  storyBible: z.object({
    overview: z.any(),
    characters: z.array(z.any()),
    worldBuilding: z.any(),
    storyStructure: z.any(),
    chapterPlans: z.array(z.any()),
    plotThreads: z.array(z.any()),
    timeline: z.array(z.any())
  })
});

export type PlanningInput = z.infer<typeof PlanningInputSchema>;
export type CreativeStrategy = z.infer<typeof CreativeStrategySchema>;
export type BookOutline = z.infer<typeof BookOutlineSchema>;
export type BookPlan = z.infer<typeof BookPlanSchema>;

// Backward compatibility exports
export type OutlineGeneration = BookOutline;

export interface PlanningAgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  maxRetries: number;
}

export interface StepRetryCount {
  stepName: string;
  retryCount: number;
  success: boolean;
  error?: string;
}

export interface RetryMetadata {
  totalRetries: number;
  lastError?: string;
  retryDuration: number;
  stepRetries: StepRetryCount[];
}

export interface PlanningResult {
  bookPlan: BookPlan;
  retryMetadata: RetryMetadata;
  debugInfo: {
    strategyPreview: string;
    outlinePreview: string;
    validationPassed: boolean;
  };
}

export class PlanningAgent {
  private config: PlanningAgentConfig;
  private chiefEditor: ChiefEditorAgent;
  private currentStepRetries: StepRetryCount[] = [];
  private languageManager: LanguageManager;
  private languagePrompts: LanguagePrompts;
  private characterNameAgent: CharacterNameContinuityAgent;

  constructor(config?: Partial<PlanningAgentConfig>) {
    this.config = {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 8000,
      maxRetries: 3,
      ...config
    };
    
    this.chiefEditor = new ChiefEditorAgent({
      model: this.config.model,
      temperature: 0.7,
      maxTokens: 8000,
    });
    
    this.languageManager = LanguageManager.getInstance();
    this.languagePrompts = LanguagePrompts.getInstance();
    this.characterNameAgent = new CharacterNameContinuityAgent();
    
    console.log('🎯 PlanningAgent initialized with:', {
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    });
  }

  /**
   * Generate comprehensive book plan with creative strategy and detailed outline
   */
  async generateBookPlan(
    input: PlanningInput
  ): Promise<PlanningResult> {
    const startTime = Date.now();
    this.currentStepRetries = [];
    let lastError: string | undefined;

    try {
      console.log('🎯 Starting book planning process...');
      
      // Validate input
      const validatedInput = this.validateInput(input);
      console.log('✅ Input validation passed');

      // Phase 4: Analyze user prompt for character names and details
      console.log('🔍 Analyzing user prompt for character information...');
      const promptAnalysis = this.characterNameAgent.analyzeUserPrompt(validatedInput.prompt);
      console.log(`📊 Prompt analysis: ${promptAnalysis.promptAnalysis.promptType} prompt with ${promptAnalysis.names.length} names detected`);
      
      // Update settings with extracted character names if not already specified
      if (promptAnalysis.names.length > 0 && (!validatedInput.settings.characterNames || validatedInput.settings.characterNames.length === 0)) {
        console.log(`📝 Auto-detected character names: ${promptAnalysis.names.join(', ')}`);
        validatedInput.settings.characterNames = promptAnalysis.names;
      } else if (promptAnalysis.names.length > 0 && validatedInput.settings.characterNames && validatedInput.settings.characterNames.length > 0) {
        console.log(`📝 User-specified names: ${validatedInput.settings.characterNames.join(', ')}, detected names: ${promptAnalysis.names.join(', ')}`);
      }

      // Generate back cover first
      const backCover = await this.runValidatedStep(
        'Back Cover Generation',
        async () => {
          const cover = await this.generateBackCover(validatedInput.prompt, validatedInput.settings);
          console.log('📖 Back cover generated:', cover.substring(0, 100) + '...');
          return cover;
        },
        z.string().min(50, 'Back cover must be at least 50 characters')
      );

      // Generate creative strategy using ChiefEditorAgent
      const creativeStrategy = await this.runValidatedStep(
        'Creative Strategy Generation',
        async () => {
          const strategy = await this.generateCreativeStrategy(
            validatedInput.prompt,
            backCover,
            validatedInput.settings,
            validatedInput.research
          );
          console.log('🎨 Creative strategy generated:', this.truncateForLog(strategy.overallApproach));
          return strategy;
        },
        CreativeStrategySchema
      );

      // Generate outline using ChiefEditorAgent
      const outline = await this.runValidatedStep(
        'Outline Generation',
        async () => {
          const outlineResult = await this.generateOutlineInternal(
            validatedInput.prompt,
            backCover,
            validatedInput.settings,
            validatedInput.research
          );
          console.log('📋 Outline generated with', outlineResult.chapters.length, 'chapters');
          return outlineResult;
        },
        BookOutlineSchema
      );

      // Generate structure plan using ChiefEditorAgent
      const structurePlan = await this.runValidatedStep(
        'Structure Plan Generation',
        async () => {
          const plan = await this.chiefEditor.createBookStructurePlan(
            validatedInput.prompt,
            backCover,
            outline,
            validatedInput.research,
            validatedInput.settings
          );
          console.log('🏗️ Structure plan created with', plan.chapters.length, 'chapters');
          return plan;
        },
        z.any() // ChiefEditorAgent handles its own validation
      );

      // Generate story bible using ChiefEditorAgent
      const storyBible = await this.runValidatedStep(
        'Story Bible Generation',
        async () => {
          const bible = await this.chiefEditor.createStoryBible(
            validatedInput.prompt,
            backCover,
            outline,
            validatedInput.research,
            validatedInput.settings
          );
          console.log('📚 Story bible created with', bible.characters.length, 'characters');
          return bible;
        },
        z.any() // ChiefEditorAgent handles its own validation
      );

      // Phase 4: Validate character name consistency across all planning stages
      if (validatedInput.settings.characterNames && validatedInput.settings.characterNames.length > 0) {
        console.log('🔍 Validating character name consistency...');
        const nameValidation = this.characterNameAgent.validateNameConsistency(
          validatedInput.settings.characterNames,
          backCover,
          outline.characters,
          storyBible.characters
        );
        
        console.log(`📊 Character name consistency score: ${nameValidation.score}/100`);
        
        if (!nameValidation.isValid) {
          console.warn('⚠️ Character name inconsistencies detected:');
          nameValidation.issues.forEach(issue => {
            console.warn(`  - ${issue.severity.toUpperCase()}: ${issue.recommendation}`);
          });
        } else {
          console.log('✅ Character names are consistent across all planning stages');
        }

        // Log character name mapping for debugging
        const nameMapping = this.characterNameAgent.createNameMapping(
          validatedInput.settings.characterNames,
          backCover,
          outline.characters,
          storyBible.characters
        );
        console.log('📋 Character name mapping:', {
          userSpecified: nameMapping.userSpecifiedNames,
          backCover: nameMapping.backCoverNames,
          outline: nameMapping.outlineNames,
          storyBible: nameMapping.storyBibleNames
        });
      }

      // Assemble and validate final result
      const bookPlan: BookPlan = {
        creativeStrategy,
        outline,
        structurePlan,
        storyBible
      };

      this.validateBookPlan(bookPlan);
      console.log('✅ Book plan validation passed');

      const endTime = Date.now();
      const totalRetries = this.currentStepRetries.reduce((sum, step) => sum + step.retryCount, 0);
      const retryMetadata: RetryMetadata = {
        totalRetries,
        lastError,
        retryDuration: endTime - startTime,
        stepRetries: [...this.currentStepRetries]
      };

      const debugInfo = {
        strategyPreview: this.truncateForLog(creativeStrategy.overallApproach),
        outlinePreview: this.truncateForLog(outline.summary),
        validationPassed: true
      };

      console.log('🎉 Book planning completed successfully');
      console.log(`📊 Total retries: ${totalRetries}, Duration: ${retryMetadata.retryDuration}ms`);

      return {
        bookPlan,
        retryMetadata,
        debugInfo
      };

    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Book planning failed:', lastError);
      
      // Attempt fallback strategy if main planning fails
      try {
        console.log('🔄 Attempting fallback strategy...');
        const { fallbackPlan, fallbackReason } = await this.generateFallbackPlan(input);
        
        const endTime = Date.now();
        const totalRetries = this.currentStepRetries.reduce((sum, step) => sum + step.retryCount, 0);
        const retryMetadata: RetryMetadata = {
          totalRetries: totalRetries + 1,
          lastError: `Fallback used (${fallbackReason}): ${lastError}`,
          retryDuration: endTime - startTime,
          stepRetries: [...this.currentStepRetries]
        };

        const debugInfo = {
          strategyPreview: `Fallback strategy used: ${fallbackReason}`,
          outlinePreview: 'Fallback outline generated',
          validationPassed: true
        };

        console.log(`🆘 Fallback plan generated successfully: ${fallbackReason}`);
        
        return {
          bookPlan: fallbackPlan,
          retryMetadata,
          debugInfo
        };
      } catch (fallbackError) {
        const fallbackErrorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
        console.error('❌ Fallback strategy also failed:', fallbackErrorMessage);
        throw new Error(`Planning failed completely: ${lastError}. Fallback also failed: ${fallbackErrorMessage}`);
      }
    }
  }

  /**
   * Abstract method for running validated steps with retry logic
   */
  private async runValidatedStep<T>(
    stepName: string,
    operation: () => Promise<T>,
    schema: z.ZodSchema<T>
  ): Promise<T> {
    let stepRetryCount = 0;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`🔄 ${stepName} - Attempt ${attempt}/${this.config.maxRetries}`);
        const result = await operation();
        
        // Validate result with schema
        const validatedResult = schema.parse(result);
        
        if (attempt > 1) {
          console.log(`✅ ${stepName} succeeded on attempt ${attempt}`);
        }
        
        // Record successful step
        this.currentStepRetries.push({
          stepName,
          retryCount: stepRetryCount,
          success: true
        });
        
        return validatedResult;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(`Unknown error in ${stepName}: ${error}`);
        stepRetryCount++;
        
        console.warn(`⚠️ ${stepName} attempt ${attempt} failed:`, lastError.message);
        
        if (attempt === this.config.maxRetries) {
          console.error(`❌ ${stepName} failed after ${this.config.maxRetries} attempts, giving up`);
          
          // Record failed step
          this.currentStepRetries.push({
            stepName,
            retryCount: stepRetryCount,
            success: false,
            error: lastError.message
          });
          
          throw new Error(`${stepName} failed: ${lastError.message}`);
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ ${stepName} retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError || new Error(`${stepName} failed after all retries`);
  }

  /**
   * Generate back cover description from user prompt and settings
   */
  async generateBackCover(
    userPrompt: string, 
    settings: BookSettings
  ): Promise<string> {
    try {
      const languageCode = settings.language || 'en';
      const prompt = this.languagePrompts.getBackCoverPrompt(languageCode, userPrompt, settings);
      const adjustedTemperature = this.languageManager.getAdjustedTemperature(languageCode, this.config.temperature);
      
      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: adjustedTemperature,
        maxTokens: this.config.maxTokens,
        system: this.languagePrompts.getPlanningSystemPrompt(languageCode)
      });

      const backCover = response.text.trim();
      
      if (!backCover || backCover.length < 50) {
        throw new Error('Generated back cover is too short or empty');
      }

      // Validate language output
      const languageValidation = this.languageManager.validateLanguageOutput(backCover, languageCode);
      if (!languageValidation.isValid) {
        console.warn(`PlanningAgent: Language validation failed for back cover in ${languageCode}`, languageValidation.warnings);
      }

      return backCover;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error generating Back Cover:', errorMessage);
      throw new Error(`Back Cover generation failed: ${errorMessage}`);
    }
  }

  /**
   * Refine back cover based on user feedback
   */
  async refineBackCover(
    originalPrompt: string,
    currentBackCover: string,
    refinementRequest: string,
    settings: BookSettings
  ): Promise<string> {
    try {
      const languageCode = settings.language || 'en';
      
      // Create language-aware refinement prompt
      const basePrompt = `Refine the following back cover based on the user's feedback:

CURRENT BACK COVER:
${currentBackCover}

USER FEEDBACK:
${refinementRequest}

BOOK DETAILS:
- Genre: ${settings.genre}
- Target Audience: ${settings.targetAudience}
- Tone: ${settings.tone}

REFINEMENT INSTRUCTIONS:
1. Address the specific feedback provided by the user
2. Maintain the compelling nature of the back cover
3. Keep the same genre and tone
4. Ensure the refined version is still 150-300 words
5. Preserve what's working well while improving what the user requested

Generate an improved back cover that incorporates the user's feedback while maintaining quality and appeal.`;

      const languageAdditions = this.languageManager.getContentPromptAdditions(languageCode, settings.genre);
      const prompt = basePrompt + languageAdditions;
      
      const adjustedTemperature = this.languageManager.getAdjustedTemperature(languageCode, this.config.temperature);

      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: adjustedTemperature,
        maxTokens: this.config.maxTokens,
        system: this.languagePrompts.getPlanningSystemPrompt(languageCode)
      });

      const refinedBackCover = response.text.trim();
      
      if (!refinedBackCover || refinedBackCover.length < 50) {
        throw new Error('Failed to refine back cover content');
      }

      // Validate language output
      const languageValidation = this.languageManager.validateLanguageOutput(refinedBackCover, languageCode);
      if (!languageValidation.isValid) {
        console.warn(`PlanningAgent: Language validation failed for refined back cover in ${languageCode}`, languageValidation.warnings);
      }

      return refinedBackCover;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error refining Back Cover:', errorMessage);
      throw new Error(`Back Cover refinement failed: ${errorMessage}`);
    }
  }

  /**
   * Generate creative strategy using ChiefEditorAgent
   */
  private async generateCreativeStrategy(
    userPrompt: string,
    backCover: string,
    settings: BookSettings,
    research: ComprehensiveResearch
  ): Promise<CreativeStrategy> {
    try {
      const prompt = `
Create a comprehensive creative strategy for this book project:

USER PROMPT: ${userPrompt}
BACK COVER: ${backCover}
GENRE: ${settings.genre}
TARGET AUDIENCE: ${settings.targetAudience}
TONE: ${settings.tone}
WORD COUNT: ${settings.wordCount}

Research Available:
- Domain Knowledge: ${research.domainKnowledge.map(r => r.topic).join(', ')}
- Character Backgrounds: ${research.characterBackgrounds.map(r => r.topic).join(', ')}
- Setting Details: ${research.settingDetails.map(r => r.topic).join(', ')}
- Technical Aspects: ${research.technicalAspects.map(r => r.topic).join(', ')}
- Cultural Context: ${research.culturalContext.map(r => r.topic).join(', ')}

Create a creative strategy that includes:
1. Overall Approach (200+ words)
2. Pacing Strategy (100+ words)
3. Character Development Strategy (100+ words)
4. Theme Integration Plan (100+ words)
5. Structural Choices (100+ words)
6. Research Integration Method (100+ words)
7. Quality Measures (at least 3 specific measures)

Respond in JSON format with the following structure:
{
  "overallApproach": "...",
  "pacing": "...",
  "characterDevelopment": "...",
  "themeIntegration": "...",
  "structuralChoices": "...",
  "researchIntegration": "...",
  "qualityMeasures": ["...", "...", "..."]
}`;

      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: 0.6,
        maxTokens: 3000,
        system: 'You are a master storyteller and creative strategist. Create comprehensive strategies for book projects. Always respond with valid JSON only.'
      });

      const strategyData = this.parseJsonResponse(response.text);
      return strategyData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error generating Creative Strategy:', errorMessage);
      throw new Error(`Creative Strategy generation failed: ${errorMessage}`);
    }
  }

  /**
   * DEPRECATED: Use generateBookPlan instead
   * Kept for backward compatibility with existing code
   */
  async generateOutline(
    userPrompt: string,
    backCover: string,
    settings: BookSettings
  ): Promise<BookOutline> {
    try {
      const languageCode = settings.language || 'en';
      const adjustedTemperature = this.languageManager.getAdjustedTemperature(languageCode, 0.6);
      
      const basePrompt = createOutlinePrompt({
        userPrompt,
        settings,
        previousContext: backCover
      });
      
      const languageAdditions = this.languageManager.getContentPromptAdditions(languageCode, settings.genre);
      const prompt = basePrompt + languageAdditions;

      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: adjustedTemperature,
        maxTokens: 6000,
        system: this.languagePrompts.getPlanningSystemPrompt(languageCode)
      });

      const outlineData = this.parseJsonResponse(response.text);
      return outlineData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error generating Outline:', errorMessage);
      throw new Error(`Outline generation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate detailed book outline
   */
  private async generateOutlineInternal(
    userPrompt: string,
    backCover: string,
    settings: BookSettings,
    research: ComprehensiveResearch
  ): Promise<BookOutline> {
    try {
      const languageCode = settings.language || 'en';
      const adjustedTemperature = this.languageManager.getAdjustedTemperature(languageCode, 0.6);
      
      const basePrompt = createOutlinePrompt({
        userPrompt,
        settings,
        previousContext: backCover
      });
      
      const languageAdditions = this.languageManager.getContentPromptAdditions(languageCode, settings.genre);
      const prompt = basePrompt + languageAdditions;

      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: adjustedTemperature,
        maxTokens: 6000,
        system: this.languagePrompts.getPlanningSystemPrompt(languageCode)
      });

      const outlineData = this.parseJsonResponse(response.text);
      return outlineData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error generating Outline:', errorMessage);
      throw new Error(`Outline generation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate fallback plan when main planning fails
   */
  private async generateFallbackPlan(
    input: PlanningInput
  ): Promise<{ fallbackPlan: BookPlan; fallbackReason: string }> {
    const { prompt, settings, research } = input;
    
    console.log('🔧 Generating fallback plan due to main planning failure');
    
    let fallbackReason = 'Unknown failure';
    
    // Determine fallback reason based on step failures
    const failedSteps = this.currentStepRetries.filter(step => !step.success);
    if (failedSteps.length > 0) {
      const failedStepNames = failedSteps.map(step => step.stepName).join(', ');
      fallbackReason = `Failed steps: ${failedStepNames}`;
    }
    
    console.log(`📋 Fallback reason: ${fallbackReason}`);
    
    try {
      // Create minimal viable plan structure
      const creativeStrategy: CreativeStrategy = {
        overallApproach: `A ${settings.genre} story for ${settings.targetAudience} with a ${settings.tone} tone. The story will follow traditional narrative structure with clear character development and thematic elements. This fallback strategy ensures a coherent narrative structure while maintaining genre conventions.`,
        pacing: `Balanced pacing with a strong opening that hooks readers, steady development through the middle acts, and a satisfying conclusion. The story will build tension gradually with appropriate climactic moments.`,
        characterDevelopment: `Characters will grow through conflict and challenge, with clear arcs and motivations. Each character will have distinct voices and realistic development patterns that serve the overall narrative.`,
        themeIntegration: `Themes will be woven naturally through character actions, dialogue, and plot developments. The core themes will emerge organically from the story without being heavy-handed.`,
        structuralChoices: `Traditional three-act structure with clear beginning, middle, and end. The story will follow proven narrative patterns while allowing for creative expression within that framework.`,
        researchIntegration: `Available research will be integrated naturally into the narrative where relevant, adding authenticity and depth without overwhelming the story or disrupting pacing.`,
        qualityMeasures: [
          'Character consistency and development throughout the narrative',
          'Plot coherence and logical progression from scene to scene',
          'Appropriate pacing and tension for the target audience and genre',
          'Thematic integration that enhances rather than detracts from the story',
          'Authentic use of research elements without exposition dumping'
        ]
      };

      const outline: BookOutline = {
        summary: `A ${settings.genre} story that explores themes of growth and challenge while engaging ${settings.targetAudience} readers. The narrative follows a compelling journey that balances character development with plot advancement.`,
        themes: [settings.genre, 'Character Development', 'Personal Growth', 'Conflict Resolution'],
        characters: this.generateFallbackCharacters(settings, prompt),
        chapters: this.generateFallbackChapters(settings)
      };

      // Create comprehensive structure plan and story bible
      const structurePlan: BookStructurePlan = {
        overallStructure: {
          actBreaks: [Math.ceil(outline.chapters.length * 0.25), Math.ceil(outline.chapters.length * 0.75)],
          climaxChapter: Math.ceil(outline.chapters.length * 0.8),
          majorTurningPoints: [
            { chapter: Math.ceil(outline.chapters.length * 0.25), description: 'Inciting incident that launches the main conflict' },
            { chapter: Math.ceil(outline.chapters.length * 0.5), description: 'Midpoint reversal that raises stakes' },
            { chapter: Math.ceil(outline.chapters.length * 0.8), description: 'Climax where main conflict resolves' }
          ],
          themesWeaving: [
            { theme: settings.genre, chapters: Array.from({ length: Math.ceil(outline.chapters.length / 2) }, (_, i) => i + 1) },
            { theme: 'Character Development', chapters: Array.from({ length: outline.chapters.length }, (_, i) => i + 1) }
          ]
        },
                 chapters: outline.chapters.map(chapter => ({
           number: chapter.number,
           title: chapter.title,
           purpose: chapter.number <= outline.chapters.length * 0.25 ? 'Setup' : 
                    chapter.number <= outline.chapters.length * 0.75 ? 'Development' : 'Resolution',
           wordCountTarget: chapter.wordCountTarget,
           researchFocus: [],
           pacingNotes: chapter.number <= outline.chapters.length * 0.25 ? 'Moderate pace for setup' : 
                        chapter.number <= outline.chapters.length * 0.75 ? 'Varied pace for development' : 'Accelerated pace for resolution',
           keyScenes: chapter.keyEvents,
           characterFocus: chapter.characters
         })),
        researchIntegrationStrategy: {
          upfrontResearch: research.domainKnowledge.map(r => r.topic),
          chapterSpecificResearch: []
        },
        pacingStrategy: {
          slowChapters: outline.chapters.slice(0, 2).map(c => c.number),
          fastChapters: outline.chapters.slice(-3).map(c => c.number),
          buildupChapters: outline.chapters.slice(2, -3).map(c => c.number),
          resolutionChapters: outline.chapters.slice(-2).map(c => c.number)
        },
                 qualityCheckpoints: [
           { chapter: Math.ceil(outline.chapters.length * 0.25), focusAreas: ['Character establishment and conflict setup'] },
           { chapter: Math.ceil(outline.chapters.length * 0.5), focusAreas: ['Midpoint tension and character development'] },
           { chapter: Math.ceil(outline.chapters.length * 0.75), focusAreas: ['Climax preparation and stakes escalation'] }
         ]
      };

      const storyBible: StoryBible = {
        overview: {
          premise: prompt,
          theme: settings.genre,
          conflict: 'Character faces challenges that test their growth and resilience',
          resolution: 'Growth through adversity leading to character transformation',
          targetAudience: settings.targetAudience,
          tone: settings.tone
        },
                 characters: outline.characters.map(char => ({
           name: char.name,
           role: (char.role === 'protagonist' || char.role === 'antagonist' || char.role === 'supporting' || char.role === 'minor') 
                 ? char.role as 'protagonist' | 'antagonist' | 'supporting' | 'minor' 
                 : 'supporting',
           background: `Background appropriate for ${char.role} role in ${settings.genre} story`,
           motivation: `Primary motivation driving ${char.name}'s actions`,
           arc: char.arc,
           relationships: {},
           physicalDescription: `Physical description for ${char.name}`,
           personality: `Personality traits for ${char.name}`,
           flaws: [`Character flaw for ${char.name}`],
           strengths: [`Character strength for ${char.name}`]
         })),
        worldBuilding: {
          setting: `${settings.genre}-appropriate setting that supports the story themes`,
          timeframe: 'Contemporary or story-appropriate timeframe',
                     locations: outline.chapters.map(c => c.location).filter((loc, index, arr) => arr.indexOf(loc) === index).map(loc => ({
             name: loc,
             description: `Description for ${loc}`,
             importance: 'Story location'
           })),
          rules: [`Genre conventions for ${settings.genre}`],
          history: 'Relevant background that informs the current story events'
        },
        storyStructure: {
          act1: { 
            chapters: outline.chapters.slice(0, Math.ceil(outline.chapters.length * 0.25)).map(c => c.number), 
            purpose: 'Setup and character introduction', 
            keyEvents: ['Character introduction', 'World establishment', 'Inciting incident'] 
          },
          act2: { 
            chapters: outline.chapters.slice(Math.ceil(outline.chapters.length * 0.25), Math.ceil(outline.chapters.length * 0.75)).map(c => c.number), 
            purpose: 'Development and rising action', 
            keyEvents: ['Complications arise', 'Character development', 'Midpoint reversal'] 
          },
          act3: { 
            chapters: outline.chapters.slice(Math.ceil(outline.chapters.length * 0.75)).map(c => c.number), 
            purpose: 'Resolution and conclusion', 
            keyEvents: ['Climax', 'Resolution', 'Denouement'] 
          },
          climax: { 
            chapter: Math.ceil(outline.chapters.length * 0.8), 
            description: 'The major confrontation or decision point that resolves the main conflict' 
          },
          resolution: { 
            chapter: outline.chapters.length, 
            description: 'The aftermath and new equilibrium following the climax' 
          }
        },
                 chapterPlans: outline.chapters.map(chapter => ({
           number: chapter.number,
           title: chapter.title,
           purpose: chapter.summary,
           scenes: chapter.keyEvents.map((event, index) => ({
             sceneNumber: index + 1,
             purpose: event,
             setting: chapter.location,
             characters: chapter.characters,
             conflict: 'Chapter conflict',
             outcome: 'Scene outcome',
             wordTarget: Math.ceil(chapter.wordCountTarget / chapter.keyEvents.length),
             mood: 'Story appropriate mood'
           })),
           characterArcs: chapter.characters.map(char => ({
             character: char,
             development: `Character development for ${char} in chapter ${chapter.number}`
           })),
           plotThreads: [{
             thread: 'Main Plot',
             development: `Plot development in chapter ${chapter.number}`
           }],
           wordCountTarget: chapter.wordCountTarget,
           researchFocus: []
         })),
                 plotThreads: [
           {
             name: 'Main Plot',
             description: 'The primary story arc following the protagonist\'s journey',
             startChapter: 1,
             endChapter: outline.chapters.length,
             keyMoments: [
               { chapter: 1, event: 'Story begins' },
               { chapter: Math.ceil(outline.chapters.length / 2), event: 'Midpoint development' },
               { chapter: outline.chapters.length, event: 'Story resolution' }
             ]
           }
         ],
                 timeline: outline.chapters.map((chapter, index) => ({
           chapter: chapter.number,
           timeDescription: `Story time ${index + 1}`,
           duration: 'Chapter duration',
           significantEvents: chapter.keyEvents
         }))
      };

      const fallbackPlan: BookPlan = {
        creativeStrategy,
        outline,
        structurePlan,
        storyBible
      };

      // Validate the fallback plan
      this.validateBookPlan(fallbackPlan);
      console.log('✅ Fallback plan validation passed');

      return { fallbackPlan, fallbackReason };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Fallback plan generation failed:', errorMessage);
      throw new Error(`Fallback plan generation failed: ${errorMessage}`);
    }
  }

  /**
   * Generate fallback characters using user-provided names when available
   */
  private generateFallbackCharacters(settings: BookSettings, userPrompt?: string): BookOutline['characters'] {
    const characters = [];
    
    console.log('👥 Generating fallback characters');
    
    // Try to extract names from prompt if not in settings
    let characterNames = settings.characterNames || [];
    
    if (characterNames.length === 0 && userPrompt) {
      console.log('🔍 No character names in settings, analyzing prompt...');
      const promptAnalysis = this.characterNameAgent.analyzeUserPrompt(userPrompt);
      characterNames = promptAnalysis.names;
      
      if (characterNames.length > 0) {
        console.log(`📝 Auto-extracted ${characterNames.length} character names from prompt: ${characterNames.join(', ')}`);
      }
    }
    
    if (characterNames.length > 0) {
      console.log(`📝 Using ${characterNames.length} character names`);
      characterNames.forEach((name, index) => {
        characters.push({
          name: name.trim(),
          role: index === 0 ? 'protagonist' : 'supporting',
          description: `A ${index === 0 ? 'compelling main' : 'important supporting'} character in this ${settings.genre} story, designed to engage ${settings.targetAudience} readers`,
          arc: index === 0 
            ? 'Experiences significant growth and transformation throughout the story, facing challenges that test their resolve and ultimately lead to meaningful change'
            : `Supports the protagonist's journey and undergoes their own development arc that contributes to the overall narrative themes`
        });
      });
    } else {
      console.log('📝 No character names found, using generic protagonist');
      characters.push({
        name: 'Protagonist',
        role: 'protagonist',
        description: `The central character of this ${settings.genre} story, crafted to resonate with ${settings.targetAudience} readers`,
        arc: 'Undergoes a transformative journey filled with challenges, setbacks, and ultimately growth that changes their perspective and capabilities'
      });
    }
    
    console.log(`✅ Generated ${characters.length} fallback characters`);
    return characters;
  }

  /**
   * Generate fallback chapters
   */
  private generateFallbackChapters(settings: BookSettings): BookOutline['chapters'] {
    const wordsPerChapter = 2500;
    const numberOfChapters = Math.max(3, Math.ceil(settings.wordCount / wordsPerChapter));
    const chapters = [];

    console.log(`📚 Generating ${numberOfChapters} fallback chapters for ${settings.wordCount} words`);

    for (let i = 1; i <= numberOfChapters; i++) {
      const chapterPhase = i <= numberOfChapters * 0.25 ? 'Setup' : 
                           i <= numberOfChapters * 0.75 ? 'Development' : 'Resolution';
      
      chapters.push({
        number: i,
        title: `Chapter ${i}`,
        summary: `Chapter ${i} advances the ${chapterPhase.toLowerCase()} phase of the story, contributing to character development and plot progression appropriate for ${settings.targetAudience} readers.`,
        keyEvents: [`Significant event in chapter ${i} that moves the story forward`],
        characters: ['Protagonist'],
        location: 'Primary story setting',
        wordCountTarget: wordsPerChapter
      });
    }

    console.log(`✅ Generated ${chapters.length} fallback chapters`);
    return chapters;
  }

  /**
   * Validate input with comprehensive error messages
   */
  private validateInput(input: any): PlanningInput {
    try {
      return PlanningInputSchema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Input validation failed: ${errorMessages}`);
      }
      throw new Error(`Input validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate book plan with comprehensive error messages
   */
  private validateBookPlan(bookPlan: any): BookPlan {
    try {
      return BookPlanSchema.parse(bookPlan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Book plan validation failed: ${errorMessages}`);
      }
      throw new Error(`Book plan validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse JSON response with error handling
   */
  private parseJsonResponse(responseText: string): any {
    try {
      let cleanContent = responseText.trim();
      
      // Remove markdown code blocks if present
      if (cleanContent.startsWith('```')) {
        const firstNewline = cleanContent.indexOf('\n');
        const lastBackticks = cleanContent.lastIndexOf('```');
        if (firstNewline !== -1 && lastBackticks > firstNewline) {
          cleanContent = cleanContent.substring(firstNewline + 1, lastBackticks).trim();
        }
      }
      
      return JSON.parse(cleanContent);
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      console.log('Raw response preview:', responseText.substring(0, 200));
      throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Truncate text for logging
   */
  private truncateForLog(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Get planning agent configuration
   */
  getConfig(): PlanningAgentConfig {
    return { ...this.config };
  }

  /**
   * Update planning agent configuration
   */
  updateConfig(newConfig: Partial<PlanningAgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update ChiefEditorAgent config as well
    this.chiefEditor.updateConfig({
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens
    });
  }
} 