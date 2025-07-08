import { generateAIText } from '@/lib/openai';
import type { BookSettings } from '@/types';
import type { StoryBible } from './chief-editor-agent';

export interface DriftGuardConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  semanticDeviationThreshold: number; // 0-100, default 35
  strictMode: boolean;
  enableVectorAnalysis: boolean;
}

export interface SemanticProfile {
  genre: string;
  environment: string[];
  tonalElements: string[];
  stylePhrases: string[];
  characterVoices: string[];
  worldBuildingElements: string[];
  narrativeStyle: string;
  vocabularyLevel: string;
  timestamp: number;
}

export interface DriftAnalysis {
  overallDrift: number; // 0-100, percentage of drift
  genreDrift: number;
  environmentDrift: number;
  tonalDrift: number;
  styleDrift: number;
  characterDrift: number;
  worldBuildingDrift: number;
  flaggedElements: string[];
  confidence: number;
}

export interface DriftValidationResult {
  isValid: boolean;
  driftAnalysis: DriftAnalysis;
  issues: DriftIssue[];
  recommendations: string[];
  shouldRegenerate: boolean;
}

export interface DriftIssue {
  type: 'genre' | 'environment' | 'tone' | 'style' | 'character' | 'worldbuilding';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  examples: string[];
  suggestion: string;
  confidence: number;
}

export class DriftGuardAgent {
  private config: DriftGuardConfig;
  private semanticProfile?: SemanticProfile;
  private profileHistory: SemanticProfile[] = [];

  constructor(config?: Partial<DriftGuardConfig>) {
    this.config = {
      model: 'gpt-4o-mini',
      temperature: 0.1, // Very low temperature for consistent analysis
      maxTokens: 2000,
      semanticDeviationThreshold: 35, // Flag if > 35% drift
      strictMode: false,
      enableVectorAnalysis: true,
      ...config
    };
  }

