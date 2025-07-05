import { generateAIText } from '@/lib/openai';
import type { BookSettings } from '@/types';
import type { TransitionStyle, SectionType } from '../planning/genre-structure';

export interface TransitionContext {
  // Section information
  previousSection: {
    content: string;
    type: SectionType;
    emotionalBeat: string;
    lastSentence: string;
    mainCharacters: string[];
    setting: string;
    timeframe: string;
  };
  
  nextSection: {
    type: SectionType;
    purpose: string;
    emotionalBeat: string;
    expectedCharacters: string[];
    expectedSetting: string;
    expectedTimeframe: string;
  };
  
  // Chapter context
  chapterNumber: number;
  totalChapters: number;
  chapterTitle: string;
  
  // Book context
  bookSettings: BookSettings;
  narrativeVoice: NarrativeVoice;
  
  // Transition requirements
  transitionType: TransitionStyle;
  transitionLength: 'brief' | 'medium' | 'extended';
}

export interface NarrativeVoice {
  perspective: 'first-person' | 'third-person-limited' | 'third-person-omniscient';
  tense: 'present' | 'past';
  tone: string;
  voiceCharacteristics: string[];
  styleTags: string[];
}

export interface TransitionResult {
  transitionText: string;
  transitionType: string;
  continuityElements: {
    emotionalFlow: string;
    characterStates: string[];
    settingContinuity: string;
    temporalFlow: string;
  };
  voiceConsistency: {
    maintained: boolean;
    adjustments: string[];
  };
  qualityScore: number;
}

export interface VoiceAnalysis {
  detectedVoice: NarrativeVoice;
  consistency: {
    score: number;
    issues: string[];
    recommendations: string[];
  };
  styleFingerprint: {
    sentenceStructure: string;
    vocabularyLevel: string;
    rhythmPattern: string;
    dialogueStyle: string;
  };
}

export class SectionTransitionAgent {
  private config: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  
  constructor(config = {
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 2000
  }) {
    this.config = config;
  }
  
  /**
   * Generate a smooth transition between two sections
   */
  async generateTransition(context: TransitionContext): Promise<TransitionResult> {
    try {
      console.log(`🔄 Generating ${context.transitionType.type} transition for Chapter ${context.chapterNumber}`);
      
      // Analyze the voice consistency first
      const voiceAnalysis = await this.analyzeVoiceConsistency(context);
      
      // Generate the transition based on type
      let transitionText = '';
      let continuityElements = {
        emotionalFlow: '',
        characterStates: [],
        settingContinuity: '',
        temporalFlow: ''
      };
      
      switch (context.transitionType.type) {
        case 'scene-break':
          const sceneBreak = await this.generateSceneBreak(context, voiceAnalysis);
          transitionText = sceneBreak.text;
          continuityElements = sceneBreak.continuity;
          break;
          
        case 'bridge-paragraph':
          const bridge = await this.generateBridgeParagraph(context, voiceAnalysis);
          transitionText = bridge.text;
          continuityElements = bridge.continuity;
          break;
          
        case 'time-jump':
          const timeJump = await this.generateTimeJump(context, voiceAnalysis);
          transitionText = timeJump.text;
          continuityElements = timeJump.continuity;
          break;
          
        case 'perspective-shift':
          const perspectiveShift = await this.generatePerspectiveShift(context, voiceAnalysis);
          transitionText = perspectiveShift.text;
          continuityElements = perspectiveShift.continuity;
          break;
          
        case 'emotional-bridge':
          const emotionalBridge = await this.generateEmotionalBridge(context, voiceAnalysis);
          transitionText = emotionalBridge.text;
          continuityElements = emotionalBridge.continuity;
          break;
          
        default:
          const defaultTransition = await this.generateDefaultTransition(context, voiceAnalysis);
          transitionText = defaultTransition.text;
          continuityElements = defaultTransition.continuity;
          break;
      }
      
      // Assess quality
      const qualityScore = await this.assessTransitionQuality(transitionText, context);
      
      return {
        transitionText,
        transitionType: context.transitionType.type,
        continuityElements,
        voiceConsistency: {
          maintained: voiceAnalysis.consistency.score > 80,
          adjustments: voiceAnalysis.consistency.recommendations
        },
        qualityScore
      };
      
    } catch (error) {
      console.error('Error generating transition:', error);
      
      // Return a simple fallback transition
      return {
        transitionText: this.generateFallbackTransition(context),
        transitionType: context.transitionType.type,
        continuityElements: {
          emotionalFlow: 'neutral',
          characterStates: [],
          settingContinuity: 'maintained',
          temporalFlow: 'continuous'
        },
        voiceConsistency: {
          maintained: true,
          adjustments: []
        },
        qualityScore: 70
      };
    }
  }
  
