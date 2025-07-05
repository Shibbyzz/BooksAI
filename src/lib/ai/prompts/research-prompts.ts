import type { BookSettings } from '@/types';

export const researchPrompts = {
  identifyTopics: (userPrompt: string, backCover: string, settings: BookSettings) => `
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

Respond in JSON format with the five categories above.`,

  domainKnowledge: (topic: string, context: string, settings: BookSettings) => `
Research the following topic for a ${settings.genre} book:

TOPIC: ${topic}
CONTEXT: ${context}

Provide comprehensive information including:
1. Key facts and details
2. Common misconceptions
3. Important nuances
4. Storytelling opportunities
5. Potential contradictions to avoid
6. 2-3 example sources where readers could learn more
7. Any contradictions or uncertainties in the field

Focus on information that would help an author write authentically about this topic.
Be specific and detailed, but concise.`,

  characterBackgrounds: (topic: string, context: string, settings: BookSettings) => `
Research character background information for a ${settings.genre} story:

CHARACTER TYPE/PROFESSION: ${topic}
STORY CONTEXT: ${context}

Provide detailed information about:
1. Typical daily life and responsibilities
2. Required skills and training
3. Common personality traits and motivations
4. Professional jargon and terminology
5. Challenges and conflicts inherent to this role
6. Social status and relationships
7. 2-3 example sources for further research
8. Any contradictions or uncertainties about this profession

This information will be used to create authentic character portrayals.`,

  settingDetails: (topic: string, context: string, settings: BookSettings) => `
Research location/setting information for a ${settings.genre} story:

LOCATION/SETTING: ${topic}
STORY CONTEXT: ${context}

Provide detailed information about:
1. Physical characteristics and geography
2. Climate and environmental conditions
3. Cultural and social aspects
4. Historical significance
5. Sensory details (sounds, smells, atmosphere)
6. Unique features or notable landmarks
7. 2-3 example sources for further research
8. Any contradictions or uncertainties about this location

Focus on details that would help create vivid, immersive scenes.`,

  technicalAspects: (topic: string, context: string, settings: BookSettings) => `
Research technical information for a ${settings.genre} story:

TECHNICAL TOPIC: ${topic}
STORY CONTEXT: ${context}

Provide accurate technical information including:
1. How it actually works
2. Limitations and constraints
3. Common problems or failures
4. Technical terminology
5. Safety considerations
6. Recent developments or changes
7. 2-3 example sources for further research
8. Any contradictions or uncertainties in the field

Explain in a way that's accurate but accessible for storytelling purposes.`,

  culturalContext: (topic: string, context: string, settings: BookSettings) => `
Research cultural context for a ${settings.genre} story:

CULTURAL ASPECT: ${topic}
STORY CONTEXT: ${context}

Provide information about:
1. Social norms and customs
2. Values and beliefs
3. Communication styles
4. Relationship dynamics
5. Conflict sources and taboos
6. Changes over time
7. 2-3 example sources for further research
8. Any contradictions or uncertainties about these cultural aspects

Focus on authentic cultural details that affect how characters interact and behave.`,

  targetedResearch: (topic: string, context: string, relevantResearch: string) => `
TARGETED RESEARCH REQUEST:

SPECIFIC TOPIC: ${topic}
SCENE CONTEXT: ${context}

EXISTING RESEARCH SUMMARY:
${relevantResearch}

Provide specific, detailed information about "${topic}" that would help write this scene authentically.

Focus on:
1. Specific details not covered in existing research
2. Sensory information (what would characters see, hear, feel?)
3. Practical considerations (what would actually happen?)
4. Potential dramatic elements or conflicts
5. 2-3 example sources for further research
6. Any contradictions or uncertainties about this topic

Be specific and concrete rather than general.`
}; 