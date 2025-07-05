import { generateAIText } from '@/lib/openai';
import type { BookSettings } from '@/types';
import { ProseValidator, type ProseValidation, type ProseWarning } from '@/lib/proseValidator';

export interface WritingAgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  retryShortContent?: boolean; // Optional retry for short content
}

export interface SectionContext {
  bookTitle: string;
  bookPrompt: string;
  backCover: string;
  outline: string;
  chapterTitle: string;
  chapterSummary: string;
  sectionNumber: number;
  totalSections: number;
  previousSections?: string[];
  characters?: string[];
  settings: BookSettings;
  // NEW: Optional emotional and scene guidance
  sectionPurpose?: string;
  sceneMood?: string;
  emotionalBeat?: string;
}

export interface SectionGeneration {
  content: string;
  wordCount: number;
  tokensUsed: number;
  warnings?: string[]; // NEW: Track any validation warnings
}



export class WritingAgent {
  private config: WritingAgentConfig;

  constructor(config: WritingAgentConfig) {
    this.config = config;
  }

  async generateSection(context: SectionContext): Promise<SectionGeneration> {
    try {
      const prompt = this.buildSectionPrompt(context);
      
      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        system: this.getSystemPrompt()
      });

      if (!response.text) {
        throw new Error('No content generated');
      }

      const tokensUsed = response.usage?.totalTokens || 0;
      const wordCount = this.countWords(response.text);
      const targetWords = context.settings.wordCount || 1000;
      
      // NEW: Fallback logic for short content
      const warnings: string[] = [];
      let finalContent = response.text.trim();
      