  /**
   * Initialize semantic profile from story bible and settings
   */
  async initializeProfile(
    settings: BookSettings,
    storyBible?: StoryBible,
    existingContent?: string
  ): Promise<SemanticProfile> {
    try {
      console.log('🎯 DriftGuard: Initializing semantic profile...');

      // Create baseline profile from story bible and settings
      const baseProfile = {
        genre: settings.genre,
        environment: this.extractEnvironmentElements(settings, storyBible),
        tonalElements: this.extractTonalElements(settings, storyBible),
        stylePhrases: this.extractStylePhrases(settings, storyBible),
        characterVoices: this.extractCharacterVoices(storyBible),
        worldBuildingElements: this.extractWorldBuildingElements(storyBible),
        narrativeStyle: settings.tone,
        vocabularyLevel: this.mapTargetAudienceToVocabulary(settings.targetAudience),
        timestamp: Date.now()
      };

      // If we have existing content, enhance profile with AI analysis
      if (existingContent && existingContent.length > 200) {
        const enhancedProfile = await this.enhanceProfileWithAI(baseProfile, existingContent);
        this.semanticProfile = enhancedProfile;
      } else {
        this.semanticProfile = baseProfile;
      }

      console.log(`✅ DriftGuard: Semantic profile initialized for ${this.semanticProfile.genre} genre`);
      return this.semanticProfile;
      
    } catch (error) {
      console.error('❌ DriftGuard: Failed to initialize profile:', error);
      throw new Error(`Profile initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze content for semantic drift
   */
  async analyzeContentDrift(
    content: string,
    sectionNumber: number,
    chapterNumber: number,
    accumulatedContent?: string
  ): Promise<DriftValidationResult> {
    try {
      if (!this.semanticProfile) {
        throw new Error('Semantic profile not initialized. Call initializeProfile first.');
      }

      console.log(`🔍 DriftGuard: Analyzing drift for Chapter ${chapterNumber}, Section ${sectionNumber}`);

      // Perform comprehensive drift analysis
      const driftAnalysis = await this.performDriftAnalysis(content, accumulatedContent);

      // Determine if content passes drift check
      const isValid = driftAnalysis.overallDrift <= this.config.semanticDeviationThreshold;
      const shouldRegenerate = driftAnalysis.overallDrift > 50; // High threshold for regeneration

      // Generate detailed issues
      const issues = this.generateDriftIssues(driftAnalysis);

      // Generate recommendations
      const recommendations = this.generateRecommendations(driftAnalysis, isValid);

      const result: DriftValidationResult = {
        isValid,
        driftAnalysis,
        issues,
        recommendations,
        shouldRegenerate
      };

      console.log(`📊 DriftGuard: ${driftAnalysis.overallDrift}% drift detected (threshold: ${this.config.semanticDeviationThreshold}%)`);
      
      if (!isValid) {
        console.warn(`⚠️ DriftGuard: Content drift exceeds threshold`);
      }

      return result;

    } catch (error) {
      console.error('❌ DriftGuard: Analysis failed:', error);
      throw new Error(`Drift analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update profile with new content (learning mechanism)
   */
  async updateProfile(newContent: string, chapterNumber: number): Promise<void> {
    try {
      if (!this.semanticProfile) {
        throw new Error('Cannot update profile: not initialized');
      }

      console.log(`📝 DriftGuard: Updating profile with Chapter ${chapterNumber} content`);

      // Store previous profile in history
      this.profileHistory.push({ ...this.semanticProfile });

      // Keep only last 5 profiles
      if (this.profileHistory.length > 5) {
        this.profileHistory.shift();
      }

      // Update profile with new elements discovered in content
      const updatedProfile = await this.enhanceProfileWithAI(this.semanticProfile, newContent);
      this.semanticProfile = {
        ...updatedProfile,
        timestamp: Date.now()
      };

      console.log('✅ DriftGuard: Profile updated successfully');
      
    } catch (error) {
      console.error('❌ DriftGuard: Profile update failed:', error);
      // Don't throw - profile update failures shouldn't stop generation
    }
  }

  /**
   * Perform comprehensive drift analysis
   */
  private async performDriftAnalysis(content: string, accumulatedContent?: string): Promise<DriftAnalysis> {
    const prompt = `
You are a semantic drift analyzer. Compare the NEW CONTENT against the ESTABLISHED PROFILE and rate drift percentage (0-100) for each category.

ESTABLISHED PROFILE:
- Genre: ${this.semanticProfile!.genre}
- Environment: ${this.semanticProfile!.environment.join(', ')}
- Tone: ${this.semanticProfile!.tonalElements.join(', ')}
- Style: ${this.semanticProfile!.stylePhrases.join(', ')}
- World Building: ${this.semanticProfile!.worldBuildingElements.join(', ')}
- Narrative Style: ${this.semanticProfile!.narrativeStyle}

NEW CONTENT TO ANALYZE:
${content}

${accumulatedContent ? `\nEXISTING CHAPTER CONTENT FOR CONTEXT:\n${accumulatedContent.slice(-1000)}` : ''}

Analyze semantic drift and respond with JSON only:
{
  "overallDrift": <0-100>,
  "genreDrift": <0-100>,
  "environmentDrift": <0-100>,
  "tonalDrift": <0-100>,
  "styleDrift": <0-100>,
  "characterDrift": <0-100>,
  "worldBuildingDrift": <0-100>,
  "flaggedElements": ["element1", "element2"],
  "confidence": <0-100>
}

Rate 0 = perfect match, 100 = completely different.
`;

    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      system: 'You are a semantic analysis expert. Respond with valid JSON only.'
    });

    try {
      const analysis = JSON.parse(response.text);
      
      // Validate the response structure
      if (typeof analysis.overallDrift !== 'number' || 
          typeof analysis.genreDrift !== 'number' ||
          typeof analysis.confidence !== 'number') {
        throw new Error('Invalid analysis response structure');
      }

      return analysis;
      
    } catch (error) {
      console.error('❌ DriftGuard: Failed to parse analysis response:', error);
      
      // Fallback analysis
      return {
        overallDrift: 25, // Safe default
        genreDrift: 20,
        environmentDrift: 20,
        tonalDrift: 20,
        styleDrift: 20,
        characterDrift: 20,
        worldBuildingDrift: 20,
        flaggedElements: ['Analysis failed'],
        confidence: 50
      };
    }
  }

  /**
   * Enhance profile with AI analysis
   */
  private async enhanceProfileWithAI(baseProfile: SemanticProfile, content: string): Promise<SemanticProfile> {
    const prompt = `
Analyze this content and extract semantic elements that define the story's style and world:

CONTENT:
${content.slice(0, 2000)}

CURRENT PROFILE:
${JSON.stringify(baseProfile, null, 2)}

Extract and enhance the profile with elements found in the content. Respond with enhanced JSON:
{
  "genre": "${baseProfile.genre}",
  "environment": ["extracted", "environmental", "elements"],
  "tonalElements": ["extracted", "tonal", "elements"],
  "stylePhrases": ["extracted", "style", "phrases"],
  "characterVoices": ["extracted", "character", "voices"],
  "worldBuildingElements": ["extracted", "world", "elements"],
  "narrativeStyle": "${baseProfile.narrativeStyle}",
  "vocabularyLevel": "${baseProfile.vocabularyLevel}"
}
`;

    try {
      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        system: 'You are a literary analysis expert. Respond with valid JSON only.'
      });

      const enhancedProfile = JSON.parse(response.text);
      
      return {
        ...baseProfile,
        ...enhancedProfile,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.warn('⚠️ DriftGuard: AI enhancement failed, using base profile:', error);
      return baseProfile;
    }
  }

