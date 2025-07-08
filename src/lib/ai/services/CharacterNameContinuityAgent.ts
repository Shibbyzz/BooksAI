import type { BookSettings } from '@/types';
import { StoryMemoryManager } from './StoryMemoryManager';

export interface CharacterNameMapping {
  userSpecifiedNames: string[];
  backCoverNames: string[];
  outlineNames: string[];
  storyBibleNames: string[];
  inconsistencies: CharacterNameInconsistency[];
}

export interface CharacterNameInconsistency {
  type: 'missing_in_backcover' | 'missing_in_outline' | 'extra_names' | 'name_mismatch';
  severity: 'critical' | 'warning' | 'info';
  userSpecifiedName?: string;
  foundName?: string;
  context: string;
  recommendation: string;
}

export interface CharacterNameValidation {
  isValid: boolean;
  score: number; // 0-100 consistency score
  issues: CharacterNameInconsistency[];
  recommendations: string[];
}

export interface ExtractedCharacterInfo {
  names: string[];
  hasDetailedCharacters: boolean;
  characterDescriptions: Array<{
    name: string;
    description: string;
    traits: string[];
  }>;
  promptAnalysis: {
    containsNames: boolean;
    containsCharacterSheets: boolean;
    estimatedCharacterCount: number;
    promptType: 'minimal' | 'moderate' | 'detailed';
  };
}

export class CharacterNameContinuityAgent {
  private storyMemoryManager: StoryMemoryManager;

  constructor() {
    this.storyMemoryManager = new StoryMemoryManager();
  }

  /**
   * Comprehensive analysis of user prompt to extract character information
   */
  analyzeUserPrompt(userPrompt: string): ExtractedCharacterInfo {
    try {
      console.log('🔍 Starting character name analysis...');
      
      // Extract names once and reuse
      const names = this.extractNamesFromPrompt(userPrompt);
      console.log(`📊 Found ${names.length} potential character names:`, names);
      
      // Analyze complexity using the extracted names
      const analysis = this.analyzePromptComplexityWithNames(userPrompt, names);
      console.log(`📝 Prompt analysis complete: ${analysis.promptType} type`);
      
      // Extract character descriptions (simplified to avoid regex issues)
      const characterDescriptions = this.extractCharacterDescriptions(userPrompt);
      console.log(`👥 Found ${characterDescriptions.length} character descriptions`);
      
      console.log('✅ Character name analysis completed successfully');
      
      return {
        names,
        hasDetailedCharacters: characterDescriptions.length > 0,
        characterDescriptions,
        promptAnalysis: analysis
      };
    } catch (error) {
      console.error('❌ Error in character name analysis:', error);
      // Return safe fallback
      return {
        names: [],
        hasDetailedCharacters: false,
        characterDescriptions: [],
        promptAnalysis: {
          containsNames: false,
          containsCharacterSheets: false,
          estimatedCharacterCount: 1,
          promptType: 'minimal'
        }
      };
    }
  }

  /**
   * Analyze the complexity and type of the user prompt using pre-extracted names
   */
  private analyzePromptComplexityWithNames(userPrompt: string, names: string[]): ExtractedCharacterInfo['promptAnalysis'] {
    const wordCount = userPrompt.split(/\s+/).length;
    const hasNames = names.length > 0;
    const hasCharacterIndicators = /character|protagonist|hero|heroine|main|lead/i.test(userPrompt);
    const hasDescriptiveElements = /age|years old|personality|trait|background|history|profession|job|appearance|looks like/i.test(userPrompt);
    const hasCharacterSheets = /name:|character:|protagonist:|age:|personality:|background:|appearance:/i.test(userPrompt);
    
    let promptType: 'minimal' | 'moderate' | 'detailed';
    let estimatedCharacterCount = 0;
    
    if (wordCount < 20 && !hasNames && !hasCharacterIndicators) {
      promptType = 'minimal';
      estimatedCharacterCount = 1; // Will need AI to generate protagonist
    } else if (wordCount < 100 && (hasNames || hasCharacterIndicators) && !hasCharacterSheets) {
      promptType = 'moderate';
      estimatedCharacterCount = hasNames ? names.length : 2;
    } else {
      promptType = 'detailed';
      estimatedCharacterCount = Math.max(names.length, 2);
    }
    
    return {
      containsNames: hasNames,
      containsCharacterSheets: hasCharacterSheets,
      estimatedCharacterCount,
      promptType
    };
  }

