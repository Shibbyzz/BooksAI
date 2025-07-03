import { generateAIText } from '@/lib/openai';
import type { BookSettings } from '@/types';

export interface ResearchAgentConfig {
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ResearchTopic {
  topic: string;
  priority: 'high' | 'medium' | 'low';
  scope: 'broad' | 'specific';
  context: string;
}

export interface ResearchResult {
  topic: string;
  facts: string[];
  sources: string[];
  keyDetails: {
    [key: string]: string;
  };
  contradictions: string[];
  uncertainties: string[];
}

export interface ComprehensiveResearch {
  domainKnowledge: ResearchResult[];
  characterBackgrounds: ResearchResult[];
  settingDetails: ResearchResult[];
  technicalAspects: ResearchResult[];
  culturalContext: ResearchResult[];
}

export class ResearchAgent {
  private config: ResearchAgentConfig;

  constructor(config?: Partial<ResearchAgentConfig>) {
    this.config = {
      model: 'gpt-3.5-turbo',
      temperature: 0.3, // Low temperature for factual accuracy
      maxTokens: 3000,
      ...config
    };
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
      const researchTopics = await this.identifyResearchTopics(userPrompt, backCover, settings);
      
      // Conduct research in parallel for efficiency
      const [
        domainKnowledge,
        characterBackgrounds,
        settingDetails,
        technicalAspects,
        culturalContext
      ] = await Promise.all([
        this.researchDomainKnowledge(researchTopics.domain, settings),
        this.researchCharacterBackgrounds(researchTopics.characters, settings),
        this.researchSettingDetails(researchTopics.settings, settings),
        this.researchTechnicalAspects(researchTopics.technical, settings),
        this.researchCulturalContext(researchTopics.cultural, settings)
      ]);

      console.log('Comprehensive research completed');
      
      return {
        domainKnowledge,
        characterBackgrounds,
        settingDetails,
        technicalAspects,
        culturalContext
      };
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
      
      const prompt = this.buildTargetedResearchPrompt(topic, context, existingResearch);
      
      const response = await generateAIText(prompt, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens,
        system: 'You are a professional researcher. Provide accurate, detailed, and verifiable information. Focus on facts that would be relevant for storytelling. Always note any uncertainties or contradictions.'
      });

      return this.parseResearchResponse(response.text, topic);
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
  ): Promise<{
    domain: ResearchTopic[];
    characters: ResearchTopic[];
    settings: ResearchTopic[];
    technical: ResearchTopic[];
    cultural: ResearchTopic[];
  }> {
    const prompt = `
Analyze this story concept and identify key research topics:

USER PROMPT: ${userPrompt}
BACK COVER: ${backCover}
GENRE: ${settings.genre}
TARGET AUDIENCE: ${settings.targetAudience}

Identify research topics in these categories:
1. DOMAIN KNOWLEDGE (core subject matter - e.g., Mars exploration, Medieval history, Medical procedures)
2. CHARACTER BACKGROUNDS (professions, skills, backgrounds mentioned)
3. SETTING DETAILS (locations, time periods, environments)
4. TECHNICAL ASPECTS (technology, science, specialized knowledge)
5. CULTURAL CONTEXT (social norms, customs, historical context)

For each topic, specify:
- Priority (high/medium/low)
- Scope (broad/specific)
- Why it's important for the story

Respond in JSON format with the five categories above.`;

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
      
      return JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Error parsing research topics:', parseError);
      // Fallback to basic research topics
      return this.generateFallbackResearchTopics(settings);
    }
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
        const prompt = `
Research the following topic for a ${settings.genre} book:

TOPIC: ${topic.topic}
CONTEXT: ${topic.context}
PRIORITY: ${topic.priority}

Provide comprehensive information including:
1. Key facts and details
2. Common misconceptions
3. Important nuances
4. Storytelling opportunities
5. Potential contradictions to avoid

Focus on information that would help an author write authentically about this topic.
Be specific and detailed, but concise.`;

        const response = await generateAIText(prompt, {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: 2000,
          system: 'You are a subject matter expert providing research for creative writing. Be accurate and detailed.'
        });

