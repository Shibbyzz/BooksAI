import type { BookSettings } from '@/types';

export interface GenreStructureRules {
  // Chapter planning
  optimalChapterLength: number;
  minChapterLength: number;
  maxChapterLength: number;
  preferredChapterCount: (wordCount: number) => number;
  
  // Section planning
  optimalSectionLength: number;
  minSectionLength: number;
  maxSectionLength: number;
  preferredSectionsPerChapter: number;
  
  // Pacing and flow
  pacingPattern: 'linear' | 'accelerating' | 'variable' | 'wave';
  chapterEndStyle: 'cliffhanger' | 'resolution' | 'reflection' | 'mixed';
  
  // Transition styles
  preferredTransitions: TransitionStyle[];
  
  // Structure preferences
  allowSingleSectionChapters: boolean;
  preferSceneBreaks: boolean;
  timeJumpFrequency: 'rare' | 'occasional' | 'frequent';
}

export interface TransitionStyle {
  type: 'scene-break' | 'bridge-paragraph' | 'time-jump' | 'perspective-shift' | 'emotional-bridge';
  weight: number; // Probability weight
  description: string;
}

export interface SectionPlan {
  number: number;
  type: SectionType;
  wordTarget: number;
  purpose: string;
  emotionalBeat: string;
  transitionIn: TransitionStyle;
  transitionOut: TransitionStyle;
}

export type SectionType = 
  | 'opening'        // Chapter opener
  | 'development'    // Middle sections
  | 'climax'         // High tension
  | 'resolution'     // Wrap-up
  | 'bridge'         // Connection sections
  | 'dialogue-heavy' // Conversation focus
  | 'action-heavy'   // Action sequences
  | 'introspective'  // Character reflection
  | 'worldbuilding'  // Setting/context
  | 'revelation';    // Plot reveals