  /**
   * Extract character names from user prompt using multiple strategies
   */
  private extractNamesFromPrompt(userPrompt: string): string[] {
    const names: Set<string> = new Set();
    
    try {
      // Clean the prompt first - remove excessive formatting
      const cleanedPrompt = userPrompt
        .replace(/\n+/g, ' ')  // Replace multiple newlines with single space
        .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
        .trim();
      
      // Strategy 1: Look for explicit name indicators
      const nameMatches = cleanedPrompt.match(/(?:name(?:d)?|called|known as)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi);
      if (nameMatches) {
        nameMatches.forEach(match => {
          const name = match.replace(/^(?:name(?:d)?|called|known as)\s+/i, '').trim();
          const cleanName = this.cleanExtractedName(name);
          if (cleanName && this.isLikelyPersonName(cleanName)) {
            names.add(cleanName);
          }
        });
      }
      
      // Strategy 2: Look for character sheet patterns
      const characterMatches = cleanedPrompt.match(/(?:character|name):\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi);
      if (characterMatches) {
        characterMatches.forEach(match => {
          const name = match.replace(/^(?:character|name):\s*/i, '').trim();
          const cleanName = this.cleanExtractedName(name);
          if (cleanName && this.isLikelyPersonName(cleanName)) {
            names.add(cleanName);
          }
        });
      }
      
      // Strategy 3: Look for quoted names
      const quotedMatches = cleanedPrompt.match(/["']([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)["']/g);
      if (quotedMatches) {
        quotedMatches.forEach(match => {
          const name = match.replace(/["']/g, '').trim();
          const cleanName = this.cleanExtractedName(name);
          if (cleanName && this.isLikelyPersonName(cleanName)) {
            names.add(cleanName);
          }
        });
      }
      
      // Strategy 4: Look for simple capitalized words near character context
      const words = cleanedPrompt.split(/\s+/).slice(0, 200); // Limit processing to first 200 words
      const characterContextWords = ['character', 'protagonist', 'hero', 'heroine'];
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i].replace(/[.,!?;:"'()]/g, '');
        const cleanWord = this.cleanExtractedName(word);
        
        if (cleanWord && this.isLikelyPersonName(cleanWord)) {
          // Simple proximity check - look 2 words before and after
          const nearbyWords = words.slice(Math.max(0, i - 2), Math.min(words.length, i + 3));
          if (characterContextWords.some(contextWord => 
            nearbyWords.some(nearbyWord => nearbyWord.toLowerCase().includes(contextWord)))) {
            names.add(cleanWord);
          }
        }
      }
    } catch (error) {
      console.error('Error extracting names from prompt:', error);
      // Return empty array on error to prevent blocking
      return [];
    }
    
    return Array.from(names).slice(0, 5); // Limit to 5 names max
  }

  /**
   * Extract detailed character descriptions from prompt (simplified for performance)
   */
  private extractCharacterDescriptions(userPrompt: string): Array<{name: string; description: string; traits: string[]}> {
    const descriptions: Array<{name: string; description: string; traits: string[]}> = [];
    
    try {
      // Look for simple patterns like "Character: Name"
      const lines = userPrompt.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Simple pattern: "Character: Name" or "Name: Description"
        if (line.includes(':')) {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const leftPart = parts[0].trim();
            const rightPart = parts.slice(1).join(':').trim();
            
            // Check if left part looks like a character indicator
            if (/character|name|protagonist|hero|heroine/i.test(leftPart) && rightPart.length > 1) {
              const name = rightPart.split(' ')[0]; // Get first word as name
              if (this.isLikelyPersonName(name)) {
                descriptions.push({
                  name,
                  description: rightPart,
                  traits: this.extractTraits(rightPart)
                });
              }
            }
            // Or check if left part looks like a name
            else if (this.isLikelyPersonName(leftPart) && rightPart.length > 10) {
              descriptions.push({
                name: leftPart,
                description: rightPart,
                traits: this.extractTraits(rightPart)
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error extracting character descriptions:', error);
    }
    
    return descriptions;
  }

  /**
   * Clean extracted name by removing formatting artifacts
   */
  private cleanExtractedName(name: string): string | null {
    if (!name) return null;
    
    // Remove newlines, excessive whitespace, and formatting
    const cleaned = name
      .replace(/\n+/g, ' ')          // Replace newlines with space
      .replace(/\s+/g, ' ')          // Replace multiple spaces with single space
      .replace(/[^\w\s'-]/g, '')     // Remove non-word characters except spaces, hyphens, apostrophes
      .trim();
    
    // Split on spaces and take only the first meaningful part
    const parts = cleaned.split(/\s+/);
    const firstPart = parts[0];
    
    // If first part looks like a section header or formatting artifact, try second part
    if (firstPart && this.isFormattingArtifact(firstPart) && parts.length > 1) {
      return parts[1];
    }
    
    return firstPart || null;
  }

  /**
   * Check if a word is likely a formatting artifact
   */
  private isFormattingArtifact(word: string): boolean {
    const artifacts = [
      // Role descriptors
      'Role', 'Name', 'Character', 'MAIN', 'CHARACTERS', 'PROTAGONIST', 'HERO', 'HEROINE',
      'Lead', 'Supporting', 'Antagonist', 'Villain', 'Sidekick', 'Ally', 'Enemy',
      
      // Character attributes
      'Description', 'Background', 'Age', 'Personality', 'Appearance', 'Traits', 'Skills',
      'Goals', 'Motivation', 'Conflict', 'Arc', 'Development', 'Relationships',
      'Physical', 'Mental', 'Emotional', 'Social', 'Backstory', 'History',
      
      // Story elements
      'Plot', 'Theme', 'Setting', 'Genre', 'Tone', 'Style', 'POV', 'Perspective',
      'Chapter', 'Section', 'Scene', 'Part', 'Book', 'Story', 'Tale', 'Novel',
      
      // Generic descriptors
      'First', 'Second', 'Third', 'Last', 'Next', 'Previous', 'New', 'Old', 'Young', 'Ancient',
      'Primary', 'Secondary', 'Important', 'Special', 'Unique', 'Common', 'Major', 'Minor',
      
      // Action words often mistaken for names
      'About', 'After', 'Before', 'During', 'Through', 'Around', 'Between', 'Among',
      'Within', 'Without', 'Beyond', 'Behind', 'Inside', 'Outside', 'Above', 'Below'
    ];
    
    return artifacts.some(artifact => 
      word.toUpperCase() === artifact.toUpperCase()
    );
  }

  /**
   * Check if a word is likely a person's name
   */
  private isLikelyPersonName(word: string): boolean {
    if (!word || word.length < 2) return false;
    
    // Must start with capital letter
    if (word[0] !== word[0].toUpperCase()) return false;
    
    // Common words that aren't names
    const commonWords = [
      'The', 'A', 'An', 'And', 'But', 'Or', 'For', 'So', 'Yet', 'When', 'Where', 'Why', 'How', 
      'What', 'Who', 'Which', 'That', 'This', 'These', 'Those', 'Chapter', 'Book', 'Story',
      'Character', 'Protagonist', 'Hero', 'Heroine', 'Person', 'Man', 'Woman', 'Boy', 'Girl',
      'First', 'Second', 'Third', 'Last', 'Next', 'Previous', 'New', 'Old', 'Young', 'Ancient',
      'Modern', 'Future', 'Past', 'Present', 'Today', 'Tomorrow', 'Yesterday', 'Now', 'Then',
      'Here', 'There', 'Everywhere', 'Nowhere', 'Somewhere', 'Anywhere', 'Everyone', 'Someone',
      'Anyone', 'Nobody', 'Everybody', 'Somebody', 'Anybody', 'Nothing', 'Something', 'Anything',
      'Everything', 'Main', 'Primary', 'Secondary', 'Important', 'Special', 'Unique', 'Common'
    ];
    
    if (commonWords.includes(word)) return false;
    
    // Check if it's a likely name pattern (letters only, reasonable length)
    if (!/^[A-Za-z]+(?:\s+[A-Za-z]+)?$/.test(word)) return false;
    if (word.length > 20) return false; // Too long to be a typical name
    
    return true;
  }

  /**
   * Extract character traits from description text
   */
  private extractTraits(description: string): string[] {
    const traits: string[] = [];
    
    // Look for common trait patterns
    const traitPatterns = [
      /(?:is|was|being)\s+(brave|kind|smart|clever|funny|serious|quiet|loud|friendly|shy|confident|nervous|strong|weak|tall|short|beautiful|handsome|young|old)/gi,
      /(brave|kind|smart|clever|funny|serious|quiet|loud|friendly|shy|confident|nervous|strong|weak|tall|short|beautiful|handsome|young|old)\s+(?:person|character|individual|man|woman|boy|girl)/gi,
      /personality:\s*([^.!?\n]+)/gi,
      /traits?:\s*([^.!?\n]+)/gi
    ];
    
    for (const pattern of traitPatterns) {
      let match;
      while ((match = pattern.exec(description)) !== null) {
        const trait = match[1].trim().toLowerCase();
        if (trait.length > 2 && trait.length < 20) {
          traits.push(trait);
        }
      }
    }
    
    return Array.from(new Set(traits)); // Remove duplicates
  }

  /**
   * Extract character names from text content
   */
  extractCharacterNames(text: string): string[] {
    // Simple name extraction - looks for capitalized words that appear multiple times
    const words = text.split(/\s+/);
    const nameFrequency = new Map<string, number>();
    
    // Find capitalized words that could be names
    for (const word of words) {
      const cleanWord = word.replace(/[.,!?;:"'()]/g, '');
      const cleanedName = this.cleanExtractedName(cleanWord);
      
      // FIXED: Use the same robust filtering as extractNamesFromPrompt
      if (cleanedName && 
          this.isLikelyPersonName(cleanedName) && 
          !this.isFormattingArtifact(cleanedName)) {  // Added this check!
        nameFrequency.set(cleanedName, (nameFrequency.get(cleanedName) || 0) + 1);
      }
    }
    
    // Return names that appear more than once (likely character names)
    return Array.from(nameFrequency.entries())
      .filter(([name, count]) => count > 1)
      .map(([name]) => name)
      .slice(0, 10); // Limit to top 10 potential names
  }

  /**
   * Validate character name consistency across all planning stages
   */
  validateNameConsistency(
    userSpecifiedNames: string[],
    backCoverText: string,
    outlineCharacters: Array<{ name: string; role: string }>,
    storyBibleCharacters: Array<{ name: string; role: string }>
  ): CharacterNameValidation {
    const issues: CharacterNameInconsistency[] = [];
    const backCoverNames = this.extractCharacterNames(backCoverText);
    const outlineNames = outlineCharacters.map(c => c.name);
    const storyBibleNames = storyBibleCharacters.map(c => c.name);

    // Check if user-specified names appear in back cover
    for (const userSpecifiedName of userSpecifiedNames) {
      if (!backCoverNames.includes(userSpecifiedName)) {
        issues.push({
          type: 'missing_in_backcover',
          severity: 'critical',
          userSpecifiedName,
          context: 'Back cover generation',
          recommendation: `Add ${userSpecifiedName} to the back cover description to maintain consistency with user requirements.`
        });
      }
    }

    // Check if user-specified names appear in outline
    for (const userSpecifiedName of userSpecifiedNames) {
      if (!outlineNames.includes(userSpecifiedName)) {
        issues.push({
          type: 'missing_in_outline',
          severity: 'critical',
          userSpecifiedName,
          context: 'Outline generation',
          recommendation: `Ensure ${userSpecifiedName} is included as a character in the story outline.`
        });
      }
    }

    // Check for extra names in back cover that aren't user-specified
    for (const backCoverName of backCoverNames) {
      if (!userSpecifiedNames.includes(backCoverName) && userSpecifiedNames.length > 0) {
        issues.push({
          type: 'extra_names',
          severity: 'warning',
          foundName: backCoverName,
          context: 'Back cover contains additional names',
          recommendation: `Consider whether ${backCoverName} should be replaced with a user-specified name or if it's a minor character.`
        });
      }
    }

    // Check for name mismatches between outline and story bible
    for (const outlineName of outlineNames) {
      if (!storyBibleNames.includes(outlineName)) {
        issues.push({
          type: 'name_mismatch',
          severity: 'warning',
          foundName: outlineName,
          context: 'Outline vs Story Bible mismatch',
          recommendation: `Ensure ${outlineName} appears consistently in both outline and story bible.`
        });
      }
    }

    // Calculate consistency score
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const warningIssues = issues.filter(i => i.severity === 'warning').length;
    const score = Math.max(0, 100 - (criticalIssues * 25) - (warningIssues * 10));

    const recommendations = this.generateRecommendations(issues, userSpecifiedNames);

    return {
      isValid: criticalIssues === 0,
      score,
      issues,
      recommendations
    };
  }

  /**
   * Fix character name inconsistencies in generated content
   */
  async fixNameInconsistencies(
    content: string,
    userSpecifiedNames: string[],
    incorrectNames: string[]
  ): Promise<string> {
    if (userSpecifiedNames.length === 0 || incorrectNames.length === 0) {
      return content;
    }

    let fixedContent = content;

    // Simple name replacement - in a real implementation, this would use NLP
    for (let i = 0; i < Math.min(userSpecifiedNames.length, incorrectNames.length); i++) {
      const userSpecifiedName = userSpecifiedNames[i];
      const incorrectName = incorrectNames[i];
      
      // Replace the incorrect name with the user-specified name
      const regex = new RegExp(`\\b${incorrectName}\\b`, 'g');
      fixedContent = fixedContent.replace(regex, userSpecifiedName);
    }

    return fixedContent;
  }

  /**
   * Generate actionable recommendations for fixing character name issues
   */
  private generateRecommendations(
    issues: CharacterNameInconsistency[],
    userSpecifiedNames: string[]
  ): string[] {
    const recommendations: string[] = [];

    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const warningIssues = issues.filter(i => i.severity === 'warning');

    if (criticalIssues.length > 0) {
      recommendations.push(
        `CRITICAL: ${criticalIssues.length} character names are missing from generated content. The back cover and outline must include user-specified names: ${userSpecifiedNames.join(', ')}.`
      );
    }

    if (warningIssues.length > 0) {
      recommendations.push(
        `WARNING: ${warningIssues.length} potential name inconsistencies detected. Review generated content for extra or mismatched character names.`
      );
    }

    const backCoverIssues = issues.filter(i => i.type === 'missing_in_backcover');
    if (backCoverIssues.length > 0) {
      recommendations.push(
        `Regenerate the back cover to include these user-specified names: ${backCoverIssues.map(i => i.userSpecifiedName).join(', ')}.`
      );
    }

    const outlineIssues = issues.filter(i => i.type === 'missing_in_outline');
    if (outlineIssues.length > 0) {
      recommendations.push(
        `Update the story outline to include these user-specified characters: ${outlineIssues.map(i => i.userSpecifiedName).join(', ')}.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Character name consistency is excellent! All user-specified names are properly integrated.');
    }

    return recommendations;
  }

  /**
   * Create a mapping of character names across all planning stages
   */
  createNameMapping(
    userSpecifiedNames: string[],
    backCoverText: string,
    outlineCharacters: Array<{ name: string; role: string }>,
    storyBibleCharacters: Array<{ name: string; role: string }>
  ): CharacterNameMapping {
    const backCoverNames = this.extractCharacterNames(backCoverText);
    const outlineNames = outlineCharacters.map(c => c.name);
    const storyBibleNames = storyBibleCharacters.map(c => c.name);

    const validation = this.validateNameConsistency(
      userSpecifiedNames,
      backCoverText,
      outlineCharacters,
      storyBibleCharacters
    );

    return {
      userSpecifiedNames,
      backCoverNames,
      outlineNames,
      storyBibleNames,
      inconsistencies: validation.issues
    };
  }

  /**
   * Validate character names in a specific text (for real-time validation)
   */
  validateTextForCharacterNames(
    text: string,
    expectedNames: string[],
    context: string
  ): CharacterNameValidation {
    const foundNames = this.extractCharacterNames(text);
    const issues: CharacterNameInconsistency[] = [];

    for (const expectedName of expectedNames) {
      if (!foundNames.includes(expectedName)) {
        issues.push({
          type: 'missing_in_backcover',
          severity: 'critical',
          userSpecifiedName: expectedName,
          context,
          recommendation: `Add ${expectedName} to the ${context.toLowerCase()} to maintain character name consistency.`
        });
      }
    }

    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const score = Math.max(0, 100 - (criticalIssues * 25));

    return {
      isValid: criticalIssues === 0,
      score,
      issues,
      recommendations: this.generateRecommendations(issues, expectedNames)
    };
  }
} 