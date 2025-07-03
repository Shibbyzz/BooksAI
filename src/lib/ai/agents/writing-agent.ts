import { generateAIText } from '@/lib/openai';
import type { BookSettings } from '@/types';

export interface WritingAgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
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
}

export interface SectionGeneration {
  content: string;
  wordCount: number;
  tokensUsed: number;
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

      return {
        content: response.text.trim(),
        wordCount,
        tokensUsed
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
- Generate approximately 800-1200 words per section
- Maintain consistency with the book's genre, tone, and style
- Follow the chapter outline and story progression
- Include character development and plot advancement
- End sections with natural stopping points or mild cliffhangers

FORMATTING:
- Use proper paragraph breaks for readability
- Include dialogue with proper formatting
- No chapter titles or section headers in the content
- Focus on pure narrative prose
- Avoid meta-commentary or author notes`;
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
      settings
    } = context;

    let prompt = `Write section ${sectionNumber} of ${totalSections} for the chapter "${chapterTitle}".

BOOK DETAILS:
Title: "${bookTitle}"
Genre: ${settings.genre}
Target Audience: ${settings.targetAudience}
Tone: ${settings.tone}
Word Count Goal: ${settings.wordCount.toLocaleString()} words total

STORY CONTEXT:
Original Prompt: ${bookPrompt}

Back Cover Summary: ${backCover}

CHAPTER CONTEXT:
Chapter: "${chapterTitle}"
Chapter Summary: ${chapterSummary}

SECTION REQUIREMENTS:
- This is section ${sectionNumber} of ${totalSections} in this chapter
- Write approximately 800-1200 words
- ${sectionNumber === 1 ? 'Start the chapter with engaging opening that draws readers in' : 
  sectionNumber === totalSections ? 'End the chapter with a satisfying conclusion or cliffhanger' : 
  'Continue the story naturally from the previous section'}
`;

    if (characters.length > 0) {
      prompt += `\nKEY CHARACTERS: ${characters.join(', ')}`;
    }

    if (previousSections.length > 0) {
      prompt += `\nPREVIOUS SECTIONS SUMMARY:
${previousSections.map((section, i) => `Section ${i + 1}: ${section.substring(0, 300)}...`).join('\n')}`;
    }

    prompt += `\nGenerate engaging, high-quality prose that continues the story naturally. Focus on character development, plot progression, and maintaining the ${settings.tone} tone throughout.`;

    return prompt;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
} 