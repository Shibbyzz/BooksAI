export interface ProseValidation {
  isValid: boolean;
  warnings: ProseWarning[];
  suggestions: string[];
  overallSeverity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProseWarning {
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'formatting' | 'style' | 'voice' | 'structure' | 'balance';
}

export interface ProseQualityScore {
  score: number;
  summary: string;
  shouldReview: boolean;
}

export class ProseValidator {
  /**
   * Enhanced prose quality and formatting validation
   */
  static validateProse(content: string): ProseValidation {
    const warnings: ProseWarning[] = [];
    const suggestions: string[] = [];
    
    // 1. Check for giant paragraph blobs
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    const avgParagraphLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length;
    
    if (avgParagraphLength > 1200) {
      warnings.push({
        message: 'Extremely large paragraph blocks detected - breaks readability',
        severity: 'high',
        category: 'formatting'
      });
      suggestions.push('Break large paragraphs into smaller chunks of 100-200 words');
    } else if (avgParagraphLength > 800) {
      warnings.push({
        message: 'Large paragraph blocks detected - consider breaking into smaller paragraphs',
        severity: 'medium',
        category: 'formatting'
      });
      suggestions.push('Add paragraph breaks every 100-200 words for better readability');
    }
    
    // 2. Enhanced dialogue detection and ratio analysis
    const dialogueMatches = content.match(/[""].*?[""]|".*?"/g) || [];
    const dialogueText = dialogueMatches.join(' ');
    const dialogueWordCount = this.countWords(dialogueText);
    const totalWordCount = this.countWords(content);
    const dialogueRatio = totalWordCount > 0 ? dialogueWordCount / totalWordCount : 0;
    
    if (!dialogueMatches.length && content.length > 500) {
      warnings.push({
        message: 'No dialogue detected in lengthy section - lacks character interaction',
        severity: 'medium',
        category: 'balance'
      });
      suggestions.push('Include character dialogue to break up narrative and add variety');
    } else if (dialogueRatio < 0.05 && content.length > 800) {
      warnings.push({
        message: `Very low dialogue ratio (${Math.round(dialogueRatio * 100)}%) - may feel monotonous`,
        severity: 'low',
        category: 'balance'
      });
      suggestions.push('Consider adding more character interactions and conversations');
    } else if (dialogueRatio > 0.7) {
      warnings.push({
        message: `Excessive dialogue ratio (${Math.round(dialogueRatio * 100)}%) - lacks descriptive balance`,
        severity: 'medium',
        category: 'balance'
      });
      suggestions.push('Balance dialogue with narrative description and scene-setting');
    }
    
    // 3. Check paragraph variety
    if (paragraphs.length < 3 && content.length > 600) {
      warnings.push({
        message: 'Limited paragraph variety - content may lack proper formatting',
        severity: 'medium',
        category: 'structure'
      });
      suggestions.push('Use more paragraph breaks to improve flow and readability');
    }
    
    // 4. Check for repetitive sentence structures
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const shortSentences = sentences.filter(s => s.split(' ').length < 8).length;
    const sentenceVariety = shortSentences / sentences.length;
    
    if (sentenceVariety > 0.9) {
      warnings.push({
        message: 'Extremely uniform sentence structure - lacks rhythm variation',
        severity: 'high',
        category: 'style'
      });
      suggestions.push('Mix short punchy sentences with longer, more complex ones');
    } else if (sentenceVariety > 0.8) {
      warnings.push({
        message: 'Sentence structure may be too uniform - consider varying sentence length',
        severity: 'medium',
        category: 'style'
      });
      suggestions.push('Add variety with different sentence lengths and structures');
    }
    
    // 5. Passive voice detection
    const passiveVoiceWarning = this.detectPassiveVoice(content);
    if (passiveVoiceWarning) {
      warnings.push(passiveVoiceWarning);
      suggestions.push('Convert passive constructions to active voice for stronger prose');
    }
    
    // 6. Excessive adverb detection
    const adverbWarning = this.detectExcessiveAdverbs(content);
    if (adverbWarning) {
      warnings.push(adverbWarning);
      suggestions.push('Replace adverbs with stronger verbs or more specific descriptions');
    }
    
    // 7. Telling vs showing detection
    const tellingWarning = this.detectTellingLanguage(content);
    if (tellingWarning) {
      warnings.push(tellingWarning);
      suggestions.push('Show emotions and states through actions, dialogue, and sensory details');
    }
    
    // Determine overall severity
    const severityLevels = warnings.map(w => w.severity);
    const overallSeverity = this.calculateOverallSeverity(severityLevels);
    
    return {
      isValid: warnings.length === 0,
      warnings,
      suggestions,
      overallSeverity
    };
  }

  /**
   * Detect passive voice overuse
   */
  private static detectPassiveVoice(content: string): ProseWarning | null {
    const passivePatterns = [
      /\b(was|were|is|are|been|being)\s+\w+ed\b/gi,
      /\b(was|were|is|are|been|being)\s+\w+en\b/gi,
      /\b(was|were|is|are|been|being)\s+(given|taken|made|done|seen|heard|felt|found|left|brought|caught|bought|sold|told|shown|known|written|read|broken|chosen|frozen|stolen|spoken|driven|thrown|grown|blown|drawn|worn|torn|born|sworn|flown)\b/gi
    ];
    
    let passiveCount = 0;
    passivePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) passiveCount += matches.length;
    });
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const passiveRatio = passiveCount / sentences.length;
    
    // More lenient thresholds for creative writing
    if (passiveRatio > 0.5) {
      return {
        message: `Excessive passive voice usage (${Math.round(passiveRatio * 100)}% of sentences) - weakens prose impact`,
        severity: 'critical',
        category: 'voice'
      };
    } else if (passiveRatio > 0.35) {
      return {
        message: `High passive voice usage (${Math.round(passiveRatio * 100)}% of sentences) - consider more active constructions`,
        severity: 'high',
        category: 'voice'
      };
    } else if (passiveRatio > 0.25) {
      return {
        message: `Moderate passive voice usage (${Math.round(passiveRatio * 100)}% of sentences) - room for improvement`,
        severity: 'medium',
        category: 'voice'
      };
    }
    
    return null;
  }

  /**
   * Detect excessive adverb usage
   */
  private static detectExcessiveAdverbs(content: string): ProseWarning | null {
    const adverbPatterns = [
      /\b\w+ly\b/gi, // Words ending in -ly
      /\b(very|really|quite|rather|extremely|incredibly|absolutely|completely|totally|entirely|perfectly|exactly|definitely|certainly|obviously|clearly|suddenly|quickly|slowly|carefully|quietly|loudly|softly|gently|roughly|smoothly|easily|hardly|barely|nearly|almost|just|only|even|still|already|always|never|sometimes|often|usually|frequently|occasionally|rarely|seldom)\b/gi
    ];
    
    let adverbCount = 0;
    const foundAdverbs = new Set<string>();
    
    adverbPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => foundAdverbs.add(match.toLowerCase()));
        adverbCount += matches.length;
      }
    });
    
    const wordCount = this.countWords(content);
    const adverbRatio = adverbCount / wordCount;
    
    // More lenient thresholds for creative writing
    if (adverbRatio > 0.12) {
      return {
        message: `Excessive adverb usage (${Math.round(adverbRatio * 100)}% of words) - weakens prose strength`,
        severity: 'high',
        category: 'style'
      };
    } else if (adverbRatio > 0.08) {
      return {
        message: `High adverb usage (${Math.round(adverbRatio * 100)}% of words) - consider stronger verbs`,
        severity: 'medium',
        category: 'style'
      };
    } else if (adverbRatio > 0.06) {
      return {
        message: `Moderate adverb usage (${Math.round(adverbRatio * 100)}% of words) - room for improvement`,
        severity: 'low',
        category: 'style'
      };
    }
    
    return null;
  }

  /**
   * Detect "telling" language instead of "showing"
   */
  private static detectTellingLanguage(content: string): ProseWarning | null {
    const tellingPatterns = [
      /\b(he|she|they|it)\s+(felt|was|were|seemed|appeared|looked|sounded|became|grew|got|turned)\s+(angry|sad|happy|excited|nervous|worried|afraid|scared|confused|surprised|shocked|disappointed|frustrated|annoyed|irritated|pleased|satisfied|relieved|tired|exhausted|hungry|thirsty|cold|warm|hot|uncomfortable|awkward|embarrassed|ashamed|guilty|proud|confident|uncertain|sure|unsure)\b/gi,
      /\b(he|she|they)\s+(thought|realized|knew|understood|remembered|forgot|decided|wanted|needed|hoped|wished|expected|believed|felt)\s+(that|about|how|why|when|where|what)/gi,
      /\b(he|she|they)\s+(was|were)\s+(thinking|feeling|hoping|wishing|wanting|needing|trying|attempting)/gi
    ];
    
    let tellingCount = 0;
    tellingPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) tellingCount += matches.length;
    });
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const tellingRatio = tellingCount / sentences.length;
    
    // More lenient thresholds - some telling is acceptable in narrative
    if (tellingRatio > 0.3) {
      return {
        message: `Excessive "telling" language (${Math.round(tellingRatio * 100)}% of sentences) - lacks immersive showing`,
        severity: 'high',
        category: 'style'
      };
    } else if (tellingRatio > 0.2) {
      return {
        message: `Moderate "telling" language (${Math.round(tellingRatio * 100)}% of sentences) - could show more through actions`,
        severity: 'medium',
        category: 'style'
      };
    } else if (tellingRatio > 0.15) {
      return {
        message: `Some "telling" language detected (${Math.round(tellingRatio * 100)}% of sentences) - minor improvement opportunity`,
        severity: 'low',
        category: 'style'
      };
    }
    
    return null;
  }

  /**
   * Calculate overall severity from individual warnings
   */
  private static calculateOverallSeverity(severityLevels: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (severityLevels.includes('critical')) return 'critical';
    if (severityLevels.filter(s => s === 'high').length >= 2) return 'critical';
    if (severityLevels.includes('high')) return 'high';
    if (severityLevels.filter(s => s === 'medium').length >= 3) return 'high';
    if (severityLevels.includes('medium')) return 'medium';
    if (severityLevels.length > 0) return 'low';
    return 'low';
  }

  /**
   * Calculate quality score and generate summary from prose validation
   */
  static calculateQualityScore(
    proseValidation: ProseValidation,
    additionalCorrections: number = 0
  ): ProseQualityScore {
    const baseScore = 85; // More realistic starting point for AI-generated content
    
    // More reasonable deductions for corrections (many corrections can be minor style improvements)
    const correctionDeductions = Math.min(15, additionalCorrections * 1); // Cap correction penalties
    
    // More balanced deductions for prose validation warnings
    const proseDeductions = proseValidation.warnings.reduce((total, warning) => {
      switch (warning.severity) {
        case 'critical': return total + 8;  // Reduced from 15 to 8
        case 'high': return total + 5;     // Reduced from 10 to 5  
        case 'medium': return total + 2;   // Reduced from 5 to 2
        case 'low': return total + 1;      // Reduced from 2 to 1
        default: return total + 1;
      }
    }, 0);
    
    // Apply diminishing returns for multiple warnings of the same type
    const categoryGroups = new Map<string, number>();
    proseValidation.warnings.forEach(warning => {
      categoryGroups.set(warning.category, (categoryGroups.get(warning.category) || 0) + 1);
    });
    
    // Reduce penalty for multiple warnings in same category (likely related issues)
    let categoryPenalty = 0;
    categoryGroups.forEach((count, category) => {
      if (count > 2) {
        categoryPenalty += Math.min(5, (count - 2) * 1); // Small penalty for many similar issues
      }
    });
    
    const finalScore = Math.max(60, baseScore - correctionDeductions - proseDeductions - categoryPenalty);
    
    // Generate scoring summary
    const summary = this.generateScoringSummary(proseValidation, additionalCorrections);
    
    // More lenient review thresholds
    const shouldReview = finalScore < 65 || 
                        proseValidation.warnings.filter(w => w.severity === 'critical').length >= 2 ||
                        proseValidation.warnings.filter(w => w.severity === 'high').length >= 3;
    
    return {
      score: Math.round(finalScore),
      summary,
      shouldReview
    };
  }

  /**
   * Generate detailed scoring summary explaining what affected the quality score
   */
  private static generateScoringSummary(
    proseValidation: ProseValidation,
    additionalCorrections: number = 0
  ): string {
    const issues: string[] = [];
    
    // Add correction issues to summary
    if (additionalCorrections > 0) {
      issues.push(`${additionalCorrections} correction${additionalCorrections > 1 ? 's' : ''} applied`);
    }
    
    // Add prose validation issues
    const criticalWarnings = proseValidation.warnings.filter(w => w.severity === 'critical');
    const highWarnings = proseValidation.warnings.filter(w => w.severity === 'high');
    const mediumWarnings = proseValidation.warnings.filter(w => w.severity === 'medium');
    
    if (criticalWarnings.length > 0) {
      issues.push(`${criticalWarnings.length} critical structural issue${criticalWarnings.length > 1 ? 's' : ''}`);
    }
    
    if (highWarnings.length > 0) {
      issues.push(`${highWarnings.length} high-priority style issue${highWarnings.length > 1 ? 's' : ''}`);
    }
    
    if (mediumWarnings.length > 0) {
      issues.push(`${mediumWarnings.length} medium-priority issue${mediumWarnings.length > 1 ? 's' : ''}`);
    }
    
    // Highlight specific problematic areas
    const specificIssues: string[] = [];
    proseValidation.warnings.forEach(warning => {
      if (warning.category === 'voice' && warning.severity === 'critical') {
        specificIssues.push('excessive passive voice');
      } else if (warning.category === 'formatting' && warning.severity === 'high') {
        specificIssues.push('paragraph structure problems');
      } else if (warning.category === 'balance' && warning.message.includes('dialogue')) {
        specificIssues.push('dialogue imbalance');
      } else if (warning.category === 'style' && warning.message.includes('telling')) {
        specificIssues.push('telling vs showing issues');
      } else if (warning.category === 'style' && warning.message.includes('adverb')) {
        specificIssues.push('excessive adverb usage');
      }
    });
    
    if (issues.length === 0 && specificIssues.length === 0) {
      return "High quality content with minimal issues detected. Score reflects professional-grade prose.";
    }
    
    let summary = "Quality score affected by: " + issues.join(', ');
    if (specificIssues.length > 0) {
      summary += ". Key concerns: " + specificIssues.join(', ');
    }
    
    return summary + ".";
  }

  /**
   * Count words in text
   */
  private static countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }
} 