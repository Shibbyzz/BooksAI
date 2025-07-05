import { generateAIText } from '@/lib/openai';
import type { BookSettings } from '@/types';
import type { StoryBible } from './chief-editor-agent';

export interface HumanQualityConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface NarrativeVoice {
  style: string;
  perspective: 'first-person' | 'third-person-limited' | 'third-person-omniscient';
  tense: 'past' | 'present';
  tone: string;
  vocabularyLevel: 'simple' | 'moderate' | 'sophisticated';
  sentenceStructure: 'short' | 'varied' | 'complex';
  voiceCharacteristics: string[];
}

export interface ForeshadowingElement {
  id: string;
  plantChapter: number;
  payoffChapter: number;
  type: 'plot' | 'character' | 'theme' | 'setting';
  seedText: string;
  payoffText: string;
  subtlety: 'obvious' | 'moderate' | 'subtle';
  importance: 'major' | 'moderate' | 'minor';
}

export interface EmotionalBeat {
  chapter: number;
  section: number;
  emotionalTone: 'high' | 'medium' | 'low' | 'neutral';
  emotionType: 'joy' | 'sadness' | 'fear' | 'anger' | 'surprise' | 'tension' | 'relief';
  intensity: number; // 1-10
  duration: 'brief' | 'sustained' | 'building';
  purpose: string;
}

export interface TransitionStyle {
  type: 'time-jump' | 'location-change' | 'perspective-shift' | 'scene-break' | 'chapter-end';
  technique: 'fade-out' | 'hard-cut' | 'bridge-paragraph' | 'cliffhanger' | 'reflection';
  smoothness: number; // 1-10
}

export interface GenreConvention {
  genre: string;
  expectations: string[];
  pacing: 'fast' | 'moderate' | 'slow' | 'varied';
  structureRules: string[];
  readerPayoffs: string[];
  avoidances: string[];
}

export interface QualityEnhancement {
  narrativeVoice: NarrativeVoice;
  foreshadowingPlan: ForeshadowingElement[];
  emotionalPacing: EmotionalBeat[];
  transitionGuides: TransitionStyle[];
  genreConventions: GenreConvention;
  subtextLayers: {
    chapter: number;
    themes: string[];
    symbolism: string[];
    characterSubtext: { character: string; hiddenMeaning: string }[];
  }[];
}

export class HumanQualityEnhancer {
  private config: HumanQualityConfig;

  constructor(config?: Partial<HumanQualityConfig>) {
    this.config = {
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4000,
      ...config
    };
  }