// Genre-specific structure definitions
export const GENRE_STRUCTURES: Record<string, GenreStructureRules> = {
  'fantasy': {
    optimalChapterLength: 3500,
    minChapterLength: 2000,
    maxChapterLength: 5000,
    preferredChapterCount: (wordCount) => Math.max(4, Math.ceil(wordCount / 3500)),
    optimalSectionLength: 1200,
    minSectionLength: 800,
    maxSectionLength: 1800,
    preferredSectionsPerChapter: 3,
    pacingPattern: 'variable',
    chapterEndStyle: 'mixed',
    preferredTransitions: [
      { type: 'scene-break', weight: 0.4, description: 'Clear scene transitions for world-building' },
      { type: 'bridge-paragraph', weight: 0.3, description: 'Narrative bridges for epic scope' },
      { type: 'time-jump', weight: 0.2, description: 'Time passage for epic journeys' },
      { type: 'perspective-shift', weight: 0.1, description: 'Multiple POV characters' }
    ],
    allowSingleSectionChapters: false,
    preferSceneBreaks: true,
    timeJumpFrequency: 'occasional'
  },
  
  'mystery': {
    optimalChapterLength: 2800,
    minChapterLength: 1800,
    maxChapterLength: 4000,
    preferredChapterCount: (wordCount) => Math.max(5, Math.ceil(wordCount / 2800)),
    optimalSectionLength: 1000,
    minSectionLength: 600,
    maxSectionLength: 1400,
    preferredSectionsPerChapter: 3,
    pacingPattern: 'accelerating',
    chapterEndStyle: 'cliffhanger',
    preferredTransitions: [
      { type: 'bridge-paragraph', weight: 0.5, description: 'Smooth investigation flow' },
      { type: 'scene-break', weight: 0.3, description: 'Location/time changes' },
      { type: 'emotional-bridge', weight: 0.2, description: 'Character tension builds' }
    ],
    allowSingleSectionChapters: true,
    preferSceneBreaks: false,
    timeJumpFrequency: 'rare'
  },
  
  'romance': {
    optimalChapterLength: 2500,
    minChapterLength: 1500,
    maxChapterLength: 3500,
    preferredChapterCount: (wordCount) => Math.max(6, Math.ceil(wordCount / 2500)),
    optimalSectionLength: 900,
    minSectionLength: 600,
    maxSectionLength: 1200,
    preferredSectionsPerChapter: 3,
    pacingPattern: 'wave',
    chapterEndStyle: 'mixed',
    preferredTransitions: [
      { type: 'emotional-bridge', weight: 0.4, description: 'Emotional continuity' },
      { type: 'bridge-paragraph', weight: 0.3, description: 'Character interaction flow' },
      { type: 'scene-break', weight: 0.2, description: 'Setting changes' },
      { type: 'perspective-shift', weight: 0.1, description: 'Dual POV' }
    ],
    allowSingleSectionChapters: true,
    preferSceneBreaks: false,
    timeJumpFrequency: 'occasional'
  },
  
  'thriller': {
    optimalChapterLength: 2200,
    minChapterLength: 1200,
    maxChapterLength: 3000,
    preferredChapterCount: (wordCount) => Math.max(7, Math.ceil(wordCount / 2200)),
    optimalSectionLength: 800,
    minSectionLength: 500,
    maxSectionLength: 1200,
    preferredSectionsPerChapter: 3,
    pacingPattern: 'accelerating',
    chapterEndStyle: 'cliffhanger',
    preferredTransitions: [
      { type: 'scene-break', weight: 0.5, description: 'Quick scene changes' },
      { type: 'bridge-paragraph', weight: 0.3, description: 'Tension maintenance' },
      { type: 'time-jump', weight: 0.2, description: 'Fast pacing' }
    ],
    allowSingleSectionChapters: true,
    preferSceneBreaks: true,
    timeJumpFrequency: 'frequent'
  },
  
  'literary': {
    optimalChapterLength: 4000,
    minChapterLength: 2500,
    maxChapterLength: 6000,
    preferredChapterCount: (wordCount) => Math.max(3, Math.ceil(wordCount / 4000)),
    optimalSectionLength: 1500,
    minSectionLength: 1000,
    maxSectionLength: 2000,
    preferredSectionsPerChapter: 3,
    pacingPattern: 'linear',
    chapterEndStyle: 'reflection',
    preferredTransitions: [
      { type: 'bridge-paragraph', weight: 0.6, description: 'Lyrical narrative flow' },
      { type: 'emotional-bridge', weight: 0.3, description: 'Character introspection' },
      { type: 'scene-break', weight: 0.1, description: 'Subtle shifts' }
    ],
    allowSingleSectionChapters: false,
    preferSceneBreaks: false,
    timeJumpFrequency: 'rare'
  },
  
  'sci-fi': {
    optimalChapterLength: 3200,
    minChapterLength: 2000,
    maxChapterLength: 4500,
    preferredChapterCount: (wordCount) => Math.max(4, Math.ceil(wordCount / 3200)),
    optimalSectionLength: 1100,
    minSectionLength: 800,
    maxSectionLength: 1600,
    preferredSectionsPerChapter: 3,
    pacingPattern: 'variable',
    chapterEndStyle: 'mixed',
    preferredTransitions: [
      { type: 'scene-break', weight: 0.4, description: 'Setting/time changes' },
      { type: 'bridge-paragraph', weight: 0.3, description: 'Concept explanations' },
      { type: 'time-jump', weight: 0.2, description: 'Futuristic pacing' },
      { type: 'perspective-shift', weight: 0.1, description: 'Multiple viewpoints' }
    ],
    allowSingleSectionChapters: false,
    preferSceneBreaks: true,
    timeJumpFrequency: 'occasional'
  },
  
  'young-adult': {
    optimalChapterLength: 2000,
    minChapterLength: 1200,
    maxChapterLength: 2800,
    preferredChapterCount: (wordCount) => Math.max(8, Math.ceil(wordCount / 2000)),
    optimalSectionLength: 700,
    minSectionLength: 500,
    maxSectionLength: 1000,
    preferredSectionsPerChapter: 3,
    pacingPattern: 'accelerating',
    chapterEndStyle: 'cliffhanger',
    preferredTransitions: [
      { type: 'bridge-paragraph', weight: 0.4, description: 'Accessible flow' },
      { type: 'scene-break', weight: 0.3, description: 'Clear structure' },
      { type: 'emotional-bridge', weight: 0.3, description: 'Character focus' }
    ],
    allowSingleSectionChapters: true,
    preferSceneBreaks: false,
    timeJumpFrequency: 'occasional'
  },
  
  'historical': {
    optimalChapterLength: 3800,
    minChapterLength: 2500,
    maxChapterLength: 5000,
    preferredChapterCount: (wordCount) => Math.max(3, Math.ceil(wordCount / 3800)),
    optimalSectionLength: 1300,
    minSectionLength: 1000,
    maxSectionLength: 1800,
    preferredSectionsPerChapter: 3,
    pacingPattern: 'linear',
    chapterEndStyle: 'resolution',
    preferredTransitions: [
      { type: 'bridge-paragraph', weight: 0.5, description: 'Period-appropriate flow' },
      { type: 'scene-break', weight: 0.3, description: 'Historical settings' },
      { type: 'time-jump', weight: 0.2, description: 'Historical progression' }
    ],
    allowSingleSectionChapters: false,
    preferSceneBreaks: true,
    timeJumpFrequency: 'occasional'
  }
};

