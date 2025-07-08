import { generateAIText } from '@/lib/openai';
import type { BookSettings } from '@/types';
import type { ComprehensiveResearch } from '../validators/research';
import fs from 'fs/promises';
import path from 'path';
import { LanguageManager } from '../language/language-utils';
import { LanguagePrompts } from '../language/language-prompts';

// Import prompt builders
import {
  buildCharacterPrompt,
  buildTimelinePrompt,
  buildWorldbuildingPrompt,
  buildResearchPrompt,
  buildTrackerUpdatePrompt,
  buildFallbackPrompt,
  CONSISTENCY_CATEGORIES,
  type ConsistencyCategory,
  type ContinuityPromptConfig
} from '../prompts/continuity';

// Import validators
import {
  safeConsistencyIssuesValidator,
  safeTrackerUpdatesValidator,
  logValidationError,
  type ValidationResult,
  type ConsistencyIssuesResponse,
  type TrackerUpdates,
  type ConsistencyIssue
} from '../validators/continuity';

export interface ContinuityInspectorConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  maxRetries: number;
  retryDelay: number;
  maxContentLength: number;
  parsingRetries: number;
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

// ConsistencyIssue type is now imported from validators

export interface ContinuityTrace {
  chapterNumber: number;
  processingSteps: string[];
  aiResponses: { [key: string]: string };
  parseErrors: string[];
  retryAttempts: number;
  contentLength: number;
  issuesFound: number;
  processingTime: number;
}

export interface ConsistencyReport {
  overallScore: number; // 0-100
  categoryScores: { [category: string]: number };
  issues: ConsistencyIssue[];
  successfulElements: string[];
  recommendations: string[];
  trace?: ContinuityTrace;
}

// Category check runner interface
interface CategoryCheckRunner {
  category: ConsistencyCategory;
  runner: (chapterNumber: number, content: string, researchUsed: string[], trace: ContinuityTrace, settings?: BookSettings) => Promise<ConsistencyIssue[]>;
}

// Generic prompt builder type
type PromptBuilder = (chapterNumber: number, content: string, ...args: any[]) => string;

// NAMING SUGGESTIONS FOR FUTURE IMPROVEMENTS:
// 1. CategoryCheckRunner -> ConsistencyCheckRunner (more descriptive)
// 2. ContinuityTrace -> ConsistencyCheckTrace (clearer purpose)
// 3. runConsistencyCheck -> runCategoryConsistencyCheck (more specific)
// 4. parseConsistencyIssues -> transformIssuesResponse (clearer transformation)
// 5. memoizedData -> cachedComputations (more descriptive)
// 6. categoryRunners -> consistencyCheckRunners (more descriptive)
// 7. promptConfig -> promptSettings (clearer intent)
// 8. trackerFilePath -> persistenceFilePath (more descriptive)

// Scoring weights for different issue types
const ISSUE_WEIGHTS = {
  timeline: 1.5,
  character: 1.3,
  plot: 1.2,
  research: 1.0,
  worldbuilding: 0.8,
  relationship: 0.6
};

const SEVERITY_MULTIPLIERS = {
  critical: 25,
  major: 15,
  minor: 5
};

export class ContinuityInspectorAgent {
  private config: ContinuityInspectorConfig;
  private tracker: ConsistencyTracker;
  private trackerFilePath: string;
  private promptConfig: ContinuityPromptConfig;
  private categoryRunners: CategoryCheckRunner[];
  private languageManager: LanguageManager;
  private languagePrompts: LanguagePrompts;
  
  // Caching for performance
  private characterLookupCache: Map<string, CharacterState> = new Map();
  private worldBuildingCache: Map<string, { element: string; description: string; chapters: number[] }> = new Map();
  private memoizedData: {
    recentTimeline?: TimelineEntry[];
    activeCharacters?: CharacterState[];
    lastCacheUpdate?: number;
  } = {};

  constructor(config?: Partial<ContinuityInspectorConfig>) {
    this.config = {
      model: 'gpt-4o',
      temperature: 0.0, // Very low temperature for factual consistency
      maxTokens: 4000,
      maxRetries: 5,        // Increased from 3 for better reliability
      retryDelay: 500,      // Decreased from 1000 for faster recovery
      maxContentLength: 8000,
      parsingRetries: 4,    // Increased from 2 for better parse recovery
      ...config
    };

    this.languageManager = LanguageManager.getInstance();
    this.languagePrompts = LanguagePrompts.getInstance();

    this.promptConfig = {
      maxContentLength: this.config.maxContentLength
    };

    this.tracker = {
      characters: [],
      plotPoints: [],
      timeline: [],
      establishedFacts: [],
      researchReferences: [],
      worldBuilding: []
    };

    this.trackerFilePath = path.join(process.cwd(), 'data', 'continuity-tracker.json');
    
    // Initialize category runners
    this.categoryRunners = [
      {
        category: 'character',
        runner: this.runCharacterConsistencyCheck.bind(this)
      },
      {
        category: 'timeline',
        runner: this.runTimelineConsistencyCheck.bind(this)
      },
      {
        category: 'worldbuilding',
        runner: this.runWorldbuildingConsistencyCheck.bind(this)
      },
      {
        category: 'research',
        runner: this.runResearchConsistencyCheck.bind(this)
      }
    ];
  }

