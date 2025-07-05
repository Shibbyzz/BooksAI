import { generateAIText } from '@/lib/openai';
import type { BookSettings } from '@/types';

export interface SpecializedWriterConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface SceneContext {
  sceneType: 'action' | 'dialogue' | 'description' | 'emotion' | 'exposition' | 'transition';
  chapterTitle: string;
  sceneNumber: number;
  totalScenes: number;
  purpose: string;
  setting: string;
  characters: string[];
  conflict: string;
  outcome: string;
  wordTarget: number;
  mood: string;
  previousContent?: string;
  nextScenePreview?: string;
  researchContext?: string[];
  characterStates?: { [character: string]: string };
  // NEW: Human-quality enhancement properties
  narrativeVoice?: any; // NarrativeVoice from human-quality-enhancer
  emotionalTone?: any; // EmotionalBeat from human-quality-enhancer
  foreshadowing?: any; // ForeshadowingElement from human-quality-enhancer
  thematicElements?: string[]; // Themes to weave into the scene
}

export interface SceneGeneration {
  content: string;
  wordCount: number;
  sceneType: string;
  qualityScore: number;
  tokensUsed: number;
}

/**
 * Action Scene Writer - Specialized for intense, fast-paced scenes
 */
export class ActionSceneWriter {
  private config: SpecializedWriterConfig;

  constructor(config: SpecializedWriterConfig) {
    this.config = config;
  }

  async writeActionScene(context: SceneContext): Promise<SceneGeneration> {
    const prompt = this.buildActionPrompt(context);
    
    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: 0.9, // Higher temperature for dynamic action
      maxTokens: this.config.maxTokens,
      system: `You are an expert action scene writer. Create intense, visceral scenes that:
      - Use short, punchy sentences during high-intensity moments
      - Include vivid sensory details (sounds, impacts, movements)
      - Maintain clear spatial awareness and choreography
      - Balance action with character emotion and stakes
      - Create escalating tension that builds to the scene outcome
      - Use strong, active verbs and minimize passive voice
      - Include realistic consequences and physical limitations
      - CRITICAL: Meet the exact word count target specified in the prompt`
    });

    let content = response.text.trim();
    let wordCount = this.countWords(content);
    let tokensUsed = response.usage?.totalTokens || 0;
    
    // Retry if content is too short (less than 70% of target)
    if (wordCount < context.wordTarget * 0.7) {
      console.warn(`ActionWriter: Generated ${wordCount} words, below target of ${context.wordTarget}. Retrying...`);
      
      const retryPrompt = `${prompt}\n\nIMPORTANT: The previous attempt was too short (${wordCount} words). You MUST write at least ${Math.floor(context.wordTarget * 0.8)} words. Add more action details, character reactions, and sensory descriptions to reach the target.`;
      
      try {
        const retryResponse = await generateAIText(retryPrompt, {
          model: this.config.model,
          temperature: 0.8, // Slightly lower temperature for retry
          maxTokens: this.config.maxTokens,
          system: `You are an expert action writer. CRITICAL: You must meet the exact word count target specified in the prompt. Expand with vivid details and character reactions.`
        });
        
        const retryContent = retryResponse.text.trim();
        const retryWordCount = this.countWords(retryContent);
        
        if (retryWordCount > wordCount) {
          content = retryContent;
          wordCount = retryWordCount;
          tokensUsed += retryResponse.usage?.totalTokens || 0;
          console.log(`ActionWriter: Retry successful - improved from ${wordCount} to ${retryWordCount} words`);
        }
      } catch (retryError) {
        console.warn('ActionWriter: Retry failed:', retryError);
      }
    }

    return {
      content,
      wordCount,
      sceneType: 'action',
      qualityScore: 85,
      tokensUsed
    };
  }

  private buildActionPrompt(context: SceneContext): string {
    // DEBUG: Log the word target being requested
    console.log(`🎯 ActionWriter building prompt for ${context.wordTarget} words`);
    
    return `Write an intense action scene of exactly ${context.wordTarget} words:

CRITICAL WORD COUNT REQUIREMENT: 
- Write approximately ${context.wordTarget} words (${Math.floor(context.wordTarget * 0.8)}-${Math.floor(context.wordTarget * 1.2)} words acceptable)
- This is essential for proper chapter pacing and structure

SCENE CONTEXT:
- Setting: ${context.setting}
- Characters: ${context.characters.join(', ')}
- Conflict: ${context.conflict}
- Outcome: ${context.outcome}
- Mood: ${context.mood}

SCENE REQUIREMENTS:
- Create visceral, fast-paced action
- Use dynamic verbs and short sentences during peaks
- Include sensory details (sounds, impacts, movement)
- Show character emotions under pressure
- Build to the specified outcome: ${context.outcome}
- Maintain clear choreography and spatial awareness
- MUST meet the ${context.wordTarget} word count target

${context.previousContent ? `PREVIOUS SCENE CONTEXT:\n...${context.previousContent.substring(Math.max(0, context.previousContent.length - 200))}\n` : ''}

Write compelling action that puts readers in the middle of the intensity. Remember: aim for ${context.wordTarget} words.`;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
}

