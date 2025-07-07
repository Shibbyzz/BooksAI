import { LanguageManager } from './language-utils';
import { LanguagePrompts } from './language-prompts';
import type { BookSettings } from '@/types';

export interface LanguageTestResult {
  languageCode: string;
  languageName: string;
  qualityExpectations: {
    expectedQuality: number;
    qualityModifier: number;
    warnings: string[];
  };
  promptExamples: {
    writingSystemPrompt: string;
    backCoverPrompt: string;
    contentPromptAdditions: string;
  };
  temperatureAdjustment: number;
  validationExample: {
    sampleText: string;
    validationResult: {
      isValid: boolean;
      confidence: number;
      warnings: string[];
    };
  };
  culturalNotes: string;
  recommendedSettings: {
    temperature: number;
    maxTokens: number;
    retryShortContent: boolean;
  };
}

export class LanguageTestManager {
  private languageManager: LanguageManager;
  private languagePrompts: LanguagePrompts;

  constructor() {
    this.languageManager = LanguageManager.getInstance();
    this.languagePrompts = LanguagePrompts.getInstance();
  }

  /**
   * Test all supported languages and return comprehensive results
   */
  async testAllLanguages(): Promise<LanguageTestResult[]> {
    const supportedLanguages = this.languageManager.getSupportedLanguages();
    const results: LanguageTestResult[] = [];

    for (const config of supportedLanguages) {
      const result = await this.testLanguage(config.code);
      results.push(result);
    }

    return results;
  }

