import { generateAIText } from '@/lib/openai';
import { 
  createBackCoverPrompt, 
  createOutlinePrompt, 
  createRefinementPrompt 
} from '../prompts/planning-prompts';
import type { BookSettings, BookOutline } from '@/types';

export interface PlanningAgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface OutlineGeneration {
  summary: string;
  themes: string[];
  characters: Array<{
    name: string;
    role: string;
    description: string;
    arc: string;
  }>;
  chapters: Array<{
    number: number;
    title: string;
    summary: string;
    keyEvents: string[];
    characters: string[];
    location: string;
    wordCountTarget: number;
  }>;
}

export class PlanningAgent {
  private config: PlanningAgentConfig;

  constructor(config?: Partial<PlanningAgentConfig>) {
    this.config = {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 4000,
      ...config
    };
  }

  /**
   * Generate back cover description from user prompt and settings
   */
  async generateBackCover(
    userPrompt: string, 
    settings: BookSettings
  ): Promise<string> {
    try {
      const prompt = createBackCoverPrompt({ userPrompt, settings });
      
      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        system: 'You are a professional book marketing expert and editor specializing in compelling back cover descriptions.'
      });

      const backCover = response.text.trim();
      
      if (!backCover) {
        throw new Error('Failed to generate back cover content');
      }

