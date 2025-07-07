import { SubscriptionTier } from '@prisma/client';
import { UsageTracker } from './usage-tracker';

export interface AIAgentAccess {
  planningAgent: boolean;
  writingAgent: boolean;
  researchAgent: boolean;
  chiefEditorAgent: boolean;
  continuityInspectorAgent: boolean;
  supervisionAgent: boolean;
  proofreaderAgent: boolean;
  humanQualityEnhancer: boolean;
  sectionTransitionAgent: boolean;
  writerDirector: boolean;
}

export interface FeatureAccess {
  aiAgents: AIAgentAccess;
  models: {
    gpt4o: boolean;
    gpt4oMini: boolean;
    gpt35Turbo: boolean;
  };
  features: {
    researchIntegration: boolean;
    continuityChecking: boolean;
    qualityEnhancement: boolean;
    strategicPlanning: boolean;
    advancedProofreading: boolean;
    specializedWriting: boolean;
    backgroundGeneration: boolean;
    priorityQueue: boolean;
    checkpointResume: boolean;
  };
  exports: {
    formats: string[];
    commercialRights: boolean;
    bulkExport: boolean;
    customFormatting: boolean;
  };
  limits: {
    booksPerMonth: number;
    wordsPerMonth: number;
    maxWordsPerBook: number;
    dailyBookLimit: number;
  };
}

export class TierValidator {
  private static readonly TIER_ACCESS: Record<SubscriptionTier, FeatureAccess> = {
    FREE: {
      aiAgents: {
        planningAgent: true,        // Core book planning
        writingAgent: true,         // Basic section writing
        researchAgent: false,       // Premium feature
        chiefEditorAgent: false,    // Premium feature
        continuityInspectorAgent: false,  // Premium feature
        supervisionAgent: false,    // Premium feature
        proofreaderAgent: false,    // Basic+ feature
        humanQualityEnhancer: false, // Premium feature
        sectionTransitionAgent: false, // Premium feature
        writerDirector: false       // Basic+ feature
      },
      models: {
        gpt4o: false,              // Premium only
        gpt4oMini: true,           // Available to all
        gpt35Turbo: true           // Available to all
      },
      features: {
        researchIntegration: false,
        continuityChecking: false,
        qualityEnhancement: false,
        strategicPlanning: false,
        advancedProofreading: false,
        specializedWriting: false,
        backgroundGeneration: true,   // Available to all
        priorityQueue: false,
        checkpointResume: true        // Available to all
      },
      exports: {
        formats: ['txt'],
        commercialRights: false,
        bulkExport: false,
        customFormatting: false
      },
      limits: {
        booksPerMonth: 3,
        wordsPerMonth: 150000,
        maxWordsPerBook: 50000,
        dailyBookLimit: 1
      }
    },
    BASIC: {
      aiAgents: {
        planningAgent: true,
        writingAgent: true,
        researchAgent: false,       // Still premium
        chiefEditorAgent: false,    // Still premium
        continuityInspectorAgent: false,  // Still premium
        supervisionAgent: false,    // Still premium
        proofreaderAgent: true,     // Basic+ feature
        humanQualityEnhancer: false, // Still premium
        sectionTransitionAgent: false, // Still premium
        writerDirector: true        // Basic+ feature
      },
      models: {
        gpt4o: false,              // Still premium only
        gpt4oMini: true,
        gpt35Turbo: true
      },
      features: {
        researchIntegration: false,
        continuityChecking: false,
        qualityEnhancement: false,
        strategicPlanning: false,
        advancedProofreading: true,   // Basic+ feature
        specializedWriting: true,     // Basic+ feature
        backgroundGeneration: true,
        priorityQueue: true,          // Normal priority
        checkpointResume: true
      },
      exports: {
        formats: ['txt', 'pdf'],
        commercialRights: false,
        bulkExport: false,
        customFormatting: true
      },
      limits: {
        booksPerMonth: 10,
        wordsPerMonth: 750000,
        maxWordsPerBook: 75000,
        dailyBookLimit: 3
      }
    },
    PREMIUM: {
      aiAgents: {
        planningAgent: true,
        writingAgent: true,
        researchAgent: true,        // Premium feature
        chiefEditorAgent: true,     // Premium feature
        continuityInspectorAgent: true,   // Premium feature
        supervisionAgent: true,     // Premium feature
        proofreaderAgent: true,
        humanQualityEnhancer: true, // Premium feature
        sectionTransitionAgent: true, // Premium feature
        writerDirector: true
      },
      models: {
        gpt4o: true,               // Premium feature
        gpt4oMini: true,
        gpt35Turbo: true
      },
      features: {
        researchIntegration: true,     // Premium feature
        continuityChecking: true,      // Premium feature
        qualityEnhancement: true,      // Premium feature
        strategicPlanning: true,       // Premium feature
        advancedProofreading: true,
        specializedWriting: true,
        backgroundGeneration: true,
        priorityQueue: true,           // High priority
        checkpointResume: true
      },
      exports: {
        formats: ['txt', 'pdf', 'epub', 'docx', 'mobi'],
        commercialRights: true,        // Premium feature
        bulkExport: true,              // Premium feature
        customFormatting: true
      },
      limits: {
        booksPerMonth: 25,
        wordsPerMonth: 5000000,
        maxWordsPerBook: 200000,
        dailyBookLimit: 2
      }
    }
  };