// Default fallback for unknown genres
export const DEFAULT_STRUCTURE: GenreStructureRules = {
  optimalChapterLength: 2500,
  minChapterLength: 1500,
  maxChapterLength: 3500,
  preferredChapterCount: (wordCount) => Math.max(4, Math.ceil(wordCount / 2500)),
  optimalSectionLength: 1000,
  minSectionLength: 600,
  maxSectionLength: 1400,
  preferredSectionsPerChapter: 3,
  pacingPattern: 'linear',
  chapterEndStyle: 'mixed',
  preferredTransitions: [
    { type: 'bridge-paragraph', weight: 0.5, description: 'Standard narrative flow' },
    { type: 'scene-break', weight: 0.3, description: 'Scene transitions' },
    { type: 'emotional-bridge', weight: 0.2, description: 'Character continuity' }
  ],
  allowSingleSectionChapters: true,
  preferSceneBreaks: false,
  timeJumpFrequency: 'occasional'
};

export class GenreStructurePlanner {
  /**
   * Get structure rules for a specific genre
   */
  static getStructureRules(genre: string): GenreStructureRules {
    const normalizedGenre = genre.toLowerCase().replace(/[^a-z-]/g, '');
    return GENRE_STRUCTURES[normalizedGenre] || DEFAULT_STRUCTURE;
  }
  
  /**
   * Calculate optimal chapter structure for a book
   */
  static calculateChapterStructure(settings: BookSettings): {
    chapterCount: number;
    averageChapterLength: number;
    chapterLengths: number[];
  } {
    const rules = this.getStructureRules(settings.genre);
    const chapterCount = rules.preferredChapterCount(settings.wordCount);
    const averageChapterLength = Math.floor(settings.wordCount / chapterCount);
    
    // Create varied chapter lengths based on pacing pattern
    const chapterLengths = this.generateChapterLengths(
      settings.wordCount,
      chapterCount,
      rules
    );
    
    return {
      chapterCount,
      averageChapterLength,
      chapterLengths
    };
  }
  
  /**
   * Plan sections for a specific chapter
   */
  static planChapterSections(
    chapterNumber: number,
    chapterWordCount: number,
    totalChapters: number,
    settings: BookSettings
  ): SectionPlan[] {
    const rules = this.getStructureRules(settings.genre);
    
    // Calculate optimal section count for this chapter
    const sectionCount = Math.max(
      1,
      Math.min(
        5,
        Math.round(chapterWordCount / rules.optimalSectionLength)
      )
    );
    
    // If single section and genre doesn't allow it, force 2 sections
    const finalSectionCount = sectionCount === 1 && !rules.allowSingleSectionChapters 
      ? 2 
      : sectionCount;
    
    const sections: SectionPlan[] = [];
    const baseWordCount = Math.floor(chapterWordCount / finalSectionCount);
    
    for (let i = 1; i <= finalSectionCount; i++) {
      const sectionType = this.determineSectionType(i, finalSectionCount, chapterNumber, totalChapters);
      const transitionIn = this.selectTransition(rules.preferredTransitions, 'in');
      const transitionOut = this.selectTransition(rules.preferredTransitions, 'out');
      
      sections.push({
        number: i,
        type: sectionType,
        wordTarget: baseWordCount + (i === finalSectionCount ? chapterWordCount % finalSectionCount : 0),
        purpose: this.generateSectionPurpose(sectionType, i, finalSectionCount),
        emotionalBeat: this.generateEmotionalBeat(sectionType, chapterNumber, totalChapters),
        transitionIn,
        transitionOut
      });
    }
    
    return sections;
  }
  