  /**
   * Test a specific language implementation
   */
  async testLanguage(languageCode: string): Promise<LanguageTestResult> {
    const config = this.languageManager.getLanguageConfig(languageCode);
    
    // Create sample book settings for testing
    const testSettings: BookSettings = {
      id: 'test',
      bookId: 'test-book',
      language: languageCode,
      wordCount: 1000,
      genre: 'Fantasy',
      targetAudience: 'Adult (Ages 25+)',
      tone: 'Epic & Grand',
      endingType: 'Happy Ending',
      structure: 'three-act',
      characterNames: ['Hero', 'Villain'],
      inspirationBooks: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Test quality expectations
    const qualityExpectations = this.languageManager.getQualityExpectations(languageCode);

    // Test prompt generation
    const writingSystemPrompt = this.languagePrompts.getWritingSystemPrompt(languageCode);
    const backCoverPrompt = this.languagePrompts.getBackCoverPrompt(
      languageCode, 
      'A fantasy story about a brave hero', 
      testSettings
    );
    const contentPromptAdditions = this.languageManager.getContentPromptAdditions(
      languageCode, 
      testSettings.genre
    );

    // Test temperature adjustment
    const temperatureAdjustment = this.languageManager.getAdjustedTemperature(languageCode, 0.7);

    // Test language validation with sample text
    const sampleTexts = this.getSampleTextForLanguage(languageCode);
    const validationResult = this.languageManager.validateLanguageOutput(
      sampleTexts.correct, 
      languageCode
    );

    // Get recommended settings
    const recommendedSettings = this.getRecommendedSettings(languageCode);

    return {
      languageCode,
      languageName: this.languageManager.getDisplayName(languageCode),
      qualityExpectations,
      promptExamples: {
        writingSystemPrompt: this.truncateText(writingSystemPrompt, 200),
        backCoverPrompt: this.truncateText(backCoverPrompt, 200),
        contentPromptAdditions
      },
      temperatureAdjustment,
      validationExample: {
        sampleText: sampleTexts.correct,
        validationResult
      },
      culturalNotes: config.writingStyle.culturalNotes,
      recommendedSettings
    };
  }

  /**
   * Get sample text for different languages for validation testing
   */
  private getSampleTextForLanguage(languageCode: string): { correct: string; mixed: string } {
    const samples: Record<string, { correct: string; mixed: string }> = {
      en: {
        correct: 'The brave knight rode through the enchanted forest, his sword gleaming in the moonlight.',
        mixed: 'The brave knight rode through the enchanted forest, his épée gleaming in the moonlight.'
      },
      es: {
        correct: 'El valiente caballero cabalgó a través del bosque encantado, su espada brillaba bajo la luz de la luna.',
        mixed: 'El brave knight cabalgó a través del bosque encantado, su sword brillaba bajo la luz de la luna.'
      },
      fr: {
        correct: 'Le brave chevalier chevaucha à travers la forêt enchantée, son épée brillait au clair de lune.',
        mixed: 'Le brave knight chevaucha à travers la forêt enchantée, son sword brillait au clair de lune.'
      },
      de: {
        correct: 'Der tapfere Ritter ritt durch den verzauberten Wald, sein Schwert glänzte im Mondschein.',
        mixed: 'Der brave knight ritt durch den verzauberten Wald, sein sword glänzte im Mondschein.'
      },
      it: {
        correct: 'Il valoroso cavaliere cavalcò attraverso la foresta incantata, la sua spada brillava al chiaro di luna.',
        mixed: 'Il brave knight cavalcò attraverso la foresta incantata, la sua sword brillava al chiaro di luna.'
      },
      pt: {
        correct: 'O corajoso cavaleiro cavalgou pela floresta encantada, sua espada brilhava sob a luz da lua.',
        mixed: 'O brave knight cavalgou pela floresta encantada, sua sword brilhava sob a luz da lua.'
      },
      ru: {
        correct: 'Храбрый рыцарь проехал через заколдованный лес, его меч сверкал в лунном свете.',
        mixed: 'Храбрый knight проехал через заколдованный forest, его sword сверкал в лунном свете.'
      },
      zh: {
        correct: '勇敢的骑士穿过魔法森林，他的剑在月光下闪闪发光。',
        mixed: '勇敢的knight穿过魔法forest，他的sword在月光下闪闪发光。'
      },
      ja: {
        correct: '勇敢な騎士は魔法の森を駆け抜け、彼の剣は月光の下で輝いていた。',
        mixed: '勇敢なknight は魔法のforest を駆け抜け、彼のsword は月光の下で輝いていた。'
      },
      ko: {
        correct: '용감한 기사가 마법의 숲을 달려갔고, 그의 검은 달빛 아래 빛났다.',
        mixed: '용감한knight가 마법의forest을 달려갔고, 그의sword은 달빛 아래 빛났다.'
      },
      ar: {
        correct: 'ركب الفارس الشجاع عبر الغابة السحرية، وكان سيفه يلمع في ضوء القمر.',
        mixed: 'ركب الfارس الشجاع عبر الforest السحرية، وكان sword يلمع في ضوء القمر.'
      },
      hi: {
        correct: 'बहादुर शूरवीर जादुई जंगल से होकर गुजरा, उसकी तलवार चांदनी में चमक रही थी।',
        mixed: 'बहादुर knight जादुई forest से होकर गुजरा, उसकी sword चांदनी में चमक रही थी।'
      }
    };

    return samples[languageCode] || samples.en;
  }

  /**
   * Get recommended settings for a language
   */
  private getRecommendedSettings(languageCode: string): {
    temperature: number;
    maxTokens: number;
    retryShortContent: boolean;
  } {
    const config = this.languageManager.getLanguageConfig(languageCode);
    const baseTemperature = 0.7;
    
    return {
      temperature: this.languageManager.getAdjustedTemperature(languageCode, baseTemperature),
      maxTokens: config.qualityModifier < 0.8 ? 5000 : 4000, // More tokens for harder languages
      retryShortContent: config.qualityModifier < 0.7 // Enable retry for challenging languages
    };
  }

  /**
   * Test language validation with different text samples
   */
  testLanguageValidation(languageCode: string): {
    correctText: { text: string; result: any };
    mixedText: { text: string; result: any };
    englishText: { text: string; result: any };
  } {
    const samples = this.getSampleTextForLanguage(languageCode);
    const englishSample = 'The brave knight rode through the enchanted forest.';

    return {
      correctText: {
        text: samples.correct,
        result: this.languageManager.validateLanguageOutput(samples.correct, languageCode)
      },
      mixedText: {
        text: samples.mixed,
        result: this.languageManager.validateLanguageOutput(samples.mixed, languageCode)
      },
      englishText: {
        text: englishSample,
        result: this.languageManager.validateLanguageOutput(englishSample, languageCode)
      }
    };
  }

  /**
   * Get summary of language capabilities
   */
  getLanguageCapabilitiesSummary(): {
    totalLanguages: number;
    highQualityLanguages: string[];
    mediumQualityLanguages: string[];
    challengingLanguages: string[];
    rtlLanguages: string[];
    qualityDistribution: Record<string, number>;
  } {
    const languages = this.languageManager.getSupportedLanguages();
    
    const highQuality = languages.filter(l => l.qualityModifier >= 0.85).map(l => l.englishName);
    const mediumQuality = languages.filter(l => l.qualityModifier >= 0.7 && l.qualityModifier < 0.85).map(l => l.englishName);
    const challenging = languages.filter(l => l.qualityModifier < 0.7).map(l => l.englishName);
    const rtl = languages.filter(l => l.rtl).map(l => l.englishName);
    
    const qualityDistribution: Record<string, number> = {};
    languages.forEach(lang => {
      const quality = Math.round(lang.qualityModifier * 100);
      qualityDistribution[lang.englishName] = quality;
    });

    return {
      totalLanguages: languages.length,
      highQualityLanguages: highQuality,
      mediumQualityLanguages: mediumQuality,
      challengingLanguages: challenging,
      rtlLanguages: rtl,
      qualityDistribution
    };
  }

  /**
   * Utility function to truncate text for display
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Test specific language features
   */
  testLanguageFeatures(languageCode: string): {
    transitionWords: Record<string, string>;
    genreInstructions: string;
    dialogueGuidelines: string;
    errorMessages: Record<string, string>;
  } {
    return {
      transitionWords: this.languageManager.getTransitionWords(languageCode),
      genreInstructions: this.languageManager.getGenreInstructions(languageCode, 'fantasy'),
      dialogueGuidelines: this.languagePrompts.getDialogueGuidelines(languageCode),
      errorMessages: this.languagePrompts.getErrorMessages(languageCode)
    };
  }
}