  /**
   * Generate drift issues from analysis
   */
  private generateDriftIssues(analysis: DriftAnalysis): DriftIssue[] {
    const issues: DriftIssue[] = [];

    // Check each category for significant drift
    const categories = [
      { key: 'genreDrift', type: 'genre' as const, name: 'Genre' },
      { key: 'environmentDrift', type: 'environment' as const, name: 'Environment' },
      { key: 'tonalDrift', type: 'tone' as const, name: 'Tone' },
      { key: 'styleDrift', type: 'style' as const, name: 'Style' },
      { key: 'characterDrift', type: 'character' as const, name: 'Character' },
      { key: 'worldBuildingDrift', type: 'worldbuilding' as const, name: 'World Building' }
    ];

    categories.forEach(category => {
      const drift = analysis[category.key as keyof DriftAnalysis] as number;
      
      if (drift > 60) {
        issues.push({
          type: category.type,
          severity: 'critical',
          description: `${category.name} drift is ${drift}% - significantly inconsistent with established story`,
          examples: analysis.flaggedElements.slice(0, 2),
          suggestion: `Revise content to better match established ${category.name.toLowerCase()} elements`,
          confidence: analysis.confidence
        });
      } else if (drift > 35) {
        issues.push({
          type: category.type,
          severity: 'major',
          description: `${category.name} drift is ${drift}% - moderately inconsistent`,
          examples: analysis.flaggedElements.slice(0, 1),
          suggestion: `Adjust ${category.name.toLowerCase()} elements to better match story profile`,
          confidence: analysis.confidence
        });
      } else if (drift > 20) {
        issues.push({
          type: category.type,
          severity: 'minor',
          description: `${category.name} drift is ${drift}% - slightly inconsistent`,
          examples: [],
          suggestion: `Consider minor adjustments to ${category.name.toLowerCase()} consistency`,
          confidence: analysis.confidence
        });
      }
    });

    return issues;
  }

  /**
   * Generate recommendations based on drift analysis
   */
  private generateRecommendations(analysis: DriftAnalysis, isValid: boolean): string[] {
    const recommendations: string[] = [];

    if (isValid) {
      recommendations.push('✅ Content maintains good consistency with established story elements');
      
      if (analysis.overallDrift > 15) {
        recommendations.push('Minor drift detected - consider reviewing flagged elements');
      }
    } else {
      recommendations.push('❌ Content drift exceeds acceptable threshold');
      
      if (analysis.overallDrift > 50) {
        recommendations.push('🚨 CRITICAL: Consider regenerating section to improve consistency');
      }
      
      // Category-specific recommendations
      if (analysis.genreDrift > 35) {
        recommendations.push(`📚 Genre consistency: Stay within ${this.semanticProfile!.genre} conventions`);
      }
      
      if (analysis.environmentDrift > 35) {
        recommendations.push('🌍 Environment consistency: Maintain established setting elements');
      }
      
      if (analysis.tonalDrift > 35) {
        recommendations.push('🎭 Tone consistency: Maintain established narrative voice');
      }
      
      if (analysis.styleDrift > 35) {
        recommendations.push('✍️ Style consistency: Keep writing style aligned with story profile');
      }
    }

    return recommendations;
  }