/**
 * Dialogue Writer - Specialized for character conversations
 */
export class DialogueWriter {
  private config: SpecializedWriterConfig;

  constructor(config: SpecializedWriterConfig) {
    this.config = config;
  }

  async writeDialogueScene(context: SceneContext): Promise<SceneGeneration> {
    const prompt = this.buildDialoguePrompt(context);
    
    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: 0.8,
      maxTokens: this.config.maxTokens,
      system: `You are an expert dialogue writer. Create natural conversations that:
      - Give each character a distinct voice and speech pattern
      - Advance plot through conversation
      - Reveal character through what they say and don't say
      - Include subtext and hidden meanings
      - Balance dialogue with action beats and description
      - Use realistic interruptions, pauses, and overlaps
      - Show character relationships through interaction dynamics
      - CRITICAL: Meet the exact word count target specified in the prompt`
    });

    let content = response.text.trim();
    let wordCount = this.countWords(content);
    let tokensUsed = response.usage?.totalTokens || 0;
    
    // Retry if content is too short (less than 70% of target)
    if (wordCount < context.wordTarget * 0.7) {
      console.warn(`DialogueWriter: Generated ${wordCount} words, below target of ${context.wordTarget}. Retrying...`);
      
      const retryPrompt = `${prompt}\n\nIMPORTANT: The previous attempt was too short (${wordCount} words). You MUST write at least ${Math.floor(context.wordTarget * 0.8)} words. Add more dialogue exchanges, action beats, and character interactions to reach the target.`;
      
      try {
        const retryResponse = await generateAIText(retryPrompt, {
          model: this.config.model,
          temperature: 0.7,
          maxTokens: this.config.maxTokens,
          system: `You are an expert dialogue writer. CRITICAL: You must meet the exact word count target specified in the prompt. Expand with more character interaction and subtext.`
        });
        
        const retryContent = retryResponse.text.trim();
        const retryWordCount = this.countWords(retryContent);
        
        if (retryWordCount > wordCount) {
          content = retryContent;
          wordCount = retryWordCount;
          tokensUsed += retryResponse.usage?.totalTokens || 0;
          console.log(`DialogueWriter: Retry successful - improved from ${wordCount} to ${retryWordCount} words`);
        }
      } catch (retryError) {
        console.warn('DialogueWriter: Retry failed:', retryError);
      }
    }

    return {
      content,
      wordCount,
      sceneType: 'dialogue',
      qualityScore: 87,
      tokensUsed
    };
  }

  private buildDialoguePrompt(context: SceneContext): string {
    // DEBUG: Log the word target being requested
    console.log(`🎯 DialogueWriter building prompt for ${context.wordTarget} words`);
    
    return `Write a dialogue-driven scene of exactly ${context.wordTarget} words:

CRITICAL WORD COUNT REQUIREMENT: 
- Write approximately ${context.wordTarget} words (${Math.floor(context.wordTarget * 0.8)}-${Math.floor(context.wordTarget * 1.2)} words acceptable)
- This is essential for proper chapter pacing and structure

SCENE CONTEXT:
- Setting: ${context.setting}
- Characters: ${context.characters.join(', ')}
- Conflict: ${context.conflict}
- Outcome: ${context.outcome}
- Mood: ${context.mood}

DIALOGUE REQUIREMENTS:
- Each character has a distinct voice
- Conversation advances the plot toward: ${context.outcome}
- Include subtext and hidden meanings
- Balance dialogue with action beats
- Show character relationships through interaction
- Use realistic speech patterns and interruptions
- MUST meet the ${context.wordTarget} word count target

${context.characterStates ? `CHARACTER STATES:\n${Object.entries(context.characterStates).map(([char, state]) => `${char}: ${state}`).join('\n')}\n` : ''}

Write natural, engaging dialogue that feels authentic to these characters. Remember: aim for ${context.wordTarget} words.`;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
}

/**
 * Atmospheric Writer - Specialized for mood and setting description
 */
export class AtmosphericWriter {
  private config: SpecializedWriterConfig;

  constructor(config: SpecializedWriterConfig) {
    this.config = config;
  }

