import { z } from 'zod';
import type { BookSettings } from '@/types';

export interface SceneSanityConfig {
  strictGenreEnforcement: boolean;
  allowNarrativeTenseShifts: boolean;
  customRules: GenreRule[];
}

export interface GenreRule {
  genre: string;
  forbiddenPatterns: string[];
  requiredElements?: string[];
  allowedTenseShifts?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  confidence: number;
}

export interface ValidationError {
  type: 'genre_violation' | 'narrative_inconsistency' | 'content_violation' | 'structure_violation';
  message: string;
  severity: 'critical' | 'major' | 'minor';
  location?: string;
  suggestion?: string;
}

export interface ValidationWarning {
  type: 'style_concern' | 'pacing_issue' | 'character_concern';
  message: string;
  suggestion?: string;
}

// Zod schema for section validation
const SectionContentSchema = z.object({
  content: z.string().min(10, 'Content must be at least 10 characters'),
  chapterNumber: z.number().min(1),
  sectionNumber: z.number().min(1),
  settings: z.object({
    genre: z.string(),
    tone: z.string(),
    targetAudience: z.string()
  })
});

export class SceneSanityChecker {
  private config: SceneSanityConfig;
  private genreRules: Map<string, GenreRule>;

  constructor(config?: Partial<SceneSanityConfig>) {
    this.config = {
      strictGenreEnforcement: true,
      allowNarrativeTenseShifts: false,
      customRules: [],
      ...config
    };

    this.genreRules = new Map();
    this.initializeGenreRules();
  }