  /**
   * Get feature access for a subscription tier
   */
  static getFeatureAccess(tier: SubscriptionTier): FeatureAccess {
    return this.TIER_ACCESS[tier];
  }

  /**
   * Check if a specific AI agent is available for a tier
   */
  static hasAgentAccess(tier: SubscriptionTier, agentName: keyof AIAgentAccess): boolean {
    return this.TIER_ACCESS[tier].aiAgents[agentName];
  }

  /**
   * Check if a specific model is available for a tier
   */
  static hasModelAccess(tier: SubscriptionTier, modelName: string): boolean {
    const access = this.TIER_ACCESS[tier].models;
    
    // Normalize model names
    const normalizedModel = modelName.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    if (normalizedModel.includes('gpt4o') && !normalizedModel.includes('mini')) {
      return access.gpt4o;
    } else if (normalizedModel.includes('gpt4omini')) {
      return access.gpt4oMini;
    } else if (normalizedModel.includes('gpt35turbo')) {
      return access.gpt35Turbo;
    }
    
    // Default to most restrictive access
    return access.gpt35Turbo;
  }

  /**
   * Check if an export format is available for a tier
   */
  static hasExportAccess(tier: SubscriptionTier, format: string): boolean {
    return this.TIER_ACCESS[tier].exports.formats.includes(format.toLowerCase());
  }

  /**
   * Check if user has commercial rights
   */
  static hasCommercialRights(tier: SubscriptionTier): boolean {
    return this.TIER_ACCESS[tier].exports.commercialRights;
  }

  /**
   * Get queue priority for a tier
   */
  static getQueuePriority(tier: SubscriptionTier): 'low' | 'normal' | 'high' {
    const tierLimits = UsageTracker.getTierLimits(tier);
    return tierLimits.queuePriority;
  }

  /**
   * Check if a feature is available for a tier
   */
  static hasFeatureAccess(tier: SubscriptionTier, featureName: keyof FeatureAccess['features']): boolean {
    return this.TIER_ACCESS[tier].features[featureName];
  }

  /**
   * Get optimal AI configuration for a tier
   */
  static getOptimalAIConfig(tier: SubscriptionTier): {
    preferredModels: string[];
    enabledAgents: string[];
    restrictions: string[];
  } {
    const access = this.getFeatureAccess(tier);
    
    const preferredModels: string[] = [];
    if (access.models.gpt4o) preferredModels.push('gpt-4o');
    if (access.models.gpt4oMini) preferredModels.push('gpt-4o-mini');
    if (access.models.gpt35Turbo) preferredModels.push('gpt-3.5-turbo');

    const enabledAgents: string[] = [];
    Object.entries(access.aiAgents).forEach(([agent, enabled]) => {
      if (enabled) enabledAgents.push(agent);
    });

    const restrictions: string[] = [];
    if (!access.features.researchIntegration) restrictions.push('research');
    if (!access.features.continuityChecking) restrictions.push('continuity');
    if (!access.features.qualityEnhancement) restrictions.push('quality');
    if (!access.features.strategicPlanning) restrictions.push('planning');

    return {
      preferredModels,
      enabledAgents,
      restrictions
    };
  }