  async writeAtmosphericScene(context: SceneContext): Promise<SceneGeneration> {
    const prompt = this.buildAtmosphericPrompt(context);
    
    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: 0.7,
      maxTokens: this.config.maxTokens,
      system: `You are an expert atmospheric writer. Create immersive scenes that:
      - Use all five senses to create vivid environments
      - Match description to character's emotional state
      - Create mood through setting and weather
      - Include subtle details that enhance atmosphere
      - Balance description with character interiority
      - Use metaphor and symbolism when appropriate
      - Create a sense of place that feels real and lived-in
      - CRITICAL: Meet the exact word count target specified in the prompt`
    });

    let content = response.text.trim();
    let wordCount = this.countWords(content);
    let tokensUsed = response.usage?.totalTokens || 0;
    
    // Retry if content is too short (less than 70% of target)
    if (wordCount < context.wordTarget * 0.7) {
      console.warn(`AtmosphericWriter: Generated ${wordCount} words, below target of ${context.wordTarget}. Retrying...`);
      
      const retryPrompt = `${prompt}\n\nIMPORTANT: The previous attempt was too short (${wordCount} words). You MUST write at least ${Math.floor(context.wordTarget * 0.8)} words. Add more sensory details, atmospheric descriptions, and character observations to reach the target.`;
      
      try {
        const retryResponse = await generateAIText(retryPrompt, {
          model: this.config.model,
          temperature: 0.6,
          maxTokens: this.config.maxTokens,
          system: `You are an expert atmospheric writer. CRITICAL: You must meet the exact word count target specified in the prompt. Expand with rich sensory details and atmosphere.`
        });
        
        const retryContent = retryResponse.text.trim();
        const retryWordCount = this.countWords(retryContent);
        
        if (retryWordCount > wordCount) {
          content = retryContent;
          wordCount = retryWordCount;
          tokensUsed += retryResponse.usage?.totalTokens || 0;
          console.log(`AtmosphericWriter: Retry successful - improved from ${wordCount} to ${retryWordCount} words`);
        }
      } catch (retryError) {
        console.warn('AtmosphericWriter: Retry failed:', retryError);
      }
    }

    return {
      content,
      wordCount,
      sceneType: 'description',
      qualityScore: 88,
      tokensUsed
    };
  }

  private buildAtmosphericPrompt(context: SceneContext): string {
    // DEBUG: Log the word target being requested
    console.log(`🎯 AtmosphericWriter building prompt for ${context.wordTarget} words`);
    
    return `Write an atmospheric scene of exactly ${context.wordTarget} words:

CRITICAL WORD COUNT REQUIREMENT: 
- Write approximately ${context.wordTarget} words (${Math.floor(context.wordTarget * 0.8)}-${Math.floor(context.wordTarget * 1.2)} words acceptable)
- This is essential for proper chapter pacing and structure

SCENE CONTEXT:
- Setting: ${context.setting}
- Characters: ${context.characters.join(', ')}
- Mood: ${context.mood}
- Purpose: ${context.purpose}

ATMOSPHERIC REQUIREMENTS:
- Create immersive sensory experience
- Match atmosphere to mood: ${context.mood}
- Include subtle environmental details
- Show character's emotional state through their perception
- Use weather, lighting, and space to enhance mood
- Balance description with character interiority
- MUST meet the ${context.wordTarget} word count target

${context.researchContext ? `RESEARCH CONTEXT:\n${context.researchContext.join('\n')}\n` : ''}

Create rich, immersive atmosphere that draws readers into the scene. Remember: aim for ${context.wordTarget} words.`;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
}

/**
 * Emotional Writer - Specialized for character development and internal scenes
 */
export class EmotionalWriter {
  private config: SpecializedWriterConfig;

  constructor(config: SpecializedWriterConfig) {
    this.config = config;
  }

