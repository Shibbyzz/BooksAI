import { StoryMemoryManager } from './StoryMemoryManager';
import { type StoryBible } from '../agents/chief-editor-agent';
import { type QualityEnhancement } from '../agents/human-quality-enhancer';
import type { BookSettings } from '@/types';

export interface MemoryContext {
  // Character context
  relevantCharacters: {
    name: string;
    role: string;
    currentState: string;
    recentDevelopments: string[];
    relationships: any;
  }[];
  
  // World context
  activeLocations: {
    name: string;
    description: string;
    significance: string;
  }[];
  
  // Plot context
  recentEvents: {
    title: string;
    description: string;
    impact: string;
    chapterReference: string;
  }[];
  
  // Continuity context
  establishedFacts: string[];
  activeThemes: string[];
  narrativeRules: {
    tone: string;
    perspective: string;
    timeframe: string;
    restrictions: string[];
  };
  
  // Quality context
  priorityElements: {
    emotionalBeats: string[];
    pacingRequirements: string[];
    arcProgression: string[];
  };
}

export interface ContextualPrompt {
  enhancedPrompt: string;
  memoryInjection: string;
  relevanceScore: number;
  contextSources: {
    characters: number;
    locations: number;
    events: number;
    themes: number;
  };
}

export class MemoryAwarePrompting {
  private storyMemoryManager: StoryMemoryManager;
  private contextCache: Map<string, MemoryContext> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  
  constructor(storyMemoryManager: StoryMemoryManager) {
    this.storyMemoryManager = storyMemoryManager;
  }

  /**
   * Enhance an agent prompt with relevant story memory context
   */
  async enhancePrompt(
    bookId: string,
    chapterNumber: number,
    sectionNumber: number,
    basePrompt: string,
    contextType: 'writing' | 'continuity' | 'supervision' | 'transition',
    settings: BookSettings,
    storyBible?: StoryBible,
    qualityPlan?: QualityEnhancement
  ): Promise<ContextualPrompt> {
    console.log(`🧠 Enhancing ${contextType} prompt for Chapter ${chapterNumber}, Section ${sectionNumber}`);
    
    try {
      // Get relevant memory context
      const memoryContext = await this.getRelevantMemoryContext(
        bookId,
        chapterNumber,
        sectionNumber,
        contextType,
        settings,
        storyBible,
        qualityPlan
      );

      // Build contextual prompt based on agent type
      const contextualPrompt = this.buildContextualPrompt(
        basePrompt,
        memoryContext,
        contextType,
        settings
      );

      console.log(`  📊 Memory injection: ${memoryContext.relevantCharacters.length} characters, ${memoryContext.activeLocations.length} locations, ${memoryContext.recentEvents.length} events`);

      return contextualPrompt;

    } catch (error) {
      console.error('Error enhancing prompt with memory context:', error);
      
      // Return original prompt if memory enhancement fails
      return {
        enhancedPrompt: basePrompt,
        memoryInjection: '',
        relevanceScore: 0,
        contextSources: {
          characters: 0,
          locations: 0,
          events: 0,
          themes: 0
        }
      };
    }
  }

  /**
   * Retrieve relevant memory context for the current writing situation
   */
  private async getRelevantMemoryContext(
    bookId: string,
    chapterNumber: number,
    sectionNumber: number,
    contextType: string,
    settings: BookSettings,
    storyBible?: StoryBible,
    qualityPlan?: QualityEnhancement
  ): Promise<MemoryContext> {
    const cacheKey = `${bookId}-${chapterNumber}-${sectionNumber}-${contextType}`;
    
    // Check cache first
    const cached = this.contextCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get story memory data
    const storyMemory = await this.storyMemoryManager.getStoryMemoryData(bookId);
    
    // Build context based on current position in story
    const memoryContext: MemoryContext = {
      relevantCharacters: await this.getRelevantCharacters(
        storyMemory,
        chapterNumber,
        sectionNumber,
        contextType,
        storyBible
      ),
      activeLocations: await this.getActiveLocations(
        storyMemory,
        chapterNumber,
        sectionNumber,
        contextType
      ),
      recentEvents: await this.getRecentEvents(
        storyMemory,
        chapterNumber,
        sectionNumber,
        contextType
      ),
      establishedFacts: await this.getEstablishedFacts(
        storyMemory,
        chapterNumber,
        contextType
      ),
      activeThemes: await this.getActiveThemes(
        storyMemory,
        settings,
        storyBible
      ),
      narrativeRules: await this.getNarrativeRules(
        settings,
        storyBible,
        chapterNumber
      ),
      priorityElements: await this.getPriorityElements(
        qualityPlan,
        chapterNumber,
        sectionNumber,
        contextType
      )
    };

    // Cache the context
    this.contextCache.set(cacheKey, memoryContext);
    
    // Set expiry
    setTimeout(() => {
      this.contextCache.delete(cacheKey);
    }, this.cacheExpiry);

    return memoryContext;
  }