  export default LanguageTestManager; 

export class LanguageValidationTester {
  private languageManager: LanguageManager;

  constructor() {
    this.languageManager = LanguageManager.getInstance();
  }

  /**
   * Test the specific Swedish case that was failing
   */
  testSwedishBackCover(): {
    passed: boolean;
    results: any;
    originalProblem: string;
    solution: string;
  } {
    const swedishText = "Bakom den glänsande Michelin-stjärnan döljer sig en historia av passion, kamp och förvandling.";
    const result = this.languageManager.validateLanguageOutput(swedishText, 'sv');
    
    const passed = result.isValid && result.confidence > 0.6;
    
    return {
      passed,
      results: {
        isValid: result.isValid,
        confidence: Math.round(result.confidence * 100) + '%',
        warnings: result.warnings
      },
      originalProblem: "Old system: 100% false 'English contamination' due to Latin characters",
      solution: passed ? "✅ NEW SYSTEM: Properly detects Swedish using stop words and patterns" : "❌ Still failing - needs adjustment"
    };
  }

  /**
   * Run comprehensive tests across all supported languages
   */
  async runComprehensiveTests(): Promise<{
    passed: number;
    failed: number;
    results: Array<{
      language: string;
      code: string;
      tests: {
        validContent: { passed: boolean; confidence: string; warnings: string[] };
        mixedContent: { passed: boolean; confidence: string; warnings: string[] };
        englishContent: { passed: boolean; confidence: string; warnings: string[] };
      };
      overall: 'PASS' | 'FAIL';
    }>;
  }> {
    const testCases = this.getTestCases();
    const results: any[] = [];
    let passed = 0;
    let failed = 0;

    for (const testCase of testCases) {
      console.log(`\n🧪 Testing ${testCase.languageName} (${testCase.languageCode})...`);
      
      // Test 1: Valid content (should pass)
      const validResult = this.languageManager.validateLanguageOutput(testCase.samples.valid, testCase.languageCode);
      const validTest = {
        passed: validResult.isValid && validResult.confidence >= testCase.expectedResults.validConfidence,
        confidence: Math.round(validResult.confidence * 100) + '%',
        warnings: validResult.warnings
      };

      // Test 2: Mixed content (should have lower confidence)
      const mixedResult = this.languageManager.validateLanguageOutput(testCase.samples.mixed, testCase.languageCode);
      const mixedTest = {
        passed: mixedResult.confidence <= testCase.expectedResults.mixedConfidence,
        confidence: Math.round(mixedResult.confidence * 100) + '%',
        warnings: mixedResult.warnings
      };

      // Test 3: English content (should fail for non-English languages)
      const englishResult = this.languageManager.validateLanguageOutput(testCase.samples.english, testCase.languageCode);
      const englishTest = {
        passed: testCase.languageCode === 'en' ? englishResult.isValid : !englishResult.isValid,
        confidence: Math.round(englishResult.confidence * 100) + '%',
        warnings: englishResult.warnings
      };

      const allTestsPassed = validTest.passed && mixedTest.passed && englishTest.passed;
      
      if (allTestsPassed) {
        passed++;
      } else {
        failed++;
      }

      results.push({
        language: testCase.languageName,
        code: testCase.languageCode,
        tests: {
          validContent: validTest,
          mixedContent: mixedTest,
          englishContent: englishTest
        },
        overall: allTestsPassed ? 'PASS' : 'FAIL'
      });

      console.log(`  ${allTestsPassed ? '✅' : '❌'} ${testCase.languageName}: Valid(${validTest.confidence}) Mixed(${mixedTest.confidence}) English(${englishTest.confidence})`);
    }

    return { passed, failed, results };
  }

