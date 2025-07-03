import { generateAIText } from '@/lib/openai';
import type { BookSettings } from '@/types';
import type { ComprehensiveResearch } from './research-agent';
import type { OutlineGeneration } from './planning-agent';

export interface ChiefEditorConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ChapterStructure {
  number: number;
  title: string;
  purpose: string; // What this chapter accomplishes in the story
  wordCountTarget: number;
  researchFocus: string[]; // Key research topics to emphasize
  pacingNotes: string;
  keyScenes: string[];
  characterFocus: string[];
  transitionTo?: string; // How it connects to next chapter
}

export interface BookStructurePlan {
  overallStructure: {
    actBreaks: number[];
    climaxChapter: number;
    majorTurningPoints: { chapter: number; description: string }[];
    themesWeaving: { theme: string; chapters: number[] }[];
  };
  chapters: ChapterStructure[];
  researchIntegrationStrategy: {
    upfrontResearch: string[];
    chapterSpecificResearch: { chapter: number; topics: string[] }[];
  };
  pacingStrategy: {
    slowChapters: number[];
    fastChapters: number[];
    buildupChapters: number[];
    resolutionChapters: number[];
  };
  qualityCheckpoints: {
    chapter: number;
    focusAreas: string[];
  }[];
}

export class ChiefEditorAgent {
  private config: ChiefEditorConfig;

  constructor(config?: Partial<ChiefEditorConfig>) {
    this.config = {
      model: 'gpt-4o',
      temperature: 0.8, // Higher temperature for creative structural decisions
      maxTokens: 6000,
      ...config
    };
  }

  /**
   * Create comprehensive book structure plan based on research and outline
   */
  async createBookStructurePlan(
    userPrompt: string,
    backCover: string,
    outline: OutlineGeneration,
    research: ComprehensiveResearch,
    settings: BookSettings
  ): Promise<BookStructurePlan> {
    try {
      console.log('ChiefEditor creating book structure plan...');
      
      const prompt = this.buildStructurePlanPrompt(
        userPrompt, 
        backCover, 
        outline, 
        research, 
        settings
      );

      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        system: `You are an experienced book editor and narrative architect. Your job is to create a comprehensive structural plan that:
        1. Uses research findings strategically throughout the narrative
        2. Creates natural, engaging chapter sizes and pacing
        3. Ensures story consistency and flow
        4. Balances character development with plot advancement
        5. Integrates themes seamlessly
        
        Think like a master storyteller who knows how to keep readers engaged. Always respond with valid JSON only.`
      });

      const structurePlan = this.parseStructurePlan(response.text, outline, settings);
      this.validateStructurePlan(structurePlan, settings);
      