  /**
   * Get characters relevant to the current scene
   */
  private async getRelevantCharacters(
    storyMemory: any,
    chapterNumber: number,
    sectionNumber: number,
    contextType: string,
    storyBible?: StoryBible
  ): Promise<MemoryContext['relevantCharacters']> {
    const relevantCharacters = [];

    if (storyMemory?.characters) {
      for (const character of storyMemory.characters) {
        // Priority: Main characters always relevant
        if (character.role === 'protagonist' || character.role === 'antagonist') {
          relevantCharacters.push({
            name: character.name,
            role: character.role,
            currentState: character.personality || 'Active in story',
            recentDevelopments: this.extractRecentDevelopments(character, chapterNumber),
            relationships: character.relationships || {}
          });
        }
        
        // Secondary characters relevant if mentioned recently
        else if (this.isCharacterRecentlyActive(character, chapterNumber, storyBible)) {
          relevantCharacters.push({
            name: character.name,
            role: character.role,
            currentState: character.personality || 'Present in story',
            recentDevelopments: this.extractRecentDevelopments(character, chapterNumber),
            relationships: character.relationships || {}
          });
        }
      }
    }

    return relevantCharacters.slice(0, 5); // Limit to 5 most relevant
  }

  /**
   * Get locations active in the current scene
   */
  private async getActiveLocations(
    storyMemory: any,
    chapterNumber: number,
    sectionNumber: number,
    contextType: string
  ): Promise<MemoryContext['activeLocations']> {
    const activeLocations = [];

    if (storyMemory?.locations) {
      for (const location of storyMemory.locations) {
        // Include locations that are important or recently mentioned
        if (location.importance === 'major' || 
            location.importance === 'minor' && this.isLocationRecentlyMentioned(location, chapterNumber)) {
          activeLocations.push({
            name: location.name,
            description: location.description,
            significance: location.importance === 'major' ? 'Major story location' : 'Recent location'
          });
        }
      }
    }

    return activeLocations.slice(0, 3); // Limit to 3 most relevant
  }

  /**
   * Get recent story events that provide context
   */
  private async getRecentEvents(
    storyMemory: any,
    chapterNumber: number,
    sectionNumber: number,
    contextType: string
  ): Promise<MemoryContext['recentEvents']> {
    const recentEvents = [];

    if (storyMemory?.timelineEvents) {
      for (const event of storyMemory.timelineEvents) {
        // Include events from current and previous chapters
        const eventChapter = this.extractChapterNumber(event.chapterReference);
        
        if (eventChapter && eventChapter >= chapterNumber - 2 && eventChapter <= chapterNumber) {
          recentEvents.push({
            title: event.title,
            description: event.description,
            impact: event.importance === 'MAJOR' ? 'Major story impact' : 'Minor story impact',
            chapterReference: event.chapterReference
          });
        }
      }
    }

    return recentEvents.slice(0, 4); // Limit to 4 most recent
  }

  /**
   * Get established facts that must be maintained
   */
  private async getEstablishedFacts(
    storyMemory: any,
    chapterNumber: number,
    contextType: string
  ): Promise<string[]> {
    const establishedFacts = [];

    if (storyMemory?.worldRules) {
      establishedFacts.push(
        `Genre: ${storyMemory.worldRules.theme || 'Unknown'}`,
        `Tone: ${storyMemory.worldRules.tone || 'Unknown'}`,
        `Setting: ${storyMemory.worldRules.premise || 'Unknown'}`
      );
    }

    // Add character-specific facts
    if (storyMemory?.characters) {
      for (const character of storyMemory.characters.slice(0, 3)) {
        if (character.role === 'protagonist' || character.role === 'antagonist') {
          establishedFacts.push(`${character.name}: ${character.description}`);
        }
      }
    }

    return establishedFacts.slice(0, 6); // Limit to 6 most important
  }

