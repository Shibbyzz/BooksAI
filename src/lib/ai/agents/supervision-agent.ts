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

export class SupervisionAgent {
  private config: SupervisionConfig;
  private openai: OpenAI;

  constructor(config: SupervisionConfig) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
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

      // Parse AI response
      const aiReview = JSON.parse(content_text);
      
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
} 