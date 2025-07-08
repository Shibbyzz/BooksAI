import type { BookSettings } from '@/types';

export interface PromptContext {
  userPrompt: string;
  settings: BookSettings;
  previousContext?: string;
}

/**
 * Generate back cover text from user prompt and settings
 */
export function createBackCoverPrompt({ userPrompt, settings }: PromptContext): string {
  return `You are a professional book marketing expert and editor. Your task is to create a compelling back cover description for a book.

**USER'S BOOK CONCEPT:**
${userPrompt}

**BOOK SETTINGS:**
- Genre: ${settings.genre}
- Target Audience: ${settings.targetAudience}
- Tone: ${settings.tone}
- Language: ${settings.language}
- Target Word Count: ${settings.wordCount.toLocaleString()} words
- Ending Type: ${settings.endingType}

${settings.characterNames?.length > 0 ? `**IMPORTANT CHARACTER NAMES TO USE:**
${settings.characterNames.join(', ')}

**CRITICAL**: You MUST use these specific character names in your back cover description. These names were chosen by the user and must appear in the back cover text.` : ''}

**INSTRUCTIONS:**
1. Create a compelling back cover description (150-250 words)
2. Include a hook that draws readers in
3. Highlight the main conflict or stakes
4. Match the tone and genre conventions
5. End with intrigue, not spoilers
6. Use language appropriate for the target audience
${settings.characterNames?.length > 0 ? '7. **MUST include the user-specified character names listed above**' : ''}

**BACK COVER DESCRIPTION:**`;
}

/**
 * Generate detailed book outline from back cover and settings
 */
export function createOutlinePrompt({ 
  userPrompt, 
  settings, 
  previousContext 
}: PromptContext & { previousContext: string }): string {
  // Calculate genre-specific optimal chapter count
  const genreChapterGuidance = getGenreChapterGuidance(settings.genre, settings.wordCount);
  
  return `You are a professional book editor and story architect. Create a detailed book outline based on the back cover description and user requirements.

**ORIGINAL USER CONCEPT:**
${userPrompt}

**APPROVED BACK COVER:**
${previousContext}

**BOOK SPECIFICATIONS:**
- Genre: ${settings.genre}
- Target Word Count: ${settings.wordCount.toLocaleString()} words
- Structure: ${settings.structure}
- Ending Type: ${settings.endingType}
- Character Names: ${settings.characterNames?.length > 0 ? settings.characterNames.join(', ') : 'To be determined'}
- Inspiration Books: ${settings.inspirationBooks?.length > 0 ? settings.inspirationBooks.join(', ') : 'None specified'}

${settings.characterNames?.length > 0 ? `**IMPORTANT: Please use these character names in your outline: ${settings.characterNames.join(', ')}**` : ''}

**GENRE-SPECIFIC STRUCTURE GUIDANCE:**
${genreChapterGuidance}

**CREATIVE OUTLINE REQUIREMENTS:**
Create an engaging story outline with natural chapter divisions. Think like a real author - consider:

1. **OPTIMAL CHAPTER COUNT**: Based on ${settings.genre} genre conventions and your ${settings.wordCount.toLocaleString()}-word target, aim for the recommended chapter structure above.
   
2. **VARIED CHAPTER PURPOSES**: Each chapter should serve the story:
   - Opening: Character introduction and hook
   - Development: Plot advancement and relationship building  
   - Tension: Conflict escalation and obstacles
   - Climax: Major confrontations and revelations
   - Resolution: Satisfying conclusion and character growth
   
3. Chapter details should include:
   - Compelling title that hints at chapter content
   - Rich 2-3 paragraph summary showing what happens
   - Key story beats and character moments
   - Setting and emotional tone
   - Word count that fits the recommended chapter length

**STRUCTURAL ELEMENTS TO INCLUDE:**
- Opening hook
- Character introduction and motivation
- Rising action with escalating conflict
- Midpoint twist or revelation
- Climax and resolution
- Ending that matches the specified ending type

**ADDITIONAL CONSIDERATIONS:**
- Maintain genre conventions for ${settings.genre}
- Ensure pacing appropriate for ${settings.targetAudience}
- Incorporate ${settings.tone} tone throughout
- Include character arcs and relationship development

Please provide a comprehensive outline with:
1. **BOOK SUMMARY** (3-4 paragraphs)
2. **MAIN THEMES** (3-5 key themes)
3. **CHARACTER PROFILES** (main characters with brief descriptions)
4. **CHAPTER BREAKDOWN** (detailed chapter-by-chapter outline)

**TARGET WORD COUNT: ${settings.wordCount.toLocaleString()}

**RESPOND WITH CLEAN JSON ONLY - NO MARKDOWN, NO BACKTICKS:**

{
  "summary": "Compelling book summary that captures the story's essence...",
  "themes": ["Primary Theme", "Secondary Theme", "Character Theme"],
  "characters": [
    {
      "name": "Character Name",
      "role": "protagonist/antagonist/supporting",
      "description": "Rich character description and motivation",
      "arc": "Character growth and development journey"
    }
  ],
  "chapters": [
    {
      "number": 1,
      "title": "Engaging Chapter Title",
      "summary": "Detailed summary of what happens in this chapter, including key events, character moments, and emotional beats...",
      "keyEvents": ["Major plot point", "Character development moment"],
      "characters": ["Names of characters appearing"],
      "location": "Primary setting description",
      "wordCountTarget": 1800
    }
  ]
}

💡 **FOLLOW THE GENRE GUIDANCE ABOVE** - Create the recommended number of chapters for optimal ${settings.genre} pacing!`;
}