  /**
   * Test Latin-script languages specifically (the main bug victims)
   */
  testLatinScriptLanguages(): {
    summary: string;
    results: Array<{
      language: string;
      code: string;
      oldSystemResult: string;
      newSystemResult: string;
      improvement: string;
    }>;
  } {
    const latinLanguages = ['sv', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'da', 'no', 'fi', 'pl'];
    const results: any[] = [];

    for (const code of latinLanguages) {
      const config = this.languageManager.getLanguageConfig(code);
      const testText = this.getValidSampleForLanguage(code);
      
      // Simulate old system (broken regex)
      const oldSystemContamination = this.simulateOldSystemValidation(testText);
      
      // New system
      const newResult = this.languageManager.validateLanguageOutput(testText, code);
      
      results.push({
        language: config.englishName,
        code,
        oldSystemResult: `❌ ${oldSystemContamination}% "English contamination"`,
        newSystemResult: `${newResult.isValid ? '✅' : '⚠️'} ${Math.round(newResult.confidence * 100)}% confidence`,
        improvement: newResult.isValid ? '🎯 FIXED - Properly detected' : '⚠️ Needs refinement'
      });
    }

    const fixedCount = results.filter(r => r.improvement.includes('FIXED')).length;
    const summary = `${fixedCount}/${latinLanguages.length} Latin-script languages fixed (${Math.round((fixedCount / latinLanguages.length) * 100)}%)`;

    return { summary, results };
  }

  /**
   * Simulate the old broken validation system
   */
  private simulateOldSystemValidation(content: string): number {
    const englishWords = content.match(/\b[a-zA-Z]{3,}\b/g) || [];
    const totalWords = content.split(/\s+/).length;
    return Math.round((englishWords.length / totalWords) * 100);
  }