  /**
   * Enhance a scene using the quality enhancement plan
   */
  async enhanceScene(
    content: string,
    context: {
      chapterNumber: number;
      sectionNumber: number;
      emotionalGoal?: string;
      narrativeVoiceStyle?: string;
      transitionTarget?: string;
    },
    qualityPlan?: QualityEnhancement
  ): Promise<{
    enhancedContent: string;
    narrativeAdjustments: string[];
    emotionalAdjustments: string[];
    summary: string;
  }> {
    try {
      console.log(`🎨 Enhancing scene - Chapter ${context.chapterNumber}, Section ${context.sectionNumber}...`);

      // Get emotional beat for this chapter/section
      const emotionalBeat = qualityPlan?.emotionalPacing.find(
        beat => beat.chapter === context.chapterNumber && beat.section === context.sectionNumber
      );

      // Get narrative voice guidelines
      const narrativeVoice = qualityPlan?.narrativeVoice;

      // Get relevant foreshadowing elements
      const relevantForeshadowing = qualityPlan?.foreshadowingPlan.filter(
        element => element.plantChapter === context.chapterNumber || element.payoffChapter === context.chapterNumber
      ) || [];

      // Get genre conventions
      const genreConventions = qualityPlan?.genreConventions;

      // Get subtext layers for this chapter
      const subtextLayer = qualityPlan?.subtextLayers.find(
        layer => layer.chapter === context.chapterNumber
      );

      const enhancementPrompt = `Enhance this scene to achieve professional, human-quality writing:

ORIGINAL SCENE:
${content}

CONTEXT:
- Chapter ${context.chapterNumber}, Section ${context.sectionNumber}
- Emotional Goal: ${context.emotionalGoal || 'Not specified'}
- Narrative Voice Style: ${context.narrativeVoiceStyle || 'Not specified'}
- Transition Target: ${context.transitionTarget || 'Not specified'}

QUALITY ENHANCEMENT GUIDELINES:

NARRATIVE VOICE:
${narrativeVoice ? `
- Style: ${narrativeVoice.style}
- Perspective: ${narrativeVoice.perspective}
- Tense: ${narrativeVoice.tense}
- Tone: ${narrativeVoice.tone}
- Vocabulary Level: ${narrativeVoice.vocabularyLevel}
- Sentence Structure: ${narrativeVoice.sentenceStructure}
- Voice Characteristics: ${narrativeVoice.voiceCharacteristics.join(', ')}
` : 'Apply consistent, professional narrative voice'}

EMOTIONAL PACING:
${emotionalBeat ? `
- Target Emotion: ${emotionalBeat.emotionType}
- Intensity Level: ${emotionalBeat.intensity}/10
- Duration: ${emotionalBeat.duration}
- Purpose: ${emotionalBeat.purpose}
` : 'Maintain appropriate emotional resonance'}

FORESHADOWING:
${relevantForeshadowing.length > 0 ? 
  relevantForeshadowing.map(f => `- ${f.type === 'plot' ? 'PLANT' : 'PAYOFF'}: ${f.seedText || f.payoffText} (${f.subtlety} subtlety)`).join('\n')
  : 'No specific foreshadowing elements for this scene'
}

GENRE CONVENTIONS:
${genreConventions ? `
- Genre: ${genreConventions.genre}
- Expectations: ${genreConventions.expectations.join(', ')}
- Pacing: ${genreConventions.pacing}
- Reader Payoffs: ${genreConventions.readerPayoffs.join(', ')}
- Avoid: ${genreConventions.avoidances.join(', ')}
` : 'Apply general genre best practices'}

SUBTEXT LAYERS:
${subtextLayer ? `
- Themes: ${subtextLayer.themes.join(', ')}
- Symbolism: ${subtextLayer.symbolism.join(', ')}
- Character Subtext: ${subtextLayer.characterSubtext.map(cs => `${cs.character}: ${cs.hiddenMeaning}`).join(', ')}
` : 'Add appropriate thematic depth'}

ENHANCEMENT GOALS:
1. Improve prose quality and readability
2. Enhance emotional impact and resonance
3. Ensure narrative voice consistency
4. Add appropriate subtext and depth
5. Implement any required foreshadowing
6. Match genre conventions and expectations
7. Create smooth transitions and flow
8. Elevate the writing to professional standards

Important: Maintain the core story events and character actions while enhancing the quality of the prose.

Return the enhanced scene followed by "---ADJUSTMENTS---" and then list the specific narrative and emotional adjustments made.`;

      const response = await generateAIText(enhancementPrompt, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        system: 'You are a master prose editor who enhances writing to professional, human-quality standards while maintaining story integrity.'
      });

      // Parse the response to extract enhanced content and adjustments
      const parts = response.text.split('---ADJUSTMENTS---');
      const enhancedContent = parts[0].trim();
      const adjustmentText = parts[1] || '';

      // Extract narrative and emotional adjustments
      const narrativeAdjustments = this.extractAdjustments(adjustmentText, 'narrative');
      const emotionalAdjustments = this.extractAdjustments(adjustmentText, 'emotional');

      // Create summary
      const summary = this.createEnhancementSummary(
        content,
        enhancedContent,
        narrativeAdjustments,
        emotionalAdjustments,
        context
      );

      return {
        enhancedContent,
        narrativeAdjustments,
        emotionalAdjustments,
        summary
      };

    } catch (error) {
      console.error('Error enhancing scene:', error);
      throw new Error(`Scene enhancement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract specific types of adjustments from the AI response
   */
  private extractAdjustments(adjustmentText: string, type: 'narrative' | 'emotional'): string[] {
    const lines = adjustmentText.split('\n').map(line => line.trim()).filter(line => line);
    const adjustments: string[] = [];
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      if (type === 'narrative') {
        if (lowerLine.includes('voice') || lowerLine.includes('perspective') || 
            lowerLine.includes('tense') || lowerLine.includes('style') ||
            lowerLine.includes('sentence') || lowerLine.includes('vocabulary') ||
            lowerLine.includes('transition') || lowerLine.includes('flow')) {
          adjustments.push(line.replace(/^[-*•]\s*/, ''));
        }
      } else if (type === 'emotional') {
        if (lowerLine.includes('emotion') || lowerLine.includes('feeling') || 
            lowerLine.includes('tension') || lowerLine.includes('mood') ||
            lowerLine.includes('intensity') || lowerLine.includes('atmosphere') ||
            lowerLine.includes('impact') || lowerLine.includes('resonance')) {
          adjustments.push(line.replace(/^[-*•]\s*/, ''));
        }
      }
    }
    
    return adjustments;
  }

  /**
   * Create a summary of the enhancements made
   */
  private createEnhancementSummary(
    originalContent: string,
    enhancedContent: string,
    narrativeAdjustments: string[],
    emotionalAdjustments: string[],
    context: {
      chapterNumber: number;
      sectionNumber: number;
      emotionalGoal?: string;
      narrativeVoiceStyle?: string;
      transitionTarget?: string;
    }
  ): string {
    const originalWordCount = originalContent.split(/\s+/).length;
    const enhancedWordCount = enhancedContent.split(/\s+/).length;
    const wordCountChange = enhancedWordCount - originalWordCount;
    
    let summary = `Enhanced Chapter ${context.chapterNumber}, Section ${context.sectionNumber}:\n`;
    
    if (wordCountChange > 0) {
      summary += `• Expanded content by ${wordCountChange} words\n`;
    } else if (wordCountChange < 0) {
      summary += `• Condensed content by ${Math.abs(wordCountChange)} words\n`;
    }
    
    if (narrativeAdjustments.length > 0) {
      summary += `• Made ${narrativeAdjustments.length} narrative improvements\n`;
    }
    
    if (emotionalAdjustments.length > 0) {
      summary += `• Made ${emotionalAdjustments.length} emotional enhancements\n`;
    }
    
    if (context.emotionalGoal) {
      summary += `• Aligned with emotional goal: ${context.emotionalGoal}\n`;
    }
    
    if (context.narrativeVoiceStyle) {
      summary += `• Applied narrative voice style: ${context.narrativeVoiceStyle}\n`;
    }
    
    if (context.transitionTarget) {
      summary += `• Enhanced transition toward: ${context.transitionTarget}\n`;
    }
    
    return summary.trim();
  }

  /**
   * Create comprehensive quality enhancement plan
   */
  async createQualityEnhancementPlan(
    storyBible: StoryBible,
    settings: BookSettings
  ): Promise<QualityEnhancement> {
    try {
      console.log('🎨 Creating human-quality enhancement plan...');

      // Create narrative voice profile
      const narrativeVoice = await this.createNarrativeVoice(storyBible, settings);

      // Plan foreshadowing elements
      const foreshadowingPlan = await this.planForeshadowing(storyBible, settings);

      // Design emotional pacing
      const emotionalPacing = await this.designEmotionalPacing(storyBible, settings);

      // Create transition guides
      const transitionGuides = await this.createTransitionGuides(storyBible, settings);

      // Define genre conventions
      const genreConventions = await this.defineGenreConventions(settings);

      // Plan subtext layers
      const subtextLayers = await this.planSubtextLayers(storyBible, settings);

      return {
        narrativeVoice,
        foreshadowingPlan,
        emotionalPacing,
        transitionGuides,
        genreConventions,
        subtextLayers
      };

    } catch (error) {
      console.error('Error creating quality enhancement plan:', error);
      throw new Error(`Quality enhancement planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create consistent narrative voice profile
   */
  private async createNarrativeVoice(
    storyBible: StoryBible,
    settings: BookSettings
  ): Promise<NarrativeVoice> {
    const prompt = `Create a consistent narrative voice profile for this ${settings.genre} book:

STORY OVERVIEW:
- Premise: ${storyBible.overview.premise}
- Tone: ${storyBible.overview.tone}
- Target Audience: ${storyBible.overview.targetAudience}
- Theme: ${storyBible.overview.theme}

MAIN CHARACTERS:
${storyBible.characters.map(c => `- ${c.name}: ${c.role} - ${c.personality}`).join('\n')}

Define a narrative voice that:
1. Matches the genre and tone consistently
2. Suits the target audience reading level
3. Remains consistent throughout the entire book
4. Enhances the story's emotional impact
5. Feels natural and human-written

Consider: perspective, tense, vocabulary level, sentence structure, and unique voice characteristics.

Respond with specific voice guidelines that can be applied consistently.`;

    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: 0.6,
      maxTokens: 1500,
      system: 'You are a narrative style expert. Create detailed voice profiles that ensure consistent, professional storytelling throughout a book.'
    });

    return this.parseNarrativeVoice(response.text, settings);
  }