  /**
   * Get active themes for the story
   */
  private async getActiveThemes(
    storyMemory: any,
    settings: BookSettings,
    storyBible?: StoryBible
  ): Promise<string[]> {
    const activeThemes = [];

    if (storyMemory?.themes) {
      activeThemes.push(...storyMemory.themes.slice(0, 3));
    }

    if (storyBible?.overview?.theme) {
      activeThemes.push(storyBible.overview.theme);
    }

    if (settings.genre) {
      activeThemes.push(`Genre: ${settings.genre}`);
    }

    return Array.from(new Set(activeThemes)).slice(0, 4); // Deduplicate and limit
  }

  /**
   * Get narrative rules that must be followed
   */
  private async getNarrativeRules(
    settings: BookSettings,
    storyBible?: StoryBible,
    chapterNumber: number
  ): Promise<MemoryContext['narrativeRules']> {
    return {
      tone: settings.genre ? `${settings.genre} genre` : (storyBible?.overview?.tone || 'Unknown'),
      perspective: 'third-person', // Default narrative perspective
      timeframe: `Chapter ${chapterNumber}`,
      restrictions: [
        'Maintain genre consistency',
        'Respect established character traits',
        'Follow narrative perspective',
        'Maintain story timeline'
      ]
    };
  }

  /**
   * Get priority elements from quality plan
   */
  private async getPriorityElements(
    chapterNumber: number,
    sectionNumber: number,
    contextType: string,
    qualityPlan?: QualityEnhancement
  ): Promise<MemoryContext['priorityElements']> {
    const priorityElements = {
      emotionalBeats: ['Maintain emotional engagement', 'Character development'],
      pacingRequirements: ['Appropriate chapter pacing', 'Scene transitions'],
      arcProgression: ['Character growth', 'Plot advancement']
    };

    // TODO: Integrate with QualityEnhancement when properties are available
    // if (qualityPlan) {
    //   priorityElements.emotionalBeats = qualityPlan.emotionalBeats?.slice(0, 3) || [];
    //   priorityElements.pacingRequirements = qualityPlan.pacingRequirements?.slice(0, 3) || [];
    //   priorityElements.arcProgression = qualityPlan.arcProgression?.slice(0, 3) || [];
    // }

    return priorityElements;
  }

  /**
   * Build the contextual prompt with memory injection
   */
  private buildContextualPrompt(
    basePrompt: string,
    memoryContext: MemoryContext,
    contextType: string,
    settings: BookSettings
  ): ContextualPrompt {
    let memoryInjection = '';
    let relevanceScore = 0;

    // Build memory injection based on context type
    switch (contextType) {
      case 'writing':
        memoryInjection = this.buildWritingMemoryInjection(memoryContext);
        relevanceScore = this.calculateRelevanceScore(memoryContext, 'writing');
        break;
      case 'continuity':
        memoryInjection = this.buildContinuityMemoryInjection(memoryContext);
        relevanceScore = this.calculateRelevanceScore(memoryContext, 'continuity');
        break;
      case 'supervision':
        memoryInjection = this.buildSupervisionMemoryInjection(memoryContext);
        relevanceScore = this.calculateRelevanceScore(memoryContext, 'supervision');
        break;
      case 'transition':
        memoryInjection = this.buildTransitionMemoryInjection(memoryContext);
        relevanceScore = this.calculateRelevanceScore(memoryContext, 'transition');
        break;
    }

    // Combine base prompt with memory injection
    const enhancedPrompt = memoryInjection ? 
      `${basePrompt}\n\n=== STORY MEMORY CONTEXT ===\n${memoryInjection}\n\n=== END CONTEXT ===` : 
      basePrompt;

    return {
      enhancedPrompt,
      memoryInjection,
      relevanceScore,
      contextSources: {
        characters: memoryContext.relevantCharacters.length,
        locations: memoryContext.activeLocations.length,
        events: memoryContext.recentEvents.length,
        themes: memoryContext.activeThemes.length
      }
    };
  }