  /**
   * Validate if a generation request is allowed for a tier
   */
  static validateGenerationRequest(
    tier: SubscriptionTier,
    request: {
      wordCount?: number;
      useResearch?: boolean;
      useContinuity?: boolean;
      useQualityEnhancement?: boolean;
      useStrategicPlanning?: boolean;
      model?: string;
    }
  ): {
    allowed: boolean;
    reasons: string[];
    upgradeRequired: boolean;
    allowedAlternatives?: string[];
  } {
    const access = this.getFeatureAccess(tier);
    const reasons: string[] = [];
    let upgradeRequired = false;

    // Check word count limits
    if (request.wordCount && request.wordCount > access.limits.maxWordsPerBook) {
      reasons.push(`Book too long (${request.wordCount} words, max ${access.limits.maxWordsPerBook})`);
      upgradeRequired = true;
    }

    // Check feature access
    if (request.useResearch && !access.features.researchIntegration) {
      reasons.push('Research integration requires Premium subscription');
      upgradeRequired = true;
    }

    if (request.useContinuity && !access.features.continuityChecking) {
      reasons.push('Continuity checking requires Premium subscription');
      upgradeRequired = true;
    }

    if (request.useQualityEnhancement && !access.features.qualityEnhancement) {
      reasons.push('Quality enhancement requires Premium subscription');
      upgradeRequired = true;
    }

    if (request.useStrategicPlanning && !access.features.strategicPlanning) {
      reasons.push('Strategic planning requires Premium subscription');
      upgradeRequired = true;
    }

    // Check model access
    if (request.model && !this.hasModelAccess(tier, request.model)) {
      reasons.push(`Model ${request.model} requires higher subscription tier`);
      upgradeRequired = true;
    }

    const allowedAlternatives: string[] = [];
    if (reasons.length > 0) {
      // Suggest available alternatives
      if (access.aiAgents.planningAgent) allowedAlternatives.push('Basic planning');
      if (access.aiAgents.writingAgent) allowedAlternatives.push('Section writing');
      if (access.aiAgents.proofreaderAgent) allowedAlternatives.push('Proofreading');
      if (access.aiAgents.writerDirector) allowedAlternatives.push('Specialized writing');
    }

    return {
      allowed: reasons.length === 0,
      reasons,
      upgradeRequired,
      allowedAlternatives: allowedAlternatives.length > 0 ? allowedAlternatives : undefined
    };
  }

  /**
   * Get upgrade suggestions for a tier
   */
  static getUpgradeSuggestions(currentTier: SubscriptionTier): {
    nextTier?: SubscriptionTier;
    benefits: string[];
    price: string;
  } | null {
    switch (currentTier) {
      case 'FREE':
        return {
          nextTier: 'BASIC',
          benefits: [
            '10 books per month (vs 3)',
            '75,000 words per book (vs 50,000)',
            'Advanced proofreading',
            'Specialized writing modes',
            'PDF export',
            'Normal queue priority'
          ],
          price: '$9/month'
        };
      
      case 'BASIC':
        return {
          nextTier: 'PREMIUM',
          benefits: [
            '25 books per month (vs 10)',
            '200,000 words per book (vs 75,000)',
            'Research integration',
            'Continuity checking',
            'Quality enhancement',
            'Strategic planning',
            'All export formats',
            'Commercial rights',
            'High priority queue'
          ],
          price: '$24/month'
        };
      
      case 'PREMIUM':
        return null; // Already at highest tier
      
      default:
        return null;
    }
  }
}

// Export singleton-like static access
export const tierValidator = TierValidator; 