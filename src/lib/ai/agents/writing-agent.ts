import { generateAIText } from '@/lib/openai';
import type { BookSettings } from '@/types';
import { ProseValidator, type ProseValidation, type ProseWarning } from '@/lib/proseValidator';
import { LanguageManager } from '../language/language-utils';
import { LanguagePrompts } from '../language/language-prompts';

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
  // NEW: Explicit word target for this section
  wordTarget?: number;
}

export interface SectionGeneration {
  content: string;
  wordCount: number;
  tokensUsed: number;
  warnings?: string[]; // NEW: Track any validation warnings
}



export class WritingAgent {
  private config: WritingAgentConfig;
  private languageManager: LanguageManager;
  private languagePrompts: LanguagePrompts;

  constructor(config: WritingAgentConfig) {
    this.config = config;
    this.languageManager = LanguageManager.getInstance();
    this.languagePrompts = LanguagePrompts.getInstance();
  }

  async generateSection(context: SectionContext): Promise<SectionGeneration> {
    try {
      const targetWords = context.wordTarget || 1000;
      const languageCode = context.settings.language || 'en';
      
      // DEBUG: Log the word target and language
      console.log(`📝 WritingAgent: Generating section with ${targetWords} words target in ${languageCode}`);
      
      const prompt = this.buildSectionPrompt(context);
      
      // Get language-adjusted temperature
      const adjustedTemperature = this.languageManager.getAdjustedTemperature(languageCode, this.config.temperature);
      
      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: adjustedTemperature,
        maxTokens: this.config.maxTokens,
        system: this.getSystemPrompt(languageCode)
      });

      if (!response.text) {
        throw new Error('No content generated');
      }

      const tokensUsed = response.usage?.totalTokens || 0;
      const wordCount = this.countWords(response.text);
      
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
              temperature: adjustedTemperature * 0.9, // Slightly lower temperature for retry
              maxTokens: this.config.maxTokens,
              system: this.getSystemPrompt(languageCode)
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

      // NEW: Validate language output
      const languageValidation = this.languageManager.validateLanguageOutput(finalContent, languageCode);
      if (!languageValidation.isValid) {
        warnings.push(...languageValidation.warnings);
        console.warn(`WritingAgent: Language validation failed for ${languageCode}`, languageValidation.warnings);
      }

      // Log language quality expectations
      const qualityExpectations = this.languageManager.getQualityExpectations(languageCode);
      if (qualityExpectations.warnings.length > 0) {
        console.log(`WritingAgent: Language quality note for ${languageCode}:`, qualityExpectations.warnings);
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











  private getSystemPrompt(languageCode: string = 'en'): string {
    return this.languagePrompts.getWritingSystemPrompt(languageCode);
  }

  private buildSectionPrompt(context: SectionContext): string {
    const languageCode = context.settings.language || 'en';
    
    // DEBUG: Log the word target and language being requested
    console.log(`🎯 WritingAgent building prompt for ${context.wordTarget || 1000} words in ${languageCode}`);
    
    return this.languagePrompts.getWritingContentPrompt(languageCode, context);
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