  /**
   * Retry utility with exponential backoff
   */
  private async runWithRetry<T>(
    operation: () => Promise<T>,
    context: string,
    maxRetries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 ${context} - Attempt ${attempt}/${maxRetries}`);
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`❌ ${context} - Attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          console.log(`⏱️ ${context} - Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new Error(`${context} - All ${maxRetries} attempts failed. Last error: ${lastError?.message}`);
  }

  /**
   * Generate AI text with parsing retry logic
   */
  private async generateWithParsingRetry<T>(
    prompt: string,
    context: string,
    validator: (text: string) => T,
    trace: ContinuityTrace,
    languageCode?: string,
    temperature?: number
  ): Promise<T> {
    let lastError: Error | null = null;
    const startAttempt = trace.retryAttempts;
    
    for (let attempt = 1; attempt <= this.config.parsingRetries + 1; attempt++) {
      trace.retryAttempts++;
      
      try {
        const currentPrompt = attempt === 1 ? prompt : buildFallbackPrompt(prompt);
        
        console.log(`🎯 ${context} - Parsing attempt ${attempt}/${this.config.parsingRetries + 1}`);
        
        const response = await this.runWithRetry(
          () => generateAIText(currentPrompt, {
            model: this.config.model,
            temperature: temperature || this.config.temperature,
            maxTokens: this.config.maxTokens,
            system: 'You are a story continuity analyst. Always respond with valid JSON only.'
          }),
          context
        );
        
        const validated = validator(response.text);
        console.log(`✅ ${context} - Validation successful`);
        return validated;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`⚠️ ${context} - Parsing attempt ${attempt} failed:`, lastError.message);
        
        if (attempt > this.config.parsingRetries) {
          const errorMsg = `${context} - All parsing attempts failed: ${lastError.message}`;
          trace.parseErrors.push(errorMsg);
          console.error(`🚨 ${errorMsg}`);
          throw new Error(errorMsg);
        }
      }
    }
    
    throw lastError || new Error(`${context} - All parsing attempts failed`);
  }

  /**
   * Generic consistency check for reusable logic
   */
  private async runGenericConsistencyCheck(
    category: string,
    chapterNumber: number,
    content: string,
    researchUsed: string[],
    trace: ContinuityTrace,
    promptBuilder: Function,
    contextData: any,
    additionalData?: any,
    settings?: BookSettings
  ): Promise<ConsistencyIssue[]> {
    try {
      const languageCode = settings?.language || 'en';
      const adjustedTemperature = this.languageManager.getAdjustedTemperature(languageCode, this.config.temperature);
      
      // Fix parameter order: prompt builders expect (chapterNumber, content, contextData, config)
      const basePrompt = additionalData 
        ? promptBuilder(chapterNumber, content, contextData, additionalData)
        : promptBuilder(chapterNumber, content, contextData, this.promptConfig);
        
      const languageAdditions = this.languageManager.getContentPromptAdditions(languageCode, settings?.genre);
      const prompt = basePrompt + languageAdditions;
      
      const response = await this.generateWithParsingRetry(
        prompt,
        `${category} consistency check`,
        safeConsistencyIssuesValidator,
        trace,
        languageCode,
        adjustedTemperature
      );
      
      trace.aiResponses[category] = JSON.stringify(response);
      return this.parseConsistencyIssues(response, chapterNumber);
    } catch (error) {
      const errorMsg = `${category} check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      trace.parseErrors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
      
      // NEW: Hard fail for critical parsing failures instead of returning empty array
      if (error instanceof Error && error.message.includes('All parsing attempts failed')) {
        throw new Error(`CRITICAL: ${category} consistency check failed after all retries - ${errorMsg}`);
      }
      
      return []; // Only return empty for non-critical errors
    }
  }

