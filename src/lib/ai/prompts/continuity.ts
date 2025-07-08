import type { CharacterState, TimelineEntry, ConsistencyTracker } from '../agents/continuity-inspector-agent';

export interface ContinuityPromptConfig {
  maxContentLength: number;
}

/**
 * Truncate content intelligently, preserving sentence boundaries
 */
export function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  const truncated = content.substring(0, maxLength);
  const lastSentence = truncated.lastIndexOf('.');
  const lastParagraph = truncated.lastIndexOf('\n\n');
  
  // Try to end at a sentence boundary
  if (lastSentence > maxLength * 0.8) {
    return truncated.substring(0, lastSentence + 1) + '\n\n[Content truncated for analysis]';
  }
  
  // Try to end at a paragraph boundary
  if (lastParagraph > maxLength * 0.7) {
    return truncated.substring(0, lastParagraph) + '\n\n[Content truncated for analysis]';
  }
  
  return truncated + '\n\n[Content truncated for analysis]';
}

/**
 * Build character consistency check prompt
 */
export function buildCharacterPrompt(
  character: CharacterState,
  chapterNumber: number,
  content: string,
  config: ContinuityPromptConfig
): string {
  return `
TASK: Check character consistency for "${character.name}" in Chapter ${chapterNumber}

CURRENT CHARACTER STATE:
- Location: ${character.currentLocation}
- Physical: ${character.physicalState}
- Emotional: ${character.emotionalState}
- Knowledge: ${character.knowledgeState}
- Last seen: Chapter ${character.lastSeen}
- Relationships: ${JSON.stringify(character.relationships, null, 2)}

CHAPTER CONTENT:
${truncateContent(content, config.maxContentLength)}

ANALYSIS REQUIRED:
1. Unexplained location changes
2. Contradictory physical/emotional states
3. Knowledge they shouldn't have yet
4. Personality inconsistencies
5. Unexplained behavior changes

RESPONSE FORMAT (JSON ONLY):
{
  "issues": [
    {
      "type": "character",
      "severity": "critical|major|minor",
      "description": "specific description of the issue",
      "suggestion": "how to fix it",
      "conflictingElements": ["element1", "element2"]
    }
  ]
}

If no issues found, return: {"issues": []}
`;
}

/**
 * Build timeline consistency check prompt
 */
export function buildTimelinePrompt(
  chapterNumber: number,
  content: string,
  timeline: TimelineEntry[],
  config: ContinuityPromptConfig
): string {
  // Ensure timeline is an array and provide safe fallback
  const safeTimeline = Array.isArray(timeline) ? timeline : [];
  const recentTimeline = safeTimeline.slice(-5);
  
  const timelineDisplay = recentTimeline.length > 0 
    ? recentTimeline.map(t => 
        `Ch${t.chapter}: ${t.timeReference} ${t.duration ? `(${t.duration})` : ''} ${t.absoluteTime ? `at ${t.absoluteTime}` : ''}`
      ).join('\n')
    : 'No previous timeline entries';
  
  return `
TASK: Check timeline consistency for Chapter ${chapterNumber}

RECENT TIMELINE:
${timelineDisplay}

CHAPTER CONTENT:
${truncateContent(content, config.maxContentLength)}

ANALYSIS REQUIRED:
1. Impossible time progression
2. Contradictory time references
3. Characters being in multiple places simultaneously
4. Inconsistent passage of time
5. Temporal paradoxes or inconsistencies

RESPONSE FORMAT (JSON ONLY):
{
  "issues": [
    {
      "type": "timeline",
      "severity": "critical|major|minor",
      "description": "specific description of the issue",
      "suggestion": "how to fix it",
      "conflictingElements": ["element1", "element2"]
    }
  ]
}

If no issues found, return: {"issues": []}
`;
}

/**
 * Build worldbuilding consistency check prompt
 */
export function buildWorldbuildingPrompt(
  chapterNumber: number,
  content: string,
  worldBuilding: Array<{ element: string; description: string; chapters: number[] }>,
  config: ContinuityPromptConfig
): string {
  // Ensure worldBuilding is an array and provide safe fallback
  const safeWorldBuilding = Array.isArray(worldBuilding) ? worldBuilding : [];
  const worldElements = safeWorldBuilding.slice(-10);
  
  const worldDisplay = worldElements.length > 0
    ? worldElements.map(w => 
        `${w.element}: ${w.description} (Chapters: ${Array.isArray(w.chapters) ? w.chapters.join(', ') : 'N/A'})`
      ).join('\n')
    : 'No established world elements yet';
  
  return `
TASK: Check worldbuilding consistency for Chapter ${chapterNumber}

ESTABLISHED WORLD ELEMENTS:
${worldDisplay}

CHAPTER CONTENT:
${truncateContent(content, config.maxContentLength)}

ANALYSIS REQUIRED:
1. Contradictory world rules or physics
2. Inconsistent technology levels
3. Cultural or social inconsistencies
4. Geographic or environmental contradictions
5. Magic/special system rule violations

RESPONSE FORMAT (JSON ONLY):
{
  "issues": [
    {
      "type": "worldbuilding",
      "severity": "critical|major|minor",
      "description": "specific description of the issue",
      "suggestion": "how to fix it",
      "conflictingElements": ["element1", "element2"]
    }
  ]
}

If no issues found, return: {"issues": []}
`;
}

