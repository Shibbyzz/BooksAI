import { generateAIText } from '@/lib/openai';
import type { BookSettings } from '@/types';
import { ProseValidator, type ProseValidation } from '@/lib/proseValidator';
import { LanguageManager } from '../language/language-utils';
import { LanguagePrompts } from '../language/language-prompts';

export interface ProofreaderAgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ProofreadingResult {
  originalContent: string;
  polishedContent: string;
  corrections: ProofreadingCorrection[];
  proseValidation: ProseValidation;
  qualityScore: number;
  scoringSummary: string;
  wordCount: number;
  tokensUsed: number;
}

export interface ProofreadingCorrection {
  type: 'grammar' | 'style' | 'consistency' | 'clarity' | 'flow';
  original: string;
  corrected: string;
  reason: string;
  confidence: number;
}

export interface QuickPolishResult {
  polishedContent: string;
  proseValidation: ProseValidation;
  qualityScore: number;
  scoringSummary: string;
  wordCount: number;
  shouldReview: boolean;
}

export interface ChapterProofreadContext {
  chapterNumber: number;
  chapterTitle: string;
  content: string;
  settings: BookSettings;
  characterNames?: string[];
  previousChapterSummary?: string;
  overallTone?: string;
}

export class ProofreaderAgent {
  private config: ProofreaderAgentConfig;
  private languageManager: LanguageManager;
  private languagePrompts: LanguagePrompts;

  constructor(config: ProofreaderAgentConfig) {
    this.config = config;
    this.languageManager = LanguageManager.getInstance();
    this.languagePrompts = LanguagePrompts.getInstance();
  }

  /**
   * Proofread and polish a chapter with comprehensive quality improvements
   */
  async proofreadChapter(context: ChapterProofreadContext): Promise<ProofreadingResult> {
    try {
      const languageCode = context.settings.language || 'en';
      const prompt = this.buildProofreadingPrompt(context);
      const adjustedTemperature = this.languageManager.getAdjustedTemperature(languageCode, this.config.temperature);
      
      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: adjustedTemperature,
        maxTokens: this.config.maxTokens,
        system: this.getSystemPrompt(languageCode)
      });

      if (!response.text) {
        throw new Error('No proofreading result generated');
      }

      const result = this.parseProofreadingResult(context.content, response.text);
      
      // If parsing failed and we don't have structured data, try simplified prompt
      if (!result.polishedContent || result.polishedContent === context.content) {
        console.warn('Proofreading result parsing failed, attempting simplified prompt...');
        try {
          const simplifiedResult = await this.retryWithSimplifiedPrompt(context);
          if (simplifiedResult.polishedContent !== context.content) {
            result.polishedContent = simplifiedResult.polishedContent;
            result.corrections.push(...simplifiedResult.corrections);
          }
        } catch (retryError) {
          console.error('Simplified prompt retry failed:', retryError);
        }
      }

      // Validate prose quality
      const proseValidation = ProseValidator.validateProse(result.polishedContent);
      
      // Validate language output
      const languageValidation = this.languageManager.validateLanguageOutput(result.polishedContent, languageCode);
      if (!languageValidation.isValid) {
        console.warn(`ProofreaderAgent: Language validation failed for ${languageCode}`, languageValidation.warnings);
      }
      
      // Calculate quality score and scoring summary
      const qualityAnalysis = ProseValidator.calculateQualityScore(proseValidation, result.corrections.length);
      const qualityScore = qualityAnalysis.score;
      const scoringSummary = qualityAnalysis.summary;
      