  /**
   * Run a specific category consistency check
   */
  private async runConsistencyCheck(
    category: ConsistencyCategory,
    chapterNumber: number,
    content: string,
    researchUsed: string[],
    trace: ContinuityTrace,
    settings?: BookSettings
  ): Promise<ConsistencyIssue[]> {
    const runner = this.categoryRunners.find(r => r.category === category);
    if (!runner) {
      console.warn(`⚠️ No runner found for category: ${category}`);
      return [];
    }

    const categoryInfo = CONSISTENCY_CATEGORIES[category];
    console.log(`🔍 Running ${categoryInfo.name} check for Chapter ${chapterNumber}`);
    
    try {
      const issues = await runner.runner(chapterNumber, content, researchUsed, trace, settings);
      console.log(`✅ ${categoryInfo.name} check complete - ${issues.length} issues found`);
      return issues;
    } catch (error) {
      const errorMsg = `${categoryInfo.name} check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      trace.parseErrors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
      return [];
    }
  }

  /**
   * Character consistency check runner
   */
  private async runCharacterConsistencyCheck(
    chapterNumber: number,
    content: string,
    researchUsed: string[],
    trace: ContinuityTrace,
    settings?: BookSettings
  ): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    const languageCode = settings?.language || 'en';
    const adjustedTemperature = this.languageManager.getAdjustedTemperature(languageCode, this.config.temperature);
    
    for (const character of this.tracker.characters) {
      if (content.toLowerCase().includes(character.name.toLowerCase())) {
        try {
          const basePrompt = buildCharacterPrompt(character, chapterNumber, content, this.promptConfig);
          const languageAdditions = this.languageManager.getContentPromptAdditions(languageCode, settings?.genre);
          const prompt = basePrompt + languageAdditions;
          
          const response = await this.generateWithParsingRetry(
            prompt,
            `Character consistency check for ${character.name}`,
            safeConsistencyIssuesValidator,
            trace,
            languageCode,
            adjustedTemperature
          );
          
          trace.aiResponses[`character_${character.name}`] = JSON.stringify(response);
          const characterIssues = this.parseConsistencyIssues(response, chapterNumber);
          issues.push(...characterIssues);
        } catch (error) {
          const errorMsg = `Character check failed for ${character.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          trace.parseErrors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
          
          // NEW: Hard fail for critical parsing failures
          if (error instanceof Error && error.message.includes('All parsing attempts failed')) {
            throw new Error(`CRITICAL: Character consistency check for ${character.name} failed after all retries - ${errorMsg}`);
          }
        }
      }
    }
    