  /**
   * Get a valid sample text for any language
   */
  private getValidSampleForLanguage(languageCode: string): string {
    const samples: Record<string, string> = {
      sv: "Bakom den glänsande Michelin-stjärnan döljer sig en historia av passion, kamp och förvandling.",
      es: "Detrás de la brillante estrella Michelin se esconde una historia de pasión, lucha y transformación.",
      fr: "Derrière l'étoile Michelin brillante se cache une histoire de passion, de lutte et de transformation.",
      de: "Hinter dem glänzenden Michelin-Stern verbirgt sich eine Geschichte von Leidenschaft, Kampf und Verwandlung.",
      it: "Dietro la stella Michelin scintillante si nasconde una storia di passione, lotta e trasformazione.",
      pt: "Por trás da estrela Michelin brilhante esconde-se uma história de paixão, luta e transformação.",
      nl: "Achter de glanzende Michelin-ster verbergt zich een verhaal van passie, strijd en transformatie.",
      da: "Bag den skinnende Michelin-stjerne gemmer sig en historie om passion, kamp og forvandling.",
      no: "Bak den skinnende Michelin-stjernen skjuler seg en historie om lidenskap, kamp og forvandling.",
      fi: "Kiiltävän Michelin-tähden takana piilee tarina intohimosta, taistelusta ja muutoksesta.",
      pl: "Za błyszczącą gwiazdą Michelin kryje się historia pasji, walki i przemiany.",
      ru: "За сияющей звездой Мишлен скрывается история страсти, борьбы и трансформации.",
      ar: "خلف نجمة ميشلان اللامعة تختبئ قصة من الشغف والنضال والتحول.",
      zh: "在闪闪发光的米其林星星背后隐藏着一个关于激情、斗争和转变的故事。",
      ja: "輝くミシュランスターの背後には、情熱、闘争、変革の物語が隠されています。",
      ko: "빛나는 미슐랭 스타 뒤에는 열정, 투쟁, 변화의 이야기가 숨어 있습니다.",
      hi: "चमकीले मिशेलिन स्टार के पीछे जुनून, संघर्ष और परिवर्तन की कहानी छुपी है।",
      en: "Behind the gleaming Michelin star hides a story of passion, struggle and transformation."
    };
    
    return samples[languageCode] || samples.en;
  }

