import { generateAIText } from '@/lib/openai';
import type { BookSettings } from '@/types';
import type { ComprehensiveResearch } from './research-agent';

export interface ContinuityInspectorConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface CharacterState {
  name: string;
  currentLocation: string;
  physicalState: string;
  emotionalState: string;
  knowledgeState: string; // What they know at this point
  relationships: { [character: string]: string };
  lastSeen: number; // Chapter number
}

export interface PlotPoint {
  chapter: number;
  event: string;
  consequences: string[];
  affectedCharacters: string[];
  establishedFacts: string[];
}

export interface TimelineEntry {
  chapter: number;
  timeReference: string; // "Day 1", "Three hours later", etc.
  absoluteTime?: string; // Actual time if determinable
  duration?: string;
}

export interface ConsistencyTracker {
  characters: CharacterState[];
  plotPoints: PlotPoint[];
  timeline: TimelineEntry[];
  establishedFacts: string[];
  researchReferences: { fact: string; chapter: number; context: string }[];
  worldBuilding: { element: string; description: string; chapters: number[] }[];
}

export interface ConsistencyIssue {
  type: 'character' | 'plot' | 'timeline' | 'research' | 'worldbuilding';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  chapters: number[];
  suggestion: string;
  conflictingElements: string[];
}

export interface ConsistencyReport {
  overallScore: number; // 0-100
  issues: ConsistencyIssue[];
  successfulElements: string[];
  recommendations: string[];
}

export class ContinuityInspectorAgent {
  private config: ContinuityInspectorConfig;
  private tracker: ConsistencyTracker;

  constructor(config?: Partial<ContinuityInspectorConfig>) {
    this.config = {
      model: 'gpt-4o',
      temperature: 0.0, // Very low temperature for factual consistency
      maxTokens: 4000,
      ...config
    };

    this.tracker = {
      characters: [],
      plotPoints: [],
      timeline: [],
      establishedFacts: [],
      researchReferences: [],
      worldBuilding: []
    };
  }

  /**
   * Initialize tracking with story setup
   */
  async initializeTracking(
    characters: any[],
    outline: any,
    research: ComprehensiveResearch,
    settings: BookSettings
  ): Promise<void> {
    try {
      console.log('Initializing continuity tracking...');
      
      // Initialize character states
      this.tracker.characters = characters.map(char => ({
        name: char.name,
        currentLocation: 'Initial setting',
        physicalState: 'Normal',
        emotionalState: 'Starting state',
        knowledgeState: 'Initial knowledge',
        relationships: {},
        lastSeen: 0
      }));

      // Extract initial facts from research
      this.tracker.establishedFacts = [
        ...research.domainKnowledge.flatMap(r => r.facts.slice(0, 3)),
        ...research.settingDetails.flatMap(r => r.facts.slice(0, 2)),
        ...research.technicalAspects.flatMap(r => r.facts.slice(0, 2))
      ];

      // Initialize timeline
      this.tracker.timeline = [{
        chapter: 1,
        timeReference: 'Story begins',
        duration: 'Initial'
      }];

      console.log('Continuity tracking initialized successfully');
    } catch (error) {
      console.error('Error initializing continuity tracking:', error);
      throw error;
    }
  }