/**
 * Generate genre-specific chapter guidance for the outline prompt
 */
function getGenreChapterGuidance(genre: string, wordCount: number): string {
  // Import the genre structures to calculate optimal chapter count
  const genreStructures: Record<string, any> = {
    'adventure': {
      optimalChapterLength: 2800,
      preferredChapterCount: (wc: number) => Math.max(6, Math.ceil(wc / 2800)),
    },
    'fantasy': {
      optimalChapterLength: 3500,
      preferredChapterCount: (wc: number) => Math.max(4, Math.ceil(wc / 3500)),
    },
    'mystery': {
      optimalChapterLength: 2800,
      preferredChapterCount: (wc: number) => Math.max(5, Math.ceil(wc / 2800)),
    },
    'romance': {
      optimalChapterLength: 2500,
      preferredChapterCount: (wc: number) => Math.max(6, Math.ceil(wc / 2500)),
    },
    'thriller': {
      optimalChapterLength: 2200,
      preferredChapterCount: (wc: number) => Math.max(7, Math.ceil(wc / 2200)),
    },
    'literary': {
      optimalChapterLength: 4000,
      preferredChapterCount: (wc: number) => Math.max(3, Math.ceil(wc / 4000)),
    },
    'sci-fi': {
      optimalChapterLength: 3200,
      preferredChapterCount: (wc: number) => Math.max(4, Math.ceil(wc / 3200)),
    },
    'young-adult': {
      optimalChapterLength: 2000,
      preferredChapterCount: (wc: number) => Math.max(8, Math.ceil(wc / 2000)),
    },
    'historical': {
      optimalChapterLength: 3800,
      preferredChapterCount: (wc: number) => Math.max(3, Math.ceil(wc / 3800)),
    }
  };

  const defaultStructure = {
    optimalChapterLength: 2500,
    preferredChapterCount: (wc: number) => Math.max(4, Math.ceil(wc / 2500)),
  };

  const structure = genreStructures[genre] || defaultStructure;
  const optimalChapterCount = structure.preferredChapterCount(wordCount);
  const optimalChapterLength = structure.optimalChapterLength;

  return `For ${genre} genre with ${wordCount.toLocaleString()} words:
- **RECOMMENDED CHAPTERS**: ${optimalChapterCount} chapters
- **OPTIMAL CHAPTER LENGTH**: ~${optimalChapterLength.toLocaleString()} words per chapter
- This provides optimal pacing and engagement for ${genre} readers
- Each chapter should average ${Math.floor(wordCount / optimalChapterCount).toLocaleString()} words

**IMPORTANT**: Please create exactly ${optimalChapterCount} chapters to match ${genre} genre conventions.`;
}

