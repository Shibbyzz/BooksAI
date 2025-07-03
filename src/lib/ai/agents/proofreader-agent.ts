import { generateAIText } from '@/lib/openai';
import type { BookSettings } from '@/types';

export interface ProofreaderAgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ProofreadingResult {
  originalContent: string;
  polishedContent: string;
  corrections: ProofreadingCorrection[];
  qualityScore: number;
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

  constructor(config: ProofreaderAgentConfig) {
    this.config = config;
  }

  /**
   * Proofread and polish a chapter with comprehensive quality improvements
   */
  async proofreadChapter(context: ChapterProofreadContext): Promise<ProofreadingResult> {
    try {
      const prompt = this.buildProofreadingPrompt(context);
      
      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        system: this.getSystemPrompt()
      });

      if (!response.text) {
        throw new Error('No proofreading result generated');
      }

      const result = this.parseProofreadingResult(context.content, response.text);
      
      return {
        originalContent: context.content,
        polishedContent: result.polishedContent,
        corrections: result.corrections,
        qualityScore: result.qualityScore,
        wordCount: this.countWords(result.polishedContent),
        tokensUsed: response.usage?.totalTokens || 0
      };
      
    } catch (error) {
      console.error('ProofreaderAgent error:', error);
      
      // Return original content with minimal corrections on error
      return {
        originalContent: context.content,
        polishedContent: context.content,
        corrections: [],
        qualityScore: 75, // Assume reasonable quality if proofreading fails
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
      const prompt = `Polish this text for grammar, clarity, and flow while maintaining the ${settings.tone} tone and ${settings.genre} genre style:

ORIGINAL TEXT:
${content}

POLISHED VERSION (return only the improved text):`;

      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: 0.0, // Lower temperature for consistency
        maxTokens: Math.min(this.config.maxTokens, 3000),
        system: 'You are a professional editor specializing in quick, high-quality text improvements.'
      });

      return response.text.trim() || content;
      
    } catch (error) {
      console.error('Quick polish error:', error);
      return content; // Return original on error
    }
  }

  private getSystemPrompt(): string {
    return `You are a professional book editor and proofreader with expertise in fiction writing. Your role is to polish and improve written content while preserving the author's voice and style.

PROOFREADING FOCUS AREAS:
1. GRAMMAR & MECHANICS: Fix grammatical errors, punctuation, spelling
2. STYLE & FLOW: Improve sentence structure, rhythm, and readability  
3. CONSISTENCY: Ensure character names, descriptions, and details remain consistent
4. CLARITY: Make unclear passages more comprehensible without changing meaning
5. VOICE: Maintain the established tone and narrative voice throughout

QUALITY STANDARDS:
- Preserve the original meaning and creative intent
- Maintain character voices and dialogue authenticity
- Ensure smooth transitions between scenes and paragraphs
- Fix passive voice where active would be stronger
- Eliminate redundancy and improve word choice
- Check for continuity errors within the chapter

OUTPUT FORMAT:
Always provide a structured response with:
- POLISHED_CONTENT: The improved version of the text
- CORRECTIONS: List of specific changes made with reasons
- QUALITY_SCORE: Overall quality rating (1-100)

Focus on meaningful improvements that enhance readability and professionalism.`;
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

    return `Proofread and polish Chapter ${chapterNumber}: "${chapterTitle}" for a ${settings.genre} book.

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
2. CORRECTIONS: Detailed list of changes made (type, original text, correction, reason)
3. QUALITY_SCORE: Overall quality rating from 1-100

Focus on maintaining the ${settings.tone} tone while improving clarity, flow, and professional quality.`;
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
      
      // Parse corrections (simplified for now)
      const corrections: ProofreadingCorrection[] = [];
      if (correctionsMatch) {
        const correctionLines = correctionsMatch[1].split('\n').filter(line => line.trim());
        for (const line of correctionLines.slice(0, 10)) { // Limit to 10 corrections
          if (line.includes('→') || line.includes('->')) {
            corrections.push({
              type: 'style',
              original: line.split('→')[0]?.trim() || line.split('->')[0]?.trim() || '',
              corrected: line.split('→')[1]?.trim() || line.split('->')[1]?.trim() || '',
              reason: 'Improved clarity and style',
              confidence: 85
            });
          }
        }
      }

      return {
        polishedContent: polishedContent || originalContent,
        corrections,
        qualityScore: Math.max(70, Math.min(100, qualityScore))
      };
      
    } catch (error) {
      console.error('Error parsing proofreading result:', error);
      return {
        polishedContent: response.trim() || originalContent,
        corrections: [],
        qualityScore: 80
      };
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