  /**
   * Build memory injection for writing agents
   */
  private buildWritingMemoryInjection(memoryContext: MemoryContext): string {
    const sections = [];

    if (memoryContext.relevantCharacters.length > 0) {
      sections.push(`ACTIVE CHARACTERS:\n${memoryContext.relevantCharacters
        .map(char => `- ${char.name} (${char.role}): ${char.currentState}`)
        .join('\n')}`);
    }

    if (memoryContext.activeLocations.length > 0) {
      sections.push(`CURRENT LOCATIONS:\n${memoryContext.activeLocations
        .map(loc => `- ${loc.name}: ${loc.description}`)
        .join('\n')}`);
    }

    if (memoryContext.recentEvents.length > 0) {
      sections.push(`RECENT EVENTS:\n${memoryContext.recentEvents
        .map(event => `- ${event.title}: ${event.description}`)
        .join('\n')}`);
    }

    if (memoryContext.activeThemes.length > 0) {
      sections.push(`THEMES TO MAINTAIN:\n${memoryContext.activeThemes
        .map(theme => `- ${theme}`)
        .join('\n')}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Build memory injection for continuity agents
   */
  private buildContinuityMemoryInjection(memoryContext: MemoryContext): string {
    const sections = [];

    if (memoryContext.establishedFacts.length > 0) {
      sections.push(`ESTABLISHED FACTS:\n${memoryContext.establishedFacts
        .map(fact => `- ${fact}`)
        .join('\n')}`);
    }

    if (memoryContext.relevantCharacters.length > 0) {
      sections.push(`CHARACTER STATES:\n${memoryContext.relevantCharacters
        .map(char => `- ${char.name}: ${char.currentState}`)
        .join('\n')}`);
    }

    sections.push(`NARRATIVE RULES:\n- Tone: ${memoryContext.narrativeRules.tone}\n- Perspective: ${memoryContext.narrativeRules.perspective}\n- Restrictions: ${memoryContext.narrativeRules.restrictions.join(', ')}`);

    return sections.join('\n\n');
  }

  /**
   * Build memory injection for supervision agents
   */
  private buildSupervisionMemoryInjection(memoryContext: MemoryContext): string {
    const sections = [];

    if (memoryContext.priorityElements.emotionalBeats.length > 0) {
      sections.push(`EMOTIONAL REQUIREMENTS:\n${memoryContext.priorityElements.emotionalBeats
        .map(beat => `- ${beat}`)
        .join('\n')}`);
    }

    if (memoryContext.priorityElements.pacingRequirements.length > 0) {
      sections.push(`PACING REQUIREMENTS:\n${memoryContext.priorityElements.pacingRequirements
        .map(req => `- ${req}`)
        .join('\n')}`);
    }

    if (memoryContext.activeThemes.length > 0) {
      sections.push(`THEME CONSISTENCY:\n${memoryContext.activeThemes
        .map(theme => `- ${theme}`)
        .join('\n')}`);
    }

    return sections.join('\n\n');
  }

  /**
   * Build memory injection for transition agents
   */
  private buildTransitionMemoryInjection(memoryContext: MemoryContext): string {
    const sections = [];

    if (memoryContext.relevantCharacters.length > 0) {
      sections.push(`CHARACTER CONTINUITY:\n${memoryContext.relevantCharacters
        .map(char => `- ${char.name}: ${char.currentState}`)
        .join('\n')}`);
    }

    sections.push(`NARRATIVE CONSISTENCY:\n- Tone: ${memoryContext.narrativeRules.tone}\n- Perspective: ${memoryContext.narrativeRules.perspective}`);

    return sections.join('\n\n');
  }

  /**
   * Calculate relevance score for memory context
   */
  private calculateRelevanceScore(memoryContext: MemoryContext, contextType: string): number {
    let score = 0;

    // Base score from available context
    score += memoryContext.relevantCharacters.length * 15;
    score += memoryContext.activeLocations.length * 10;
    score += memoryContext.recentEvents.length * 8;
    score += memoryContext.activeThemes.length * 5;
    score += memoryContext.establishedFacts.length * 3;

    // Cap at 100
    return Math.min(score, 100);
  }

  // Helper methods
  private extractRecentDevelopments(character: any, chapterNumber: number): string[] {
    // Extract recent developments from character data
    return [];
  }

  private isCharacterRecentlyActive(character: any, chapterNumber: number, storyBible?: StoryBible): boolean {
    // Check if character has been mentioned recently
    return character.role === 'supporting' || character.role === 'secondary';
  }

  private isLocationRecentlyMentioned(location: any, chapterNumber: number): boolean {
    // Check if location has been mentioned recently
    return true; // Simplified for now
  }

  private extractChapterNumber(chapterReference: string): number | null {
    const match = chapterReference.match(/Chapter (\d+)/);
    return match ? parseInt(match[1]) : null;
  }

  /**
   * Clear memory cache
   */
  public clearCache(): void {
    this.contextCache.clear();
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.contextCache.size,
      keys: Array.from(this.contextCache.keys())
    };
  }
} 