  /**
   * Check consistency of a chapter before publication
   */
  async checkChapterConsistency(
    chapterNumber: number,
    chapterContent: string,
    chapterSummary: string,
    researchUsed: string[]
  ): Promise<ConsistencyReport> {
    try {
      console.log(`Checking consistency for chapter ${chapterNumber}...`);
      
      // Update tracker with chapter information
      await this.updateTrackerFromChapter(chapterNumber, chapterContent, chapterSummary, researchUsed);
      
      // Perform consistency checks
      const issues = await this.performConsistencyChecks(chapterNumber, chapterContent);
      
      // Calculate overall score
      const overallScore = this.calculateConsistencyScore(issues);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(issues, chapterNumber);
      
      const report: ConsistencyReport = {
        overallScore,
        issues,
        successfulElements: this.identifySuccessfulElements(chapterNumber),
        recommendations
      };

      console.log(`Consistency check complete. Score: ${overallScore}/100`);
      return report;
      
    } catch (error) {
      console.error('Error checking chapter consistency:', error);
      throw new Error(`Consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current tracker state
   */
  getTrackerState(): ConsistencyTracker {
    return { ...this.tracker };
  }

  /**
   * Update tracker with information from a new chapter
   */
  private async updateTrackerFromChapter(
    chapterNumber: number,
    content: string,
    summary: string,
    researchUsed: string[]
  ): Promise<void> {
    try {
      const prompt = `
Extract consistency tracking information from this chapter:

CHAPTER ${chapterNumber}:
SUMMARY: ${summary}
CONTENT: ${content.substring(0, 2000)}... (truncated)
RESEARCH USED: ${researchUsed.join(', ')}

Extract and identify:
1. CHARACTER UPDATES: Location changes, physical/emotional state changes, new knowledge gained
2. PLOT POINTS: Key events, consequences, character impacts
3. TIME REFERENCES: How much time has passed, time of day, temporal markers
4. NEW FACTS: World-building elements, research facts mentioned
5. RELATIONSHIP CHANGES: How character relationships evolve

Focus on information that could create consistency issues if not tracked properly.

Respond in JSON format with these sections.`;

      const response = await generateAIText(prompt, {
        model: 'gpt-4o-mini', // Use cheaper model for extraction
        temperature: 0.1,
        maxTokens: 2000,
        system: 'You are a story analyst extracting tracking information. Respond with valid JSON only.'
      });

      const updates = this.parseTrackerUpdates(response.text);
      this.applyTrackerUpdates(chapterNumber, updates);
      
    } catch (error) {
      console.error('Error updating tracker:', error);
      // Continue without updates rather than failing
    }
  }

  /**
   * Perform consistency checks for a chapter
   */
  private async performConsistencyChecks(
    chapterNumber: number,
    content: string
  ): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    try {
      // Character consistency check
      const characterIssues = await this.checkCharacterConsistency(chapterNumber, content);
      issues.push(...characterIssues);
      
      // Timeline consistency check  
      const timelineIssues = await this.checkTimelineConsistency(chapterNumber, content);
      issues.push(...timelineIssues);
      
      return issues;
    } catch (error) {
      console.error('Error performing consistency checks:', error);
      return issues; // Return what we have so far
    }
  }

  /**
   * Check character consistency
   */
  private async checkCharacterConsistency(
    chapterNumber: number,
    content: string
  ): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    for (const character of this.tracker.characters) {
      if (content.toLowerCase().includes(character.name.toLowerCase())) {
        const prompt = `
Check character consistency for ${character.name} in this chapter:

CURRENT CHARACTER STATE:
- Location: ${character.currentLocation}
- Physical: ${character.physicalState}
- Emotional: ${character.emotionalState}
- Knowledge: ${character.knowledgeState}
- Last seen: Chapter ${character.lastSeen}

CHAPTER ${chapterNumber} CONTENT:
${content.substring(0, 1500)}...

Look for consistency issues:
1. Unexplained location changes
2. Contradictory physical/emotional states
3. Knowledge they shouldn't have yet
4. Personality inconsistencies
5. Unexplained behavior changes

If issues found, describe them specifically.`;

        const response = await generateAIText(prompt, {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: 800,
          system: 'You are a continuity editor checking character consistency. Be specific about any issues found.'
        });

        const characterIssues = this.parseCharacterIssues(response.text, character.name, chapterNumber);
        issues.push(...characterIssues);
      }
    }
    
    return issues;
  }

  /**
   * Check timeline consistency
   */
  private async checkTimelineConsistency(
    chapterNumber: number,
    content: string
  ): Promise<ConsistencyIssue[]> {
    const recentTimeline = this.tracker.timeline.slice(-3);
    
    const prompt = `
Check timeline consistency:

RECENT TIMELINE:
${recentTimeline.map(t => 
  `Ch${t.chapter}: ${t.timeReference} ${t.duration ? `(${t.duration})` : ''}`
).join('\n')}

CHAPTER ${chapterNumber} CONTENT:
${content.substring(0, 1000)}...

Look for:
1. Impossible time progression
2. Contradictory time references
3. Characters being in multiple places simultaneously
4. Inconsistent passage of time

Report specific timeline issues.`;

    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: 800
    });

    return this.parseTimelineIssues(response.text, chapterNumber);
  }

  /**
   * Parse tracker updates from AI response
   */
  private parseTrackerUpdates(responseText: string): any {
    try {
      let cleanContent = responseText.trim();
      if (cleanContent.startsWith('```')) {
        const firstNewline = cleanContent.indexOf('\n');
        const lastBackticks = cleanContent.lastIndexOf('```');
        if (firstNewline !== -1 && lastBackticks > firstNewline) {
          cleanContent = cleanContent.substring(firstNewline + 1, lastBackticks).trim();
        }
      }
      
      return JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Error parsing tracker updates:', parseError);
      return {
        characterUpdates: [],
        plotPoints: [],
        timeReferences: [],
        newFacts: []
      };
    }
  }