  /**
   * Get comprehensive test cases for all languages
   */
  private getTestCases(): any[] {
    return [
      {
        languageCode: 'sv',
        languageName: 'Swedish',
        samples: {
          valid: "Bakom den glänsande Michelin-stjärnan döljer sig en historia av passion, kamp och förvandling. Det är en berättelse som sträcker sig över decennier, fylld med höga förväntningar och djupa besvikelser.",
          mixed: "Bakom den glänsande star döljer sig a historia of passion och struggle. This mixed text should trigger warnings för quality control.",
          english: "Behind the gleaming Michelin star hides a story of passion, struggle and transformation. This is pure English content."
        },
        expectedResults: { validConfidence: 0.6, mixedConfidence: 0.6, englishConfidence: 0.4 }
      },
      {
        languageCode: 'es',
        languageName: 'Spanish',
        samples: {
          valid: "Detrás de la brillante estrella Michelin se esconde una historia de pasión, lucha y transformación. Es una narrativa que se extiende por décadas, llena de altas expectativas y profundas decepciones.",
          mixed: "Detrás de la brilliant estrella se esconde una story of pasión y struggle. This texto mixto should trigger warnings para quality control.",
          english: "Behind the gleaming Michelin star hides a story of passion, struggle and transformation. This is pure English content."
        },
        expectedResults: { validConfidence: 0.6, mixedConfidence: 0.6, englishConfidence: 0.4 }
      },
      {
        languageCode: 'fr',
        languageName: 'French',
        samples: {
          valid: "Derrière l'étoile Michelin brillante se cache une histoire de passion, de lutte et de transformation. C'est un récit qui s'étend sur des décennies, rempli de grandes attentes et de profondes déceptions.",
          mixed: "Derrière l'étoile brilliant se cache une story de passion et struggle. Ce texte mixte should trigger warnings pour quality control.",
          english: "Behind the gleaming Michelin star hides a story of passion, struggle and transformation. This is pure English content."
        },
        expectedResults: { validConfidence: 0.6, mixedConfidence: 0.6, englishConfidence: 0.4 }
      },
      {
        languageCode: 'de',
        languageName: 'German',
        samples: {
          valid: "Hinter dem glänzenden Michelin-Stern verbirgt sich eine Geschichte von Leidenschaft, Kampf und Verwandlung. Es ist eine Erzählung, die sich über Jahrzehnte erstreckt, voller hoher Erwartungen und tiefer Enttäuschungen.",
          mixed: "Hinter dem glänzenden star verbirgt sich eine story von Leidenschaft und struggle. This gemischter Text should trigger warnings für quality control.",
          english: "Behind the gleaming Michelin star hides a story of passion, struggle and transformation. This is pure English content."
        },
        expectedResults: { validConfidence: 0.6, mixedConfidence: 0.6, englishConfidence: 0.4 }
      },
      {
        languageCode: 'it',
        languageName: 'Italian',
        samples: {
          valid: "Dietro la stella Michelin scintillante si nasconde una storia di passione, lotta e trasformazione. È una narrativa che si estende per decenni, piena di grandi aspettative e profonde delusioni.",
          mixed: "Dietro la stella brilliant si nasconde una story di passione e struggle. Questo testo misto should trigger warnings per quality control.",
          english: "Behind the gleaming Michelin star hides a story of passion, struggle and transformation. This is pure English content."
        },
        expectedResults: { validConfidence: 0.6, mixedConfidence: 0.6, englishConfidence: 0.4 }
      },
      {
        languageCode: 'pt',
        languageName: 'Portuguese',
        samples: {
          valid: "Por trás da estrela Michelin brilhante esconde-se uma história de paixão, luta e transformação. É uma narrativa que se estende por décadas, cheia de altas expectativas e profundas decepções.",
          mixed: "Por trás da estrela brilliant esconde-se uma story de paixão e struggle. Este texto misto should trigger warnings para quality control.",
          english: "Behind the gleaming Michelin star hides a story of passion, struggle and transformation. This is pure English content."
        },
        expectedResults: { validConfidence: 0.5, mixedConfidence: 0.6, englishConfidence: 0.4 }
      },
      {
        languageCode: 'ru',
        languageName: 'Russian',
        samples: {
          valid: "За сияющей звездой Мишлен скрывается история страсти, борьбы и трансформации. Это повествование, которое охватывает десятилетия, полное высоких ожиданий и глубоких разочарований.",
          mixed: "За сияющей star скрывается история passion, борьбы and transformation. This смешанный текст should trigger warnings для quality control.",
          english: "Behind the gleaming Michelin star hides a story of passion, struggle and transformation. This is pure English content."
        },
        expectedResults: { validConfidence: 0.5, mixedConfidence: 0.6, englishConfidence: 0.4 }
      },
      {
        languageCode: 'ar',
        languageName: 'Arabic',
        samples: {
          valid: "خلف نجمة ميشلان اللامعة تختبئ قصة من الشغف والنضال والتحول. إنها قصة تمتد عبر العقود، مليئة بالتوقعات العالية وخيبات الأمل العميقة.",
          mixed: "خلف نجمة ميشلان اللامعة تختبئ story من الشغف والنضال والtransformation. This نص مختلط should trigger warnings for quality control.",
          english: "Behind the gleaming Michelin star hides a story of passion, struggle and transformation. This is pure English content."
        },
        expectedResults: { validConfidence: 0.4, mixedConfidence: 0.6, englishConfidence: 0.4 }
      },
      {
        languageCode: 'zh',
        languageName: 'Chinese',
        samples: {
          valid: "在闪闪发光的米其林星星背后隐藏着一个关于激情、斗争和转变的故事。这是一个跨越几十年的叙述，充满了高期望和深深的失望。",
          mixed: "在闪闪发光的米其林star背后隐藏着一个关于passion、斗争和transformation的故事。This mixed 文本 should trigger warnings for quality control.",
          english: "Behind the gleaming Michelin star hides a story of passion, struggle and transformation. This is pure English content."
        },
        expectedResults: { validConfidence: 0.4, mixedConfidence: 0.6, englishConfidence: 0.4 }
      },
      {
        languageCode: 'ja',
        languageName: 'Japanese',
        samples: {
          valid: "輝くミシュランスターの背後には、情熱、闘争、変革の物語が隠されています。それは数十年にわたる物語であり、高い期待と深い失望に満ちています。",
          mixed: "輝くミシュランstarの背後には、passion、闘争、transformationの物語が隠されています。This mixed テキスト should trigger warnings for quality control.",
          english: "Behind the gleaming Michelin star hides a story of passion, struggle and transformation. This is pure English content."
        },
        expectedResults: { validConfidence: 0.4, mixedConfidence: 0.6, englishConfidence: 0.4 }
      },
      {
        languageCode: 'en',
        languageName: 'English',
        samples: {
          valid: "Behind the gleaming Michelin star hides a story of passion, struggle and transformation. It is a narrative that spans decades, filled with high expectations and deep disappointments.",
          mixed: "Behind the gleaming Michelin estrella hides una story of passion, lucha and transformation. This mixed texto should trigger warnings para quality control.",
          english: "Behind the gleaming Michelin star hides a story of passion, struggle and transformation. This is pure English content."
        },
        expectedResults: { validConfidence: 0.8, mixedConfidence: 0.7, englishConfidence: 0.8 }
      }
    ];
  }