        return this.parseResearchResponse(response.text, topic.topic);
      } catch (error) {
        console.error(`Error researching domain topic ${topic.topic}:`, error);
        return {
          topic: topic.topic,
          facts: [`Research failed for ${topic.topic}`],
          sources: [],
          keyDetails: {},
          contradictions: [],
          uncertainties: []
        };
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
        const prompt = `
Research character background information for a ${settings.genre} story:

CHARACTER TYPE/PROFESSION: ${topic.topic}
STORY CONTEXT: ${topic.context}

Provide detailed information about:
1. Typical daily life and responsibilities
2. Required skills and training
3. Common personality traits and motivations
4. Professional jargon and terminology
5. Challenges and conflicts inherent to this role
6. Social status and relationships

This information will be used to create authentic character portrayals.`;

        const response = await generateAIText(prompt, {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: 1500
        });

        return this.parseResearchResponse(response.text, topic.topic);
      } catch (error) {
        console.error(`Error researching character topic ${topic.topic}:`, error);
        return {
          topic: topic.topic,
          facts: [`Character research failed for ${topic.topic}`],
          sources: [],
          keyDetails: {},
          contradictions: [],
          uncertainties: []
        };
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
        const prompt = `
Research location/setting information for a ${settings.genre} story:

LOCATION/SETTING: ${topic.topic}
STORY CONTEXT: ${topic.context}

Provide detailed information about:
1. Physical characteristics and geography
2. Climate and environmental conditions
3. Cultural and social aspects
4. Historical significance
5. Sensory details (sounds, smells, atmosphere)
6. Unique features or notable landmarks

Focus on details that would help create vivid, immersive scenes.`;

        const response = await generateAIText(prompt, {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: 1500
        });

        return this.parseResearchResponse(response.text, topic.topic);
      } catch (error) {
        console.error(`Error researching setting topic ${topic.topic}:`, error);
        return {
          topic: topic.topic,
          facts: [`Setting research failed for ${topic.topic}`],
          sources: [],
          keyDetails: {},
          contradictions: [],
          uncertainties: []
        };
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
        const prompt = `
Research technical information for a ${settings.genre} story:

TECHNICAL TOPIC: ${topic.topic}
STORY CONTEXT: ${topic.context}

Provide accurate technical information including:
1. How it actually works
2. Limitations and constraints
3. Common problems or failures
4. Technical terminology
5. Safety considerations
6. Recent developments or changes

Explain in a way that's accurate but accessible for storytelling purposes.`;

        const response = await generateAIText(prompt, {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: 2000
        });

        return this.parseResearchResponse(response.text, topic.topic);
      } catch (error) {
        console.error(`Error researching technical topic ${topic.topic}:`, error);
        return {
          topic: topic.topic,
          facts: [`Technical research failed for ${topic.topic}`],
          sources: [],
          keyDetails: {},
          contradictions: [],
          uncertainties: []
        };
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
        const prompt = `
Research cultural context for a ${settings.genre} story:

CULTURAL ASPECT: ${topic.topic}
STORY CONTEXT: ${topic.context}

Provide information about:
1. Social norms and customs
2. Values and beliefs
3. Communication styles
4. Relationship dynamics
5. Conflict sources and taboos
6. Changes over time

Focus on authentic cultural details that affect how characters interact and behave.`;

        const response = await generateAIText(prompt, {
          model: this.config.model,
          temperature: this.config.temperature,
          maxTokens: 1500
        });

        return this.parseResearchResponse(response.text, topic.topic);
      } catch (error) {
        console.error(`Error researching cultural topic ${topic.topic}:`, error);
        return {
          topic: topic.topic,
          facts: [`Cultural research failed for ${topic.topic}`],
          sources: [],
          keyDetails: {},
          contradictions: [],
          uncertainties: []
        };
      }
    });

    return Promise.all(researchPromises);
  }

  /**
   * Build prompt for targeted research
   */
  private buildTargetedResearchPrompt(
    topic: string,
    context: string,
    existingResearch: ComprehensiveResearch
  ): string {
    // Extract relevant existing research
    const relevantResearch = this.findRelevantResearch(topic, existingResearch);
    
    return `
TARGETED RESEARCH REQUEST:

SPECIFIC TOPIC: ${topic}
SCENE CONTEXT: ${context}

EXISTING RESEARCH SUMMARY:
${relevantResearch.slice(0, 3).map(r => `- ${r.topic}: ${r.facts.slice(0, 2).join('; ')}`).join('\n')}

Provide specific, detailed information about "${topic}" that would help write this scene authentically.

Focus on:
1. Specific details not covered in existing research
2. Sensory information (what would characters see, hear, feel?)
3. Practical considerations (what would actually happen?)
4. Potential dramatic elements or conflicts

Be specific and concrete rather than general.`;
  }

  /**
   * Parse research response into structured format
   */
  private parseResearchResponse(responseText: string, topic: string): ResearchResult {
    // Parse the AI response into structured data
    // This is a simplified version - could be enhanced with more sophisticated parsing
    
    const lines = responseText.split('\n').filter(line => line.trim());
    const facts: string[] = [];
    const keyDetails: { [key: string]: string } = {};
    
    let currentSection = '';
    
    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        // Numbered fact
        facts.push(line.replace(/^\d+\.\s*/, ''));
      } else if (line.includes(':')) {
        // Key-value pair
        const [key, value] = line.split(':', 2);
        if (key && value) {
          keyDetails[key.trim()] = value.trim();
        }
      }
    }
    
    return {
      topic,
      facts,
      sources: [], // Could be enhanced to extract sources
      keyDetails,
      contradictions: [], // Could be enhanced to identify contradictions
      uncertainties: [] // Could be enhanced to identify uncertainties
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
  private generateFallbackResearchTopics(settings: BookSettings): any {
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