    return issues;
  }

  /**
   * Timeline consistency check runner
   */
  private async runTimelineConsistencyCheck(
    chapterNumber: number,
    content: string,
    researchUsed: string[],
    trace: ContinuityTrace,
    settings?: BookSettings
  ): Promise<ConsistencyIssue[]> {
    const recentTimeline = this.getRecentTimeline(5);
    return this.runGenericConsistencyCheck(
      'timeline',
      chapterNumber,
      content,
      researchUsed,
      trace,
      buildTimelinePrompt,
      recentTimeline,
      this.promptConfig,
      settings
    );
  }

  /**
   * Worldbuilding consistency check runner
   */
  private async runWorldbuildingConsistencyCheck(
    chapterNumber: number,
    content: string,
    researchUsed: string[],
    trace: ContinuityTrace,
    settings?: BookSettings
  ): Promise<ConsistencyIssue[]> {
    return this.runGenericConsistencyCheck(
      'worldbuilding',
      chapterNumber,
      content,
      researchUsed,
      trace,
      buildWorldbuildingPrompt,
      this.tracker.worldBuilding,
      this.promptConfig,
      settings
    );
  }

  /**
   * Research consistency check runner
   */
  private async runResearchConsistencyCheck(
    chapterNumber: number,
    content: string,
    researchUsed: string[],
    trace: ContinuityTrace,
    settings?: BookSettings
  ): Promise<ConsistencyIssue[]> {
    if (researchUsed.length === 0) {
      return [];
    }
    
    return this.runGenericConsistencyCheck(
      'research',
      chapterNumber,
      content,
      researchUsed,
      trace,
      buildResearchPrompt,
      researchUsed,
      this.tracker.researchReferences,
      settings
    );
  }

  /**
   * Save tracker state to persistent storage
   */
  async saveTrackerState(): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(this.trackerFilePath), { recursive: true });
      
      const trackerData = {
        ...this.tracker,
        metadata: {
          savedAt: new Date().toISOString(),
          version: '1.0'
        }
      };
      
      await fs.writeFile(this.trackerFilePath, JSON.stringify(trackerData, null, 2));
      console.log('💾 Tracker state saved successfully');
    } catch (error) {
      console.error('❌ Error saving tracker state:', error);
      throw new Error(`Failed to save tracker state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load tracker state from persistent storage
   */
  async loadTrackerState(): Promise<void> {
    try {
      const data = await fs.readFile(this.trackerFilePath, 'utf-8');
      const trackerData = JSON.parse(data);
      
      // Validate loaded data structure
      if (!trackerData.characters || !trackerData.plotPoints || !trackerData.timeline) {
        throw new Error('Invalid tracker data structure');
      }
      
      this.tracker = {
        characters: trackerData.characters || [],
        plotPoints: trackerData.plotPoints || [],
        timeline: trackerData.timeline || [],
        establishedFacts: trackerData.establishedFacts || [],
        researchReferences: trackerData.researchReferences || [],
        worldBuilding: trackerData.worldBuilding || []
      };
      
      // Rebuild caches after loading
      this.rebuildCharacterCache();
      this.invalidateCache();
      
      console.log('📥 Tracker state loaded successfully');
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        console.log('📝 No existing tracker state found, starting fresh');
        return;
      }
      
      console.error('❌ Error loading tracker state:', error);
      throw new Error(`Failed to load tracker state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reset tracker state
   */
  resetTracker(): void {
    this.tracker = {
      characters: [],
      plotPoints: [],
      timeline: [],
      establishedFacts: [],
      researchReferences: [],
      worldBuilding: []
    };
    
    // Clear caches
    this.characterLookupCache.clear();
    this.worldBuildingCache.clear();
    this.invalidateCache();
    
    console.log('🔄 Tracker state reset successfully');
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
      console.log('🚀 Initializing continuity tracking...');
      
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

      // Initialize research references
      this.tracker.researchReferences = [
        ...research.domainKnowledge.flatMap(r => 
          r.facts.slice(0, 2).map(fact => ({
            fact,
            chapter: 0,
            context: 'Initial research'
          }))
        ),
        ...research.technicalAspects.flatMap(r => 
          r.facts.slice(0, 2).map(fact => ({
            fact,
            chapter: 0,
            context: 'Initial research'
          }))
        )
      ];

      // Initialize timeline
      this.tracker.timeline = [{
        chapter: 1,
        timeReference: 'Story begins',
        duration: 'Initial'
      }];

      // Save initial state
      await this.saveTrackerState();

      console.log('✅ Continuity tracking initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing continuity tracking:', error);
      throw error;
    }
  }

  /**
   * Check consistency of a section in real-time (NEW: Section-level validation)
   */
  async checkSectionConsistency(
    chapterNumber: number,
    sectionNumber: number,
    sectionContent: string,
    sectionSummary: string,
    accumulatedChapterContent: string,
    researchUsed: string[],
    settings?: BookSettings
  ): Promise<ConsistencyReport> {
    const startTime = Date.now();
    const trace: ContinuityTrace = {
      chapterNumber: chapterNumber + (sectionNumber / 100), // Pseudo-chapter ID for tracking
      processingSteps: [],
      aiResponses: {},
      parseErrors: [],
      retryAttempts: 0,
      contentLength: sectionContent.length,
      issuesFound: 0,
      processingTime: 0
    };

    try {
      console.log(`🔍 [REAL-TIME] Checking consistency for Chapter ${chapterNumber}, Section ${sectionNumber}...`);
      trace.processingSteps.push('Starting real-time section consistency check');
      
      // Lightweight tracker update for section
      trace.processingSteps.push('Updating tracker from section');
      await this.updateTrackerFromSection(chapterNumber, sectionNumber, sectionContent, sectionSummary, researchUsed, trace, settings);
      
      // Perform focused consistency checks for this section
      trace.processingSteps.push('Performing section consistency checks');
      const issues = await this.performSectionConsistencyChecks(
        chapterNumber, 
        sectionNumber, 
        sectionContent, 
        accumulatedChapterContent, 
        researchUsed, 
        trace, 
        settings
      );
      trace.issuesFound = issues.length;
      
      // Calculate scores (more lenient for sections)
      trace.processingSteps.push('Calculating section scores');
      const { overallScore, categoryScores } = this.calculateSectionConsistencyScore(issues, sectionContent.length);
      
      // Generate immediate recommendations
      trace.processingSteps.push('Generating section recommendations');
      const recommendations = this.generateSectionRecommendations(issues, chapterNumber, sectionNumber);
      
      trace.processingTime = Date.now() - startTime;
      
      console.log(`✅ Section consistency check complete - Score: ${overallScore}/100, Issues: ${issues.length}`);
      
      return {
        overallScore,
        categoryScores,
        issues,
        recommendations,
        trace,
        successfulElements: this.identifySuccessfulSectionElements(chapterNumber, sectionNumber)
      };
      
    } catch (error) {
      trace.processingTime = Date.now() - startTime;
      const errorMsg = `Section consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      trace.parseErrors.push(errorMsg);
      console.error('❌ Section consistency check error:', error);
      
      return {
        overallScore: 30,
        categoryScores: { character: 30, timeline: 30, worldbuilding: 30, research: 30 },
                 issues: [{
           type: 'character',
           severity: 'critical',
           description: errorMsg,
           suggestion: 'Review section content and try again',
           conflictingElements: [],
           chapters: [chapterNumber]
         }],
        recommendations: ['Fix validation errors and retry section generation'],
        trace,
        successfulElements: []
      };
    }
  }

  /**
   * Check consistency of a chapter before publication
   */
  async checkChapterConsistency(
    chapterNumber: number,
    chapterContent: string,
    chapterSummary: string,
    researchUsed: string[],
    settings?: BookSettings
  ): Promise<ConsistencyReport> {
    const startTime = Date.now();
    const trace: ContinuityTrace = {
      chapterNumber,
      processingSteps: [],
      aiResponses: {},
      parseErrors: [],
      retryAttempts: 0,
      contentLength: chapterContent.length,
      issuesFound: 0,
      processingTime: 0
    };

    try {
      console.log(`🔍 Checking consistency for chapter ${chapterNumber}...`);
      trace.processingSteps.push('Starting consistency check');
      
      // Update tracker with chapter information
      trace.processingSteps.push('Updating tracker from chapter');
      await this.updateTrackerFromChapter(chapterNumber, chapterContent, chapterSummary, researchUsed, trace, settings);
      
      // Perform consistency checks using loopable structure
      trace.processingSteps.push('Performing consistency checks');
      const issues = await this.performConsistencyChecks(chapterNumber, chapterContent, researchUsed, trace, settings);
      trace.issuesFound = issues.length;
      
      // Calculate scores
      trace.processingSteps.push('Calculating scores');
      const { overallScore, categoryScores } = this.calculateConsistencyScore(issues, chapterContent.length);
      
      // Generate recommendations
      trace.processingSteps.push('Generating recommendations');
      const recommendations = this.generateRecommendations(issues, chapterNumber);
      
      // Save updated state
      trace.processingSteps.push('Saving tracker state');
      await this.saveTrackerState();
      
      trace.processingTime = Date.now() - startTime;
      
      console.log(`✅ Consistency check complete - Score: ${overallScore}/100, Issues: ${issues.length}`);
      
      return {
        overallScore,
        categoryScores,
        issues,
        successfulElements: this.identifySuccessfulElements(chapterNumber),
        recommendations,
        trace
      };
      
    } catch (error) {
      trace.processingTime = Date.now() - startTime;
      const errorMsg = `Consistency check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      trace.parseErrors.push(errorMsg);
      console.error('❌ Error checking chapter consistency:', error);
      
      // NEW: Hard fail for critical consistency failures
      if (error instanceof Error && error.message.includes('CRITICAL:')) {
        console.error('🚫 CRITICAL consistency failure - cannot proceed with fallback');
        throw error; // Propagate critical errors
      }
      
      // Return partial results for non-critical errors
      return {
        overallScore: 0,
        categoryScores: {},
        issues: [],
        successfulElements: [],
        recommendations: ['❌ Consistency check failed - please retry'],
        trace
      };
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
    researchUsed: string[],
    trace: ContinuityTrace,
    settings?: BookSettings
  ): Promise<void> {
    try {
      const languageCode = settings?.language || 'en';
      const adjustedTemperature = this.languageManager.getAdjustedTemperature(languageCode, this.config.temperature);
      
      const basePrompt = buildTrackerUpdatePrompt(chapterNumber, content, summary, researchUsed, this.promptConfig);
      const languageAdditions = this.languageManager.getContentPromptAdditions(languageCode, settings?.genre);
      const prompt = basePrompt + languageAdditions;
      
      const updates = await this.generateWithParsingRetry(
        prompt,
        'Extracting tracker updates',
        safeTrackerUpdatesValidator,
        trace,
        languageCode,
        adjustedTemperature
      );
      
      trace.aiResponses['trackerUpdates'] = JSON.stringify(updates);
      this.applyTrackerUpdates(chapterNumber, updates);
      
    } catch (error) {
      const errorMsg = `Tracker update failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      trace.parseErrors.push(errorMsg);
      console.error('❌ Error updating tracker:', error);
      // Continue without updates rather than failing
    }
  }

  /**
   * Perform all consistency checks
   */
  private async performConsistencyChecks(
    chapterNumber: number,
    content: string,
    researchUsed: string[],
    trace: ContinuityTrace,
    settings?: BookSettings
  ): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    try {
      // Run all consistency checks using the loopable structure
      for (const category of Object.keys(CONSISTENCY_CATEGORIES) as ConsistencyCategory[]) {
        trace.processingSteps.push(`Checking ${category} consistency`);
        const categoryIssues = await this.runConsistencyCheck(category, chapterNumber, content, researchUsed, trace, settings);
        issues.push(...categoryIssues);
      }
      
      return issues;
    } catch (error) {
      const errorMsg = `Consistency checks failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      trace.parseErrors.push(errorMsg);
      console.error('❌ Error performing consistency checks:', error);
      return issues; // Return what we have so far
    }
  }

  /**
   * Parse consistency issues from response
   */
  private parseConsistencyIssues(response: ConsistencyIssuesResponse, chapterNumber: number): ConsistencyIssue[] {
    return response.issues.map(issue => ({
      type: issue.type,
      severity: issue.severity,
      description: issue.description,
      chapters: [chapterNumber],
      suggestion: issue.suggestion,
      conflictingElements: issue.conflictingElements || []
    }));
  }

  /**
   * Apply tracker updates
   */
  private applyTrackerUpdates(chapterNumber: number, updates: TrackerUpdates): void {
    try {
      // Update character states
      this.updateCharacterStates(updates.characterUpdates, chapterNumber);
      
      // Add plot points
      this.addPlotPoints(updates.plotPoints, chapterNumber);
      
      // Add timeline entries
      this.addTimelineEntries(updates.timeReferences, chapterNumber);
      
      // Add new facts and research references
      this.addFactsAndReferences(updates.newFacts, chapterNumber);
      
      // Add world building elements
      this.addWorldBuildingElements(updates.worldBuilding, chapterNumber);
      
    } catch (error) {
      console.error('❌ Error applying tracker updates:', error);
    }
  }

  /**
   * Update character states with null-safe assignment
   */
  private updateCharacterStates(updates: TrackerUpdates['characterUpdates'], chapterNumber: number): void {
    updates.forEach(update => {
      const character = this.getCharacterFromCache(update.name);
      if (!character) return;
      
      // Helper to safely update non-null values
      const updateField = <T>(field: keyof CharacterState, value: T | null | undefined) => {
        if (value !== null && value !== undefined) {
          (character as any)[field] = value;
        }
      };
      
      updateField('currentLocation', update.location);
      updateField('physicalState', update.physicalState);
      updateField('emotionalState', update.emotionalState);
      updateField('knowledgeState', update.knowledgeState);
      
      if (update.relationshipChanges) {
        character.relationships = { ...character.relationships, ...update.relationshipChanges };
      }
      character.lastSeen = chapterNumber;
      
      // Update cache
      this.characterLookupCache.set(update.name, character);
    });
    
    // Invalidate memoized data when characters are updated
    this.invalidateCache();
  }

  /**
   * Get character from cache or tracker
   */
  private getCharacterFromCache(name: string): CharacterState | undefined {
    if (this.characterLookupCache.has(name)) {
      return this.characterLookupCache.get(name);
    }
    
    const character = this.tracker.characters.find(c => c.name === name);
    if (character) {
      this.characterLookupCache.set(name, character);
    }
    return character;
  }

  /**
   * Invalidate caches when data changes
   */
  private invalidateCache(): void {
    this.memoizedData = {};
  }

  /**
   * Rebuild character cache
   */
  private rebuildCharacterCache(): void {
    this.characterLookupCache.clear();
    this.tracker.characters.forEach(character => {
      this.characterLookupCache.set(character.name, character);
    });
  }

  /**
   * Get recent timeline entries (memoized)
   */
  private getRecentTimeline(maxEntries: number = 5): TimelineEntry[] {
    const cacheKey = `recentTimeline_${maxEntries}`;
    const now = Date.now();
    
    if (this.memoizedData.recentTimeline && 
        this.memoizedData.lastCacheUpdate && 
        now - this.memoizedData.lastCacheUpdate < 5000) {
      return this.memoizedData.recentTimeline;
    }
    
    const recentTimeline = this.tracker.timeline.slice(-maxEntries);
    this.memoizedData.recentTimeline = recentTimeline;
    this.memoizedData.lastCacheUpdate = now;
    
    return recentTimeline;
  }

  /**
   * Add plot points to tracker
   */
  private addPlotPoints(plotPoints: TrackerUpdates['plotPoints'], chapterNumber: number): void {
    plotPoints.forEach(point => {
      this.tracker.plotPoints.push({
        chapter: chapterNumber,
        event: point.event,
        consequences: point.consequences,
        affectedCharacters: point.affectedCharacters,
        establishedFacts: point.establishedFacts
      });
    });
  }

  /**
   * Add timeline entries to tracker
   */
  private addTimelineEntries(timeReferences: TrackerUpdates['timeReferences'], chapterNumber: number): void {
    timeReferences.forEach(time => {
      this.tracker.timeline.push({
        chapter: chapterNumber,
        timeReference: time.reference,
        duration: time.duration || undefined,
        absoluteTime: time.absoluteTime || undefined
      });
    });
  }

  /**
   * Add facts and research references to tracker
   */
  private addFactsAndReferences(newFacts: string[], chapterNumber: number): void {
    this.tracker.establishedFacts.push(...newFacts);
    
    newFacts.forEach(fact => {
      this.tracker.researchReferences.push({
        fact,
        chapter: chapterNumber,
        context: 'Chapter content'
      });
    });
  }

  /**
   * Add world building elements to tracker
   */
  private addWorldBuildingElements(worldBuilding: TrackerUpdates['worldBuilding'], chapterNumber: number): void {
    worldBuilding.forEach(element => {
      const existing = this.tracker.worldBuilding.find(w => w.element === element.element);
      if (existing) {
        existing.chapters.push(chapterNumber);
      } else {
        this.tracker.worldBuilding.push({
          element: element.element,
          description: element.description,
          chapters: [chapterNumber]
        });
      }
    });
  }

  /**
   * Calculate overall consistency score with category breakdown
   */
  private calculateConsistencyScore(issues: ConsistencyIssue[], contentLength: number): { overallScore: number; categoryScores: { [category: string]: number } } {
    const categoryScores: { [category: string]: number } = {};
    const categoryIssues: { [category: string]: ConsistencyIssue[] } = {};
    
    // Group issues by category
    issues.forEach(issue => {
      if (!categoryIssues[issue.type]) {
        categoryIssues[issue.type] = [];
      }
      categoryIssues[issue.type].push(issue);
    });
    
    // Calculate category scores
    Object.keys(ISSUE_WEIGHTS).forEach(category => {
      const categoryIssuesList = categoryIssues[category] || [];
      let categoryScore = 100;
      
      categoryIssuesList.forEach(issue => {
        const weight = ISSUE_WEIGHTS[issue.type] || 1.0;
        const severity = SEVERITY_MULTIPLIERS[issue.severity] || 5;
        categoryScore -= weight * severity;
      });
      
      categoryScores[category] = Math.max(0, categoryScore);
    });
    
    // Calculate overall score
    let totalDeduction = 0;
    issues.forEach(issue => {
      const weight = ISSUE_WEIGHTS[issue.type] || 1.0;
      const severity = SEVERITY_MULTIPLIERS[issue.severity] || 5;
      totalDeduction += weight * severity;
    });
    
    // Apply content length normalization (longer content is more likely to have issues)
    const lengthNormalization = Math.max(1, contentLength / 5000);
    const normalizedDeduction = totalDeduction / lengthNormalization;
    
    const overallScore = Math.max(0, Math.min(100, 100 - normalizedDeduction));
    
    return { overallScore, categoryScores };
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(issues: ConsistencyIssue[], chapterNumber: number): string[] {
    const recommendations: string[] = [];
    
    if (issues.length === 0) {
      recommendations.push('Chapter maintains excellent consistency with previous story elements');
      return recommendations;
    }
    
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const majorIssues = issues.filter(i => i.severity === 'major');
    const minorIssues = issues.filter(i => i.severity === 'minor');
    
    if (criticalIssues.length > 0) {
      recommendations.push(`❌ Address ${criticalIssues.length} critical consistency issue${criticalIssues.length === 1 ? '' : 's'} before proceeding`);
      recommendations.push('Critical issues can break story immersion and reader trust');
    }
    
    if (majorIssues.length > 0) {
      recommendations.push(`⚠️ Review and fix ${majorIssues.length} major consistency issue${majorIssues.length === 1 ? '' : 's'}`);
    }
    
    if (minorIssues.length > 0) {
      recommendations.push(`📝 Consider addressing ${minorIssues.length} minor consistency issue${minorIssues.length === 1 ? '' : 's'} for polish`);
    }
    
    // Category-specific recommendations
    const categoryTypes = Array.from(new Set(issues.map(i => i.type)));
    if (categoryTypes.includes('timeline')) {
      recommendations.push('🕐 Pay special attention to time progression and character locations');
    }
    if (categoryTypes.includes('character')) {
      recommendations.push('👥 Ensure character behavior and knowledge remain consistent');
    }
    if (categoryTypes.includes('worldbuilding')) {
      recommendations.push('🌍 Verify world rules and established elements are maintained');
    }
    if (categoryTypes.includes('research')) {
      recommendations.push('📚 Double-check research facts and technical details');
    }
    
    recommendations.push('Continue monitoring consistency as the story progresses');
    
    return recommendations;
  }

  /**
   * Update tracker with information from a new section (lightweight version)
   */
  private async updateTrackerFromSection(
    chapterNumber: number,
    sectionNumber: number,
    content: string,
    summary: string,
    researchUsed: string[],
    trace: ContinuityTrace,
    settings?: BookSettings
  ): Promise<void> {
    try {
      // Lightweight update - only track immediate changes
      // Update character states if they appear in this section
      this.tracker.characters.forEach(char => {
        if (content.toLowerCase().includes(char.name.toLowerCase())) {
          char.lastSeen = chapterNumber;
          // Simple state updates based on content analysis
          if (content.includes('angry') || content.includes('furious')) {
            char.emotionalState = 'angry';
          } else if (content.includes('sad') || content.includes('crying')) {
            char.emotionalState = 'sad';
          } else if (content.includes('happy') || content.includes('smiling')) {
            char.emotionalState = 'happy';
          }
        }
      });
      
      // Add simple timeline entry for section
      this.tracker.timeline.push({
        chapter: chapterNumber,
        timeReference: `Section ${sectionNumber}`,
        duration: 'Section duration'
      });
      
    } catch (error) {
      const errorMsg = `Section tracker update failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      trace.parseErrors.push(errorMsg);
      console.warn('⚠️ Section tracker update failed:', error);
    }
  }

  /**
   * Perform focused consistency checks for a single section
   */
  private async performSectionConsistencyChecks(
    chapterNumber: number,
    sectionNumber: number,
    sectionContent: string,
    accumulatedChapterContent: string,
    researchUsed: string[],
    trace: ContinuityTrace,
    settings?: BookSettings
  ): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];
    
    try {
      // Focus on critical consistency checks for real-time validation
      
      // 1. Character consistency (optimized - only check characters present in this section once)
      const charactersInSection = this.tracker.characters.filter(character => 
        sectionContent.toLowerCase().includes(character.name.toLowerCase())
      );
      
      if (charactersInSection.length > 0) {
        console.log(`🔍 Character consistency check for ${charactersInSection.length} character(s): ${charactersInSection.map(c => c.name).join(', ')}`);
        
        // Run character consistency check once for all characters in this section
        const characterIssues = await this.runCharacterConsistencyCheck(
          chapterNumber, sectionContent, researchUsed, trace, settings
        );
        issues.push(...characterIssues);
      }
      
      // 2. Timeline consistency (compare with previous sections)
      const timelineIssues = await this.runTimelineConsistencyCheck(
        chapterNumber, sectionContent, researchUsed, trace, settings
      );
      issues.push(...timelineIssues);
      
      // 3. Basic worldbuilding consistency
      const worldIssues = await this.runWorldbuildingConsistencyCheck(
        chapterNumber, sectionContent, researchUsed, trace, settings
      );
      issues.push(...worldIssues);
      
    } catch (error) {
      const errorMsg = `Section consistency checks failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      trace.parseErrors.push(errorMsg);
      console.error('❌ Section consistency checks error:', error);
    }
    
    return issues;
  }

  /**
   * Calculate consistency score for sections (more lenient than chapter scoring)
   */
  private calculateSectionConsistencyScore(issues: ConsistencyIssue[], contentLength: number): { overallScore: number; categoryScores: any } {
    // Section scoring is more lenient - small inconsistencies are acceptable
    let score = 100;
    
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const majorIssues = issues.filter(i => i.severity === 'major');
    const minorIssues = issues.filter(i => i.severity === 'minor');
    
    // Less harsh penalties for sections
    score -= criticalIssues.length * 15; // vs 25 for chapters
    score -= majorIssues.length * 8;     // vs 15 for chapters
    score -= minorIssues.length * 3;     // vs 5 for chapters
    
    // Bonus for short sections (more acceptable to have minor issues)
    if (contentLength < 500) {
      score += 5;
    }
    
    const categoryScores = {
      character: Math.max(0, score - (criticalIssues.length * 10)),
      timeline: Math.max(0, score - (majorIssues.length * 5)),
      worldbuilding: Math.max(0, score - (minorIssues.length * 3)),
      research: Math.max(0, score)
    };
    
    return {
      overallScore: Math.max(0, Math.min(100, score)),
      categoryScores
    };
  }

  /**
   * Generate recommendations specific to sections
   */
  private generateSectionRecommendations(issues: ConsistencyIssue[], chapterNumber: number, sectionNumber: number): string[] {
    const recommendations: string[] = [];
    
    if (issues.length === 0) {
      recommendations.push(`Section ${sectionNumber} maintains good consistency`);
      return recommendations;
    }
    
    // Group issues by category
    const issuesByCategory = issues.reduce((acc, issue) => {
      acc[issue.type] = acc[issue.type] || [];
      acc[issue.type].push(issue);
      return acc;
    }, {} as Record<string, ConsistencyIssue[]>);
    
    // Generate specific recommendations
    Object.entries(issuesByCategory).forEach(([category, categoryIssues]) => {
      if (categoryIssues.length > 0) {
        const criticalInCategory = categoryIssues.filter(i => i.severity === 'critical');
        
        if (criticalInCategory.length > 0) {
          recommendations.push(`CRITICAL: Fix ${category} issues in section ${sectionNumber} before proceeding`);
        } else {
          recommendations.push(`Review ${category} consistency in section ${sectionNumber}`);
        }
      }
    });
    
    // Add specific suggestions from issues
    issues.forEach(issue => {
      if (issue.suggestion) {
        recommendations.push(`Section ${sectionNumber}: ${issue.suggestion}`);
      }
    });
    
    return recommendations;
  }

  /**
   * Identify successful elements for sections
   */
  private identifySuccessfulSectionElements(chapterNumber: number, sectionNumber: number): string[] {
    const elements: string[] = [];
    
    // Check character presence
    const activeCharacters = this.tracker.characters.filter(c => c.lastSeen === chapterNumber);
    if (activeCharacters.length > 0) {
      elements.push(`Section ${sectionNumber} maintains character continuity`);
    }
    
    // Check timeline progression
    const recentTimeEntries = this.tracker.timeline.filter(t => t.chapter === chapterNumber);
    if (recentTimeEntries.length > 0) {
      elements.push(`Section ${sectionNumber} advances timeline appropriately`);
    }
    
    if (elements.length === 0) {
      elements.push(`Section ${sectionNumber} maintains basic narrative structure`);
    }
    
    return elements;
  }

  /**
   * Identify successful consistency elements
   */
  private identifySuccessfulElements(chapterNumber: number): string[] {
    const elements: string[] = [];
    
    // Check character tracking
    const activeCharacters = this.tracker.characters.filter(c => c.lastSeen === chapterNumber);
    if (activeCharacters.length > 0) {
      elements.push(`Successfully tracked ${activeCharacters.length} character${activeCharacters.length === 1 ? '' : 's'}`);
    }
    
    // Check timeline progression
    const recentTimeEntries = this.tracker.timeline.filter(t => t.chapter === chapterNumber);
    if (recentTimeEntries.length > 0) {
      elements.push('Time progression properly tracked');
    }
    
    // Check plot development
    const recentPlotPoints = this.tracker.plotPoints.filter(p => p.chapter === chapterNumber);
    if (recentPlotPoints.length > 0) {
      elements.push('Plot development documented');
    }
    
    // Check worldbuilding
    const recentWorldBuilding = this.tracker.worldBuilding.filter(w => w.chapters.includes(chapterNumber));
    if (recentWorldBuilding.length > 0) {
      elements.push('World elements consistently maintained');
    }
    
    if (elements.length === 0) {
      elements.push('Basic story structure maintained');
    }
    
    return elements;
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
    this.promptConfig = {
      maxContentLength: this.config.maxContentLength
    };
  }
} 