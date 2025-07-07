import { ChiefEditorAgent, type StoryBible } from '../agents/chief-editor-agent';
import { type ProseValidation } from '../../proseValidator';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ValidationService {
  constructor() {}

  /**
   * Validate story bible structure and content
   */
  validateStoryBible(storyBible: StoryBible): ValidationResult {
    const errors: string[] = [];

    // Check overview
    if (!storyBible.overview?.premise) {
      errors.push('Story bible missing premise');
    }
    if (!storyBible.overview?.theme) {
      errors.push('Story bible missing theme');
    }

    // Check characters
    if (!storyBible.characters || storyBible.characters.length === 0) {
      errors.push('Story bible missing characters');
    } else {
      storyBible.characters.forEach((char, index) => {
        if (!char.name) errors.push(`Character ${index} missing name`);
        if (!char.role) errors.push(`Character ${index} missing role`);
        if (!char.background) errors.push(`Character ${char.name || index} missing background`);
      });
    }

    // Check chapter plans
    if (!storyBible.chapterPlans || storyBible.chapterPlans.length === 0) {
      errors.push('Story bible missing chapter plans');
    } else {
      const chapterNumbers = storyBible.chapterPlans.map(c => c.number);
      const duplicates = chapterNumbers.filter((n, i) => chapterNumbers.indexOf(n) !== i);
      if (duplicates.length > 0) {
        errors.push(`Duplicate chapter numbers: ${duplicates.join(', ')}`);
      }

      storyBible.chapterPlans.forEach((chapter, index) => {
        if (!chapter.title) errors.push(`Chapter ${chapter.number || index} missing title`);
        if (!chapter.purpose) errors.push(`Chapter ${chapter.number || index} missing purpose`);
        if (!chapter.scenes || chapter.scenes.length === 0) {
          errors.push(`Chapter ${chapter.number || index} missing scenes`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate structure plan from Chief Editor
   */
  validateStructurePlan(structurePlan: any): ValidationResult {
    const errors: string[] = [];

    if (!structurePlan) {
      errors.push('Structure plan is null or undefined');
      return { isValid: false, errors };
    }

    // Check chapters array
    if (!structurePlan.chapters || !Array.isArray(structurePlan.chapters)) {
      errors.push('Structure plan missing chapters array');
    } else {
      structurePlan.chapters.forEach((chapter: any, index: number) => {
        if (!chapter.number) errors.push(`Chapter ${index} missing number`);
        if (!chapter.title) errors.push(`Chapter ${index} missing title`);
        if (!chapter.purpose) errors.push(`Chapter ${index} missing purpose`);
        if (!chapter.wordCountTarget || chapter.wordCountTarget <= 0) {
          errors.push(`Chapter ${index} missing or invalid word count target`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate prose quality and return severity level
   */
  validateProseQuality(warnings: string[]): {
    severity: 'low' | 'medium' | 'high' | 'critical';
    warnings: string[];
    suggestions: string[];
  } {
    const proseWarnings = warnings || [];
    const proseSuggestions: string[] = [];

    // Determine severity based on warning content
    const criticalWarnings = proseWarnings.filter(w => 
      w.includes('Excessive') || w.includes('Critical') || w.includes('critical')
    );
    const highWarnings = proseWarnings.filter(w => 
      w.includes('High') || w.includes('high') || w.includes('weakens prose')
    );
    const mediumWarnings = proseWarnings.filter(w => 
      w.includes('Medium') || w.includes('medium') || w.includes('Moderate')
    );
    
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (criticalWarnings.length > 0) {
      severity = 'critical';
    } else if (highWarnings.length > 0) {
      severity = 'high';
    } else if (mediumWarnings.length > 0) {
      severity = 'medium';
    } else if (proseWarnings.length > 0) {
      severity = 'low';
    }

    return {
      severity,
      warnings: proseWarnings,
      suggestions: proseSuggestions
    };
  }

  /**
   * Validate chapter content structure
   */
  validateChapterContent(content: string, expectedWordCount: number): ValidationResult {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Chapter content is empty');
      return { isValid: false, errors };
    }

    const wordCount = this.countWords(content);
    const wordCountDeviation = Math.abs(wordCount - expectedWordCount) / expectedWordCount;
    
    if (wordCountDeviation > 0.3) {
      errors.push(`Word count deviation too high: ${wordCount} vs expected ${expectedWordCount} (${Math.round(wordCountDeviation * 100)}% difference)`);
    }

    // Check for basic content structure
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    if (paragraphs.length < 2) {
      errors.push('Chapter should have multiple paragraphs');
    }

    // Check for dialogue indicators
    const hasDialogue = content.includes('"') || content.includes("'");
    if (!hasDialogue && wordCount > 500) {
      errors.push('Long chapter without dialogue may lack engagement');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate section content
   */
  validateSectionContent(content: string, targetWordCount: number): ValidationResult {
    const errors: string[] = [];

    if (!content || content.trim().length === 0) {
      errors.push('Section content is empty');
      return { isValid: false, errors };
    }

    const wordCount = this.countWords(content);
    
    // More lenient validation for sections
    if (wordCount < targetWordCount * 0.5) {
      errors.push(`Section too short: ${wordCount} words (target: ${targetWordCount})`);
    } else if (wordCount > targetWordCount * 2) {
      errors.push(`Section too long: ${wordCount} words (target: ${targetWordCount})`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  /**
   * Validate book outline completeness
   */
  validateOutlineCompleteness(outline: any): ValidationResult {
    const errors: string[] = [];

    if (!outline) {
      errors.push('Outline is missing');
      return { isValid: false, errors };
    }

    if (!outline.summary) {
      errors.push('Outline missing summary');
    }

    if (!outline.characters || outline.characters.length === 0) {
      errors.push('Outline missing characters');
    }

    if (!outline.chapters || outline.chapters.length === 0) {
      errors.push('Outline missing chapters');
    } else {
      outline.chapters.forEach((chapter: any, index: number) => {
        if (!chapter.title) errors.push(`Chapter ${index + 1} missing title`);
        if (!chapter.summary) errors.push(`Chapter ${index + 1} missing summary`);
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate generation config
   */
  validateGenerationConfig(config: any): ValidationResult {
    const errors: string[] = [];

    if (!config) {
      errors.push('Generation config is missing');
      return { isValid: false, errors };
    }

    // Check required agents
    const requiredAgents = ['planningAgent', 'writingAgent', 'supervisionAgent'];
    requiredAgents.forEach(agent => {
      if (!config[agent]) {
        errors.push(`${agent} configuration missing`);
      } else {
        if (!config[agent].model) {
          errors.push(`${agent} model not specified`);
        }
        if (config[agent].temperature < 0 || config[agent].temperature > 1) {
          errors.push(`${agent} temperature should be between 0 and 1`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 