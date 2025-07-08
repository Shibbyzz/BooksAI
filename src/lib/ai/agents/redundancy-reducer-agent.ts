import { generateAIText } from '@/lib/openai';
import type { BookSettings } from '@/types';

export interface RedundancyReducerConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  analysisWindowSize: number; // Words to analyze (default 2000)
  repetitionThreshold: number; // Min repetitions to flag (default 3)
  ngramSizes: number[]; // N-gram sizes to analyze (default [2, 3, 4])
  criticalRepetitionThreshold: number; // Threshold for critical repetition (default 5)
}

export interface RedundancyAnalysis {
  totalNgrams: number;
  repetitiveNgrams: RepetitivePhrase[];
  redundancyScore: number; // 0-100, higher = more redundant
  criticalIssues: RepetitivePhrase[];
  minorIssues: RepetitivePhrase[];
  textQualityScore: number; // 0-100, higher = better quality
}

export interface RepetitivePhrase {
  phrase: string;
  count: number;
  ngramSize: number;
  severity: 'critical' | 'major' | 'minor';
  positions: number[]; // Word positions where phrase appears
  suggestions: string[];
}

export interface ReductionResult {
  originalText: string;
  improvedText: string;
  changesApplied: TextChange[];
  qualityImprovement: number;
  redundancyReduced: number;
  analysisResults: RedundancyAnalysis;
}

export interface TextChange {
  type: 'phrase_replacement' | 'sentence_restructure' | 'word_substitution';
  original: string;
  replacement: string;
  reason: string;
  position: number;
}

export class RedundancyReducerAgent {
  private config: RedundancyReducerConfig;
  private commonCliches: Set<string>;
  private phraseVariations: Map<string, string[]>;

  constructor(config?: Partial<RedundancyReducerConfig>) {
    this.config = {
      model: 'gpt-4o-mini',
      temperature: 0.3, // Low temperature for consistent improvements
      maxTokens: 3000,
      analysisWindowSize: 2000,
      repetitionThreshold: 3,
      ngramSizes: [2, 3, 4],
      criticalRepetitionThreshold: 5,
      ...config
    };

    this.commonCliches = new Set();
    this.phraseVariations = new Map();
    this.initializeClicheDatabase();
  }

