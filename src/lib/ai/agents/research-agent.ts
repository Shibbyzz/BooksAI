import { generateAIText } from '@/lib/openai';
import type { BookSettings } from '@/types';
import { researchPrompts } from '../prompts/research-prompts';
import { 
  ResearchResultSchema, 
  ResearchTopicsSchema, 
  ComprehensiveResearchSchema,
  type ResearchTopic,
  type ResearchResult,
  type ComprehensiveResearch,
  type ResearchTopics
} from '../validators/research';
import { z } from 'zod';

export interface ResearchAgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  maxRetries: number;
  retryDelay: number;
}

export class ResearchAgent {
  private config: ResearchAgentConfig;

  constructor(config?: Partial<ResearchAgentConfig>) {
    this.config = {
      model: 'gpt-3.5-turbo',
      temperature: 0.3, // Low temperature for factual accuracy
      maxTokens: 3000,
      maxRetries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  /**
   * Utility to run operations with retry logic
   */
  private async runWithRetry<T>(
    operation: () => Promise<T>,
    label: string,
    maxRetries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`${label} (attempt ${attempt}/${maxRetries})`);
        const result = await operation();
        if (attempt > 1) {
          console.log(`${label} succeeded on attempt ${attempt}`);
        }
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`${label} failed on attempt ${attempt}:`, lastError.message);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
        }
      }
    }
    
    throw new Error(`${label} failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Conduct comprehensive upfront research for the entire book
   */
  async conductComprehensiveResearch(
    userPrompt: string,
    backCover: string,
    settings: BookSettings
  ): Promise<ComprehensiveResearch> {
    try {
      console.log('Starting comprehensive research phase...');
      
      // Identify research topics from the story concept
      const researchTopics = await this.runWithRetry(
        () => this.identifyResearchTopics(userPrompt, backCover, settings),
        'Identifying research topics'
      );
      
      // Conduct research in parallel for efficiency
      const [
        domainKnowledge,
        characterBackgrounds,
        settingDetails,
        technicalAspects,
        culturalContext
      ] = await Promise.all([
        this.runWithRetry(
          () => this.researchDomainKnowledge(researchTopics.domain, settings),
          'Researching domain knowledge'
        ),
        this.runWithRetry(
          () => this.researchCharacterBackgrounds(researchTopics.characters, settings),
          'Researching character backgrounds'
        ),
        this.runWithRetry(
          () => this.researchSettingDetails(researchTopics.settings, settings),
          'Researching setting details'
        ),
        this.runWithRetry(
          () => this.researchTechnicalAspects(researchTopics.technical, settings),
          'Researching technical aspects'
        ),
        this.runWithRetry(
          () => this.researchCulturalContext(researchTopics.cultural, settings),
          'Researching cultural context'
        )
      ]);

      const result = {
        domainKnowledge,
        characterBackgrounds,
        settingDetails,
        technicalAspects,
        culturalContext
      };

      // Validate the comprehensive research result
      const validatedResult = ComprehensiveResearchSchema.parse(result);
      
      console.log('Comprehensive research completed successfully');
      return validatedResult;
    } catch (error) {
      console.error('Error in comprehensive research:', error);
      throw new Error(`Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Conduct targeted research for specific scenes or details
   */
  async conductTargetedResearch(
    topic: string,
    context: string,
    existingResearch: ComprehensiveResearch
  ): Promise<ResearchResult> {
    try {
      console.log(`Conducting targeted research for: ${topic}`);
      
      const result = await this.runWithRetry(async () => {
        const relevantResearch = this.findRelevantResearch(topic, existingResearch);
        const relevantSummary = relevantResearch.slice(0, 3)
          .map(r => `- ${r.topic}: ${r.facts.slice(0, 2).join('; ')}`)
          .join('\n');
        
        const prompt = researchPrompts.targetedResearch(topic, context, relevantSummary);
        
        const response = await generateAIText(prompt, {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
          system: 'You are a professional researcher. Provide accurate, detailed, and verifiable information. Focus on facts that would be relevant for storytelling. Always note any uncertainties or contradictions.'
        });

        return this.parseResearchResponse(response.text, topic);
      }, `Targeted research for ${topic}`);

      // Validate the result
      return ResearchResultSchema.parse(result);
    } catch (error) {
      console.error('Error in targeted research:', error);
      throw new Error(`Targeted research failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Identify key research topics from the story concept
   */
  private async identifyResearchTopics(
    userPrompt: string,
    backCover: string,
    settings: BookSettings
  ): Promise<ResearchTopics> {
    const prompt = researchPrompts.identifyTopics(userPrompt, backCover, settings);

    const response = await generateAIText(prompt, {
      model: this.config.model,
      temperature: 0.2,
      maxTokens: 2000,
      system: 'You are a story analyst identifying research needs. Respond with valid JSON only.'
    });

    try {
      // Clean and parse JSON response
      let cleanContent = response.text.trim();
      if (cleanContent.startsWith('```')) {
        const firstNewline = cleanContent.indexOf('\n');
        const lastBackticks = cleanContent.lastIndexOf('```');
        if (firstNewline !== -1 && lastBackticks > firstNewline) {
          cleanContent = cleanContent.substring(firstNewline + 1, lastBackticks).trim();
        }
      }
      
      const parsed = JSON.parse(cleanContent);
      
      // Transform capitalized keys to lowercase schema format
      const transformedTopics = this.transformResearchTopicsFormat(parsed);
      
      return ResearchTopicsSchema.parse(transformedTopics);
    } catch (parseError) {
      console.error('Error parsing research topics:', parseError);
      console.error('Raw response:', response.text);
      console.error('Reason for fallback: Invalid JSON structure or missing required fields');
      
      // Fallback to basic research topics
      return this.generateFallbackResearchTopics(settings);
    }
  }

  /**
   * Transform AI response format to match schema expectations
   */
  private transformResearchTopicsFormat(parsed: any): ResearchTopics {
    // Handle both capitalized keys and correct format
    const mapping: { [key: string]: keyof ResearchTopics } = {
      'DOMAIN KNOWLEDGE': 'domain',
      'domain': 'domain',
      'CHARACTER BACKGROUNDS': 'characters',
      'characters': 'characters',
      'SETTING DETAILS': 'settings',
      'settings': 'settings',
      'TECHNICAL ASPECTS': 'technical',
      'technical': 'technical',
      'CULTURAL CONTEXT': 'cultural',
      'cultural': 'cultural'
    };

    const result: Partial<ResearchTopics> = {
      domain: [],
      characters: [],
      settings: [],
      technical: [],
      cultural: []
    };

    // Transform each field from AI response
    for (const [aiKey, schemaKey] of Object.entries(mapping)) {
      if (parsed[aiKey]) {
        if (Array.isArray(parsed[aiKey])) {
          result[schemaKey] = parsed[aiKey];
        } else if (typeof parsed[aiKey] === 'object') {
          // Convert object format to array format
          const item = {
            topic: parsed[aiKey].topic || schemaKey,
            priority: parsed[aiKey].Priority?.toLowerCase() || 'medium',
            scope: parsed[aiKey].Scope?.toLowerCase() || 'broad',
            context: parsed[aiKey]['Why it\'s important for the story'] || `Research for ${schemaKey}`
          };
          result[schemaKey] = [item];
        }
      }
    }

    return result as ResearchTopics;
  }

  /**
   * Research domain-specific knowledge
   */
  private async researchDomainKnowledge(
    topics: ResearchTopic[],
    settings: BookSettings
  ): Promise<ResearchResult[]> {
    if (!topics || topics.length === 0) {
      return [];
    }

    const researchPromises = topics.map(async (topic) => {
      try {
        const prompt = researchPrompts.domainKnowledge(topic.topic, topic.context, settings);

        const response = await generateAIText(prompt, {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: 2000,
          system: 'You are a subject matter expert providing research for creative writing. Be accurate and detailed.'
        });

        const result = this.parseResearchResponse(response.text, topic.topic);
        return ResearchResultSchema.parse(result);
      } catch (error) {
        console.error(`Error researching domain topic ${topic.topic}:`, error);
        return ResearchResultSchema.parse({
          topic: topic.topic,
          facts: [`Research failed for ${topic.topic}`],
          sources: [],
          keyDetails: {},
          contradictions: [],
          uncertainties: []
        });
      }
    });

    return Promise.all(researchPromises);
  }

  /**
   * Research character backgrounds and professions
   */
  private async researchCharacterBackgrounds(
    topics: ResearchTopic[],
    settings: BookSettings
  ): Promise<ResearchResult[]> {
    if (!topics || topics.length === 0) {
      return [];
    }

    const researchPromises = topics.map(async (topic) => {
      try {
        const prompt = researchPrompts.characterBackgrounds(topic.topic, topic.context, settings);

        const response = await generateAIText(prompt, {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: 1500
        });

        const result = this.parseResearchResponse(response.text, topic.topic);
        return ResearchResultSchema.parse(result);
      } catch (error) {
        console.error(`Error researching character topic ${topic.topic}:`, error);
        return ResearchResultSchema.parse({
          topic: topic.topic,
          facts: [`Character research failed for ${topic.topic}`],
          sources: [],
          keyDetails: {},
          contradictions: [],
          uncertainties: []
        });
      }
    });

    return Promise.all(researchPromises);
  }

  /**
   * Research setting and location details
   */
  private async researchSettingDetails(
    topics: ResearchTopic[],
    settings: BookSettings
  ): Promise<ResearchResult[]> {
    if (!topics || topics.length === 0) {
      return [];
    }

    const researchPromises = topics.map(async (topic) => {
      try {
        const prompt = researchPrompts.settingDetails(topic.topic, topic.context, settings);

        const response = await generateAIText(prompt, {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: 1500
        });

        const result = this.parseResearchResponse(response.text, topic.topic);
        return ResearchResultSchema.parse(result);
      } catch (error) {
        console.error(`Error researching setting topic ${topic.topic}:`, error);
        return ResearchResultSchema.parse({
          topic: topic.topic,
          facts: [`Setting research failed for ${topic.topic}`],
          sources: [],
          keyDetails: {},
          contradictions: [],
          uncertainties: []
        });
      }
    });

    return Promise.all(researchPromises);
  }

  /**
   * Research technical aspects and specialized knowledge
   */
  private async researchTechnicalAspects(
    topics: ResearchTopic[],
    settings: BookSettings
  ): Promise<ResearchResult[]> {
    if (!topics || topics.length === 0) {
      return [];
    }

    const researchPromises = topics.map(async (topic) => {
      try {
        const prompt = researchPrompts.technicalAspects(topic.topic, topic.context, settings);

        const response = await generateAIText(prompt, {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: 2000
        });

        const result = this.parseResearchResponse(response.text, topic.topic);
        return ResearchResultSchema.parse(result);
      } catch (error) {
        console.error(`Error researching technical topic ${topic.topic}:`, error);
        return ResearchResultSchema.parse({
          topic: topic.topic,
          facts: [`Technical research failed for ${topic.topic}`],
          sources: [],
          keyDetails: {},
          contradictions: [],
          uncertainties: []
        });
      }
    });

    return Promise.all(researchPromises);
  }

  /**
   * Research cultural context and social aspects
   */
  private async researchCulturalContext(
    topics: ResearchTopic[],
    settings: BookSettings
  ): Promise<ResearchResult[]> {
    if (!topics || topics.length === 0) {
      return [];
    }

    const researchPromises = topics.map(async (topic) => {
      try {
        const prompt = researchPrompts.culturalContext(topic.topic, topic.context, settings);

        const response = await generateAIText(prompt, {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: 1500
        });

        const result = this.parseResearchResponse(response.text, topic.topic);
        return ResearchResultSchema.parse(result);
      } catch (error) {
        console.error(`Error researching cultural topic ${topic.topic}:`, error);
        return ResearchResultSchema.parse({
          topic: topic.topic,
          facts: [`Cultural research failed for ${topic.topic}`],
          sources: [],
          keyDetails: {},
          contradictions: [],
          uncertainties: []
        });
      }
    });

    return Promise.all(researchPromises);
  }

  /**
   * Parse research response into structured format with sanitization
   */
  private parseResearchResponse(responseText: string, topic: string): ResearchResult {
    // Remove markdown formatting
    const cleanText = responseText
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/^\s*[-*+]\s/gm, '') // Remove list markers
      .replace(/^\s*\d+\.\s/gm, ''); // Remove numbered list markers

    const lines = cleanText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    const facts: string[] = [];
    const sources: string[] = [];
    const contradictions: string[] = [];
    const uncertainties: string[] = [];
    const keyDetails: { [key: string]: string } = {};
    
    let currentSection = '';
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Detect sections
      if (lowerLine.includes('source') || lowerLine.includes('reference')) {
        currentSection = 'sources';
        continue;
      } else if (lowerLine.includes('contradiction')) {
        currentSection = 'contradictions';
        continue;
      } else if (lowerLine.includes('uncertain') || lowerLine.includes('unknown')) {
        currentSection = 'uncertainties';
        continue;
      }
      
      // Parse content based on current section
      if (currentSection === 'sources') {
        if (line.length > 10) { // Ignore very short lines
          sources.push(line);
        }
      } else if (currentSection === 'contradictions') {
        if (line.length > 10) {
          contradictions.push(line);
        }
      } else if (currentSection === 'uncertainties') {
        if (line.length > 10) {
          uncertainties.push(line);
        }
      } else {
        // Default to facts or key details
        if (line.match(/^\d+\./)) {
          // Numbered fact
          const fact = line.replace(/^\d+\.\s*/, '');
          if (fact.length > 0) {
            facts.push(fact);
          }
        } else if (line.includes(':') && !line.includes('http')) {
          // Key-value pair (but not URLs)
          const [key, ...valueParts] = line.split(':');
          const value = valueParts.join(':').trim();
          if (key && value && key.trim().length > 0 && value.length > 0) {
            keyDetails[key.trim()] = value;
          }
        } else if (line.length > 10) {
          // General fact
          facts.push(line);
        }
      }
    }
    
    // Deduplicate and clean arrays
    const uniqueFacts = Array.from(new Set(facts));
    const uniqueSources = Array.from(new Set(sources));
    const uniqueContradictions = Array.from(new Set(contradictions));
    const uniqueUncertainties = Array.from(new Set(uncertainties));
    
    return {
      topic,
      facts: uniqueFacts,
      sources: uniqueSources,
      keyDetails,
      contradictions: uniqueContradictions,
      uncertainties: uniqueUncertainties
    };
  }

  /**
   * Find relevant existing research for a topic
   */
  private findRelevantResearch(
    topic: string,
    research: ComprehensiveResearch
  ): ResearchResult[] {
    const allResearch = [
      ...research.domainKnowledge,
      ...research.characterBackgrounds,
      ...research.settingDetails,
      ...research.technicalAspects,
      ...research.culturalContext
    ];

    // Simple relevance matching - could be enhanced with more sophisticated matching
    return allResearch.filter(r => 
      r.topic.toLowerCase().includes(topic.toLowerCase()) ||
      topic.toLowerCase().includes(r.topic.toLowerCase()) ||
      r.facts.some(fact => fact.toLowerCase().includes(topic.toLowerCase()))
    );
  }

  /**
   * Generate fallback research topics if AI parsing fails
   */
  private generateFallbackResearchTopics(settings: BookSettings): ResearchTopics {
    return {
      domain: [
        {
          topic: settings.genre,
          priority: 'high' as const,
          scope: 'broad' as const,
          context: `General ${settings.genre} genre conventions and expectations`
        }
      ],
      characters: [
        {
          topic: 'Character development',
          priority: 'medium' as const,
          scope: 'broad' as const,
          context: 'Character backgrounds and motivations'
        }
      ],
      settings: [
        {
          topic: 'Story setting',
          priority: 'medium' as const,
          scope: 'broad' as const,
          context: 'Environment and world-building details'
        }
      ],
      technical: [],
      cultural: []
    };
  }

  /**
   * Get configuration
   */
  getConfig(): ResearchAgentConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ResearchAgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
} 