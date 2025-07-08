import { OpenAI } from 'openai';
import { env } from '@/lib/env';

export interface SupervisionConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ChapterReview {
  chapterNumber: number;
  chapterTitle: string;
  overallScore: number; // 0-100
  issues: SupervisionIssue[];
  recommendations: string[];
  flaggedForReview: boolean;
  emotionalScore: number; // 0-100
  pacingScore: number; // 0-100
  arcProgressScore: number; // 0-100
}

export interface SupervisionIssue {
  type: 'low-emotion' | 'broken-pacing' | 'incomplete-arc' | 'consistency' | 'quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedFix: string;
  sectionNumber?: number;
}

export interface StoryArcProgress {
  characterName: string;
  currentStage: string;
  expectedStage: string;
  progressScore: number;
  issues: string[];
}

// Phase 3: Automatic Revision Triggers
export interface RevisionTrigger {
  chapterNumber: number;
  triggerType: 'quality_threshold' | 'arc_stagnation' | 'consistency_break' | 'pacing_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedRevisions: string[];
  triggeredAt: Date;
  autoRevision: boolean;
}

export interface AutoRevisionConfig {
  enabled: boolean;
  qualityThreshold: number; // Trigger revision if score below this
  everyNthChapter: number; // Check every N chapters (default 2)
  maxConsecutiveRevisions: number; // Prevent infinite revision loops
  criticalIssueAutoRevision: boolean; // Auto-trigger on critical issues
}

export interface SupervisionSummary {
  overallQuality: number;
  revisionTriggers: RevisionTrigger[];
  revisionQueue: RevisionTask[];
  qualityTrend: 'improving' | 'stable' | 'declining';
  criticalIssuesCount: number;
  recommendedActions: string[];
}

export interface RevisionTask {
  id: string;
  chapterNumber: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  taskType: 'full_revision' | 'section_revision' | 'quality_enhancement' | 'arc_adjustment';
  description: string;
  createdAt: Date;
  estimatedEffort: 'low' | 'medium' | 'high';
  dependencies: string[];
}

export class SupervisionAgent {
  private config: SupervisionConfig;
  private openai: OpenAI;
  
  // Phase 3: Auto-revision tracking
  private autoRevisionConfig: AutoRevisionConfig;
  private revisionHistory: Map<number, RevisionTrigger[]> = new Map(); // chapter -> triggers
  private revisionQueue: RevisionTask[] = [];
  private qualityHistory: { chapterNumber: number; score: number; timestamp: Date }[] = [];

  constructor(config: SupervisionConfig, autoRevisionConfig?: AutoRevisionConfig) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
    