      return {
        originalContent: context.content,
        polishedContent: result.polishedContent,
        corrections: result.corrections,
        proseValidation,
        qualityScore,
        scoringSummary,
        wordCount: this.countWords(result.polishedContent),
        tokensUsed: response.usage?.totalTokens || 0
      };
      
    } catch (error) {
      console.error('ProofreaderAgent error:', error);
      
      // Return original content with basic validation on error
      const proseValidation = ProseValidator.validateProse(context.content);
      const qualityAnalysis = ProseValidator.calculateQualityScore(proseValidation, 0);
      const qualityScore = qualityAnalysis.score;
      const scoringSummary = qualityAnalysis.summary;
      
      return {
        originalContent: context.content,
        polishedContent: context.content,
        corrections: [],
        proseValidation,
        qualityScore,
        scoringSummary,
        wordCount: this.countWords(context.content),
        tokensUsed: 0
      };
    }
  }

  /**
   * Quick polish for individual sections (faster, lighter corrections)
   */
  async quickPolish(content: string, settings: BookSettings): Promise<string> {
    try {
      const languageCode = settings.language || 'en';
      const adjustedTemperature = this.languageManager.getAdjustedTemperature(languageCode, 0.0);
      
      let prompt = `Polish this text for grammar, clarity, and flow while maintaining the ${settings.tone} tone and ${settings.genre} genre style:

ORIGINAL TEXT:
${content}

POLISHED VERSION (return only the improved text):`;

      // Add language-specific instructions for non-English content
      const languageAdditions = this.languageManager.getContentPromptAdditions(languageCode, settings.genre);
      prompt += languageAdditions;

      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: adjustedTemperature,
        maxTokens: Math.min(this.config.maxTokens, 3000),
        system: this.getSystemPrompt(languageCode)
      });

      const polishedContent = response.text.trim() || content;
      
      // Validate language output
      const languageValidation = this.languageManager.validateLanguageOutput(polishedContent, languageCode);
      if (!languageValidation.isValid) {
        console.warn(`ProofreaderAgent.quickPolish: Language validation failed for ${languageCode}`, languageValidation.warnings);
      }

      return polishedContent;
      
    } catch (error) {
      console.error('Quick polish error:', error);
      return content; // Return original on error
    }
  }

  /**
   * Enhanced quick polish with detailed quality feedback
   */
  async quickPolishDetailed(content: string, settings: BookSettings): Promise<QuickPolishResult> {
    try {
      const languageCode = settings.language || 'en';
      const adjustedTemperature = this.languageManager.getAdjustedTemperature(languageCode, 0.0);
      
      let prompt = `Polish this text for grammar, clarity, and flow while maintaining the ${settings.tone} tone and ${settings.genre} genre style:

ORIGINAL TEXT:
${content}

POLISHED VERSION (return only the improved text):`;

      // Add language-specific instructions for non-English content
      const languageAdditions = this.languageManager.getContentPromptAdditions(languageCode, settings.genre);
      prompt += languageAdditions;

      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: adjustedTemperature,
        maxTokens: Math.min(this.config.maxTokens, 3000),
        system: this.getSystemPrompt(languageCode)
      });

      const polishedContent = response.text.trim() || content;
      
      // Validate language output
      const languageValidation = this.languageManager.validateLanguageOutput(polishedContent, languageCode);
      if (!languageValidation.isValid) {
        console.warn(`ProofreaderAgent.quickPolishDetailed: Language validation failed for ${languageCode}`, languageValidation.warnings);
      }
      
      // Validate prose quality
      const proseValidation = ProseValidator.validateProse(polishedContent);
      
      // Calculate quality score and summary
      const qualityAnalysis = ProseValidator.calculateQualityScore(proseValidation, 0);
      
      return {
        polishedContent,
        proseValidation,
        qualityScore: qualityAnalysis.score,
        scoringSummary: qualityAnalysis.summary,
        wordCount: this.countWords(polishedContent),
        shouldReview: qualityAnalysis.shouldReview
      };
      
    } catch (error) {
      console.error('Quick polish detailed error:', error);
      
      // Return original content with validation
      const proseValidation = ProseValidator.validateProse(content);
      const qualityAnalysis = ProseValidator.calculateQualityScore(proseValidation, 0);
      
      return {
        polishedContent: content,
        proseValidation,
        qualityScore: qualityAnalysis.score,
        scoringSummary: qualityAnalysis.summary,
        wordCount: this.countWords(content),
        shouldReview: qualityAnalysis.shouldReview
      };
    }
  }

  /**
   * Retry with simplified prompt if structured parsing fails
   */
  private async retryWithSimplifiedPrompt(context: ChapterProofreadContext): Promise<{
    polishedContent: string;
    corrections: ProofreadingCorrection[];
  }> {
    const languageCode = context.settings.language || 'en';
    const adjustedTemperature = this.languageManager.getAdjustedTemperature(languageCode, 0.0);
    
    let simplifiedPrompt = `Please improve this chapter content for a ${context.settings.genre} book. Fix grammar, improve clarity, and enhance flow while maintaining the ${context.settings.tone} tone:

${context.content}

Return only the improved version:`;

    // Add language-specific instructions for non-English content
    const languageAdditions = this.languageManager.getContentPromptAdditions(languageCode, context.settings.genre);
    simplifiedPrompt += languageAdditions;

    const response = await generateAIText(simplifiedPrompt, {
      model: this.config.model,
      temperature: adjustedTemperature,
      maxTokens: this.config.maxTokens,
      system: this.getSystemPrompt(languageCode)
    });

    const polishedContent = response.text.trim() || context.content;
    
    // Validate language output
    const languageValidation = this.languageManager.validateLanguageOutput(polishedContent, languageCode);
    if (!languageValidation.isValid) {
      console.warn(`ProofreaderAgent.retryWithSimplifiedPrompt: Language validation failed for ${languageCode}`, languageValidation.warnings);
    }

    return {
      polishedContent,
      corrections: [{
        type: 'style',
        original: 'Original content',
        corrected: 'Simplified polish applied',
        reason: 'Applied general improvements via simplified prompt',
        confidence: 70
      }]
    };
  }















  private getSystemPrompt(languageCode: string = 'en'): string {
    return this.languagePrompts.getProofreaderSystemPrompt(languageCode);
  }

  private buildProofreadingPrompt(context: ChapterProofreadContext): string {
    const {
      chapterNumber,
      chapterTitle,
      content,
      settings,
      characterNames = [],
      previousChapterSummary = '',
      overallTone = settings.tone
    } = context;

    const languageCode = settings.language || 'en';

    const prompt = `Proofread and polish Chapter ${chapterNumber}: "${chapterTitle}" for a ${settings.genre} book.

BOOK CONTEXT:
- Genre: ${settings.genre}
- Target Audience: ${settings.targetAudience}  
- Tone: ${overallTone}
- Key Characters: ${characterNames.join(', ')}

${previousChapterSummary ? `PREVIOUS CHAPTER SUMMARY:\n${previousChapterSummary}\n` : ''}

CHAPTER CONTENT TO PROOFREAD:
${content}

Please provide comprehensive proofreading that includes:

1. POLISHED_CONTENT: The improved version with all corrections applied
2. CORRECTIONS: Detailed list of changes made (format: "Original text" → "Corrected text" | Reason: explanation)
3. QUALITY_SCORE: Overall quality rating from 1-100

Focus on maintaining the ${settings.tone} tone while improving clarity, flow, and professional quality.`;

    // Add language-specific instructions for non-English content
    const languageAdditions = this.languageManager.getContentPromptAdditions(languageCode, settings.genre);
    return prompt + languageAdditions;
  }

  private parseProofreadingResult(originalContent: string, response: string): {
    polishedContent: string;
    corrections: ProofreadingCorrection[];
    qualityScore: number;
  } {
    try {
      // Try to parse structured response
      const polishedMatch = response.match(/POLISHED_CONTENT:\s*([\s\S]*?)(?=CORRECTIONS:|QUALITY_SCORE:|$)/);
      const correctionsMatch = response.match(/CORRECTIONS:\s*([\s\S]*?)(?=QUALITY_SCORE:|$)/);
      const qualityMatch = response.match(/QUALITY_SCORE:\s*(\d+)/);

      const polishedContent = polishedMatch?.[1]?.trim() || response.trim();
      const qualityScore = qualityMatch ? parseInt(qualityMatch[1]) : 85;
      
      // Enhanced correction parsing
      const corrections: ProofreadingCorrection[] = [];
      if (correctionsMatch) {
        const correctionText = correctionsMatch[1];
        
        // Parse different correction formats
        const patterns = [
          // Format: "Original text" → "Corrected text" | Reason: explanation
          /"([^"]+)"\s*→\s*"([^"]+)"\s*\|\s*Reason:\s*(.+)/g,
          // Format: Original text → Corrected text | Reason: explanation
          /([^→|]+)\s*→\s*([^|]+)\s*\|\s*Reason:\s*(.+)/g,
          // Format: "Original text" → "Corrected text"
          /"([^"]+)"\s*→\s*"([^"]+)"/g,
          // Format: Original text → Corrected text
          /([^→\n]+)\s*→\s*([^→\n]+)/g,
          // Format: Original text -> Corrected text
          /([^->\n]+)\s*->\s*([^->\n]+)/g,
          // Bullet points with changes
          /[-•*]\s*(.+?):\s*(.+)/g,
          // Numbered corrections
          /\d+\.\s*(.+?):\s*(.+)/g
        ];
        
        let foundCorrections = false;
        for (const pattern of patterns) {
          const matches = Array.from(correctionText.matchAll(pattern));
          if (matches.length > 0) {
            foundCorrections = true;
            for (const match of matches.slice(0, 15)) { // Limit to 15 corrections
              const [, original, corrected, reason] = match;
              if (original && corrected && original.trim() !== corrected.trim()) {
                corrections.push({
                  type: this.categorizeCorrection(original, corrected, reason),
                  original: original.trim(),
                  corrected: corrected.trim(),
                  reason: reason?.trim() || 'Style and clarity improvement',
                  confidence: 85
                });
              }
            }
            if (corrections.length > 0) break; // Use first successful pattern
          }
        }
        
        // If no structured corrections found, try to extract from general text
        if (!foundCorrections) {
          const lines = correctionText.split('\n').filter(line => line.trim());
          for (const line of lines.slice(0, 10)) {
            if (line.includes('→') || line.includes('->') || line.includes('changed') || line.includes('fixed')) {
              corrections.push({
                type: 'style',
                original: 'Various text',
                corrected: 'Improved version',
                reason: line.trim(),
                confidence: 70
              });
            }
          }
        }
      }

      return {
        polishedContent: polishedContent || originalContent,
        corrections,
        qualityScore: Math.max(40, Math.min(100, qualityScore))
      };
      
    } catch (error) {
      console.error('Error parsing proofreading result:', error);
      return {
        polishedContent: response.trim() || originalContent,
        corrections: [],
        qualityScore: 75
      };
    }
  }

  /**
   * Categorize correction based on content
   */
  private categorizeCorrection(original: string, corrected: string, reason?: string): ProofreadingCorrection['type'] {
    const reasonLower = reason?.toLowerCase() || '';
    const originalLower = original.toLowerCase();
    
    if (reasonLower.includes('grammar') || reasonLower.includes('punctuation') || reasonLower.includes('spelling')) {
      return 'grammar';
    } else if (reasonLower.includes('clarity') || reasonLower.includes('clear')) {
      return 'clarity';
    } else if (reasonLower.includes('consistency') || reasonLower.includes('consistent')) {
      return 'consistency';
    } else if (reasonLower.includes('flow') || reasonLower.includes('transition')) {
      return 'flow';
    } else if (originalLower.includes('was') || originalLower.includes('were') || originalLower.includes('passive')) {
      return 'style';
    } else {
      return 'style';
    }
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Get agent configuration
   */
  getConfig(): ProofreaderAgentConfig {
    return { ...this.config };
  }

  /**
   * Update agent configuration  
   */
  updateConfig(newConfig: Partial<ProofreaderAgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
} 