  /**
   * Plan foreshadowing elements throughout the book
   */
  private async planForeshadowing(
    storyBible: StoryBible,
    settings: BookSettings
  ): Promise<ForeshadowingElement[]> {
    const prompt = `Plan foreshadowing elements for this ${settings.genre} story:

STORY STRUCTURE:
${storyBible.chapterPlans.map(ch => `Chapter ${ch.number}: ${ch.title} - ${ch.purpose}`).join('\n')}

PLOT THREADS:
${storyBible.plotThreads.map(pt => `${pt.name}: ${pt.description}`).join('\n')}

CLIMAX: Chapter ${storyBible.storyStructure.climax.chapter} - ${storyBible.storyStructure.climax.description}

Create 3-5 foreshadowing elements that:
1. Plant seeds early that pay off later
2. Create satisfying "aha!" moments for readers
3. Add depth and layers to the story
4. Feel natural, not forced
5. Match the genre conventions

For each element, specify:
- Where to plant the seed (early chapter)
- Where it pays off (later chapter)
- How subtle vs obvious it should be
- The actual foreshadowing text suggestions

Make readers feel like everything was planned from the beginning.`;

    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: 0.7,
      maxTokens: 2000,
      system: 'You are a master storyteller expert at crafting satisfying foreshadowing that creates compelling narrative depth.'
    });

    return this.parseForeshadowing(response.text);
  }

  /**
   * Design emotional pacing throughout the book
   */
  private async designEmotionalPacing(
    storyBible: StoryBible,
    settings: BookSettings
  ): Promise<EmotionalBeat[]> {
    const prompt = `Design emotional pacing for this ${settings.genre} book:

CHAPTER STRUCTURE:
${storyBible.chapterPlans.map(ch => `Chapter ${ch.number}: ${ch.title} - ${ch.scenes.length} scenes`).join('\n')}

STORY ACTS:
- Act 1: Chapters ${storyBible.storyStructure.act1.chapters.join(', ')} - ${storyBible.storyStructure.act1.purpose}
- Act 2: Chapters ${storyBible.storyStructure.act2.chapters.join(', ')} - ${storyBible.storyStructure.act2.purpose}  
- Act 3: Chapters ${storyBible.storyStructure.act3.chapters.join(', ')} - ${storyBible.storyStructure.act3.purpose}

Create emotional pacing that:
1. Varies emotional intensity naturally
2. Builds to emotional climaxes
3. Provides relief and breathing room
4. Matches genre expectations
5. Creates satisfying emotional journey

Map out high/medium/low emotional moments with specific emotions (joy, tension, fear, relief, etc.).
Ensure readers aren't emotionally exhausted but stay engaged.`;

    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: 0.6,
      maxTokens: 2000,
      system: 'You are an emotional pacing expert who understands how to create satisfying emotional journeys for readers.'
    });

    return this.parseEmotionalPacing(response.text, storyBible);
  }

  /**
   * Create transition guides for smooth narrative flow
   */
  private async createTransitionGuides(
    storyBible: StoryBible,
    settings: BookSettings
  ): Promise<TransitionStyle[]> {
    const transitions: TransitionStyle[] = [];

    // Create varied transition styles for different scenarios
    const transitionTypes = [
      { type: 'scene-break' as const, technique: 'bridge-paragraph' as const },
      { type: 'time-jump' as const, technique: 'fade-out' as const },
      { type: 'location-change' as const, technique: 'hard-cut' as const },
      { type: 'chapter-end' as const, technique: 'cliffhanger' as const },
      { type: 'perspective-shift' as const, technique: 'reflection' as const }
    ];

    transitionTypes.forEach(t => {
      transitions.push({
        ...t,
        smoothness: 8 // High smoothness for professional feel
      });
    });

    return transitions;
  }

  /**
   * Define genre-specific conventions and expectations
   */
  private async defineGenreConventions(settings: BookSettings): Promise<GenreConvention> {
    const genreConventions: { [key: string]: Partial<GenreConvention> } = {
      'mystery': {
        expectations: ['Clues planted early', 'Red herrings', 'Satisfying resolution', 'Fair play rules'],
        pacing: 'fast',
        structureRules: ['Introduce mystery early', 'Build suspense gradually', 'Reveal clues systematically'],
        readerPayoffs: ['Solver satisfaction', 'Surprising but logical reveal'],
        avoidances: ['Unfair solutions', 'Deus ex machina', 'Withholding crucial information']
      },
      'romance': {
        expectations: ['Character chemistry', 'Emotional development', 'Satisfying relationship arc', 'Happy/hopeful ending'],
        pacing: 'moderate',
        structureRules: ['Meet cute or conflict', 'Obstacles and growth', 'Emotional climax'],
        readerPayoffs: ['Emotional satisfaction', 'Character growth', 'Relationship triumph'],
        avoidances: ['Insta-love without development', 'Unresolved conflicts', 'Unsatisfying endings']
      },
      'fantasy': {
        expectations: ['World-building', 'Magic system rules', 'Hero journey', 'Good vs evil'],
        pacing: 'varied',
        structureRules: ['Establish world rules early', 'Build magic systematically', 'Epic scope'],
        readerPayoffs: ['Wonder and awe', 'Epic battles', 'Character transformation'],
        avoidances: ['Inconsistent magic', 'Info-dumping', 'Overpowered protagonists']
      },
      'thriller': {
        expectations: ['Constant tension', 'Fast pacing', 'Life-or-death stakes', 'Twists'],
        pacing: 'fast',
        structureRules: ['Hook immediately', 'Escalate constantly', 'No downtime'],
        readerPayoffs: ['Adrenaline rush', 'Edge-of-seat tension', 'Explosive climax'],
        avoidances: ['Slow pacing', 'Low stakes', 'Predictable outcomes']
      }
    };

    const convention = genreConventions[settings.genre.toLowerCase()] || genreConventions['fantasy'];
    
    return {
      genre: settings.genre,
      expectations: convention.expectations || [],
      pacing: convention.pacing || 'moderate',
      structureRules: convention.structureRules || [],
      readerPayoffs: convention.readerPayoffs || [],
      avoidances: convention.avoidances || []
    };
  }

  /**
   * Plan subtext layers for depth
   */
  private async planSubtextLayers(
    storyBible: StoryBible,
    settings: BookSettings
  ): Promise<QualityEnhancement['subtextLayers']> {
    return storyBible.chapterPlans.map(chapter => ({
      chapter: chapter.number,
      themes: [storyBible.overview.theme],
      symbolism: [`Chapter ${chapter.number} symbolism`],
      characterSubtext: storyBible.characters.map(char => ({
        character: char.name,
        hiddenMeaning: `${char.name}'s hidden emotional layer`
      }))
    }));
  }

  // Helper parsing methods
  private parseNarrativeVoice(responseText: string, settings: BookSettings): NarrativeVoice {
    // Simplified parsing - in production would use more sophisticated extraction
    return {
      style: settings.tone,
      perspective: 'third-person-limited',
      tense: 'past',
      tone: settings.tone,
      vocabularyLevel: settings.targetAudience.includes('adult') ? 'sophisticated' : 'moderate',
      sentenceStructure: 'varied',
      voiceCharacteristics: ['Engaging', 'Clear', 'Emotionally resonant']
    };
  }

  private parseForeshadowing(responseText: string): ForeshadowingElement[] {
    // Simplified - would parse AI response for actual foreshadowing elements
    return [
      {
        id: 'foreshadow_1',
        plantChapter: 2,
        payoffChapter: 8,
        type: 'plot',
        seedText: 'Subtle hint about the main conflict',
        payoffText: 'Resolution that references the earlier hint',
        subtlety: 'moderate',
        importance: 'major'
      }
    ];
  }

  private parseEmotionalPacing(responseText: string, storyBible: StoryBible): EmotionalBeat[] {
    const beats: EmotionalBeat[] = [];
    
    storyBible.chapterPlans.forEach((chapter, index) => {
      const totalChapters = storyBible.chapterPlans.length;
      const position = index / totalChapters;
      
      // Create varied emotional pacing
      let intensity = 5; // Medium default
      let emotionType: EmotionalBeat['emotionType'] = 'tension';
      
      if (position < 0.25) {
        intensity = 6; // Building
        emotionType = 'surprise';
      } else if (position < 0.75) {
        intensity = 7; // Rising action
        emotionType = 'tension';
      } else {
        intensity = 9; // Climax area
        emotionType = 'fear';
      }
      
      beats.push({
        chapter: chapter.number,
        section: 1,
        emotionalTone: intensity > 7 ? 'high' : intensity > 5 ? 'medium' : 'low',
        emotionType,
        intensity,
        duration: 'sustained',
        purpose: `Emotional beat for chapter ${chapter.number}`
      });
    });
    
    return beats;
  }
}