/**
 * Build research facts consistency check prompt
 */
export function buildResearchPrompt(
  chapterNumber: number,
  content: string,
  researchUsed: string[],
  researchReferences: Array<{ fact: string; chapter: number; context: string }>,
  config: ContinuityPromptConfig
): string {
  const relevantResearch = researchReferences.filter(r => 
    researchUsed.some(used => r.fact.toLowerCase().includes(used.toLowerCase()))
  );
  
  return `
TASK: Check research facts consistency for Chapter ${chapterNumber}

ESTABLISHED RESEARCH FACTS:
${relevantResearch.map(r => 
  `${r.fact} (Ch${r.chapter}: ${r.context})`
).join('\n')}

RESEARCH USED IN THIS CHAPTER:
${researchUsed.join(', ')}

CHAPTER CONTENT:
${truncateContent(content, config.maxContentLength)}

ANALYSIS REQUIRED:
1. Contradictory research facts
2. Misused technical details
3. Incorrect scientific principles
4. Historical inaccuracies
5. Inconsistent expert knowledge

RESPONSE FORMAT (JSON ONLY):
{
  "issues": [
    {
      "type": "research",
      "severity": "critical|major|minor",
      "description": "specific description of the issue",
      "suggestion": "how to fix it",
      "conflictingElements": ["element1", "element2"]
    }
  ]
}

If no issues found, return: {"issues": []}
`;
}

/**
 * Build tracker update extraction prompt
 */
export function buildTrackerUpdatePrompt(
  chapterNumber: number,
  content: string,
  summary: string,
  researchUsed: string[],
  config: ContinuityPromptConfig
): string {
  return `
TASK: Extract consistency tracking information from Chapter ${chapterNumber}

CHAPTER SUMMARY: ${summary}
RESEARCH USED: ${researchUsed.join(', ')}

CHAPTER CONTENT:
${truncateContent(content, config.maxContentLength)}

EXTRACTION REQUIREMENTS:
1. CHARACTER UPDATES: Location changes, physical/emotional state changes, new knowledge gained
2. PLOT POINTS: Key events, consequences, character impacts
3. TIME REFERENCES: How much time has passed, time of day, temporal markers
4. NEW FACTS: World-building elements, research facts mentioned
5. RELATIONSHIP CHANGES: How character relationships evolve

RESPONSE FORMAT (JSON ONLY):
{
  "characterUpdates": [
    {
      "name": "character name",
      "location": "new location or null",
      "physicalState": "new physical state or null",
      "emotionalState": "new emotional state or null",
      "knowledgeState": "new knowledge or null",
      "relationshipChanges": { "otherCharacter": "relationship change" }
    }
  ],
  "plotPoints": [
    {
      "event": "description of event",
      "consequences": ["consequence 1", "consequence 2"],
      "affectedCharacters": ["character1", "character2"],
      "establishedFacts": ["fact 1", "fact 2"]
    }
  ],
  "timeReferences": [
    {
      "reference": "time reference from text",
      "duration": "how long passed",
      "absoluteTime": "specific time if mentioned"
    }
  ],
  "newFacts": ["fact 1", "fact 2"],
  "worldBuilding": [
    {
      "element": "world element",
      "description": "description"
    }
  ]
}

IMPORTANT: Return valid JSON only. No markdown formatting or explanations.
`;
}

/**
 * Build fallback prompt for parsing retries
 */
export function buildFallbackPrompt(originalPrompt: string): string {
  return originalPrompt + `

CRITICAL: The previous response was not valid JSON. 
Please respond with ONLY valid JSON in the exact format requested above.
No markdown code blocks, no explanations, no additional text.
Just the JSON object.
`;
}

/**
 * Consistency check category configuration
 */
export const CONSISTENCY_CATEGORIES = {
  character: {
    name: 'Character Consistency',
    description: 'Check for character behavior, knowledge, and state consistency',
    weight: 1.3
  },
  timeline: {
    name: 'Timeline Consistency', 
    description: 'Check for temporal progression and time reference consistency',
    weight: 1.5
  },
  worldbuilding: {
    name: 'Worldbuilding Consistency',
    description: 'Check for world rules, physics, and established elements',
    weight: 0.8
  },
  research: {
    name: 'Research Facts Consistency',
    description: 'Check for accurate use of research facts and technical details',
    weight: 1.0
  }
} as const;

export type ConsistencyCategory = keyof typeof CONSISTENCY_CATEGORIES; 