    this.autoRevisionConfig = autoRevisionConfig || {
      enabled: true,
      qualityThreshold: 65,  // Reduced from 80 to 65 - more reasonable for creative content
      everyNthChapter: 2,
      maxConsecutiveRevisions: 8,  // Increased from 3 to 8 for more improvement attempts
      criticalIssueAutoRevision: true
    };
  }

  /**
   * Review a chapter for quality issues
   */
  async reviewChapter(
    chapterNumber: number,
    chapterTitle: string,
    content: string,
    expectedOutcome: string,
    characterArcs: any[],
    previousChapterSummary?: string
  ): Promise<ChapterReview> {
    try {
      console.log(`🔍 SupervisionAgent reviewing Chapter ${chapterNumber}: ${chapterTitle}`);

      // TODO: Implement full AI-powered chapter review
      // For now, providing a scaffolded implementation with basic checks
      
      const review = await this.performBasicReview(
        chapterNumber,
        chapterTitle,
        content,
        expectedOutcome,
        characterArcs,
        previousChapterSummary
      );

      // Apply AI-enhanced review if content is substantial
      if (content.length > 1000) {
        const aiReview = await this.performAIReview(
          chapterNumber,
          chapterTitle,
          content,
          expectedOutcome
        );
        
        // Merge AI insights with basic review
        review.overallScore = Math.round((review.overallScore + (aiReview.overallScore ?? 75)) / 2);
        review.issues.push(...(aiReview.issues || []));
        review.recommendations.push(...(aiReview.recommendations || []));
      }

      console.log(`  📊 Chapter ${chapterNumber} review complete - Score: ${review.overallScore}/100`);
      console.log(`  ⚠️  Found ${review.issues.length} issues (${review.issues.filter(i => i.severity === 'critical').length} critical)`);

      // Phase 3: Check for automatic revision triggers
      if (this.autoRevisionConfig.enabled) {
        const revisionTriggers = await this.checkRevisionTriggers(review, chapterNumber);
        if (revisionTriggers.length > 0) {
          console.log(`  🔄 Auto-revision triggered: ${revisionTriggers.length} triggers found`);
          await this.processRevisionTriggers(revisionTriggers, chapterNumber);
        }
      }

      // Track quality history
      this.qualityHistory.push({
        chapterNumber,
        score: review.overallScore,
        timestamp: new Date()
      });

      return review;

    } catch (error) {
      console.error(`SupervisionAgent review failed for chapter ${chapterNumber}:`, error);
      
      // Return minimal review on failure
      return {
        chapterNumber,
        chapterTitle,
        overallScore: 75, // Neutral score
        issues: [{
          type: 'quality',
          severity: 'medium',
          description: 'Could not complete full supervision review',
          suggestedFix: 'Review chapter manually for quality issues'
        }],
        recommendations: ['Manual review recommended due to supervision failure'],
        flaggedForReview: true,
        emotionalScore: 75,
        pacingScore: 75,
        arcProgressScore: 75
      };
    }
  }

  /**
   * Perform basic rule-based review
   */
  private async performBasicReview(
    chapterNumber: number,
    chapterTitle: string,
    content: string,
    expectedOutcome: string,
    characterArcs: any[],
    previousChapterSummary?: string
  ): Promise<ChapterReview> {
    const issues: SupervisionIssue[] = [];
    const recommendations: string[] = [];
    
    const wordCount = content.split(/\s+/).length;
    const sentenceCount = content.split(/[.!?]+/).length;
    const paragraphCount = content.split(/\n\s*\n/).length;

    // Basic quality checks
    let emotionalScore = 80; // Default
    let pacingScore = 80; // Default
    let arcProgressScore = 80; // Default

    // Check for low emotion indicators
    const emotionalWords = content.match(/\b(felt|feel|emotion|heart|love|hate|anger|joy|sad|happy|fear|hope|despair|excitement|relief|tension|anxiety|calm|peace|fury|rage|delight|sorrow|pain|pleasure|warmth|cold|trembling|shaking|tears|smile|laugh|cry|sob|gasp|sigh|whisper|shout|scream)\b/gi);
    const emotionalDensity = emotionalWords ? emotionalWords.length / wordCount : 0;
    
    if (emotionalDensity < 0.02) { // Less than 2% emotional content
      emotionalScore = 40;
      issues.push({
        type: 'low-emotion',
        severity: 'high',
        description: `Low emotional content detected (${Math.round(emotionalDensity * 100)}% emotional words)`,
        suggestedFix: 'Add more emotional beats, character reactions, and internal thoughts'
      });
    }

    // Check for pacing issues
    const avgSentenceLength = wordCount / sentenceCount;
    const avgParagraphLength = wordCount / paragraphCount;
    
    if (avgSentenceLength > 25) {
      pacingScore -= 15;
      issues.push({
        type: 'broken-pacing',
        severity: 'medium',
        description: `Sentences too long (avg: ${Math.round(avgSentenceLength)} words)`,
        suggestedFix: 'Break up long sentences for better pacing'
      });
    }

    if (avgParagraphLength > 150) {
      pacingScore -= 10;
      issues.push({
        type: 'broken-pacing',
        severity: 'medium',
        description: `Paragraphs too long (avg: ${Math.round(avgParagraphLength)} words)`,
        suggestedFix: 'Break up long paragraphs for better readability'
      });
    }

    // Check for dialogue presence
    const dialogueCount = content.match(/"/g)?.length || 0;
    const dialogueDensity = dialogueCount / wordCount;
    
    if (dialogueDensity < 0.05) { // Less than 5% dialogue indicators
      pacingScore -= 10;
      issues.push({
        type: 'broken-pacing',
        severity: 'medium',
        description: 'Low dialogue density - may feel too narrative-heavy',
        suggestedFix: 'Consider adding more character dialogue for engagement'
      });
    }

    // Check word count targets
    if (wordCount < 500) {
      issues.push({
        type: 'quality',
        severity: 'high',
        description: `Chapter too short (${wordCount} words)`,
        suggestedFix: 'Expand scenes with more detail and development'
      });
    }

    // Generate recommendations
    if (emotionalScore < 70) {
      recommendations.push('Increase emotional depth with character introspection');
    }
    if (pacingScore < 70) {
      recommendations.push('Improve pacing with varied sentence structures');
    }
    if (issues.length === 0) {
      recommendations.push('Chapter meets basic quality standards');
    }

    const overallScore = Math.round((emotionalScore + pacingScore + arcProgressScore) / 3);
    const flaggedForReview = overallScore < 70 || issues.some(i => i.severity === 'critical');

    return {
      chapterNumber,
      chapterTitle,
      overallScore,
      issues,
      recommendations,
      flaggedForReview,
      emotionalScore,
      pacingScore,
      arcProgressScore
    };
  }

  /**
   * Perform AI-enhanced review using LLM
   */
  private async performAIReview(
    chapterNumber: number,
    chapterTitle: string,
    content: string,
    expectedOutcome: string
  ): Promise<Partial<ChapterReview>> {
    try {
      const prompt = `As a professional book editor, review this chapter for quality issues:

CHAPTER ${chapterNumber}: ${chapterTitle}

EXPECTED OUTCOME: ${expectedOutcome}

CONTENT:
${content.substring(0, 3000)}${content.length > 3000 ? '...' : ''}

Please evaluate and provide scores (0-100) for:
1. Emotional engagement
2. Pacing and flow
3. Character development
4. Scene clarity

Also identify any critical issues with specific suggestions for improvement.

Respond in JSON format:
{
  "overallScore": 85,
  "emotionalScore": 80,
  "pacingScore": 90,
  "issues": [
    {
      "type": "low-emotion",
      "severity": "medium",
      "description": "Issue description",
      "suggestedFix": "Specific fix"
    }
  ],
  "recommendations": ["recommendation1", "recommendation2"]
}`;

      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: 'You are a professional book editor providing detailed chapter reviews.' },
          { role: 'user', content: prompt }
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens
      });

      const content_text = response.choices[0]?.message?.content;
      if (!content_text) {
        throw new Error('No AI review content received');
      }

      // Clean markdown formatting before parsing JSON
      let cleanContent = content_text.trim();
      
      // Remove markdown code blocks if present
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
      } else if (cleanContent.startsWith('```')) {
        const firstNewline = cleanContent.indexOf('\n');
        const lastBackticks = cleanContent.lastIndexOf('```');
        if (firstNewline !== -1 && lastBackticks > firstNewline) {
          cleanContent = cleanContent.substring(firstNewline + 1, lastBackticks).trim();
        }
      }

      // Parse AI response
      const aiReview = JSON.parse(cleanContent);
      
      return {
        overallScore: aiReview.overallScore || 75,
        emotionalScore: aiReview.emotionalScore || 75,
        pacingScore: aiReview.pacingScore || 75,
        issues: aiReview.issues || [],
        recommendations: aiReview.recommendations || []
      };

    } catch (error) {
      console.warn('AI review failed, using fallback:', error);
      
      // Return neutral scores on AI failure
      return {
        overallScore: 75,
        emotionalScore: 75,
        pacingScore: 75,
        issues: [],
        recommendations: ['AI review unavailable - manual review recommended']
      };
    }
  }

  /**
   * Review multiple chapters for arc consistency
   */
  async reviewStoryArcs(
    chapters: any[],
    expectedArcs: any[]
  ): Promise<StoryArcProgress[]> {
    // TODO: Implement comprehensive arc analysis
    console.log('🔍 Reviewing story arcs across chapters...');
    
    const arcProgress: StoryArcProgress[] = [];
    
    for (const arc of expectedArcs) {
      // Basic arc progress tracking
      const progress: StoryArcProgress = {
        characterName: arc.characterName || 'Unknown',
        currentStage: this.detectArcStage(chapters, arc),
        expectedStage: arc.expectedStage || 'development',
        progressScore: 80, // Default score
        issues: []
      };
      
      if (progress.currentStage !== progress.expectedStage) {
        progress.issues.push(`Arc behind expected progress: ${progress.currentStage} vs ${progress.expectedStage}`);
        progress.progressScore = 60;
      }
      
      arcProgress.push(progress);
    }
    
    return arcProgress;
  }

  /**
   * Detect current arc stage from chapter content
   */
  private detectArcStage(chapters: any[], arc: any): string {
    // TODO: Implement sophisticated arc detection
    // For now, return based on chapter position
    const totalChapters = chapters.length;
    const position = chapters.filter(c => c.status === 'COMPLETE').length / totalChapters;
    
    if (position < 0.3) return 'introduction';
    if (position < 0.6) return 'development';
    if (position < 0.8) return 'climax';
    return 'resolution';
  }

  /**
   * Get supervision recommendations for the overall book
   */
  async getBookRecommendations(
    chapterReviews: ChapterReview[],
    arcProgress: StoryArcProgress[]
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    const avgScore = chapterReviews.reduce((sum, r) => sum + r.overallScore, 0) / chapterReviews.length;
    const criticalIssues = chapterReviews.flatMap(r => r.issues.filter(i => i.severity === 'critical'));
    const flaggedChapters = chapterReviews.filter(r => r.flaggedForReview);
    
    if (avgScore < 70) {
      recommendations.push(`Overall book quality below target (${Math.round(avgScore)}/100) - consider comprehensive revision`);
    }
    
    if (criticalIssues.length > 0) {
      recommendations.push(`${criticalIssues.length} critical issues found - immediate attention required`);
    }
    
    if (flaggedChapters.length > 0) {
      recommendations.push(`${flaggedChapters.length} chapters flagged for review: ${flaggedChapters.map(c => c.chapterNumber).join(', ')}`);
    }
    
    // Arc-specific recommendations
    const behindArcs = arcProgress.filter(a => a.progressScore < 70);
    if (behindArcs.length > 0) {
      recommendations.push(`Character arcs need development: ${behindArcs.map(a => a.characterName).join(', ')}`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Book meets quality standards - ready for final review');
    }
    
    return recommendations;
  }

  // Phase 3: Automatic Revision Triggers
  
  /**
   * Check if current chapter review triggers automatic revision
   */
  private async checkRevisionTriggers(review: ChapterReview, chapterNumber: number): Promise<RevisionTrigger[]> {
    const triggers: RevisionTrigger[] = [];
    
    // Quality threshold trigger
    if (review.overallScore < this.autoRevisionConfig.qualityThreshold) {
      triggers.push({
        chapterNumber,
        triggerType: 'quality_threshold',
        severity: review.overallScore < 60 ? 'high' : 'medium',
        description: `Chapter quality score ${review.overallScore} below threshold ${this.autoRevisionConfig.qualityThreshold}`,
        suggestedRevisions: [
          'Enhance emotional depth',
          'Improve pacing and flow',
          'Strengthen character development',
          ...review.recommendations
        ],
        triggeredAt: new Date(),
        autoRevision: review.overallScore < 60 // Auto-revise if very low quality
      });
    }
    
    // Critical issues trigger
    const criticalIssues = review.issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0 && this.autoRevisionConfig.criticalIssueAutoRevision) {
      triggers.push({
        chapterNumber,
        triggerType: 'consistency_break',
        severity: 'critical',
        description: `${criticalIssues.length} critical issues detected`,
        suggestedRevisions: criticalIssues.map(issue => issue.suggestedFix),
        triggeredAt: new Date(),
        autoRevision: true
      });
    }
    
    // Pacing issues trigger
    if (review.pacingScore < 60) {
      triggers.push({
        chapterNumber,
        triggerType: 'pacing_issue',
        severity: 'medium',
        description: `Pacing score ${review.pacingScore} indicates flow problems`,
        suggestedRevisions: [
          'Vary sentence length and structure',
          'Add or remove transitions',
          'Balance dialogue and narrative',
          'Adjust scene pacing'
        ],
        triggeredAt: new Date(),
        autoRevision: false
      });
    }
    
    // Arc stagnation trigger (check every N chapters)
    if (chapterNumber % this.autoRevisionConfig.everyNthChapter === 0) {
      const arcStagnation = this.detectArcStagnation(chapterNumber);
      if (arcStagnation) {
        triggers.push({
          chapterNumber,
          triggerType: 'arc_stagnation',
          severity: 'medium',
          description: 'Character arc progression has stagnated',
          suggestedRevisions: [
            'Advance character development',
            'Introduce new conflicts',
            'Deepen character relationships',
            'Add arc-specific scenes'
          ],
          triggeredAt: new Date(),
          autoRevision: false
        });
      }
    }
    
    return triggers;
  }
  
  /**
   * Process revision triggers and queue revision tasks
   */
  private async processRevisionTriggers(triggers: RevisionTrigger[], chapterNumber: number): Promise<void> {
    // Store triggers in history
    if (!this.revisionHistory.has(chapterNumber)) {
      this.revisionHistory.set(chapterNumber, []);
    }
    this.revisionHistory.get(chapterNumber)!.push(...triggers);
    
    // Process each trigger
    for (const trigger of triggers) {
      // IMPROVED: More intelligent revision limit checking
      const recentRevisions = this.countRecentRevisions(chapterNumber);
      const criticalIssues = triggers.filter(t => t.severity === 'critical').length;
      
      // Allow more revisions for critical issues or if quality is improving
      const effectiveMaxRevisions = criticalIssues > 0 
        ? this.autoRevisionConfig.maxConsecutiveRevisions + 3  // Extra attempts for critical issues
        : this.autoRevisionConfig.maxConsecutiveRevisions;
        
      if (recentRevisions >= effectiveMaxRevisions) {
        console.log(`⚠️  Skipping auto-revision for chapter ${chapterNumber} - max consecutive revisions reached (${recentRevisions}/${effectiveMaxRevisions})`);
        
        // But still allow critical issue revisions if quality is very low
        if (trigger.severity === 'critical' && recentRevisions < this.autoRevisionConfig.maxConsecutiveRevisions + 5) {
          console.log(`🚨 Allowing critical revision for chapter ${chapterNumber} despite limits`);
        } else {
          continue;
        }
      }
      
      // Create revision task
      const revisionTask = this.createRevisionTask(trigger, chapterNumber);
      this.revisionQueue.push(revisionTask);
      
      console.log(`📋 Revision task queued: ${revisionTask.taskType} for chapter ${chapterNumber} (${trigger.severity} priority)`);
    }
  }
  
  /**
   * Create a revision task from a trigger
   */
  private createRevisionTask(trigger: RevisionTrigger, chapterNumber: number): RevisionTask {
    const taskId = `rev_${chapterNumber}_${Date.now()}`;
    
    let taskType: RevisionTask['taskType'];
    let priority: RevisionTask['priority'];
    let estimatedEffort: RevisionTask['estimatedEffort'];
    
    switch (trigger.triggerType) {
      case 'quality_threshold':
        taskType = trigger.severity === 'high' ? 'full_revision' : 'quality_enhancement';
        priority = trigger.severity as RevisionTask['priority'];
        estimatedEffort = trigger.severity === 'high' ? 'high' : 'medium';
        break;
      case 'consistency_break':
        taskType = 'section_revision';
        priority = 'critical';
        estimatedEffort = 'medium';
        break;
      case 'pacing_issue':
        taskType = 'quality_enhancement';
        priority = 'medium';
        estimatedEffort = 'low';
        break;
      case 'arc_stagnation':
        taskType = 'arc_adjustment';
        priority = 'medium';
        estimatedEffort = 'medium';
        break;
      default:
        taskType = 'quality_enhancement';
        priority = 'medium';
        estimatedEffort = 'medium';
    }
    
    return {
      id: taskId,
      chapterNumber,
      priority,
      taskType,
      description: trigger.description,
      createdAt: new Date(),
      estimatedEffort,
      dependencies: []
    };
  }
  
  /**
   * Detect if character arcs have stagnated
   */
  private detectArcStagnation(chapterNumber: number): boolean {
    // Simple heuristic: if quality scores haven't improved in recent chapters
    const recentScores = this.qualityHistory
      .filter(h => h.chapterNumber >= chapterNumber - 3 && h.chapterNumber <= chapterNumber)
      .map(h => h.score);
    
    if (recentScores.length < 2) return false;
    
    const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const trend = recentScores[recentScores.length - 1] - recentScores[0];
    
    return avgRecent < 75 && trend <= 0; // Stagnant if low quality and no improvement
  }
  
  /**
   * Count recent revisions for a chapter to prevent infinite loops
   * IMPROVED: More intelligent counting with quality-aware thresholds
   */
  private countRecentRevisions(chapterNumber: number): number {
    const triggers = this.revisionHistory.get(chapterNumber) || [];
    
    // Use a more reasonable time window: 2 hours for active development
    const timeWindow = 2 * 60 * 60 * 1000; // 2 hours instead of 24 hours
    const recentTriggers = triggers.filter(t => 
      Date.now() - t.triggeredAt.getTime() < timeWindow
    );
    
    // SMARTER COUNTING: Only count actual revision attempts, not just triggers
    // Filter out duplicate triggers of the same type within short time periods
    const uniqueRevisions = new Map<string, RevisionTrigger>();
    
    for (const trigger of recentTriggers) {
      const key = `${trigger.triggerType}_${trigger.severity}`;
      const existing = uniqueRevisions.get(key);
      
      // Only count if it's a new type or significantly newer
      if (!existing || trigger.triggeredAt.getTime() - existing.triggeredAt.getTime() > 10 * 60 * 1000) {
        uniqueRevisions.set(key, trigger);
      }
    }
    
    console.log(`📊 Chapter ${chapterNumber} revision count: ${uniqueRevisions.size} unique revisions in last 2 hours`);
    return uniqueRevisions.size;
  }
  
  /**
   * Get current supervision summary with revision queue
   */
  async getSupervisionSummary(chapterReviews: ChapterReview[]): Promise<SupervisionSummary> {
    const overallQuality = chapterReviews.reduce((sum, r) => sum + r.overallScore, 0) / chapterReviews.length;
    const criticalIssuesCount = chapterReviews.flatMap(r => r.issues.filter(i => i.severity === 'critical')).length;
    
    // Calculate quality trend
    const qualityTrend = this.calculateQualityTrend();
    
    // Get all revision triggers
    const allTriggers = Array.from(this.revisionHistory.values()).flat();
    
    // Generate recommendations
    const recommendedActions = [];
    if (this.revisionQueue.length > 0) {
      recommendedActions.push(`${this.revisionQueue.length} revision tasks pending`);
    }
    if (criticalIssuesCount > 0) {
      recommendedActions.push(`${criticalIssuesCount} critical issues require immediate attention`);
    }
    if (qualityTrend === 'declining') {
      recommendedActions.push('Quality trend is declining - consider comprehensive review');
    }
    
    return {
      overallQuality,
      revisionTriggers: allTriggers,
      revisionQueue: this.revisionQueue,
      qualityTrend,
      criticalIssuesCount,
      recommendedActions
    };
  }
  
  /**
   * Calculate quality trend from history
   */
  private calculateQualityTrend(): 'improving' | 'stable' | 'declining' {
    if (this.qualityHistory.length < 3) return 'stable';
    
    const recent = this.qualityHistory.slice(-3);
    const scores = recent.map(h => h.score);
    
    const trend = scores[scores.length - 1] - scores[0];
    
    if (trend > 5) return 'improving';
    if (trend < -5) return 'declining';
    return 'stable';
  }
  
  /**
   * Clear completed revision tasks
   */
  clearCompletedRevisions(completedTaskIds: string[]): void {
    this.revisionQueue = this.revisionQueue.filter(task => !completedTaskIds.includes(task.id));
  }
  
  /**
   * Get pending revision tasks for a specific chapter
   */
  getPendingRevisions(chapterNumber: number): RevisionTask[] {
    return this.revisionQueue.filter(task => task.chapterNumber === chapterNumber);
  }
  
  /**
   * Update auto-revision configuration
   */
  updateAutoRevisionConfig(config: Partial<AutoRevisionConfig>): void {
    this.autoRevisionConfig = { ...this.autoRevisionConfig, ...config };
  }
} 