  /**
   * Extract environment elements from settings and story bible
   */
  private extractEnvironmentElements(settings: BookSettings, storyBible?: StoryBible): string[] {
    const elements: string[] = [];
    
    // From genre
    elements.push(settings.genre);
    
    // From story bible
    if (storyBible?.worldBuilding?.locations) {
      elements.push(...storyBible.worldBuilding.locations.map(l => typeof l === 'string' ? l : l.name));
    }
    
    // Default elements based on genre
    const genreDefaults: { [key: string]: string[] } = {
      'fantasy': ['medieval', 'magical', 'ancient', 'mystical'],
      'science fiction': ['futuristic', 'technological', 'space', 'advanced'],
      'mystery': ['investigative', 'suspenseful', 'urban', 'contemporary'],
      'romance': ['emotional', 'intimate', 'relationship-focused'],
      'horror': ['dark', 'frightening', 'supernatural', 'threatening'],
      'thriller': ['fast-paced', 'dangerous', 'high-stakes'],
      'historical fiction': ['period-appropriate', 'historical', 'authentic']
    };
    
    elements.push(...(genreDefaults[settings.genre.toLowerCase()] || ['general']));
    
    return Array.from(new Set(elements)); // Remove duplicates
  }

  /**
   * Extract tonal elements from settings and story bible
   */
  private extractTonalElements(settings: BookSettings, storyBible?: StoryBible): string[] {
    const elements: string[] = [];
    
    elements.push(settings.tone);
    
    // From story bible theme
    if (storyBible?.overview?.theme) {
      elements.push(storyBible.overview.theme);
    }
    
    return Array.from(new Set(elements));
  }

  /**
   * Extract style phrases from settings and story bible
   */
  private extractStylePhrases(settings: BookSettings, storyBible?: StoryBible): string[] {
    const phrases: string[] = [];
    
    // Based on tone
    const toneMapping: { [key: string]: string[] } = {
      'serious': ['thoughtful', 'contemplative', 'earnest'],
      'light': ['cheerful', 'upbeat', 'optimistic'],
      'humorous': ['witty', 'amusing', 'playful'],
      'dramatic': ['intense', 'emotional', 'powerful'],
      'mysterious': ['enigmatic', 'puzzling', 'secretive']
    };
    
    phrases.push(...(toneMapping[settings.tone.toLowerCase()] || ['neutral']));
    
    return phrases;
  }

  /**
   * Extract character voices from story bible
   */
  private extractCharacterVoices(storyBible?: StoryBible): string[] {
    const voices: string[] = [];
    
    if (storyBible?.characters) {
      storyBible.characters.forEach(character => {
        if (character.personality) {
          voices.push(`${character.name}: ${character.personality}`);
        }
      });
    }
    
    return voices;
  }

  /**
   * Extract world building elements from story bible
   */
  private extractWorldBuildingElements(storyBible?: StoryBible): string[] {
    const elements: string[] = [];
    
    if (storyBible?.worldBuilding) {
      if (storyBible.worldBuilding.rules) {
        elements.push(...storyBible.worldBuilding.rules);
      }
      
      if (storyBible.worldBuilding.setting) {
        elements.push(storyBible.worldBuilding.setting);
      }
      
      if (storyBible.worldBuilding.history) {
        elements.push(storyBible.worldBuilding.history);
      }
    }
    
    return elements;
  }

  /**
   * Map target audience to vocabulary level
   */
  private mapTargetAudienceToVocabulary(targetAudience: string): string {
    const audience = targetAudience.toLowerCase();
    
    if (audience.includes('children') || audience.includes('child')) {
      return 'simple';
    } else if (audience.includes('young') || audience.includes('teen')) {
      return 'moderate';
    } else if (audience.includes('adult')) {
      return 'advanced';
    } else {
      return 'moderate';
    }
  }

  /**
   * Get current semantic profile
   */
  getProfile(): SemanticProfile | undefined {
    return this.semanticProfile;
  }

  /**
   * Get validation summary
   */
  getValidationSummary(result: DriftValidationResult): string {
    const { isValid, driftAnalysis, issues } = result;
    
    let summary = `DriftGuard ${isValid ? 'PASSED' : 'FAILED'} (${driftAnalysis.overallDrift}% drift)\n`;
    
    if (issues.length > 0) {
      summary += `Issues (${issues.length}):\n`;
      issues.forEach(issue => {
        summary += `  - ${issue.severity.toUpperCase()}: ${issue.description}\n`;
      });
    }
    
    return summary;
  }
}

// Export singleton instance
export const driftGuardAgent = new DriftGuardAgent(); 