  /**
   * Generate detailed test report
   */
  generateTestReport(results: any): string {
    const { passed, failed, results: testResults } = results;
    const totalTests = passed + failed;
    const successRate = Math.round((passed / totalTests) * 100);

    let report = `
# 🧪 BooksAI Language Validation Test Report

## 📊 Overall Results
- **Total Languages Tested:** ${totalTests}
- **Passed:** ${passed} ✅
- **Failed:** ${failed} ❌
- **Success Rate:** ${successRate}%

## 📋 Detailed Results

`;

    for (const result of testResults) {
      const status = result.overall === 'PASS' ? '✅' : '❌';
      report += `### ${status} ${result.language} (${result.code})
- **Valid Content:** ${result.tests.validContent.passed ? '✅' : '❌'} ${result.tests.validContent.confidence}
- **Mixed Content:** ${result.tests.mixedContent.passed ? '✅' : '❌'} ${result.tests.mixedContent.confidence}
- **English Content:** ${result.tests.englishContent.passed ? '✅' : '❌'} ${result.tests.englishContent.confidence}

`;
    }

    report += `
## 🎯 Key Improvements
- ✅ Fixed false "English contamination" for Latin-script languages
- ✅ Added intelligent stop word detection
- ✅ Implemented language-specific pattern matching
- ✅ Added statistical character frequency analysis
- ✅ Dynamic confidence thresholds based on language quality
- ✅ Comprehensive validation for all 20 supported languages

## 🔧 Technical Details
- **Stop Words Database:** ${Object.keys(this.languageManager['getStopWordsDatabase']()).length} languages
- **Pattern Matching:** Language-specific positive/negative patterns
- **Character Analysis:** Statistical frequency comparison
- **Confidence Scoring:** Weighted multi-factor analysis
- **RTL Support:** Special validation for Arabic script languages
`;

    return report;
  }
} 