  /**
   * Analyze voice consistency based on previous content
   */
  async analyzeVoiceConsistency(context: TransitionContext): Promise<VoiceAnalysis> {
    const prompt = `Analyze the narrative voice and style of this text excerpt:

TEXT EXCERPT:
${context.previousSection.content.slice(-1000)} // Last 1000 characters

EXPECTED NARRATIVE VOICE:
- Perspective: ${context.narrativeVoice.perspective}
- Tense: ${context.narrativeVoice.tense}
- Tone: ${context.narrativeVoice.tone}
- Characteristics: ${context.narrativeVoice.voiceCharacteristics.join(', ')}

BOOK CONTEXT:
- Genre: ${context.bookSettings.genre}
- Target Audience: ${context.bookSettings.targetAudience}
- Overall Tone: ${context.bookSettings.tone}

Analyze the text and provide:
1. Detected narrative voice elements
2. Consistency score (0-100)
3. Any voice inconsistencies
4. Recommendations for maintaining voice
5. Style fingerprint characteristics

Respond in JSON format:
{
  "detectedVoice": {
    "perspective": "detected perspective",
    "tense": "detected tense",
    "tone": "detected tone",
    "voiceCharacteristics": ["characteristic1", "characteristic2"],
    "styleTags": ["tag1", "tag2"]
  },
  "consistency": {
    "score": 85,
    "issues": ["issue1", "issue2"],
    "recommendations": ["recommendation1", "recommendation2"]
  },
  "styleFingerprint": {
    "sentenceStructure": "varied/simple/complex",
    "vocabularyLevel": "accessible/advanced/literary",
    "rhythmPattern": "flowing/staccato/varied",
    "dialogueStyle": "natural/formal/colloquial"
  }
}`;

    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: 0.3,
      maxTokens: 1500,
      system: 'You are a professional literary editor analyzing narrative voice consistency. Respond with valid JSON only.'
    });
    
    try {
      return JSON.parse(response.text);
    } catch (parseError) {
      console.warn('Failed to parse voice analysis, using default');
      return {
        detectedVoice: context.narrativeVoice,
        consistency: {
          score: 85,
          issues: [],
          recommendations: []
        },
        styleFingerprint: {
          sentenceStructure: 'varied',
          vocabularyLevel: 'accessible',
          rhythmPattern: 'flowing',
          dialogueStyle: 'natural'
        }
      };
    }
  }
  
  /**
   * Generate a scene break transition
   */
  private async generateSceneBreak(
    context: TransitionContext,
    voiceAnalysis: VoiceAnalysis
  ): Promise<{ text: string; continuity: any }> {
    const prompt = `Create a scene break transition that smoothly moves from one section to another.

PREVIOUS SECTION ENDING:
${context.previousSection.lastSentence}

CURRENT CONTEXT:
- Setting: ${context.previousSection.setting}
- Characters: ${context.previousSection.mainCharacters.join(', ')}
- Emotional Beat: ${context.previousSection.emotionalBeat}
- Time: ${context.previousSection.timeframe}

NEXT SECTION REQUIREMENTS:
- Purpose: ${context.nextSection.purpose}
- Expected Setting: ${context.nextSection.expectedSetting}
- Expected Characters: ${context.nextSection.expectedCharacters.join(', ')}
- Emotional Beat: ${context.nextSection.emotionalBeat}
- Time: ${context.nextSection.expectedTimeframe}

VOICE REQUIREMENTS:
- Perspective: ${voiceAnalysis.detectedVoice.perspective}
- Tense: ${voiceAnalysis.detectedVoice.tense}
- Tone: ${voiceAnalysis.detectedVoice.tone}
- Style: ${voiceAnalysis.styleFingerprint.sentenceStructure} sentences, ${voiceAnalysis.styleFingerprint.vocabularyLevel} vocabulary

GENRE: ${context.bookSettings.genre}

Create a scene break that:
1. Provides natural closure to the previous section
2. Establishes the new scene context
3. Maintains emotional and temporal continuity
4. Matches the established narrative voice exactly
5. Uses appropriate transitions for ${context.bookSettings.genre} genre

The scene break should be ${context.transitionLength} in length.

WRITE THE SCENE BREAK TRANSITION:`;

    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: 0.7,
      maxTokens: 1000,
      system: `You are a professional novelist writing a scene break transition. Match the established voice and style exactly. Write in ${voiceAnalysis.detectedVoice.perspective} perspective, ${voiceAnalysis.detectedVoice.tense} tense.`
    });
    
    return {
      text: response.text,
      continuity: {
        emotionalFlow: `${context.previousSection.emotionalBeat} → ${context.nextSection.emotionalBeat}`,
        characterStates: context.nextSection.expectedCharacters,
        settingContinuity: `${context.previousSection.setting} → ${context.nextSection.expectedSetting}`,
        temporalFlow: `${context.previousSection.timeframe} → ${context.nextSection.expectedTimeframe}`
      }
    };
  }
  
  /**
   * Generate a bridge paragraph transition
   */
  private async generateBridgeParagraph(
    context: TransitionContext,
    voiceAnalysis: VoiceAnalysis
  ): Promise<{ text: string; continuity: any }> {
    const prompt = `Create a bridge paragraph that smoothly connects two sections within the same scene.

PREVIOUS SECTION ENDING:
${context.previousSection.lastSentence}

TRANSITION REQUIREMENTS:
- Maintain current setting: ${context.previousSection.setting}
- Continue with characters: ${context.previousSection.mainCharacters.join(', ')}
- Flow from: ${context.previousSection.emotionalBeat} to ${context.nextSection.emotionalBeat}
- Next section purpose: ${context.nextSection.purpose}

VOICE REQUIREMENTS:
- Style: ${voiceAnalysis.styleFingerprint.sentenceStructure} sentences
- Vocabulary: ${voiceAnalysis.styleFingerprint.vocabularyLevel}
- Rhythm: ${voiceAnalysis.styleFingerprint.rhythmPattern}
- Perspective: ${voiceAnalysis.detectedVoice.perspective}
- Tense: ${voiceAnalysis.detectedVoice.tense}

GENRE: ${context.bookSettings.genre}

Create a bridge paragraph that:
1. Flows naturally from the previous section
2. Maintains scene continuity
3. Prepares for the next section's purpose
4. Matches the established narrative voice perfectly
5. Uses appropriate transitions for ${context.bookSettings.genre} genre

The bridge should be ${context.transitionLength} in length.

WRITE THE BRIDGE PARAGRAPH:`;

    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: 0.7,
      maxTokens: 800,
      system: `You are a professional novelist writing a bridge paragraph. Match the established voice and style exactly. Write in ${voiceAnalysis.detectedVoice.perspective} perspective, ${voiceAnalysis.detectedVoice.tense} tense.`
    });
    
    return {
      text: response.text,
      continuity: {
        emotionalFlow: `bridging from ${context.previousSection.emotionalBeat} to ${context.nextSection.emotionalBeat}`,
        characterStates: context.previousSection.mainCharacters,
        settingContinuity: 'maintained',
        temporalFlow: 'continuous'
      }
    };
  }
  
  /**
   * Generate a time jump transition
   */
  private async generateTimeJump(
    context: TransitionContext,
    voiceAnalysis: VoiceAnalysis
  ): Promise<{ text: string; continuity: any }> {
    const prompt = `Create a time jump transition that moves the story forward in time.

PREVIOUS SECTION ENDING:
${context.previousSection.lastSentence}

TIME JUMP REQUIREMENTS:
- From: ${context.previousSection.timeframe}
- To: ${context.nextSection.expectedTimeframe}
- Characters: ${context.nextSection.expectedCharacters.join(', ')}
- New setting: ${context.nextSection.expectedSetting}
- Next section purpose: ${context.nextSection.purpose}

VOICE REQUIREMENTS:
- Perspective: ${voiceAnalysis.detectedVoice.perspective}
- Tense: ${voiceAnalysis.detectedVoice.tense}
- Style: ${voiceAnalysis.styleFingerprint.sentenceStructure} sentences
- Vocabulary: ${voiceAnalysis.styleFingerprint.vocabularyLevel}

GENRE: ${context.bookSettings.genre}

Create a time jump that:
1. Clearly indicates the passage of time
2. Reorients the reader to the new temporal context
3. Maintains character continuity
4. Matches the established narrative voice
5. Uses appropriate time transition techniques for ${context.bookSettings.genre}

The time jump should be ${context.transitionLength} in length.

WRITE THE TIME JUMP TRANSITION:`;

    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: 0.7,
      maxTokens: 900,
      system: `You are a professional novelist writing a time jump transition. Match the established voice and style exactly. Write in ${voiceAnalysis.detectedVoice.perspective} perspective, ${voiceAnalysis.detectedVoice.tense} tense.`
    });
    
    return {
      text: response.text,
      continuity: {
        emotionalFlow: `temporal shift maintaining ${context.nextSection.emotionalBeat}`,
        characterStates: context.nextSection.expectedCharacters,
        settingContinuity: `location shift: ${context.previousSection.setting} → ${context.nextSection.expectedSetting}`,
        temporalFlow: `time jump: ${context.previousSection.timeframe} → ${context.nextSection.expectedTimeframe}`
      }
    };
  }
  
  /**
   * Generate a perspective shift transition
   */
  private async generatePerspectiveShift(
    context: TransitionContext,
    voiceAnalysis: VoiceAnalysis
  ): Promise<{ text: string; continuity: any }> {
    const prompt = `Create a perspective shift transition that changes the point of view character.

PREVIOUS SECTION CONTEXT:
- Main characters: ${context.previousSection.mainCharacters.join(', ')}
- Setting: ${context.previousSection.setting}
- Emotional beat: ${context.previousSection.emotionalBeat}
- Ending: ${context.previousSection.lastSentence}

NEW PERSPECTIVE:
- Focus characters: ${context.nextSection.expectedCharacters.join(', ')}
- Setting: ${context.nextSection.expectedSetting}
- Emotional beat: ${context.nextSection.emotionalBeat}
- Purpose: ${context.nextSection.purpose}

VOICE REQUIREMENTS:
- Maintain perspective: ${voiceAnalysis.detectedVoice.perspective}
- Tense: ${voiceAnalysis.detectedVoice.tense}
- Style consistency: ${voiceAnalysis.styleFingerprint.sentenceStructure} sentences
- Vocabulary: ${voiceAnalysis.styleFingerprint.vocabularyLevel}

GENRE: ${context.bookSettings.genre}

Create a perspective shift that:
1. Smoothly transitions between viewpoints
2. Maintains the established narrative voice
3. Provides necessary context for the new perspective
4. Preserves story continuity
5. Uses appropriate techniques for ${context.bookSettings.genre}

The perspective shift should be ${context.transitionLength} in length.

WRITE THE PERSPECTIVE SHIFT TRANSITION:`;

    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: 0.7,
      maxTokens: 900,
      system: `You are a professional novelist writing a perspective shift. Match the established voice and style exactly. Write in ${voiceAnalysis.detectedVoice.perspective} perspective, ${voiceAnalysis.detectedVoice.tense} tense.`
    });
    
    return {
      text: response.text,
      continuity: {
        emotionalFlow: `perspective shift maintaining ${context.nextSection.emotionalBeat}`,
        characterStates: context.nextSection.expectedCharacters,
        settingContinuity: `maintained in ${context.nextSection.expectedSetting}`,
        temporalFlow: 'continuous with perspective change'
      }
    };
  }
  
  /**
   * Generate an emotional bridge transition
   */
  private async generateEmotionalBridge(
    context: TransitionContext,
    voiceAnalysis: VoiceAnalysis
  ): Promise<{ text: string; continuity: any }> {
    const prompt = `Create an emotional bridge that connects two different emotional states.

EMOTIONAL TRANSITION:
- From: ${context.previousSection.emotionalBeat}
- To: ${context.nextSection.emotionalBeat}
- Characters: ${context.previousSection.mainCharacters.join(', ')}
- Setting: ${context.previousSection.setting}
- Next section purpose: ${context.nextSection.purpose}

VOICE REQUIREMENTS:
- Perspective: ${voiceAnalysis.detectedVoice.perspective}
- Tense: ${voiceAnalysis.detectedVoice.tense}
- Style: ${voiceAnalysis.styleFingerprint.sentenceStructure} sentences
- Vocabulary: ${voiceAnalysis.styleFingerprint.vocabularyLevel}
- Rhythm: ${voiceAnalysis.styleFingerprint.rhythmPattern}

GENRE: ${context.bookSettings.genre}

Create an emotional bridge that:
1. Naturally transitions between emotional states
2. Maintains character authenticity
3. Prepares for the next section's emotional tone
4. Matches the established narrative voice perfectly
5. Uses appropriate emotional techniques for ${context.bookSettings.genre}

The emotional bridge should be ${context.transitionLength} in length.

WRITE THE EMOTIONAL BRIDGE TRANSITION:`;

    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: 0.8,
      maxTokens: 800,
      system: `You are a professional novelist writing an emotional bridge. Match the established voice and style exactly. Write in ${voiceAnalysis.detectedVoice.perspective} perspective, ${voiceAnalysis.detectedVoice.tense} tense.`
    });
    
    return {
      text: response.text,
      continuity: {
        emotionalFlow: `emotional bridge: ${context.previousSection.emotionalBeat} → ${context.nextSection.emotionalBeat}`,
        characterStates: context.previousSection.mainCharacters,
        settingContinuity: 'maintained',
        temporalFlow: 'continuous'
      }
    };
  }
  
  /**
   * Generate a default transition
   */
  private async generateDefaultTransition(
    context: TransitionContext,
    voiceAnalysis: VoiceAnalysis
  ): Promise<{ text: string; continuity: any }> {
    const prompt = `Create a smooth transition between two sections of a story.

PREVIOUS SECTION:
- Ending: ${context.previousSection.lastSentence}
- Type: ${context.previousSection.type}
- Emotional beat: ${context.previousSection.emotionalBeat}

NEXT SECTION:
- Type: ${context.nextSection.type}
- Purpose: ${context.nextSection.purpose}
- Emotional beat: ${context.nextSection.emotionalBeat}

VOICE REQUIREMENTS:
- Perspective: ${voiceAnalysis.detectedVoice.perspective}
- Tense: ${voiceAnalysis.detectedVoice.tense}
- Style: ${voiceAnalysis.styleFingerprint.sentenceStructure} sentences
- Vocabulary: ${voiceAnalysis.styleFingerprint.vocabularyLevel}

Create a transition that maintains narrative flow and voice consistency.

WRITE THE TRANSITION:`;

    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: 0.7,
      maxTokens: 600,
      system: `You are a professional novelist. Match the established voice and style exactly. Write in ${voiceAnalysis.detectedVoice.perspective} perspective, ${voiceAnalysis.detectedVoice.tense} tense.`
    });
    
    return {
      text: response.text,
      continuity: {
        emotionalFlow: `smooth transition: ${context.previousSection.emotionalBeat} → ${context.nextSection.emotionalBeat}`,
        characterStates: context.previousSection.mainCharacters,
        settingContinuity: 'maintained',
        temporalFlow: 'continuous'
      }
    };
  }
  
  /**
   * Assess the quality of a generated transition
   */
  private async assessTransitionQuality(
    transitionText: string,
    context: TransitionContext
  ): Promise<number> {
    // Simple quality assessment based on length and coherence
    const wordCount = transitionText.trim().split(/\s+/).length;
    const expectedLength = context.transitionLength === 'brief' ? 30 : 
                          context.transitionLength === 'medium' ? 60 : 100;
    
    let score = 85; // Base score
    
    // Length appropriateness
    const lengthRatio = wordCount / expectedLength;
    if (lengthRatio < 0.5 || lengthRatio > 2) {
      score -= 10;
    }
    
    // Basic coherence checks
    if (transitionText.includes(context.nextSection.purpose)) score += 5;
    if (transitionText.includes('...') || transitionText.includes('unclear')) score -= 15;
    
    return Math.max(60, Math.min(100, score));
  }
  
  /**
   * Generate a simple fallback transition
   */
  private generateFallbackTransition(context: TransitionContext): string {
    const templates = {
      'scene-break': `\n\n* * *\n\n`,
      'bridge-paragraph': `Meanwhile, `,
      'time-jump': `Later, `,
      'perspective-shift': `\n\n`,
      'emotional-bridge': `The feeling shifted as `
    };
    
    return templates[context.transitionType.type] || '\n\n';
  }
  
  /**
   * Extract narrative voice from a text sample
   */
  async extractNarrativeVoice(textSample: string, settings: BookSettings): Promise<NarrativeVoice> {
    const prompt = `Analyze this text sample and determine the narrative voice characteristics:

TEXT SAMPLE:
${textSample.slice(0, 1500)}

BOOK CONTEXT:
- Genre: ${settings.genre}
- Tone: ${settings.tone}
- Target Audience: ${settings.targetAudience}

Identify:
1. Narrative perspective (first-person, third-person-limited, third-person-omniscient)
2. Tense (present, past)
3. Tone and voice characteristics
4. Style elements

Respond in JSON format:
{
  "perspective": "detected perspective",
  "tense": "detected tense",
  "tone": "detected tone",
  "voiceCharacteristics": ["characteristic1", "characteristic2"],
  "styleTags": ["tag1", "tag2"]
}`;

    try {
      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: 0.3,
        maxTokens: 800,
        system: 'You are a literary editor analyzing narrative voice. Respond with valid JSON only.'
      });
      
      const analysis = JSON.parse(response.text);
      return {
        perspective: analysis.perspective || 'third-person-limited',
        tense: analysis.tense || 'past',
        tone: analysis.tone || settings.tone,
        voiceCharacteristics: analysis.voiceCharacteristics || [],
        styleTags: analysis.styleTags || []
      };
    } catch (error) {
      console.warn('Failed to extract narrative voice, using defaults');
      return {
        perspective: 'third-person-limited',
        tense: 'past',
        tone: settings.tone,
        voiceCharacteristics: ['consistent', 'engaging'],
        styleTags: ['standard', 'accessible']
      };
    }
  }
}

export default SectionTransitionAgent; 