  /**
   * Main validation method - must return true before section can persist
   */
  async validateSection(
    content: string,
    chapterNumber: number,
    sectionNumber: number,
    settings: BookSettings,
    previousContent?: string
  ): Promise<ValidationResult> {
    try {
      // Validate input structure
      const validationInput = SectionContentSchema.parse({
        content,
        chapterNumber,
        sectionNumber,
        settings: {
          genre: settings.genre,
          tone: settings.tone,
          targetAudience: settings.targetAudience
        }
      });

      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];

      // Run all validation checks
      const genreErrors = await this.validateGenreConsistency(content, settings);
      const narrativeErrors = await this.validateNarrativeConsistency(content, previousContent, settings);
      const structureErrors = await this.validateStructure(content, chapterNumber, sectionNumber);
      const contentErrors = await this.validateContent(content, settings);

      errors.push(...genreErrors);
      errors.push(...narrativeErrors);
      errors.push(...structureErrors);
      errors.push(...contentErrors);

      // Generate warnings
      const styleWarnings = await this.generateStyleWarnings(content, settings);
      warnings.push(...styleWarnings);

      // Calculate confidence score
      const confidence = this.calculateConfidence(errors, warnings, content.length);

      // Determine if section is valid
      const criticalErrors = errors.filter(e => e.severity === 'critical');
      const majorErrors = errors.filter(e => e.severity === 'major');
      
      const isValid = criticalErrors.length === 0 && 
                     (majorErrors.length === 0 || !this.config.strictGenreEnforcement);

      return {
        isValid,
        errors,
        warnings,
        confidence
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [{
          type: 'structure_violation',
          message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'critical'
        }],
        warnings: [],
        confidence: 0
      };
    }
  }

  /**
   * Validate genre consistency
   */
  private async validateGenreConsistency(content: string, settings: BookSettings): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const genre = settings.genre.toLowerCase();
    const genreRule = this.genreRules.get(genre);

    if (!genreRule) {
      // No specific rules for this genre, skip validation
      return errors;
    }

    // Check for forbidden patterns
    for (const pattern of genreRule.forbiddenPatterns) {
      const regex = new RegExp(pattern, 'gi');
      const matches = content.match(regex);
      
      if (matches && matches.length > 0) {
        errors.push({
          type: 'genre_violation',
          message: `Genre '${settings.genre}' violation: Found forbidden pattern '${pattern}'`,
          severity: 'critical',
          location: `Found ${matches.length} instance(s): ${matches.slice(0, 3).join(', ')}`,
          suggestion: `Remove or replace content that doesn't fit ${settings.genre} genre`
        });
      }
    }

    // Check for required elements (if specified)
    if (genreRule.requiredElements) {
      for (const element of genreRule.requiredElements) {
        const regex = new RegExp(element, 'gi');
        if (!regex.test(content)) {
          errors.push({
            type: 'genre_violation',
            message: `Genre '${settings.genre}' missing required element: '${element}'`,
            severity: 'major',
            suggestion: `Consider adding ${element} to maintain genre consistency`
          });
        }
      }
    }

    return errors;
  }

  /**
   * Validate narrative consistency
   */
  private async validateNarrativeConsistency(
    content: string, 
    previousContent: string | undefined, 
    settings: BookSettings
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check for narrative tense consistency
    if (previousContent) {
      const previousTense = this.detectNarrativeTense(previousContent);
      const currentTense = this.detectNarrativeTense(content);
      
      if (previousTense !== currentTense && !this.config.allowNarrativeTenseShifts) {
        // Look for explicit time markers that might justify the shift
        const hasTimeMarker = this.hasTimeMarker(content);
        
        if (!hasTimeMarker) {
          errors.push({
            type: 'narrative_inconsistency',
            message: `Narrative tense shifted from ${previousTense} to ${currentTense} without time marker`,
            severity: 'critical',
            suggestion: 'Add explicit time marker or maintain consistent tense'
          });
        }
      }
    }

    // Check for POV consistency
    const povShifts = this.detectPOVShifts(content);
    if (povShifts.length > 0) {
      errors.push({
        type: 'narrative_inconsistency',
        message: `Multiple POV shifts detected within single section`,
        severity: 'major',
        location: `${povShifts.length} shifts found`,
        suggestion: 'Consider splitting into separate sections or maintaining consistent POV'
      });
    }

    return errors;
  }

  /**
   * Validate section structure
   */
  private async validateStructure(
    content: string, 
    chapterNumber: number, 
    sectionNumber: number
  ): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check minimum content length
    if (content.trim().length < 50) {
      errors.push({
        type: 'structure_violation',
        message: 'Section content too short',
        severity: 'major',
        suggestion: 'Sections should contain meaningful content'
      });
    }

    // Check for placeholder content
    const placeholderPatterns = [
      /\[.*\]/g,
      /TODO:/gi,
      /PLACEHOLDER/gi,
      /\{.*\}/g
    ];

    for (const pattern of placeholderPatterns) {
      if (pattern.test(content)) {
        errors.push({
          type: 'structure_violation',
          message: 'Section contains placeholder content',
          severity: 'critical',
          suggestion: 'Replace placeholder content with actual narrative'
        });
      }
    }

    return errors;
  }

  /**
   * Validate content appropriateness
   */
  private async validateContent(content: string, settings: BookSettings): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];

    // Check for age-appropriate content based on target audience
    const targetAudience = settings.targetAudience.toLowerCase();
    
    if (targetAudience.includes('children') || targetAudience.includes('young')) {
      const inappropriatePatterns = [
        /\b(damn|hell|shit|fuck|bloody hell)\b/gi,
        /\b(sex|sexual|intimate|passionate|desire)\b/gi,
        /\b(violence|blood|gore|murder|kill)\b/gi
      ];

      for (const pattern of inappropriatePatterns) {
        if (pattern.test(content)) {
          errors.push({
            type: 'content_violation',
            message: `Content may not be appropriate for ${settings.targetAudience}`,
            severity: 'major',
            suggestion: `Consider age-appropriate alternatives for ${settings.targetAudience}`
          });
        }
      }
    }

    return errors;
  }

  /**
   * Generate style warnings
   */
  private async generateStyleWarnings(content: string, settings: BookSettings): Promise<ValidationWarning[]> {
    const warnings: ValidationWarning[] = [];

    // Check for overly long paragraphs
    const paragraphs = content.split('\n\n');
    const longParagraphs = paragraphs.filter(p => p.split(' ').length > 150);
    
    if (longParagraphs.length > 0) {
      warnings.push({
        type: 'style_concern',
        message: `${longParagraphs.length} paragraph(s) are quite long`,
        suggestion: 'Consider breaking long paragraphs for better readability'
      });
    }

    // Check for repetitive sentence starts
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const firstWords = sentences.map(s => s.trim().split(' ')[0]?.toLowerCase()).filter(Boolean);
    const wordCounts = firstWords.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const repetitiveStarts = Object.entries(wordCounts)
      .filter(([word, count]) => count > 3 && word.length > 2)
      .map(([word]) => word);

    if (repetitiveStarts.length > 0) {
      warnings.push({
        type: 'style_concern',
        message: `Repetitive sentence starts detected: ${repetitiveStarts.join(', ')}`,
        suggestion: 'Vary sentence beginnings for better flow'
      });
    }

    return warnings;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(errors: ValidationError[], warnings: ValidationWarning[], contentLength: number): number {
    let confidence = 100;

    // Penalize for errors
    errors.forEach(error => {
      switch (error.severity) {
        case 'critical':
          confidence -= 25;
          break;
        case 'major':
          confidence -= 15;
          break;
        case 'minor':
          confidence -= 5;
          break;
      }
    });

    // Penalize for warnings
    confidence -= warnings.length * 2;

    // Penalize for very short content
    if (contentLength < 200) {
      confidence -= 10;
    }

    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Detect narrative tense
   */
  private detectNarrativeTense(content: string): 'past' | 'present' | 'future' | 'mixed' {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let pastCount = 0;
    let presentCount = 0;
    let futureCount = 0;

    const pastPatterns = [/\b(was|were|had|did|said|went|came|saw|felt|thought)\b/gi];
    const presentPatterns = [/\b(is|are|has|does|says|goes|comes|sees|feels|thinks)\b/gi];
    const futurePatterns = [/\b(will|shall|going to|would|could|might)\b/gi];

    sentences.forEach(sentence => {
      pastPatterns.forEach(pattern => {
        if (pattern.test(sentence)) pastCount++;
      });
      presentPatterns.forEach(pattern => {
        if (pattern.test(sentence)) presentCount++;
      });
      futurePatterns.forEach(pattern => {
        if (pattern.test(sentence)) futureCount++;
      });
    });

    const total = pastCount + presentCount + futureCount;
    if (total === 0) return 'mixed';

    const pastRatio = pastCount / total;
    const presentRatio = presentCount / total;
    const futureRatio = futureCount / total;

    if (pastRatio > 0.6) return 'past';
    if (presentRatio > 0.6) return 'present';
    if (futureRatio > 0.6) return 'future';
    return 'mixed';
  }

  /**
   * Check for time markers
   */
  private hasTimeMarker(content: string): boolean {
    const timeMarkers = [
      /\b(later|meanwhile|earlier|then|next|after|before|during|while|when|suddenly|immediately|eventually)\b/gi,
      /\b(minutes|hours|days|weeks|months|years) (later|earlier|ago|before|after)\b/gi,
      /\b(the next|the following|that same|later that)\b/gi
    ];

    return timeMarkers.some(pattern => pattern.test(content));
  }

  /**
   * Detect POV shifts
   */
  private detectPOVShifts(content: string): string[] {
    const shifts: string[] = [];
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentPOV: 'first' | 'second' | 'third' | 'mixed' = 'mixed';
    
    sentences.forEach((sentence, index) => {
      const pov = this.detectSentencePOV(sentence);
      
      if (currentPOV === 'mixed') {
        currentPOV = pov;
      } else if (pov !== currentPOV && pov !== 'mixed') {
        shifts.push(`Sentence ${index + 1}: ${currentPOV} → ${pov}`);
        currentPOV = pov;
      }
    });

    return shifts;
  }

  /**
   * Detect sentence POV
   */
  private detectSentencePOV(sentence: string): 'first' | 'second' | 'third' | 'mixed' {
    const firstPerson = /\b(I|me|my|mine|we|us|our|ours)\b/gi;
    const secondPerson = /\b(you|your|yours)\b/gi;
    const thirdPerson = /\b(he|she|it|they|him|her|them|his|hers|its|their|theirs)\b/gi;

    const hasFirst = firstPerson.test(sentence);
    const hasSecond = secondPerson.test(sentence);
    const hasThird = thirdPerson.test(sentence);

    const count = [hasFirst, hasSecond, hasThird].filter(Boolean).length;
    
    if (count > 1) return 'mixed';
    if (hasFirst) return 'first';
    if (hasSecond) return 'second';
    if (hasThird) return 'third';
    return 'mixed';
  }

  /**
   * Initialize genre-specific rules
   */
  private initializeGenreRules(): void {
    const genreRules: GenreRule[] = [
      {
        genre: 'fantasy',
        forbiddenPatterns: [
          '\\b(smartphone|internet|wifi|bluetooth|computer|laptop|tablet|GPS|satellite|nuclear|laser|robot|AI|artificial intelligence)\\b',
          '\\b(NASA|FBI|CIA|iPhone|Android|Google|Facebook|Twitter|Instagram|YouTube)\\b',
          '\\b(car|truck|airplane|helicopter|submarine|tank|machine gun|rifle|pistol|grenade)\\b'
        ],
        requiredElements: [],
        allowedTenseShifts: false
      },
      {
        genre: 'science fiction',
        forbiddenPatterns: [
          '\\b(magic|spell|enchant|wizard|witch|sorcerer|dragon|fairy|elf|dwarf|orc|troll)\\b',
          '\\b(medieval|knight|sword|shield|armor|castle|kingdom|quest|prophecy)\\b'
        ],
        requiredElements: [],
        allowedTenseShifts: true
      },
      {
        genre: 'historical fiction',
        forbiddenPatterns: [
          '\\b(smartphone|internet|wifi|bluetooth|computer|laptop|tablet|GPS|satellite|nuclear|laser|robot|AI)\\b',
          '\\b(modern|contemporary|21st century|2000s|2010s|2020s)\\b'
        ],
        requiredElements: [],
        allowedTenseShifts: false
      },
      {
        genre: 'romance',
        forbiddenPatterns: [
          '\\b(zombie|vampire|werewolf|alien|robot|cyborg|time travel|parallel universe)\\b'
        ],
        requiredElements: [],
        allowedTenseShifts: false
      },
      {
        genre: 'mystery',
        forbiddenPatterns: [
          '\\b(magic|spell|supernatural|ghost|demon|vampire|werewolf|time travel)\\b'
        ],
        requiredElements: [],
        allowedTenseShifts: false
      },
      {
        genre: 'thriller',
        forbiddenPatterns: [
          '\\b(magic|spell|supernatural|ghost|demon|vampire|werewolf|time travel|parallel universe)\\b'
        ],
        requiredElements: [],
        allowedTenseShifts: false
      },
      {
        genre: 'horror',
        forbiddenPatterns: [
          '\\b(comedy|funny|hilarious|joke|laugh|humor|romantic|love story|happy ending)\\b'
        ],
        requiredElements: [],
        allowedTenseShifts: false
      },
      {
        genre: 'children',
        forbiddenPatterns: [
          '\\b(violence|blood|gore|murder|kill|death|sex|sexual|intimate|passionate|damn|hell|shit|fuck|bloody hell)\\b',
          '\\b(weapon|gun|knife|sword|fight|battle|war|conflict|enemy|villain)\\b'
        ],
        requiredElements: [],
        allowedTenseShifts: false
      }
    ];

    genreRules.forEach(rule => {
      this.genreRules.set(rule.genre.toLowerCase(), rule);
    });
  }

  /**
   * Add custom genre rule
   */
  addGenreRule(rule: GenreRule): void {
    this.genreRules.set(rule.genre.toLowerCase(), rule);
  }

  /**
   * Get validation summary
   */
  getValidationSummary(result: ValidationResult): string {
    const { isValid, errors, warnings, confidence } = result;
    
    let summary = `Validation ${isValid ? 'PASSED' : 'FAILED'} (${confidence}% confidence)\n`;
    
    if (errors.length > 0) {
      summary += `Errors (${errors.length}):\n`;
      errors.forEach(error => {
        summary += `  - ${error.severity.toUpperCase()}: ${error.message}\n`;
      });
    }
    
    if (warnings.length > 0) {
      summary += `Warnings (${warnings.length}):\n`;
      warnings.forEach(warning => {
        summary += `  - ${warning.message}\n`;
      });
    }
    
    return summary;
  }
}

// Export singleton instance
export const sceneSanityChecker = new SceneSanityChecker(); 