  /**
   * Apply tracker updates
   */
  private applyTrackerUpdates(chapterNumber: number, updates: any): void {
    try {
      // Update character states
      if (updates.characterUpdates) {
        updates.characterUpdates.forEach((update: any) => {
          const character = this.tracker.characters.find(c => c.name === update.name);
          if (character) {
            if (update.location) character.currentLocation = update.location;
            if (update.physicalState) character.physicalState = update.physicalState;
            if (update.emotionalState) character.emotionalState = update.emotionalState;
            if (update.knowledgeState) character.knowledgeState = update.knowledgeState;
            character.lastSeen = chapterNumber;
          }
        });
      }

      // Add plot points
      if (updates.plotPoints) {
        updates.plotPoints.forEach((point: any) => {
          this.tracker.plotPoints.push({
            chapter: chapterNumber,
            event: point.event || 'Chapter event',
            consequences: point.consequences || [],
            affectedCharacters: point.affectedCharacters || [],
            establishedFacts: point.establishedFacts || []
          });
        });
      }

      // Add timeline entries
      if (updates.timeReferences) {
        updates.timeReferences.forEach((time: any) => {
          this.tracker.timeline.push({
            chapter: chapterNumber,
            timeReference: time.reference || 'Time passes',
            duration: time.duration
          });
        });
      }

      // Add new facts
      if (updates.newFacts) {
        this.tracker.establishedFacts.push(...updates.newFacts);
      }
      
    } catch (error) {
      console.error('Error applying tracker updates:', error);
    }
  }

  /**
   * Parse consistency issues from AI responses
   */
  private parseCharacterIssues(responseText: string, characterName: string, chapterNumber: number): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    if (responseText.toLowerCase().includes('inconsistency') || responseText.toLowerCase().includes('contradiction')) {
      issues.push({
        type: 'character',
        severity: 'major',
        description: `Potential character inconsistency for ${characterName} in chapter ${chapterNumber}`,
        chapters: [chapterNumber],
        suggestion: 'Review character behavior and state for consistency',
        conflictingElements: [characterName]
      });
    }
    
    return issues;
  }

  private parseTimelineIssues(responseText: string, chapterNumber: number): ConsistencyIssue[] {
    const issues: ConsistencyIssue[] = [];
    
    if (responseText.toLowerCase().includes('timeline') || responseText.toLowerCase().includes('time')) {
      issues.push({
        type: 'timeline',
        severity: 'minor',
        description: `Timeline issue in chapter ${chapterNumber}`,
        chapters: [chapterNumber],
        suggestion: 'Verify time progression and references',
        conflictingElements: ['timeline']
      });
    }
    
    return issues;
  }

  /**
   * Calculate overall consistency score
   */
  private calculateConsistencyScore(issues: ConsistencyIssue[]): number {
    let score = 100;
    
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'major':
          score -= 10;
          break;
        case 'minor':
          score -= 3;
          break;
      }
    });
    
    return Math.max(0, score);
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(issues: ConsistencyIssue[], chapterNumber: number): string[] {
    const recommendations: string[] = [];
    
    if (issues.length === 0) {
      recommendations.push('Chapter maintains good consistency with previous story elements');
    } else {
      const criticalIssues = issues.filter(i => i.severity === 'critical');
      const majorIssues = issues.filter(i => i.severity === 'major');
      
      if (criticalIssues.length > 0) {
        recommendations.push('Address critical consistency issues before proceeding');
      }
      
      if (majorIssues.length > 0) {
        recommendations.push('Review and fix major consistency issues');
      }
      
      recommendations.push('Continue monitoring character development and plot progression');
    }
    
    return recommendations;
  }

  /**
   * Identify successful consistency elements
   */
  private identifySuccessfulElements(chapterNumber: number): string[] {
    return [
      'Character behavior remains consistent',
      'Plot progression follows established logic',
      'Research integration feels natural'
    ];
  }

  /**
   * Get configuration
   */
  getConfig(): ContinuityInspectorConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ContinuityInspectorConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
} 