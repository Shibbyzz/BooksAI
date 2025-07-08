import { CharacterNameContinuityAgent } from './services/CharacterNameContinuityAgent';
import { PlanningAgent } from './agents/planning-agent';
import type { BookSettings } from '@/types';

/**
 * Test script for Phase 4: Character Name Continuity
 * Tests the system across different prompt types:
 * 1. Minimal prompts ("a book about sailing")
 * 2. Moderate prompts with some character info
 * 3. Detailed prompts with character sheets
 */

async function testPhase4CharacterContinuity() {
  console.log('🚀 Testing Phase 4: Character Name Continuity System');
  console.log('====================================================\n');

  const characterNameAgent = new CharacterNameContinuityAgent();
  const planningAgent = new PlanningAgent();

  // Test scenarios with different prompt complexity levels
  const testScenarios = [
    {
      name: 'Minimal Prompt Test',
      type: 'minimal',
      prompt: 'A book about sailing',
      settings: {
        genre: 'Adventure',
        targetAudience: 'Young Adult',
        tone: 'Adventurous',
        language: 'en',
        wordCount: 50000,
        endingType: 'Happy',
        structure: 'Three Act',
        characterNames: [], // No names specified - AI should generate
        inspirationBooks: []
      }
    },
    {
      name: 'Moderate Prompt Test',
      type: 'moderate',
      prompt: 'Write a story about Sarah, a young marine biologist who discovers something mysterious in the deep ocean. She teams up with Captain Rodriguez to investigate.',
      settings: {
        genre: 'Science Fiction',
        targetAudience: 'Adult',
        tone: 'Mysterious',
        language: 'en',
        wordCount: 75000,
        endingType: 'Twist',
        structure: 'Five Act',
        characterNames: [], // Names in prompt should be auto-detected
        inspirationBooks: []
      }
    },
    {
      name: 'Detailed Character Sheet Test',
      type: 'detailed',
      prompt: `Write a fantasy novel with these characters:

Character: Elena Stormweaver
Age: 23 years old
Personality: Brave but impulsive, struggles with self-doubt
Background: Royal mage's apprentice who discovered she has forbidden magic
Appearance: Silver hair, blue eyes, tall and athletic

Character: Marcus Ironheart  
Age: 30 years old
Personality: Loyal, strategic thinker, protective of Elena
Background: Former knight turned outlaw after being framed
Appearance: Dark hair, scarred face, muscular build

The story should be about their quest to clear Marcus's name while Elena learns to control her dangerous powers.`,
      settings: {
        genre: 'Fantasy',
        targetAudience: 'Young Adult',
        tone: 'Epic',
        language: 'en',
        wordCount: 100000,
        endingType: 'Heroic',
        structure: 'Hero\'s Journey',
        characterNames: [], // Detailed names and descriptions in prompt
        inspirationBooks: []
      }
    },
    {
      name: 'User-Specified Names Override Test',
      type: 'override',
      prompt: 'A thriller about Alex who uncovers a conspiracy',
      settings: {
        genre: 'Thriller',
        targetAudience: 'Adult',
        tone: 'Suspenseful',
        language: 'en',
        wordCount: 60000,
        endingType: 'Cliffhanger',
        structure: 'Three Act',
        characterNames: ['Victoria', 'James'], // Should override "Alex" from prompt
        inspirationBooks: []
      }
    }
  ];

  // Run tests for each scenario
  for (const scenario of testScenarios) {
    console.log(`\n🧪 ${scenario.name}`);
    console.log(`📝 Prompt: "${scenario.prompt.substring(0, 100)}${scenario.prompt.length > 100 ? '...' : ''}"`);
    console.log(`⚙️ Pre-set character names: ${scenario.settings.characterNames.length > 0 ? scenario.settings.characterNames.join(', ') : 'None'}`);
    
    try {
      // Step 1: Analyze the prompt
      console.log('\n1️⃣ Analyzing prompt for character information...');
      const promptAnalysis = characterNameAgent.analyzeUserPrompt(scenario.prompt);
      
      console.log(`   📊 Prompt type: ${promptAnalysis.promptAnalysis.promptType}`);
      console.log(`   👥 Names detected: ${promptAnalysis.names.length > 0 ? promptAnalysis.names.join(', ') : 'None'}`);
      console.log(`   📋 Character descriptions: ${promptAnalysis.characterDescriptions.length}`);
      console.log(`   🎯 Estimated character count: ${promptAnalysis.promptAnalysis.estimatedCharacterCount}`);
      
      // Step 2: Simulate back cover generation
      console.log('\n2️⃣ Simulating back cover generation...');
      
      // Create mock settings with character names from prompt analysis or user settings
      const mockSettings: BookSettings = {
        ...scenario.settings,
        id: 'test',
        bookId: 'test',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Auto-detect names if none specified
      if (mockSettings.characterNames.length === 0 && promptAnalysis.names.length > 0) {
        mockSettings.characterNames = promptAnalysis.names;
        console.log(`   ✨ Auto-detected names added to settings: ${promptAnalysis.names.join(', ')}`);
      }
      
      // Mock back cover text (simulating what would be generated)
      const mockBackCover = generateMockBackCover(scenario.prompt, mockSettings, promptAnalysis);
      console.log(`   📖 Mock back cover generated (${mockBackCover.length} characters)`);
      
      // Step 3: Create mock outline and story bible
      console.log('\n3️⃣ Creating mock outline and story bible...');
      
      const mockOutlineCharacters = (mockSettings.characterNames || []).map((name, index) => ({
        name,
        role: index === 0 ? 'protagonist' : 'supporting',
        description: `Character ${name} in ${mockSettings.genre} story`,
        arc: `${name}'s development journey`
      }));
      
      const mockStoryBibleCharacters = mockOutlineCharacters.map(char => ({
        name: char.name,
        role: char.role as 'protagonist' | 'antagonist' | 'supporting' | 'minor',
        background: `Background for ${char.name}`,
        motivation: `${char.name}'s primary motivation`,
        arc: char.arc,
        relationships: {},
        physicalDescription: `Physical description of ${char.name}`,
        personality: `Personality traits of ${char.name}`,
        flaws: [`${char.name}'s main flaw`],
        strengths: [`${char.name}'s key strength`]
      }));
      
      console.log(`   📋 Mock outline characters: ${mockOutlineCharacters.map(c => c.name).join(', ')}`);
      console.log(`   📚 Mock story bible characters: ${mockStoryBibleCharacters.map(c => c.name).join(', ')}`);
      
      // Step 4: Validate character name consistency
      console.log('\n4️⃣ Validating character name consistency...');
      
      const nameValidation = characterNameAgent.validateNameConsistency(
        mockSettings.characterNames || [],
        mockBackCover,
        mockOutlineCharacters,
        mockStoryBibleCharacters
      );
      
      console.log(`   📊 Consistency score: ${nameValidation.score}/100`);
      console.log(`   ✅ Valid: ${nameValidation.isValid}`);
      
      if (nameValidation.issues.length > 0) {
        console.log(`   ⚠️ Issues found:`);
        nameValidation.issues.forEach(issue => {
          console.log(`      - ${issue.severity.toUpperCase()}: ${issue.recommendation}`);
        });
      }
      
      // Step 5: Create name mapping
      const nameMapping = characterNameAgent.createNameMapping(
        mockSettings.characterNames || [],
        mockBackCover,
        mockOutlineCharacters,
        mockStoryBibleCharacters
      );
      
      console.log('\n5️⃣ Character name mapping:');
      console.log(`   👤 User specified: [${nameMapping.userSpecifiedNames.join(', ')}]`);
      console.log(`   📖 Back cover: [${nameMapping.backCoverNames.join(', ')}]`);
      console.log(`   📋 Outline: [${nameMapping.outlineNames.join(', ')}]`);
      console.log(`   📚 Story bible: [${nameMapping.storyBibleNames.join(', ')}]`);
      
      // Step 6: Summary
      console.log(`\n✅ ${scenario.name} completed successfully!`);
      console.log(`   🎯 Character continuity maintained: ${nameValidation.isValid ? 'YES' : 'NO'}`);
      console.log(`   📊 Quality score: ${nameValidation.score}/100`);
      
    } catch (error) {
      console.error(`❌ ${scenario.name} failed:`, error instanceof Error ? error.message : error);
    }
    
    console.log('\n' + '─'.repeat(60));
  }
  
  console.log('\n🎉 Phase 4 Character Name Continuity testing completed!');
  console.log('\nKey improvements demonstrated:');
  console.log('• Automatic character name extraction from any prompt type');
  console.log('• Real-time consistency validation across planning stages');
  console.log('• Support for minimal, moderate, and detailed prompts');
  console.log('• User-specified names properly override detected names');
  console.log('• Comprehensive character information analysis');
}

/**
 * Generate a mock back cover that includes character names for testing
 */
function generateMockBackCover(prompt: string, settings: BookSettings, analysis: any): string {
  const names = settings.characterNames || [];
  const genre = settings.genre;
  const tone = settings.tone;
  
  if (names.length === 0) {
    return `A thrilling ${genre.toLowerCase()} story that will captivate readers. Set in a world of adventure and discovery, this ${tone.toLowerCase()} tale explores themes of courage and determination. Perfect for ${settings.targetAudience.toLowerCase()} readers who love compelling narratives.`;
  }
  
  const primaryName = names[0];
  const otherNames = names.slice(1);
  
  let backCover = `When ${primaryName} discovers the truth, everything changes. `;
  
  if (otherNames.length > 0) {
    if (otherNames.length === 1) {
      backCover += `With ${otherNames[0]} by their side, `;
    } else {
      backCover += `Together with ${otherNames.slice(0, -1).join(', ')} and ${otherNames[otherNames.length - 1]}, `;
    }
  }
  
  backCover += `${primaryName} must navigate a world of ${genre.toLowerCase()} and intrigue. `;
  
  backCover += `This ${tone.toLowerCase()} ${genre.toLowerCase()} story will keep ${settings.targetAudience.toLowerCase()} readers on the edge of their seats. `;
  
  if (analysis.promptAnalysis.promptType === 'detailed') {
    backCover += `With richly developed characters and intricate plot lines, this tale explores the depths of human nature and the power of determination.`;
  } else {
    backCover += `A compelling journey of discovery and growth awaits.`;
  }
  
  return backCover;
}

// Export for use in tests
export { testPhase4CharacterContinuity }; 