  /**
   * Analyze text for redundancy and repetitive patterns
   */
  async analyzeRedundancy(
    text: string,
    previousContent?: string,
    settings?: BookSettings
  ): Promise<RedundancyAnalysis> {
    try {
      // Combine with previous content for analysis window
      const analysisText = this.prepareAnalysisText(text, previousContent);
      
      console.log(`🔍 RedundancyReducer: Analyzing ${analysisText.split(' ').length} words for repetitive patterns`);

      // Extract n-grams of different sizes
      const allNgrams = this.extractNgrams(analysisText, this.config.ngramSizes);
      
      // Identify repetitive phrases
      const repetitiveNgrams = this.identifyRepetitiveNgrams(allNgrams);
      
      // Calculate redundancy score
      const redundancyScore = this.calculateRedundancyScore(repetitiveNgrams, analysisText);
      
      // Categorize issues by severity
      const criticalIssues = repetitiveNgrams.filter(p => p.severity === 'critical');
      const minorIssues = repetitiveNgrams.filter(p => p.severity === 'minor' || p.severity === 'major');
      
      // Calculate overall text quality score
      const textQualityScore = Math.max(0, 100 - redundancyScore);

      return {
        totalNgrams: allNgrams.size,
        repetitiveNgrams,
        redundancyScore,
        criticalIssues,
        minorIssues,
        textQualityScore
      };

    } catch (error) {
      console.error('❌ RedundancyReducer: Analysis failed:', error);
      throw new Error(`Redundancy analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reduce redundancy in text by replacing repetitive phrases
   */
  async reduceRedundancy(
    text: string,
    analysis: RedundancyAnalysis,
    settings?: BookSettings
  ): Promise<ReductionResult> {
    try {
      console.log(`🛠️ RedundancyReducer: Reducing redundancy (${analysis.redundancyScore}% redundant)`);

      if (analysis.redundancyScore < 15) {
        // Text is already good quality
        return {
          originalText: text,
          improvedText: text,
          changesApplied: [],
          qualityImprovement: 0,
          redundancyReduced: 0,
          analysisResults: analysis
        };
      }

      let improvedText = text;
      const changesApplied: TextChange[] = [];

      // Handle critical issues first
      for (const criticalPhrase of analysis.criticalIssues) {
        const replacements = await this.generatePhraseReplacements(
          criticalPhrase.phrase,
          text,
          settings?.genre,
          settings?.tone
        );

        if (replacements.length > 0) {
          const change = await this.applyPhraseReplacement(
            improvedText,
            criticalPhrase,
            replacements
          );

          if (change) {
            improvedText = change.newText;
            changesApplied.push(change.change);
          }
        }
      }

      // Apply AI-based overall improvement for remaining issues
      if (analysis.minorIssues.length > 3 || analysis.redundancyScore > 35) {
        const aiImprovedText = await this.applyAIRedundancyReduction(
          improvedText,
          analysis,
          settings
        );

        if (aiImprovedText && aiImprovedText.length > improvedText.length * 0.8) {
          const structureChanges = this.detectStructuralChanges(improvedText, aiImprovedText);
          changesApplied.push(...structureChanges);
          improvedText = aiImprovedText;
        }
      }

      // Analyze improvement
      const newAnalysis = await this.analyzeRedundancy(improvedText, undefined, settings);
      const qualityImprovement = newAnalysis.textQualityScore - analysis.textQualityScore;
      const redundancyReduced = analysis.redundancyScore - newAnalysis.redundancyScore;

      console.log(`✅ RedundancyReducer: ${changesApplied.length} changes applied, ${redundancyReduced}% redundancy reduced`);

      return {
        originalText: text,
        improvedText,
        changesApplied,
        qualityImprovement,
        redundancyReduced,
        analysisResults: newAnalysis
      };

    } catch (error) {
      console.error('❌ RedundancyReducer: Reduction failed:', error);
      
      // Return original text on failure
      return {
        originalText: text,
        improvedText: text,
        changesApplied: [],
        qualityImprovement: 0,
        redundancyReduced: 0,
        analysisResults: analysis
      };
    }
  }

  /**
   * Quick check if text needs redundancy reduction
   */
  async quickRedundancyCheck(
    text: string,
    previousContent?: string
  ): Promise<{ needsReduction: boolean; score: number; criticalIssues: number }> {
    try {
      const analysis = await this.analyzeRedundancy(text, previousContent);
      
      return {
        needsReduction: analysis.redundancyScore > 25,
        score: analysis.redundancyScore,
        criticalIssues: analysis.criticalIssues.length
      };
    } catch (error) {
      console.warn('⚠️ RedundancyReducer: Quick check failed:', error);
      return { needsReduction: false, score: 0, criticalIssues: 0 };
    }
  }

  /**
   * Prepare text for analysis by combining with previous content
   */
  private prepareAnalysisText(text: string, previousContent?: string): string {
    if (!previousContent) {
      return text;
    }

    // Take last N words from previous content plus new text
    const prevWords = previousContent.split(/\s+/);
    const takeWords = Math.max(0, this.config.analysisWindowSize - text.split(/\s+/).length);
    const relevantPreviousContent = prevWords.slice(-takeWords).join(' ');

    return relevantPreviousContent + ' ' + text;
  }

  /**
   * Extract n-grams of specified sizes from text
   */
  private extractNgrams(text: string, ngramSizes: number[]): Map<string, { count: number; positions: number[] }> {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);

    const ngramMap = new Map<string, { count: number; positions: number[] }>();

    for (const size of ngramSizes) {
      for (let i = 0; i <= words.length - size; i++) {
        const ngram = words.slice(i, i + size).join(' ');
        
        // Skip very common words and single character combinations
        if (this.shouldSkipNgram(ngram, size)) {
          continue;
        }

        if (!ngramMap.has(ngram)) {
          ngramMap.set(ngram, { count: 0, positions: [] });
        }

        const data = ngramMap.get(ngram)!;
        data.count++;
        data.positions.push(i);
      }
    }

    return ngramMap;
  }

  /**
   * Identify repetitive n-grams that exceed thresholds
   */
  private identifyRepetitiveNgrams(
    ngramMap: Map<string, { count: number; positions: number[] }>
  ): RepetitivePhrase[] {
    const repetitiveNgrams: RepetitivePhrase[] = [];

    // Convert Map entries to array for iteration compatibility
    Array.from(ngramMap.entries()).forEach(([phrase, data]) => {
      if (data.count >= this.config.repetitionThreshold) {
        const severity = this.determineSeverity(phrase, data.count);
        const suggestions = this.generateReplacementSuggestions(phrase);

        repetitiveNgrams.push({
          phrase,
          count: data.count,
          ngramSize: phrase.split(' ').length,
          severity,
          positions: data.positions,
          suggestions
        });
      }
    });

    // Sort by severity and count
    return repetitiveNgrams.sort((a, b) => {
      const severityOrder = { critical: 3, major: 2, minor: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      return severityDiff !== 0 ? severityDiff : b.count - a.count;
    });
  }

  /**
   * Calculate overall redundancy score
   */
  private calculateRedundancyScore(
    repetitiveNgrams: RepetitivePhrase[],
    text: string
  ): number {
    const totalWords = text.split(/\s+/).length;
    
    // Return 0 if text is too short to meaningfully analyze for redundancy
    if (totalWords < 100) {
      return 0;
    }
    
    // CRITICAL FIX: Cap redundancy for typical story content
    // Most narrative content will have natural repetition patterns
    if (totalWords < 2000 && repetitiveNgrams.length <= 5) {
      // For shorter sections, be much more lenient
      return Math.min(15, repetitiveNgrams.length * 3);
    }
    
    let redundancyPoints = 0;
    let totalRepetitions = 0;

    repetitiveNgrams.forEach(phrase => {
      // More reasonable scoring - don't penalize normal repetition patterns
      const excessRepetitions = Math.max(0, phrase.count - this.config.repetitionThreshold);
      
      // MAJOR FIX: Skip natural language patterns that shouldn't be penalized
      if (this.isNaturalLanguagePattern(phrase.phrase)) {
        return; // Skip this phrase entirely
      }
      
      // Lower multipliers and consider phrase length
      const phraseWords = phrase.phrase.split(' ').length;
      const baseMultiplier = phraseWords > 1 ? 2 : 1; // Multi-word phrases are more significant
      
      const severityMultiplier = { 
        critical: baseMultiplier * 2,  // Further reduced from 3
        major: baseMultiplier * 1.5,   // Further reduced from 2
        minor: baseMultiplier * 0.5    // Further reduced from 1
      }[phrase.severity];
      
      const repetitionPoints = excessRepetitions * severityMultiplier;
      redundancyPoints += repetitionPoints;
      totalRepetitions += phrase.count;
    });

    // CRITICAL FIX: Much more conservative scoring
    // Improved normalization that considers text length and context
    const lengthFactor = Math.min(1.5, totalWords / 1500); // Reduced scale factor
    const maxReasonablePoints = (totalWords / 100) * lengthFactor; // Much more reasonable baseline
    
    // Calculate score with better scaling
    let redundancyScore = Math.min(100, (redundancyPoints / Math.max(maxReasonablePoints, 1)) * 100);
    
    // Additional safeguards against false positives
    const repetitionDensity = totalRepetitions / totalWords;
    
    // MAJOR FIX: Much stricter caps for low repetition
    if (repetitionDensity < 0.03) { // Less than 3% of words are repetitive
      redundancyScore = Math.min(redundancyScore, 10);
    } else if (repetitionDensity < 0.08) { // Less than 8% of words are repetitive
      redundancyScore = Math.min(redundancyScore, 25);
    }
    
    // CRITICAL FIX: For new content (likely no previous context), be MUCH more lenient
    if (repetitiveNgrams.length <= 3) {
      redundancyScore = Math.min(redundancyScore, 15);
    } else if (repetitiveNgrams.length <= 8) {
      redundancyScore = Math.min(redundancyScore, 30);
    }
    
    // ABSOLUTE CAP: Never exceed 75% for narrative content unless truly problematic
    if (redundancyScore > 75 && repetitiveNgrams.length < 15) {
      redundancyScore = Math.min(redundancyScore, 40);
    }

    return Math.round(Math.max(0, redundancyScore));
  }

  /**
   * Determine severity of repetitive phrase
   */
  private determineSeverity(phrase: string, count: number): 'critical' | 'major' | 'minor' {
    // Critical if it's a known cliché or appears many times
    if (this.commonCliches.has(phrase) || count >= this.config.criticalRepetitionThreshold) {
      return 'critical';
    }

    // Major if appears frequently
    if (count >= 4) {
      return 'major';
    }

    return 'minor';
  }

  /**
   * Check if n-gram should be skipped
   */
  private shouldSkipNgram(ngram: string, size: number): boolean {
    // Skip very common words
    const commonWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const words = ngram.split(' ');
    
    // Skip if all words are common words
    if (words.every(word => commonWords.has(word))) {
      return true;
    }

    // Skip very short phrases for larger n-grams
    if (size > 2 && ngram.length < 6) {
      return true;
    }

    return false;
  }

  /**
   * Generate replacement suggestions for a phrase
   */
  private generateReplacementSuggestions(phrase: string): string[] {
    const suggestions: string[] = [];

    // Check if we have predefined variations
    if (this.phraseVariations.has(phrase)) {
      suggestions.push(...this.phraseVariations.get(phrase)!);
    }

    // Generate basic variations
    if (phrase.includes('heart')) {
      suggestions.push(
        phrase.replace('heart', 'pulse'),
        phrase.replace('heart', 'chest'),
        phrase.replace('heart pounds', 'pulse quickened'),
        phrase.replace('heart pounded', 'pulse raced')
      );
    }

    if (phrase.includes('eyes')) {
      suggestions.push(
        phrase.replace('eyes', 'gaze'),
        phrase.replace('eyes', 'vision'),
        phrase.replace('eyes widened', 'gaze sharpened')
      );
    }

    return suggestions.filter(s => s !== phrase).slice(0, 3);
  }

  /**
   * Generate AI-powered phrase replacements
   */
  private async generatePhraseReplacements(
    phrase: string,
    context: string,
    genre?: string,
    tone?: string
  ): Promise<string[]> {
    const prompt = `
Replace the overused phrase "${phrase}" with more varied and creative alternatives that fit the context.

CONTEXT: ${context.slice(0, 500)}
GENRE: ${genre || 'general'}
TONE: ${tone || 'neutral'}

Generate 3-5 alternative ways to express the same meaning as "${phrase}" but with fresh language.
Consider the genre and tone. Respond with JSON array of strings only:

["alternative 1", "alternative 2", "alternative 3"]
`;

    try {
      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: 200,
        system: 'You are a creative writing assistant. Respond with valid JSON array only. Do not use markdown code blocks.'
      });

      // Clean response text to handle markdown code blocks
      let cleanText = response.text.trim();
      
      // Remove markdown code blocks if present
      if (cleanText.startsWith('```json')) {
        cleanText = cleanText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```\s*/, '').replace(/```\s*$/, '');
      }
      
      // Remove any leading/trailing backticks
      cleanText = cleanText.replace(/^`+|`+$/g, '');
      
      const alternatives = JSON.parse(cleanText);
      return Array.isArray(alternatives) ? alternatives : [];
      
    } catch (error) {
      console.warn('⚠️ RedundancyReducer: AI replacement generation failed:', error);
      return this.generateReplacementSuggestions(phrase);
    }
  }

  /**
   * Apply phrase replacement to text
   */
  private async applyPhraseReplacement(
    text: string,
    repetitivePhrase: RepetitivePhrase,
    replacements: string[]
  ): Promise<{ newText: string; change: TextChange } | null> {
    if (replacements.length === 0) {
      return null;
    }

    // Use different replacements for different occurrences
    let newText = text;
    let changeCount = 0;
    let lastReplacement = '';

    const regex = new RegExp(repetitivePhrase.phrase, 'gi');
    newText = newText.replace(regex, (match, offset) => {
      if (changeCount >= Math.min(replacements.length, repetitivePhrase.count - 1)) {
        return match; // Keep some occurrences unchanged
      }

      const replacement = replacements[changeCount % replacements.length];
      lastReplacement = replacement;
      changeCount++;
      return replacement;
    });

    if (changeCount > 0) {
      return {
        newText,
        change: {
          type: 'phrase_replacement',
          original: repetitivePhrase.phrase,
          replacement: lastReplacement,
          reason: `Reduced repetition (${repetitivePhrase.count} occurrences)`,
          position: repetitivePhrase.positions[0]
        }
      };
    }

    return null;
  }

  /**
   * Apply AI-based redundancy reduction
   */
  private async applyAIRedundancyReduction(
    text: string,
    analysis: RedundancyAnalysis,
    settings?: BookSettings
  ): Promise<string | null> {
    const repetitivePhrases = analysis.repetitiveNgrams.map(p => p.phrase).slice(0, 10);

    const prompt = `
Improve this text by reducing redundancy and repetitive language while maintaining the original meaning, style, and length.

REPETITIVE PHRASES TO VARY: ${repetitivePhrases.join(', ')}
GENRE: ${settings?.genre || 'general'}
TONE: ${settings?.tone || 'neutral'}

TEXT TO IMPROVE:
${text}

Instructions:
1. Replace repetitive phrases with varied alternatives
2. Maintain the exact same story events and character actions
3. Keep the same narrative voice and style
4. Preserve all dialogue exactly
5. Maintain similar length (±10%)

Return only the improved text without explanations.
`;

    try {
      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        system: 'You are an expert editor specializing in reducing repetitive language while preserving meaning and style.'
      });

      return response.text.trim();
      
    } catch (error) {
      console.warn('⚠️ RedundancyReducer: AI improvement failed:', error);
      return null;
    }
  }

  /**
   * Detect structural changes between texts
   */
  private detectStructuralChanges(originalText: string, improvedText: string): TextChange[] {
    const changes: TextChange[] = [];

    // Simple detection - in a real implementation, you might use diff libraries
    if (originalText.length !== improvedText.length) {
      changes.push({
        type: 'sentence_restructure',
        original: 'Original structure',
        replacement: 'Improved structure',
        reason: 'AI-based redundancy reduction',
        position: 0
      });
    }

    return changes;
  }

  /**
   * Initialize database of common clichés and phrases
   */
  private initializeClicheDatabase(): void {
    const commonCliches = [
      'heart pounded',
      'heart pounds',
      'heart racing',
      'heart skipped',
      'eyes widened',
      'eyes narrow',
      'breath caught',
      'blood ran cold',
      'spine tingled',
      'stomach dropped',
      'mind reeled',
      'world spun',
      'time stood still',
      'spark ignited',
      'spark ignites',
      'fire burned',
      'flame flickered',
      'shadow fell',
      'darkness consumed',
      'light dawned',
      'realization hit',
      'truth struck',
      'memory flooded',
      'emotion washed',
      'wave crashed',
      'storm raged',
      'thunder roared',
      'lightning struck'
    ];

    commonCliches.forEach(cliche => this.commonCliches.add(cliche));

    // Initialize phrase variations
    this.phraseVariations.set('heart pounded', ['pulse raced', 'heartbeat quickened', 'chest tightened']);
    this.phraseVariations.set('heart pounds', ['pulse races', 'heartbeat quickens', 'chest tightens']);
    this.phraseVariations.set('eyes widened', ['gaze sharpened', 'vision focused', 'look intensified']);
    this.phraseVariations.set('spark ignited', ['connection formed', 'feeling awakened', 'emotion stirred']);
    this.phraseVariations.set('spark ignites', ['connection forms', 'feeling awakens', 'emotion stirs']);
  }

  /**
   * Get analysis summary
   */
  getAnalysisSummary(analysis: RedundancyAnalysis): string {
    const { redundancyScore, criticalIssues, minorIssues, textQualityScore } = analysis;
    
    let summary = `RedundancyReducer Analysis:\n`;
    summary += `- Redundancy Score: ${redundancyScore}%\n`;
    summary += `- Text Quality: ${textQualityScore}%\n`;
    summary += `- Critical Issues: ${criticalIssues.length}\n`;
    summary += `- Minor Issues: ${minorIssues.length}\n`;
    
    if (criticalIssues.length > 0) {
      summary += `\nCritical Repetitions:\n`;
      criticalIssues.forEach(issue => {
        summary += `  - "${issue.phrase}" (${issue.count} times)\n`;
      });
    }
    
    return summary;
  }

  /**
   * Check if phrase represents natural language pattern that shouldn't be penalized
   */
  private isNaturalLanguagePattern(phrase: string): boolean {
    const naturalPatterns = [
      // Common narrative transitions
      'said', 'asked', 'replied', 'continued', 'began', 'started',
      // Action descriptors
      'walked to', 'looked at', 'turned to', 'moved toward',
      // Emotional expressions
      'felt', 'seemed', 'appeared', 'looked like',
      // Common conjunctions and transitions in longer phrases
      'and then', 'but then', 'so that', 'as if', 'even though',
      // Character interaction patterns
      'he said', 'she said', 'they said', 'he asked', 'she asked'
    ];
    
    return naturalPatterns.some(pattern => phrase.includes(pattern.toLowerCase()));
  }
}

// Export singleton instance
export const redundancyReducerAgent = new RedundancyReducerAgent(); 