      // Check if content is too short (< 80% of target)
      const minWordCount = Math.floor(targetWords * 0.8);
      if (wordCount < minWordCount) {
        const shortWarning = `Generated content is ${wordCount} words, below target of ${targetWords} words (${Math.round((wordCount / targetWords) * 100)}% of target)`;
        console.warn('WritingAgent:', shortWarning);
        warnings.push(shortWarning);
        
        // Optional retry for short content
        if (this.config.retryShortContent) {
          try {
            console.log('Attempting retry for short content...');
            const retryPrompt = this.buildSectionPrompt({
              ...context,
              // Add emphasis on word count for retry
              sectionPurpose: `${context.sectionPurpose || ''} CRITICAL: Must reach ${targetWords} words minimum.`.trim()
            });
            
            const retryResponse = await generateAIText(retryPrompt, {
              model: this.config.model,
              temperature: this.config.temperature * 0.9, // Slightly lower temperature for retry
              maxTokens: this.config.maxTokens,
              system: this.getSystemPrompt()
            });
            
            if (retryResponse.text) {
              const retryWordCount = this.countWords(retryResponse.text);
              if (retryWordCount > wordCount) {
                finalContent = retryResponse.text.trim();
                warnings.push(`Retry successful: improved from ${wordCount} to ${retryWordCount} words`);
              }
            }
          } catch (retryError) {
            warnings.push(`Retry failed: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
          }
        }
      }

      // NEW: Validate prose quality
      const proseValidation = ProseValidator.validateProse(finalContent);
      if (!proseValidation.isValid) {
        warnings.push(...proseValidation.warnings.map(w => w.message));
      }

      return {
        content: finalContent,
        wordCount: this.countWords(finalContent),
        tokensUsed,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      console.error('WritingAgent error:', error);
      throw new Error(`Failed to generate section: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }











  private getSystemPrompt(): string {
    return `You are a professional book writing AI. Your role is to write engaging, high-quality fiction that captivates readers.

WRITING GUIDELINES:
- Write in a compelling, immersive style that draws readers in
- Show, don't tell - use vivid descriptions and dialogue
- Maintain consistent character voices and personalities
- Create natural, flowing narrative that moves the story forward
- Include sensory details and emotional depth
- Write in third person unless specified otherwise
- Ensure proper pacing - balance action, dialogue, and description
- Use strong, specific verbs and precise language
- Create smooth transitions between scenes and ideas

CONTENT REQUIREMENTS:
- CRITICAL: Hit the specified word count target (within 10-20% range)
- Generate content that matches the target word count specified in the prompt
- Maintain consistency with the book's genre, tone, and style
- Follow the chapter outline and story progression
- Include character development and plot advancement
- End sections with natural stopping points or compelling hooks

WORD COUNT TARGETING:
- Always aim for the specific word count requested in the prompt
- Use the word count guidance provided to adjust pacing and detail level
- If target is 500 words: Focus on a single impactful scene
- If target is 800-1000 words: Develop one main scene with rich detail
- If target is 1200+ words: Include multiple scenes or extensive development

FORMATTING:
- Use proper paragraph breaks for readability (every 100-200 words)
- Include dialogue with proper formatting
- Vary sentence length and structure for engaging rhythm
- No chapter titles or section headers in the content
- Focus on pure narrative prose
- Avoid meta-commentary or author notes

Remember: Meeting the word count target is crucial for proper book structure and pacing.`;
  }

  private buildSectionPrompt(context: SectionContext): string {
    const {
      bookTitle,
      bookPrompt,
      backCover,
      chapterTitle,
      chapterSummary,
      sectionNumber,
      totalSections,
      previousSections = [],
      characters = [],
      settings,
      // NEW: Optional emotional and scene guidance
      sectionPurpose,
      sceneMood,
      emotionalBeat
    } = context;

    // Calculate target word count for this section
    const targetWords = settings.wordCount || 1000;
    const wordGuidance = this.getWordCountGuidance(targetWords);

    let prompt = `Write section ${sectionNumber} of ${totalSections} for the chapter "${chapterTitle}".

BOOK DETAILS:
Title: "${bookTitle}"
Genre: ${settings.genre}
Target Audience: ${settings.targetAudience}
Tone: ${settings.tone}

STORY CONTEXT:
Original Prompt: ${bookPrompt}
Back Cover Summary: ${backCover}

CHAPTER CONTEXT:
Chapter: "${chapterTitle}"
Chapter Summary: ${chapterSummary}

WORD COUNT TARGET: ${targetWords} words
${wordGuidance}

SECTION REQUIREMENTS:
- This is section ${sectionNumber} of ${totalSections} in this chapter
- Write approximately ${targetWords} words (${Math.floor(targetWords * 0.8)}-${Math.floor(targetWords * 1.2)} words acceptable range)
- ${sectionNumber === 1 ? 'Start the chapter with an engaging opening that draws readers in' : 
  sectionNumber === totalSections ? 'End the chapter with a satisfying conclusion or compelling cliffhanger' : 
  'Continue the story naturally from the previous section, building tension and developing the plot'}
`;

    // NEW: Add emotional and scene guidance if provided
    if (sectionPurpose) {
      prompt += `\nSECTION PURPOSE: ${sectionPurpose}`;
    }
    
    if (sceneMood) {
      prompt += `\nSCENE MOOD: ${sceneMood}`;
    }
    
    if (emotionalBeat) {
      prompt += `\nEMOTIONAL BEAT: ${emotionalBeat}`;
    }

    if (characters.length > 0) {
      prompt += `\nKEY CHARACTERS: ${characters.join(', ')}`;
    }

    if (previousSections.length > 0) {
      prompt += `\nPREVIOUS SECTIONS CONTEXT:
${previousSections.map((section, i) => `Section ${i + (sectionNumber - previousSections.length)}: ${section.substring(0, 400)}...`).join('\n')}`;
    }

    prompt += `\n\nGenerate engaging, high-quality prose that:
1. Continues the story naturally and maintains the ${settings.tone} tone
2. Reaches approximately ${targetWords} words in length
3. Includes vivid descriptions, compelling dialogue, and character development
4. ${sectionNumber === totalSections ? 'Provides a strong chapter ending' : 'Sets up naturally for the next section'}
5. Maintains consistency with the established story world and characters`;

    // NEW: Add emotional guidance to prose requirements
    if (sceneMood || emotionalBeat) {
      prompt += `\n6. Captures the specified mood and emotional beats to enhance reader engagement`;
    }

    prompt += `\n\nFocus on creating immersive, page-turning content that keeps readers engaged. Use proper paragraph breaks and varied sentence structures for optimal readability.`;

    return prompt;
  }

  /**
   * Provide word count guidance based on target
   */
  private getWordCountGuidance(targetWords: number): string {
    if (targetWords <= 500) {
      return "PACING: Short, punchy section - focus on a single scene or moment with high impact.";
    } else if (targetWords <= 800) {
      return "PACING: Medium-length section - develop one main scene with character interaction and plot advancement.";
    } else if (targetWords <= 1200) {
      return "PACING: Standard section - include multiple scenes or one detailed scene with rich description and dialogue.";
    } else {
      return "PACING: Extended section - develop complex scenes with multiple characters, detailed world-building, and significant plot progression.";
    }
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
} 