import { NextRequest } from 'next/server';
import { ResearchAgent } from '@/lib/ai/agents/research-agent';
import { ChiefEditorAgent } from '@/lib/ai/agents/chief-editor-agent';
import { ContinuityInspectorAgent } from '@/lib/ai/agents/continuity-inspector-agent';

export async function POST(request: NextRequest) {
  try {
    const { testType = 'research', prompt } = await request.json();

    if (!prompt) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    switch (testType) {
      case 'research':
        return await testResearchAgent(prompt);
      case 'chief-editor':
        return await testChiefEditor(prompt);
      case 'continuity':
        return await testContinuityInspector(prompt);
      default:
        return Response.json({ error: 'Invalid test type' }, { status: 400 });
    }

  } catch (error) {
    console.error('Enhanced AI test error:', error);
    return Response.json(
      { error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function testResearchAgent(prompt: string) {
  const agent = new ResearchAgent();
  
  const mockSettings = {
    id: 'test',
    bookId: 'test',
    language: 'en',
    wordCount: 50000,
    genre: 'Science Fiction',
    targetAudience: 'Young Adult',
    tone: 'Adventurous',
    endingType: 'Happy',
    structure: 'Three Act',
    characterNames: ['Alex', 'Sam'],
    inspirationBooks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockBackCover = `${prompt.substring(0, 200)}... An epic adventure awaits.`;

  console.log('Testing ResearchAgent...');
  const research = await agent.conductComprehensiveResearch(
    prompt,
    mockBackCover,
    mockSettings
  );

  return Response.json({
    success: true,
    testType: 'research',
    result: {
      researchTopics: {
        domain: research.domainKnowledge.length,
        characters: research.characterBackgrounds.length,
        settings: research.settingDetails.length,
        technical: research.technicalAspects.length,
        cultural: research.culturalContext.length
      },
      sampleResearch: {
        domainFacts: research.domainKnowledge.slice(0, 2).map(r => ({
          topic: r.topic,
          factCount: r.facts.length,
          sampleFact: r.facts[0]
        })),
        settingDetails: research.settingDetails.slice(0, 1).map(r => ({
          topic: r.topic,
          factCount: r.facts.length
        }))
      }
    }
  });
}

async function testChiefEditor(prompt: string) {
  const agent = new ChiefEditorAgent();
  
  const mockOutline = {
    summary: `${prompt.substring(0, 150)}... This is the story outline.`,
    themes: ['Adventure', 'Growth', 'Discovery'],
    characters: [
      { name: 'Alex', role: 'protagonist', description: 'Main character', arc: 'Growth story' },
      { name: 'Sam', role: 'supporting', description: 'Best friend', arc: 'Loyalty theme' }
    ],
    chapters: [
      { number: 1, title: 'The Beginning', summary: 'Story starts', keyEvents: ['Introduction'], characters: ['Alex'], location: 'Home', wordCountTarget: 2500 },
      { number: 2, title: 'The Journey', summary: 'Adventure begins', keyEvents: ['Departure'], characters: ['Alex', 'Sam'], location: 'Road', wordCountTarget: 2500 },
      { number: 3, title: 'The Challenge', summary: 'Main conflict', keyEvents: ['Conflict'], characters: ['Alex', 'Sam'], location: 'Destination', wordCountTarget: 2500 }
    ]
  };

  const mockResearch = {
    domainKnowledge: [{ topic: 'Adventure Travel', facts: ['Fact 1', 'Fact 2'], sources: [], keyDetails: {}, contradictions: [], uncertainties: [] }],
    characterBackgrounds: [],
    settingDetails: [],
    technicalAspects: [],
    culturalContext: []
  };

  const mockSettings = {
    id: 'test',
    bookId: 'test', 
    language: 'en',
    wordCount: 50000,
    genre: 'Adventure',
    targetAudience: 'Young Adult',
    tone: 'Exciting',
    endingType: 'Happy',
    structure: 'Three Act',
    characterNames: ['Alex', 'Sam'],
    inspirationBooks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  console.log('Testing ChiefEditorAgent...');
  const structurePlan = await agent.createBookStructurePlan(
    prompt,
    mockOutline.summary,
    mockOutline,
    mockResearch,
    mockSettings
  );

  return Response.json({
    success: true,
    testType: 'chief-editor',
    result: {
      totalChapters: structurePlan.chapters.length,
      chapterLengthVariation: {
        shortest: Math.min(...structurePlan.chapters.map(c => c.wordCountTarget)),
        longest: Math.max(...structurePlan.chapters.map(c => c.wordCountTarget)),
        average: Math.round(structurePlan.chapters.reduce((sum, c) => sum + c.wordCountTarget, 0) / structurePlan.chapters.length)
      },
      pacingStrategy: structurePlan.pacingStrategy,
      researchIntegration: structurePlan.researchIntegrationStrategy,
      sampleChapter: structurePlan.chapters[0]
    }
  });
}

async function testContinuityInspector(prompt: string) {
  const agent = new ContinuityInspectorAgent();
  
  const mockCharacters = [
    { name: 'Alex', role: 'protagonist', description: 'Main character', arc: 'Growth story' }
  ];

  const mockOutline = {
    summary: `${prompt.substring(0, 150)}... This is the story outline.`,
    themes: ['Adventure'],
    characters: mockCharacters
  };

  const mockResearch = {
    domainKnowledge: [{ topic: 'Test Topic', facts: ['Test fact 1', 'Test fact 2'], sources: [], keyDetails: {}, contradictions: [], uncertainties: [] }],
    characterBackgrounds: [],
    settingDetails: [],
    technicalAspects: [],
    culturalContext: []
  };

  const mockSettings = {
    id: 'test',
    bookId: 'test',
    language: 'en', 
    wordCount: 50000,
    genre: 'Adventure',
    targetAudience: 'Young Adult',
    tone: 'Exciting',
    endingType: 'Happy',
    structure: 'Three Act',
    characterNames: ['Alex'],
    inspirationBooks: [],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  console.log('Testing ContinuityInspectorAgent...');
  await agent.initializeTracking(
    mockCharacters,
    mockOutline,
    mockResearch,
    mockSettings
  );

  const mockChapterContent = `
  Alex walked through the forest, thinking about the recent events. 
  The morning sun filtered through the trees as Alex recalled the conversation with Sam yesterday.
  Everything seemed peaceful, but Alex knew that challenges lay ahead.
  `;

  const consistencyReport = await agent.checkChapterConsistency(
    1,
    mockChapterContent,
    'Introduction chapter where Alex begins the journey',
    ['Adventure basics', 'Character introduction']
  );

  return Response.json({
    success: true,
    testType: 'continuity',
    result: {
      consistencyScore: consistencyReport.overallScore,
      issueCount: consistencyReport.issues.length,
      trackerState: {
        charactersTracked: agent.getTrackerState().characters.length,
        factsEstablished: agent.getTrackerState().establishedFacts.length,
        timelineEntries: agent.getTrackerState().timeline.length
      },
      recommendations: consistencyReport.recommendations
    }
  });
} 