  /**
   * Generate chapter lengths with natural variation
   */
  private static generateChapterLengths(
    totalWords: number,
    chapterCount: number,
    rules: GenreStructureRules
  ): number[] {
    const baseLength = Math.floor(totalWords / chapterCount);
    const lengths: number[] = [];
    
    for (let i = 0; i < chapterCount; i++) {
      let multiplier = 1.0;
      const position = i / (chapterCount - 1);
      
      // Apply pacing pattern
      switch (rules.pacingPattern) {
        case 'accelerating':
          multiplier = 0.9 + (position * 0.3); // Start smaller, get bigger
          break;
        case 'variable':
          multiplier = 0.8 + (Math.sin(position * Math.PI * 2) * 0.2) + 0.2;
          break;
        case 'wave':
          multiplier = 1.0 + (Math.sin(position * Math.PI * 4) * 0.15);
          break;
        case 'linear':
        default:
          multiplier = 0.9 + (Math.random() * 0.2); // Small random variation
          break;
      }
      
      // Special chapters get different lengths
      if (i === 0) multiplier *= 1.1; // Longer opening
      if (i === chapterCount - 1) multiplier *= 1.05; // Longer ending
      if (i === Math.floor(chapterCount * 0.8)) multiplier *= 1.2; // Longer climax
      
      const chapterLength = Math.max(
        rules.minChapterLength,
        Math.min(rules.maxChapterLength, Math.floor(baseLength * multiplier))
      );
      
      lengths.push(chapterLength);
    }
    
    // Adjust to hit exact word count
    const currentTotal = lengths.reduce((sum, len) => sum + len, 0);
    const difference = totalWords - currentTotal;
    lengths[Math.floor(chapterCount / 2)] += difference;
    
    return lengths;
  }
  
  /**
   * Determine section type based on position
   */
  private static determineSectionType(
    sectionNum: number,
    totalSections: number,
    chapterNum: number,
    totalChapters: number
  ): SectionType {
    const sectionPosition = sectionNum / totalSections;
    const chapterPosition = chapterNum / totalChapters;
    
    // First section is always opening
    if (sectionNum === 1) return 'opening';
    
    // Last section depends on chapter position
    if (sectionNum === totalSections) {
      if (chapterPosition > 0.8) return 'resolution';
      if (chapterPosition > 0.6) return 'climax';
      return 'bridge';
    }
    
    // Middle sections vary by position and purpose
    if (totalSections === 2) {
      return 'development';
    }
    
    if (sectionPosition < 0.4) return 'development';
    if (sectionPosition > 0.6) return 'climax';
    return 'development';
  }
  
  /**
   * Select appropriate transition style
   */
  private static selectTransition(
    transitions: TransitionStyle[],
    direction: 'in' | 'out'
  ): TransitionStyle {
    const totalWeight = transitions.reduce((sum, t) => sum + t.weight, 0);
    const random = Math.random() * totalWeight;
    let currentWeight = 0;
    
    for (const transition of transitions) {
      currentWeight += transition.weight;
      if (random <= currentWeight) {
        return transition;
      }
    }
    
    return transitions[0];
  }
  
  /**
   * Generate section purpose description
   */
  private static generateSectionPurpose(
    type: SectionType,
    sectionNum: number,
    totalSections: number
  ): string {
    const purposes = {
      opening: `Establish the chapter's context and hook the reader`,
      development: `Advance the plot and develop characters (section ${sectionNum}/${totalSections})`,
      climax: `Build tension and reach a dramatic moment`,
      resolution: `Resolve the chapter's conflict and transition forward`,
      bridge: `Connect story elements and maintain narrative flow`,
      'dialogue-heavy': `Character interaction and relationship development`,
      'action-heavy': `Dynamic scenes with high energy and movement`,
      introspective: `Character reflection and internal development`,
      worldbuilding: `Establish setting, context, and atmosphere`,
      revelation: `Reveal important plot information or character insights`
    };
    
    return purposes[type] || `Section ${sectionNum} development`;
  }
  
  /**
   * Generate emotional beat for section
   */
  private static generateEmotionalBeat(
    type: SectionType,
    chapterNum: number,
    totalChapters: number
  ): string {
    const position = chapterNum / totalChapters;
    
    if (position < 0.25) return 'establishment';
    if (position < 0.5) return 'rising-tension';
    if (position < 0.75) return 'conflict';
    return 'resolution';
  }
} 