/**
 * Refine storyline based on user feedback
 */
export function createRefinementPrompt({
  userPrompt,
  settings,
  previousContext
}: PromptContext & { previousContext: string }): string {
  return `You are a professional editor helping refine a book's storyline. The user wants to modify the current back cover or storyline.

**ORIGINAL CONCEPT:**
${userPrompt}

**CURRENT BACK COVER/STORYLINE:**
${previousContext}

**USER'S REFINEMENT REQUEST:**
${userPrompt}

**BOOK SETTINGS:**
- Genre: ${settings.genre}
- Target Audience: ${settings.targetAudience}
- Tone: ${settings.tone}
- Word Count: ${settings.wordCount.toLocaleString()} words

**INSTRUCTIONS:**
1. Incorporate the user's feedback thoughtfully
2. Maintain the core appeal and marketability
3. Ensure consistency with genre and tone
4. Keep the compelling hook and intrigue
5. Preserve what's working while improving based on feedback

**REFINED BACK COVER DESCRIPTION:**`;
}

/**
 * Generate chapter section prompts for the writing agent
 */
export function createChapterSectionPrompt(
  chapterSummary: string,
  sectionNumber: number,
  sectionsTotal: number,
  settings: BookSettings,
  storyContext: string,
  chapterWordTarget?: number
): string {
  // Use provided chapter word target or calculate from settings
  const chapterWords = chapterWordTarget || Math.floor(settings.wordCount / 12); // Assuming ~12 chapters average
  const sectionTargetWords = Math.floor(chapterWords / sectionsTotal);
  
  return `You are a professional novelist writing a section of a ${settings.genre} book. 

**CHAPTER CONTEXT:**
${chapterSummary}

**SECTION DETAILS:**
- Section ${sectionNumber} of ${sectionsTotal} in this chapter
- Target: ~${sectionTargetWords} words
- Tone: ${settings.tone}
- Target Audience: ${settings.targetAudience}

**STORY CONTEXT:**
${storyContext}

**WRITING GUIDELINES:**
1. Write engaging, immersive prose appropriate for ${settings.genre}
2. Maintain ${settings.tone} tone throughout
3. Show don't tell - use vivid scenes and dialogue
4. Advance the plot and develop characters
5. End with a hook or transition to the next section
6. Use descriptive language that draws readers in
7. Maintain consistency with established characters and world

**WRITE THE SECTION:**`;
}

/**
 * Story memory extraction prompt
 */
export function createStoryMemoryPrompt(content: string, chapterRef: string): string {
  return `You are a story consistency expert. Analyze the following book content and extract key story elements for tracking consistency across the book.

**CONTENT TO ANALYZE:**
${content}

**CHAPTER REFERENCE:** ${chapterRef}

**EXTRACT THE FOLLOWING AS JSON:**
{
  "characters": [
    {
      "name": "Character Name",
      "role": "protagonist/antagonist/supporting/minor",
      "description": "Physical and personality description",
      "firstAppearance": "${chapterRef}",
      "keyTraits": ["trait1", "trait2"],
      "relationships": [{"character": "Other Character", "relationship": "friend/enemy/family/etc"}]
    }
  ],
  "locations": [
    {
      "name": "Location Name",
      "description": "Detailed description of the place",
      "importance": "major/minor/mentioned",
      "firstMention": "${chapterRef}"
    }
  ],
  "timelineEvents": [
    {
      "title": "Event Title",
      "description": "What happened",
      "importance": "critical/major/minor",
      "chapterReference": "${chapterRef}"
    }
  ],
  "worldRules": [
    {
      "rule": "Description of world rule, magic system, technology, etc.",
      "established": "${chapterRef}"
    }
  ]
}

**ONLY EXTRACT ELEMENTS THAT ARE CLEARLY MENTIONED OR ESTABLISHED IN THE CONTENT.**`;
} 