      console.log('Book structure plan created successfully');
      return structurePlan;
      
    } catch (error) {
      console.error('Error creating book structure plan:', error);
      throw new Error(`Structure planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Make real-time editorial decisions during writing
   */
  async makeEditorialDecision(
    context: {
      currentChapter: number;
      sceneContext: string;
      availableResearch: string[];
      characterStates: string[];
      plotProgress: string;
    },
    question: string,
    options: string[]
  ): Promise<{
    decision: string;
    reasoning: string;
    researchToUse: string[];
    qualityChecks: string[];
  }> {
    try {
      const prompt = `
As the Chief Editor, make an editorial decision:

CONTEXT:
- Current Chapter: ${context.currentChapter}
- Scene: ${context.sceneContext}
- Available Research: ${context.availableResearch.join(', ')}
- Character States: ${context.characterStates.join(', ')}
- Plot Progress: ${context.plotProgress}

DECISION NEEDED: ${question}

OPTIONS:
${options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}

Consider:
1. Story consistency and character development
2. Research integration opportunities
3. Reader engagement and pacing
4. Long-term story consequences
5. Genre expectations

Provide your decision with detailed reasoning and specific research to incorporate.

Respond in JSON format:
{
  "decision": "selected option",
  "reasoning": "detailed explanation",
  "researchToUse": ["relevant research topics"],
  "qualityChecks": ["things to verify in this scene"]
}`;

      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: 0.7,
        maxTokens: 1500,
        system: 'You are a professional book editor making real-time editorial decisions. Respond with valid JSON only.'
      });

      return this.parseEditorialDecision(response.text);
    } catch (error) {
      console.error('Error making editorial decision:', error);
      throw new Error(`Editorial decision failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Review and adjust chapter structure during writing
   */
  async reviewChapterProgress(
    chapterNumber: number,
    currentStructure: ChapterStructure,
    actualProgress: {
      wordCount: number;
      scenesCompleted: string[];
      researchUsed: string[];
      charactersPresent: string[];
    },
    upcomingChapters: ChapterStructure[]
  ): Promise<{
    adjustments: {
      wordCountTarget?: number;
      additionalScenes?: string[];
      researchToAdd?: string[];
      pacingAdjustment?: string;
    };
    rippleEffects: {
      chapter: number;
      adjustment: string;
    }[];
  }> {
    try {
      const prompt = `
Review chapter progress and make structural adjustments:

CURRENT CHAPTER: ${chapterNumber}
PLANNED STRUCTURE:
- Target words: ${currentStructure.wordCountTarget}
- Purpose: ${currentStructure.purpose}
- Key scenes: ${currentStructure.keyScenes.join(', ')}
- Research focus: ${currentStructure.researchFocus.join(', ')}

ACTUAL PROGRESS:
- Current words: ${actualProgress.wordCount}
- Scenes completed: ${actualProgress.scenesCompleted.join(', ')}
- Research used: ${actualProgress.researchUsed.join(', ')}
- Characters present: ${actualProgress.charactersPresent.join(', ')}

UPCOMING CHAPTERS: ${upcomingChapters.slice(0, 3).map(c => c.title).join(', ')}

Assess if adjustments are needed for:
1. Chapter length (too short/long?)
2. Missing key scenes or character moments
3. Unused research that should be integrated
4. Pacing issues
5. Setup for upcoming chapters

Provide specific adjustments and their impact on future chapters.`;

      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: 0.6,
        maxTokens: 2000,
        system: 'You are a professional book editor reviewing chapter progress. Be specific about adjustments needed.'
      });

      return this.parseProgressReview(response.text);
    } catch (error) {
      console.error('Error reviewing chapter progress:', error);
      throw new Error(`Chapter review failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build the structure planning prompt
   */
  private buildStructurePlanPrompt(
    userPrompt: string,
    backCover: string,
    outline: OutlineGeneration,
    research: ComprehensiveResearch,
    settings: BookSettings
  ): string {
    const researchSummary = this.summarizeResearch(research);
    
    return `
You are a master storyteller and book architect. Read this story concept and make CREATIVE DECISIONS about the optimal book structure, just like a human author would.

USER CONCEPT: ${userPrompt}
BACK COVER: ${backCover}
TARGET WORD COUNT: ${settings.wordCount}
GENRE: ${settings.genre}
TONE: ${settings.tone}

EXISTING OUTLINE:
Summary: ${outline.summary}
Themes: ${outline.themes.join(', ')}
Characters: ${outline.characters.map(c => `${c.name} (${c.role})`).join(', ')}

RESEARCH AVAILABLE:
${researchSummary}

🎯 **YOUR CREATIVE MISSION**: 
Analyze this story and decide the BEST chapter structure for maximum reader engagement. Consider:

**STORY-DRIVEN CHAPTER DECISIONS:**
- **Mystery/Thriller**: Many short chapters (7-12) for tension and pacing
- **Epic Fantasy**: Fewer long chapters (3-6) for world-building and immersion
- **Romance**: Medium chapters (4-8) for emotional beats and development  
- **Literary Fiction**: Varied chapters (3-7) based on narrative structure
- **Action/Adventure**: Fast-paced chapters (6-10) matching story rhythm

**NATURAL LENGTH VARIATION:**
- Opening chapters: Longer for setup and character introduction
- Action sequences: Shorter for intensity and pace
- Emotional moments: Medium length for impact
- Climax: Longer for dramatic payoff
- Resolution: Appropriate length for satisfying conclusion

**INTELLIGENT SECTION PLANNING:**
Each chapter will be divided into 800-1200 word sections by the writing AI to prevent hallucination. Your job is to decide:
- How many words each chapter should target overall
- What story purpose each chapter serves
- How chapters connect and flow naturally

**THINK LIKE A HUMAN AUTHOR:**
- What would make this story most engaging to read?
- How should the pacing feel throughout the book?
- Where are the natural story beats and chapter breaks?
- What structure serves THIS specific story best?

Respond with a creative, story-driven structure plan that feels natural and engaging, not formulaic.`;
  }

  /**
   * Summarize research for prompt inclusion
   */
  private summarizeResearch(research: ComprehensiveResearch): string {
    const sections = [
      `Domain Knowledge: ${research.domainKnowledge.map(r => r.topic).join(', ')}`,
      `Character Backgrounds: ${research.characterBackgrounds.map(r => r.topic).join(', ')}`,
      `Settings: ${research.settingDetails.map(r => r.topic).join(', ')}`,
      `Technical: ${research.technicalAspects.map(r => r.topic).join(', ')}`,
      `Cultural: ${research.culturalContext.map(r => r.topic).join(', ')}`
    ].filter(section => !section.endsWith(': '));
    
    return sections.join('\n');
  }

  /**
   * Parse structure plan response
   */
  private parseStructurePlan(
    responseText: string, 
    originalOutline: OutlineGeneration,
    settings: BookSettings
  ): BookStructurePlan {
    try {
      console.log('Parsing structure plan response...');
      // Clean and parse JSON response
      let cleanContent = responseText.trim();
      if (cleanContent.startsWith('```')) {
        const firstNewline = cleanContent.indexOf('\n');
        const lastBackticks = cleanContent.lastIndexOf('```');
        if (firstNewline !== -1 && lastBackticks > firstNewline) {
          cleanContent = cleanContent.substring(firstNewline + 1, lastBackticks).trim();
        }
      }
      
      console.log('Attempting to parse JSON, content length:', cleanContent.length);
      const parsed = JSON.parse(cleanContent);
      console.log('Successfully parsed structure plan from AI');
      
      // Validate the parsed structure has required fields
      if (!parsed.chapters || !Array.isArray(parsed.chapters)) {
        console.log('Parsed structure missing chapters array, using fallback');
        return this.createFallbackStructurePlan(originalOutline, settings);
      }
      
      // CRITICAL: Validate chapter count matches word count requirements
      const totalParsedWords = parsed.chapters.reduce((sum: number, ch: any) => sum + (ch.wordCountTarget || 0), 0);
      const targetWords = settings.wordCount;
      const wordCountRatio = totalParsedWords / targetWords;
      
      console.log(`AI plan: ${parsed.chapters.length} chapters, ${totalParsedWords} total words vs ${targetWords} target (${(wordCountRatio * 100).toFixed(1)}%)`);
      
      // If AI plan is significantly under target word count, enhance it
      if (wordCountRatio < 0.7 || parsed.chapters.length < 3) {
        console.log('AI plan insufficient for word count target, enhancing...');
        return this.enhanceStructurePlan(parsed, originalOutline, settings);
      }
      
      return parsed;
    } catch (parseError) {
      console.error('Error parsing structure plan:', parseError);
      console.log('AI response preview:', responseText.substring(0, 200));
      console.log('Falling back to enhanced outline structure...');
      
      // Fallback: Enhance the existing outline with better structure
      return this.createFallbackStructurePlan(originalOutline, settings);
    }
  }

  /**
   * Create fallback structure plan if AI parsing fails
   */
  private createFallbackStructurePlan(
    outline: OutlineGeneration,
    settings: BookSettings
  ): BookStructurePlan {
    console.log('Creating fallback structure plan...');
    console.log('Outline chapters length:', outline.chapters?.length || 0);
    console.log('Target word count:', settings.wordCount);
    
    const totalWords = settings.wordCount;
    
    // STORY-DRIVEN: Make intelligent decisions based on genre and story needs
    const numChapters = this.determineOptimalChapterCount(totalWords, settings, outline);
    
    console.log(`Intelligent chapter count determined: ${numChapters} chapters for ${settings.genre} story`);
    
    // Create varied chapter lengths (not all equal)
    const chapterWordTargets = this.generateVariedChapterLengths(totalWords, numChapters);
    
    const chapters: ChapterStructure[] = (outline.chapters || []).map((chapter, index) => ({
      number: chapter.number,
      title: chapter.title,
      purpose: chapter.summary.substring(0, 100) + '...',
      wordCountTarget: chapterWordTargets[index],
      researchFocus: ['General research'],
      pacingNotes: index < numChapters * 0.3 ? 'Setup and establishment' :
                   index < numChapters * 0.7 ? 'Building tension' : 'Resolution',
      keyScenes: chapter.keyEvents || ['Main scene'],
      characterFocus: chapter.characters || ['Protagonist']
    }));
    
    // If no chapters from outline, create some basic ones
    if (chapters.length === 0) {
      console.log('No chapters in outline, creating default chapters');
      for (let i = 1; i <= 3; i++) {
        chapters.push({
          number: i,
          title: `Chapter ${i}`,
          purpose: `Chapter ${i} content`,
          wordCountTarget: Math.floor(totalWords / 3),
          researchFocus: ['General research'],
          pacingNotes: i === 1 ? 'Setup' : i === 2 ? 'Development' : 'Resolution',
          keyScenes: ['Main scene'],
          characterFocus: ['Protagonist']
        });
      }
    }
    
    console.log('Fallback structure plan created with', chapters.length, 'chapters');

    return {
      overallStructure: {
        actBreaks: [Math.floor(numChapters * 0.25), Math.floor(numChapters * 0.75)],
        climaxChapter: Math.floor(numChapters * 0.8),
        majorTurningPoints: [
          { chapter: Math.floor(numChapters * 0.25), description: 'First turning point' },
          { chapter: Math.floor(numChapters * 0.5), description: 'Midpoint reversal' },
          { chapter: Math.floor(numChapters * 0.75), description: 'Final conflict begins' }
        ],
        themesWeaving: outline.themes.map(theme => ({
          theme,
          chapters: Array.from({ length: numChapters }, (_, i) => i + 1)
        }))
      },
      chapters,
      researchIntegrationStrategy: {
        upfrontResearch: ['Domain knowledge', 'Character backgrounds'],
        chapterSpecificResearch: chapters.map(c => ({
          chapter: c.number,
          topics: ['Setting details']
        }))
      },
      pacingStrategy: {
        slowChapters: chapters.filter((_, i) => i % 3 === 1).map(c => c.number),
        fastChapters: chapters.filter((_, i) => i % 3 === 0).map(c => c.number),
        buildupChapters: chapters.slice(0, Math.floor(numChapters * 0.7)).map(c => c.number),
        resolutionChapters: chapters.slice(Math.floor(numChapters * 0.7)).map(c => c.number)
      },
      qualityCheckpoints: [
        { chapter: Math.floor(numChapters * 0.33), focusAreas: ['Character consistency', 'Research accuracy'] },
        { chapter: Math.floor(numChapters * 0.66), focusAreas: ['Plot consistency', 'Pacing'] },
        { chapter: numChapters, focusAreas: ['Overall coherence', 'Theme resolution'] }
      ]
    };
  }

  /**
   * Enhance insufficient AI structure plan to meet word count requirements
   */
  private enhanceStructurePlan(
    insufficientPlan: any,
    originalOutline: OutlineGeneration,
    settings: BookSettings
  ): BookStructurePlan {
    console.log('Enhancing insufficient AI structure plan...');
    
    const targetWords = settings.wordCount;
    const currentWords = insufficientPlan.chapters?.reduce((sum: number, ch: any) => sum + (ch.wordCountTarget || 0), 0) || 0;
    const currentChapters = insufficientPlan.chapters?.length || 0;
    
    // Calculate how many additional chapters we need
    const wordsPerChapter = 2500;
    const neededChapters = Math.max(3, Math.ceil(targetWords / wordsPerChapter));
    const additionalChapters = Math.max(0, neededChapters - currentChapters);
    
    console.log(`Current: ${currentChapters} chapters (${currentWords} words), Need: ${neededChapters} chapters (${targetWords} words), Adding: ${additionalChapters} chapters`);
    
    // Use existing chapters as base
    const enhancedChapters = [...(insufficientPlan.chapters || [])];
    
    // Add additional chapters if needed
    for (let i = 0; i < additionalChapters; i++) {
      const chapterNumber = currentChapters + i + 1;
      enhancedChapters.push({
        number: chapterNumber,
        title: `Chapter ${chapterNumber}`,
        purpose: `Continue the story with key developments and character growth.`,
        wordCountTarget: wordsPerChapter,
        researchFocus: ['Character development', 'Plot advancement'],
        pacingNotes: chapterNumber < neededChapters * 0.7 ? 'Building tension' : 'Moving toward resolution',
        keyScenes: [`Key scene in chapter ${chapterNumber}`],
        characterFocus: originalOutline.characters?.map(c => c.name) || ['Protagonist']
      });
    }
    
    // Recalculate word targets to ensure we hit the target
    const newChapterTargets = this.generateVariedChapterLengths(targetWords, enhancedChapters.length);
    enhancedChapters.forEach((chapter, index) => {
      chapter.wordCountTarget = newChapterTargets[index];
    });
    
    console.log(`Enhanced plan: ${enhancedChapters.length} chapters with proper word distribution`);
    
    // Create enhanced structure plan
    return {
      overallStructure: insufficientPlan.overallStructure || {
        actBreaks: [Math.floor(enhancedChapters.length * 0.25), Math.floor(enhancedChapters.length * 0.75)],
        climaxChapter: Math.floor(enhancedChapters.length * 0.8),
        majorTurningPoints: [
          { chapter: Math.floor(enhancedChapters.length * 0.25), description: 'First turning point' },
          { chapter: Math.floor(enhancedChapters.length * 0.5), description: 'Midpoint reversal' },
          { chapter: Math.floor(enhancedChapters.length * 0.75), description: 'Final conflict begins' }
        ],
        themesWeaving: originalOutline.themes?.map(theme => ({
          theme,
          chapters: Array.from({ length: enhancedChapters.length }, (_, i) => i + 1)
        })) || []
      },
      chapters: enhancedChapters,
      researchIntegrationStrategy: insufficientPlan.researchIntegrationStrategy || {
        upfrontResearch: ['Domain knowledge', 'Character backgrounds'],
        chapterSpecificResearch: enhancedChapters.map(c => ({
          chapter: c.number,
          topics: ['Setting details']
        }))
      },
      pacingStrategy: insufficientPlan.pacingStrategy || {
        slowChapters: enhancedChapters.filter((_, i) => i % 3 === 1).map(c => c.number),
        fastChapters: enhancedChapters.filter((_, i) => i % 3 === 0).map(c => c.number),
        buildupChapters: enhancedChapters.slice(0, Math.floor(enhancedChapters.length * 0.7)).map(c => c.number),
        resolutionChapters: enhancedChapters.slice(Math.floor(enhancedChapters.length * 0.7)).map(c => c.number)
      },
      qualityCheckpoints: insufficientPlan.qualityCheckpoints || [
        { chapter: Math.floor(enhancedChapters.length * 0.33), focusAreas: ['Character consistency', 'Research accuracy'] },
        { chapter: Math.floor(enhancedChapters.length * 0.66), focusAreas: ['Plot consistency', 'Pacing'] },
        { chapter: enhancedChapters.length, focusAreas: ['Overall coherence', 'Theme resolution'] }
      ]
    };
  }

  /**
   * Determine optimal chapter count based on story-driven decisions
   */
  private determineOptimalChapterCount(
    totalWords: number, 
    settings: BookSettings, 
    outline: OutlineGeneration
  ): number {
    console.log(`Analyzing story for optimal chapter structure: ${settings.genre}, ${settings.tone}, ${totalWords} words`);
    
    // Story-driven chapter count based on genre and narrative needs
    let baseChapters = 4; // Reasonable default
    
    // Genre-specific chapter tendencies
    switch (settings.genre.toLowerCase()) {
      case 'mystery':
      case 'thriller':
      case 'suspense':
        // Many short chapters for tension and pacing
        baseChapters = Math.max(6, Math.min(12, Math.ceil(totalWords / 1500)));
        console.log('Mystery/Thriller: Using many short chapters for tension');
        break;
        
      case 'fantasy':
      case 'science fiction':
      case 'epic fantasy':
        // Fewer long chapters for world-building and immersion
        baseChapters = Math.max(3, Math.min(8, Math.ceil(totalWords / 3500)));
        console.log('Fantasy/Sci-Fi: Using fewer long chapters for immersion');
        break;
        
      case 'romance':
      case 'contemporary romance':
        // Medium chapters for emotional beats
        baseChapters = Math.max(4, Math.min(8, Math.ceil(totalWords / 2200)));
        console.log('Romance: Using medium chapters for emotional development');
        break;
        
      case 'action':
      case 'adventure':
        // Fast-paced chapters matching story rhythm
        baseChapters = Math.max(5, Math.min(10, Math.ceil(totalWords / 1800)));
        console.log('Action/Adventure: Using fast-paced chapter structure');
        break;
        
      case 'literary fiction':
      case 'drama':
        // Varied chapters based on narrative structure
        baseChapters = Math.max(3, Math.min(7, Math.ceil(totalWords / 2800)));
        console.log('Literary Fiction: Using varied narrative structure');
        break;
        
      case 'horror':
        // Short to medium chapters for building dread
        baseChapters = Math.max(5, Math.min(9, Math.ceil(totalWords / 2000)));
        console.log('Horror: Using chapters optimized for building dread');
        break;
        
      default:
        // General fiction - balanced approach
        baseChapters = Math.max(4, Math.min(8, Math.ceil(totalWords / 2500)));
        console.log('General Fiction: Using balanced chapter approach');
    }
    
    // Tone adjustments
    if (settings.tone.toLowerCase().includes('fast') || settings.tone.toLowerCase().includes('intense')) {
      baseChapters = Math.ceil(baseChapters * 1.2); // More chapters for faster pace
      console.log('Fast/Intense tone: Increasing chapter count for pace');
    } else if (settings.tone.toLowerCase().includes('slow') || settings.tone.toLowerCase().includes('contemplative')) {
      baseChapters = Math.ceil(baseChapters * 0.8); // Fewer chapters for slower pace
      console.log('Slow/Contemplative tone: Reducing chapter count for depth');
    }
    
    // Consider existing outline if it has reasonable structure
    const outlineChapters = outline.chapters?.length || 0;
    if (outlineChapters > 0 && Math.abs(outlineChapters - baseChapters) <= 2) {
      // If outline is close to our calculated optimum, use it
      console.log(`Outline had ${outlineChapters} chapters, close to optimal ${baseChapters}, using outline`);
      return outlineChapters;
    }
    
    // Ensure we stay within reasonable bounds
    const finalChapters = Math.max(3, Math.min(15, baseChapters));
    
    console.log(`Final decision: ${finalChapters} chapters for this ${settings.genre} story`);
    return finalChapters;
  }

  /**
   * Generate varied chapter lengths instead of equal distribution
   */
  private generateVariedChapterLengths(totalWords: number, numChapters: number): number[] {
    const baseLength = Math.floor(totalWords / numChapters);
    const variations = [];
    
    for (let i = 0; i < numChapters; i++) {
      let multiplier = 1.0;
      
      // Opening chapters: slightly longer for setup
      if (i < 2) multiplier = 1.2;
      // Climax chapters: longer for drama
      else if (i >= numChapters * 0.7 && i <= numChapters * 0.85) multiplier = 1.3;
      // Transition chapters: shorter
      else if (i === Math.floor(numChapters * 0.25) || i === Math.floor(numChapters * 0.5)) multiplier = 0.8;
      // Resolution: medium length
      else if (i >= numChapters * 0.9) multiplier = 1.1;
      // Regular chapters: slight variation
      else multiplier = 0.9 + (Math.random() * 0.2);
      
      variations.push(Math.floor(baseLength * multiplier));
    }
    
    // Ensure total adds up correctly
    const currentTotal = variations.reduce((sum, len) => sum + len, 0);
    const adjustment = totalWords - currentTotal;
    variations[Math.floor(numChapters / 2)] += adjustment;
    
    return variations;
  }

  /**
   * Parse editorial decision response
   */
  private parseEditorialDecision(responseText: string): any {
    try {
      let cleanContent = responseText.trim();
      if (cleanContent.startsWith('```')) {
        const firstNewline = cleanContent.indexOf('\n');
        const lastBackticks = cleanContent.lastIndexOf('```');
        if (firstNewline !== -1 && lastBackticks > firstNewline) {
          cleanContent = cleanContent.substring(firstNewline + 1, lastBackticks).trim();
        }
      }
      
      return JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Error parsing editorial decision:', parseError);
      // Fallback response
      return {
        decision: "Continue as planned",
        reasoning: "Unable to parse AI response, proceeding with default option",
        researchToUse: [],
        qualityChecks: ["Verify scene consistency"]
      };
    }
  }

  /**
   * Parse progress review response
   */
  private parseProgressReview(responseText: string): any {
    try {
      // Extract key information from text response
      // This is a simplified parser - could be enhanced with structured JSON
      
      return {
        adjustments: {
          wordCountTarget: undefined,
          additionalScenes: [],
          researchToAdd: [],
          pacingAdjustment: 'Continue as planned'
        },
        rippleEffects: []
      };
    } catch (error) {
      console.error('Error parsing progress review:', error);
      return {
        adjustments: {},
        rippleEffects: []
      };
    }
  }

  /**
   * Validate structure plan
   */
  private validateStructurePlan(plan: BookStructurePlan, settings: BookSettings): void {
    if (!plan.chapters || plan.chapters.length === 0) {
      throw new Error('Structure plan must include chapters');
    }

    const totalWordTarget = plan.chapters.reduce((sum, ch) => sum + ch.wordCountTarget, 0);
    const expectedWords = settings.wordCount;
    const variance = Math.abs(totalWordTarget - expectedWords) / expectedWords;
    
    if (variance > 0.2) {
      console.warn(`Word count variance: ${(variance * 100).toFixed(1)}%`);
    }

    // Validate chapter numbering
    plan.chapters.forEach((chapter, index) => {
      if (chapter.number !== index + 1) {
        throw new Error(`Chapter numbering inconsistent at chapter ${index + 1}`);
      }
    });
  }

  /**
   * Get configuration
   */
  getConfig(): ChiefEditorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ChiefEditorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
} 