      return backCover;
    } catch (error) {
      console.error('Error generating back cover:', error);
      throw new Error(`Back cover generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      const prompt = createRefinementPrompt({
        userPrompt: refinementRequest,
        settings,
        previousContext: currentBackCover
      });

      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        system: 'You are a professional editor helping refine book storylines and back cover descriptions.'
      });

      const refinedBackCover = response.text.trim();
      
      if (!refinedBackCover) {
        throw new Error('Failed to refine back cover content');
      }

      return refinedBackCover;
    } catch (error) {
      console.error('Error refining back cover:', error);
      throw new Error(`Back cover refinement failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate detailed book outline from back cover and settings
   */
  async generateOutline(
    userPrompt: string,
    backCover: string,
    settings: BookSettings
  ): Promise<OutlineGeneration> {
    try {
      console.log('Starting outline generation...');
      
      // Try structured JSON approach first
      const prompt = createOutlinePrompt({
        userPrompt,
        settings,
        previousContext: backCover
      });

      console.log('Calling OpenAI for outline generation...');
      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: 0.6, // Lower temperature for more structured output
        maxTokens: 6000, // More tokens for detailed outlines
        system: 'You are a professional book editor and story architect. Create detailed, structured outlines that maintain narrative consistency and pacing. Always respond with valid JSON only.'
      });

      const outlineContent = response.text.trim();
      console.log('Received outline response, length:', outlineContent.length);
      
      if (!outlineContent) {
        console.error('Empty outline content received');
        throw new Error('Failed to generate outline content');
      }

      let outline: OutlineGeneration;
      try {
        console.log('Attempting to parse JSON outline...');
        
        // Clean the content - remove markdown formatting if present
        let cleanContent = outlineContent.trim();
        
        // Remove markdown code blocks (```json ... ```)
        if (cleanContent.startsWith('```')) {
          const firstNewline = cleanContent.indexOf('\n');
          const lastBackticks = cleanContent.lastIndexOf('```');
          if (firstNewline !== -1 && lastBackticks > firstNewline) {
            cleanContent = cleanContent.substring(firstNewline + 1, lastBackticks).trim();
          }
        }
        
        console.log('Cleaned content for parsing, length:', cleanContent.length);
        outline = JSON.parse(cleanContent);
        console.log('Successfully parsed JSON outline');
      } catch (parseError) {
        console.error('Error parsing outline JSON:', parseError);
        console.log('Raw content preview:', outlineContent.substring(0, 200));
        console.log('Falling back to simpler outline generation...');
        
        // Fallback: Create a simpler outline structure
        outline = await this.generateSimpleOutline(userPrompt, backCover, settings);
      }

      // Validate outline structure
      this.validateOutline(outline);
      console.log('Outline validation successful');

      return outline;
    } catch (error) {
      console.error('Error generating outline:', error);
      throw new Error(`Outline generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate fallback characters using user-provided names when available
   */
  private generateFallbackCharacters(settings: BookSettings) {
    const characters = [];
    
    if (settings.characterNames && settings.characterNames.length > 0) {
      // Use user-provided character names
      settings.characterNames.forEach((name, index) => {
        characters.push({
          name: name.trim(),
          role: index === 0 ? 'protagonist' : (index === 1 ? 'supporting' : 'supporting'),
          description: `A ${index === 0 ? 'main' : 'important'} character in the ${settings.genre} story`,
          arc: index === 0 
            ? 'Growth and development throughout the story, facing challenges and overcoming obstacles'
            : 'Supports the main character and plays a key role in the story development'
        });
      });
    } else {
      // Default characters
      characters.push({
        name: 'Protagonist',
        role: 'protagonist',
        description: 'The main character of the story who drives the narrative forward',
        arc: 'Growth and development throughout the story, facing challenges and overcoming obstacles'
      });
    }
    
    return characters;
  }

  /**
   * Fallback method to generate a simpler outline structure
   */
  private async generateSimpleOutline(
    userPrompt: string,
    backCover: string,
    settings: BookSettings
  ): Promise<OutlineGeneration> {
    try {
      console.log('Generating simple outline as fallback...');
      
      // Calculate chapters based on word count
      const wordsPerChapter = 2500;
      const numberOfChapters = Math.max(3, Math.ceil(settings.wordCount / wordsPerChapter));
      
      // Create a basic outline structure
      const outline: OutlineGeneration = {
        summary: `A ${settings.genre} story for ${settings.targetAudience} with a ${settings.tone} tone. ${backCover.substring(0, 200)}...`,
        themes: [settings.genre, 'Character Development', 'Adventure'],
        characters: this.generateFallbackCharacters(settings),
        chapters: []
      };

      // Generate basic chapters
      for (let i = 1; i <= numberOfChapters; i++) {
        outline.chapters.push({
          number: i,
          title: `Chapter ${i}`,
          summary: `Chapter ${i} continues the story with important developments and character growth.`,
          keyEvents: [`Key event in chapter ${i}`],
          characters: ['Protagonist'],
          location: 'Story setting',
          wordCountTarget: wordsPerChapter
        });
      }

      console.log(`Generated simple outline with ${numberOfChapters} chapters`);
      return outline;
      
    } catch (error) {
      console.error('Error generating simple outline:', error);
      throw new Error('Failed to generate even a simple outline');
    }
  }

  /**
   * Generate chapter summaries for existing outline
   */
  async generateChapterSummaries(
    outline: OutlineGeneration,
    settings: BookSettings
  ): Promise<OutlineGeneration> {
    try {
      // Enhance chapter summaries if they're too brief
      const enhancedChapters = await Promise.all(
        outline.chapters.map(async (chapter, index) => {
          if (chapter.summary.length < 100) {
            // Generate more detailed summary
            const enhancementPrompt = `
Expand this chapter summary for a ${settings.genre} book with ${settings.tone} tone:

Chapter ${chapter.number}: ${chapter.title}
Current summary: ${chapter.summary}

Book context: ${outline.summary}
Key characters: ${outline.characters.map(c => c.name).join(', ')}

Provide a detailed 2-3 paragraph summary (200-300 words) that includes:
- Key plot developments
- Character interactions and development
- Setting and atmosphere
- Connection to overall story arc
- Specific scenes or conflicts

Enhanced summary:`;

            const response = await generateAIText(enhancementPrompt, {
              model: this.config.model,
              temperature: 0.7,
              maxTokens: 500,
              system: 'You are a professional book editor creating detailed chapter summaries.'
            });

            const enhancedSummary = response.text.trim();
            if (enhancedSummary) {
              return { ...chapter, summary: enhancedSummary };
            }
          }
          return chapter;
        })
      );

      return { ...outline, chapters: enhancedChapters };
    } catch (error) {
      console.error('Error enhancing chapter summaries:', error);
      // Return original outline if enhancement fails
      return outline;
    }
  }

  /**
   * Validate outline structure and content
   */
  private validateOutline(outline: OutlineGeneration): void {
    if (!outline.summary || outline.summary.length < 100) {
      throw new Error('Outline must include a substantial summary');
    }

    if (!outline.themes || outline.themes.length === 0) {
      throw new Error('Outline must include at least one theme');
    }

    if (!outline.characters || outline.characters.length === 0) {
      throw new Error('Outline must include at least one character');
    }

    if (!outline.chapters || outline.chapters.length === 0) {
      throw new Error('Outline must include at least one chapter');
    }

    // Validate each chapter
    outline.chapters.forEach((chapter, index) => {
      if (!chapter.title || chapter.title.trim().length === 0) {
        throw new Error(`Chapter ${index + 1} must have a title`);
      }

      if (!chapter.summary || chapter.summary.length < 50) {
        throw new Error(`Chapter ${index + 1} must have a meaningful summary`);
      }

      if (chapter.number !== index + 1) {
        throw new Error(`Chapter numbering is inconsistent at chapter ${index + 1}`);
      }

      if (!chapter.wordCountTarget || chapter.wordCountTarget < 500) {
        throw new Error(`Chapter ${index + 1} must have a reasonable word count target`);
      }
    });

    // Validate characters
    outline.characters.forEach((character, index) => {
      if (!character.name || character.name.trim().length === 0) {
        throw new Error(`Character ${index + 1} must have a name`);
      }

      // More flexible role validation - check for common role types
      if (!character.role || character.role.trim().length === 0) {
        throw new Error(`Character ${character.name} must have a role`);
      }

      const normalizedRole = character.role.toLowerCase();
      const validRolePatterns = [
        'protagonist', 'main', 'hero', 'lead',
        'antagonist', 'villain', 'enemy',
        'supporting', 'secondary', 'side', 'friend', 'ally'
      ];
      
      const hasValidRole = validRolePatterns.some(pattern => 
        normalizedRole.includes(pattern)
      );
      
      if (!hasValidRole) {
        console.warn(`Character ${character.name} has unusual role: ${character.role}`);
        // Don't throw error, just log warning for flexibility
      }

      if (!character.description || character.description.length < 20) {
        throw new Error(`Character ${character.name} must have a meaningful description`);
      }
    });
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
  }
} 