  async writeEmotionalScene(context: SceneContext): Promise<SceneGeneration> {
    const prompt = this.buildEmotionalPrompt(context);
    
    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: 0.8,
      maxTokens: this.config.maxTokens,
      system: `You are an expert emotional writer. Create deeply felt scenes that:
      - Show character's internal emotional journey
      - Use physical sensations to convey emotions
      - Create empathy and connection with readers
      - Balance introspection with external action
      - Show rather than tell emotional states
      - Include subtle emotional shifts and realizations
      - Connect emotions to character's deeper motivations
      - CRITICAL: Meet the exact word count target specified in the prompt`
    });

    let content = response.text.trim();
    let wordCount = this.countWords(content);
    let tokensUsed = response.usage?.totalTokens || 0;
    
    // Retry if content is too short (less than 70% of target)
    if (wordCount < context.wordTarget * 0.7) {
      console.warn(`EmotionalWriter: Generated ${wordCount} words, below target of ${context.wordTarget}. Retrying...`);
      
      const retryPrompt = `${prompt}\n\nIMPORTANT: The previous attempt was too short (${wordCount} words). You MUST write at least ${Math.floor(context.wordTarget * 0.8)} words. Add more emotional depth, character introspection, and physical reactions to reach the target.`;
      
      try {
        const retryResponse = await generateAIText(retryPrompt, {
          model: this.config.model,
          temperature: 0.7,
          maxTokens: this.config.maxTokens,
          system: `You are an expert emotional writer. CRITICAL: You must meet the exact word count target specified in the prompt. Expand with deeper emotional exploration and character development.`
        });
        
        const retryContent = retryResponse.text.trim();
        const retryWordCount = this.countWords(retryContent);
        
        if (retryWordCount > wordCount) {
          content = retryContent;
          wordCount = retryWordCount;
          tokensUsed += retryResponse.usage?.totalTokens || 0;
          console.log(`EmotionalWriter: Retry successful - improved from ${wordCount} to ${retryWordCount} words`);
        }
      } catch (retryError) {
        console.warn('EmotionalWriter: Retry failed:', retryError);
      }
    }

    return {
      content,
      wordCount,
      sceneType: 'emotion',
      qualityScore: 89,
      tokensUsed
    };
  }

  private buildEmotionalPrompt(context: SceneContext): string {
    // DEBUG: Log the word target being requested
    console.log(`🎯 EmotionalWriter building prompt for ${context.wordTarget} words`);
    
    return `Write an emotionally-driven scene of exactly ${context.wordTarget} words:

CRITICAL WORD COUNT REQUIREMENT: 
- Write approximately ${context.wordTarget} words (${Math.floor(context.wordTarget * 0.8)}-${Math.floor(context.wordTarget * 1.2)} words acceptable)
- This is essential for proper chapter pacing and structure

SCENE CONTEXT:
- Character Focus: ${context.characters[0] || 'Main character'}
- Setting: ${context.setting}
- Emotional Core: ${context.mood}
- Purpose: ${context.purpose}

EMOTIONAL REQUIREMENTS:
- Show character's internal emotional journey
- Use physical sensations to convey feelings
- Create reader empathy and connection
- Balance introspection with external details
- Show emotional growth or realization
- Connect to character's deeper motivations
- MUST meet the ${context.wordTarget} word count target

${context.characterStates ? `CHARACTER STATE:\n${context.characterStates[context.characters[0]] || 'Current emotional state'}\n` : ''}

Write a scene that creates deep emotional resonance with readers. Remember: aim for ${context.wordTarget} words.`;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
}

/**
 * Writer Director - Orchestrates specialized writers based on scene needs
 */
export class WriterDirector {
  private actionWriter: ActionSceneWriter;
  private dialogueWriter: DialogueWriter;
  private atmosphericWriter: AtmosphericWriter;
  private emotionalWriter: EmotionalWriter;

  constructor(config: SpecializedWriterConfig) {
    this.actionWriter = new ActionSceneWriter(config);
    this.dialogueWriter = new DialogueWriter(config);
    this.atmosphericWriter = new AtmosphericWriter(config);
    this.emotionalWriter = new EmotionalWriter(config);
  }

  async writeScene(context: SceneContext): Promise<SceneGeneration> {
    // DEBUG: Log the word target to track where massive numbers come from
    console.log(`📝 WriterDirector: Processing ${context.sceneType} scene with ${context.wordTarget} words target`);
    
    // Determine best writer based on scene type and context
    const sceneType = this.determineSceneType(context);
    
    switch (sceneType) {
      case 'action':
        return await this.actionWriter.writeActionScene(context);
      case 'dialogue':
        return await this.dialogueWriter.writeDialogueScene(context);
      case 'description':
        return await this.atmosphericWriter.writeAtmosphericScene(context);
      case 'emotion':
        return await this.emotionalWriter.writeEmotionalScene(context);
      default:
        // Default to atmospheric for general scenes
        return await this.atmosphericWriter.writeAtmosphericScene(context);
    }
  }

  private determineSceneType(context: SceneContext): SceneContext['sceneType'] {
    // Intelligent scene type determination based on context
    const conflict = context.conflict.toLowerCase();
    const mood = context.mood.toLowerCase();
    const purpose = context.purpose.toLowerCase();
    
    // Action scenes
    if (conflict.includes('fight') || conflict.includes('chase') || conflict.includes('battle') || 
        mood.includes('intense') || mood.includes('tense') || purpose.includes('action')) {
      return 'action';
    }
    
    // Dialogue scenes
    if (purpose.includes('conversation') || purpose.includes('dialogue') || 
        conflict.includes('argument') || conflict.includes('negotiation')) {
      return 'dialogue';
    }
    
    // Emotional scenes
    if (mood.includes('emotional') || mood.includes('sad') || mood.includes('touching') ||
        purpose.includes('character development') || purpose.includes('introspection')) {
      return 'emotion';
    }
    
    // Default to atmospheric/description
    return 'description';
  }
} 