/**
 * Scene Transition Enhancer - Creates smooth transitions between scenes
 */
export class SceneTransitionEnhancer {
  private config: HumanQualityConfig;

  constructor(config?: Partial<HumanQualityConfig>) {
    this.config = {
      model: 'gpt-4o',
      temperature: 0.6,
      maxTokens: 1000,
      ...config
    };
  }

  /**
   * Create smooth transition between scenes
   */
  async createTransition(
    previousScene: string,
    nextSceneContext: {
      setting: string;
      characters: string[];
      timeChange: string;
      mood: string;
    },
    transitionType: TransitionStyle['technique']
  ): Promise<string> {
    const prompt = `Create a smooth ${transitionType} transition:

PREVIOUS SCENE ENDING:
${previousScene.substring(Math.max(0, previousScene.length - 300))}

NEXT SCENE CONTEXT:
- Setting: ${nextSceneContext.setting}
- Characters: ${nextSceneContext.characters.join(', ')}
- Time Change: ${nextSceneContext.timeChange}
- Mood: ${nextSceneContext.mood}

Create a ${transitionType} transition that:
1. Flows naturally from the previous scene
2. Smoothly introduces the new context
3. Maintains narrative momentum
4. Feels professional and polished
5. Is 1-3 sentences long

Write ONLY the transition text, no explanations.`;

    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: 200,
      system: 'You are a transition specialist who creates seamless narrative flow between scenes.'
    });

    return response.text.trim();
  }
} 