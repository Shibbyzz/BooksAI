export interface LanguageConfig {
  code: string;
  name: string;
  englishName: string;
  rtl: boolean;
  nativeInstructions: string;
  qualityModifier: number; // 0.5 - 1.0 (where 1.0 is English quality)
  temperatureAdjustment: number; // -0.2 to +0.2
  specificInstructions: string;
  commonPhrases: Record<string, string>;
  writingStyle: {
    sentenceStructure: string;
    paragraphLength: string;
    formalityLevel: string;
    culturalNotes: string;
  };
  genreAdaptations: Record<string, string>;
  warnings: string[];
}

export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    englishName: 'English',
    rtl: false,
    nativeInstructions: 'Write in clear, engaging English',
    qualityModifier: 1.0,
    temperatureAdjustment: 0.0,
    specificInstructions: 'Use varied sentence structures, active voice, and compelling narrative flow.',
    commonPhrases: {
      meanwhile: 'Meanwhile',
      suddenly: 'Suddenly',
      however: 'However',
      therefore: 'Therefore',
      moreover: 'Moreover'
    },
    writingStyle: {
      sentenceStructure: 'varied and dynamic',
      paragraphLength: 'medium to long',
      formalityLevel: 'accessible',
      culturalNotes: 'Universal English conventions'
    },
    genreAdaptations: {
      fantasy: 'Use rich, descriptive language with mythical elements',
      'science fiction': 'Incorporate technical terminology and futuristic concepts',
      romance: 'Focus on emotional depth and relationship dynamics',
      mystery: 'Build tension through pacing and revelation',
      thriller: 'Maintain fast-paced, suspenseful narrative'
    },
    warnings: []
  },
  
  es: {
    code: 'es',
    name: 'Español',
    englishName: 'Spanish',
    rtl: false,
    nativeInstructions: 'Escribe en español claro y envolvente',
    qualityModifier: 0.85,
    temperatureAdjustment: 0.1,
    specificInstructions: 'Utiliza estructuras de oración variadas, voz activa y un flujo narrativo convincente. Mantén la fluidez del español nativo.',
    commonPhrases: {
      meanwhile: 'Mientras tanto',
      suddenly: 'De repente',
      however: 'Sin embargo',
      therefore: 'Por lo tanto',
      moreover: 'Además'
    },
    writingStyle: {
      sentenceStructure: 'fluida y expresiva',
      paragraphLength: 'medio a largo',
      formalityLevel: 'accesible',
      culturalNotes: 'Usar expresiones idiomáticas hispanas cuando sea apropiado'
    },
    genreAdaptations: {
      fantasy: 'Usar lenguaje rico y descriptivo con elementos míticos',
      'science fiction': 'Incorporar terminología técnica y conceptos futuristas',
      romance: 'Enfocarse en profundidad emocional y dinámicas de relaciones',
      mystery: 'Construir tensión através del ritmo y revelación',
      thriller: 'Mantener narrativa rápida y suspensiva'
    },
    warnings: ['May have slight quality reduction in complex technical terminology']
  },
  
  fr: {
    code: 'fr',
    name: 'Français',
    englishName: 'French',
    rtl: false,
    nativeInstructions: 'Écrivez en français clair et captivant',
    qualityModifier: 0.88,
    temperatureAdjustment: 0.05,
    specificInstructions: 'Utilisez des structures de phrases variées, la voix active et un flux narratif convaincant. Maintenez l\'élégance du français littéraire.',
    commonPhrases: {
      meanwhile: 'Pendant ce temps',
      suddenly: 'Soudain',
      however: 'Cependant',
      therefore: 'Par conséquent',
      moreover: 'De plus'
    },
    writingStyle: {
      sentenceStructure: 'élégante et sophistiquée',
      paragraphLength: 'moyen à long',
      formalityLevel: 'légèrement soutenu',
      culturalNotes: 'Respecter les conventions littéraires françaises'
    },
    genreAdaptations: {
      fantasy: 'Utiliser un langage riche et descriptif avec des éléments mythiques',
      'science fiction': 'Incorporer la terminologie technique et les concepts futuristes',
      romance: 'Se concentrer sur la profondeur émotionnelle et la dynamique relationnelle',
      mystery: 'Construire la tension par le rythme et la révélation',
      thriller: 'Maintenir un récit rapide et suspensif'
    },
    warnings: ['May require additional review for complex literary expressions']
  },
  
  de: {
    code: 'de',
    name: 'Deutsch',
    englishName: 'German',
    rtl: false,
    nativeInstructions: 'Schreiben Sie in klarem, fesselndem Deutsch',
    qualityModifier: 0.82,
    temperatureAdjustment: 0.1,
    specificInstructions: 'Verwenden Sie abwechslungsreiche Satzstrukturen, aktive Stimme und einen überzeugenden Erzählfluss. Achten Sie auf deutsche Grammatik und Wortstellung.',
    commonPhrases: {
      meanwhile: 'Währenddessen',
      suddenly: 'Plötzlich',
      however: 'Jedoch',
      therefore: 'Daher',
      moreover: 'Außerdem'
    },
    writingStyle: {
      sentenceStructure: 'präzise und ausdrucksvoll',
      paragraphLength: 'mittel bis lang',
      formalityLevel: 'zugänglich',
      culturalNotes: 'Deutsche Erzähltraditionen respektieren'
    },
    genreAdaptations: {
      fantasy: 'Reiche, beschreibende Sprache mit mythischen Elementen verwenden',
      'science fiction': 'Technische Terminologie und futuristische Konzepte einbeziehen',
      romance: 'Fokus auf emotionale Tiefe und Beziehungsdynamik',
      mystery: 'Spannung durch Tempo und Enthüllung aufbauen',
      thriller: 'Schnelle, spannungsreiche Erzählung beibehalten'
    },
    warnings: ['Complex compound sentences may need additional review']
  },
  
  it: {
    code: 'it',
    name: 'Italiano',
    englishName: 'Italian',
    rtl: false,
    nativeInstructions: 'Scrivi in italiano chiaro e coinvolgente',
    qualityModifier: 0.83,
    temperatureAdjustment: 0.08,
    specificInstructions: 'Utilizza strutture di frasi varie, voce attiva e un flusso narrativo convincente. Mantieni la musicalità dell\'italiano.',
    commonPhrases: {
      meanwhile: 'Nel frattempo',
      suddenly: 'Improvvisamente',
      however: 'Tuttavia',
      therefore: 'Pertanto',
      moreover: 'Inoltre'
    },
    writingStyle: {
      sentenceStructure: 'musicale e espressiva',
      paragraphLength: 'medio a lungo',
      formalityLevel: 'accessibile',
      culturalNotes: 'Rispettare le tradizioni narrative italiane'
    },
    genreAdaptations: {
      fantasy: 'Usare linguaggio ricco e descrittivo con elementi mitici',
      'science fiction': 'Incorporare terminologia tecnica e concetti futuristici',
      romance: 'Concentrarsi sulla profondità emotiva e le dinamiche relazionali',
      mystery: 'Costruire tensione attraverso ritmo e rivelazione',
      thriller: 'Mantenere narrativa veloce e suspensiva'
    },
    warnings: ['May benefit from additional review for literary style']
  },
  
  pt: {
    code: 'pt',
    name: 'Português',
    englishName: 'Portuguese',
    rtl: false,
    nativeInstructions: 'Escreva em português claro e envolvente',
    qualityModifier: 0.80,
    temperatureAdjustment: 0.12,
    specificInstructions: 'Use estruturas de frases variadas, voz ativa e fluxo narrativo convincente. Mantenha a fluidez do português literário.',
    commonPhrases: {
      meanwhile: 'Enquanto isso',
      suddenly: 'De repente',
      however: 'No entanto',
      therefore: 'Portanto',
      moreover: 'Além disso'
    },
    writingStyle: {
      sentenceStructure: 'fluida e expressiva',
      paragraphLength: 'médio a longo',
      formalityLevel: 'acessível',
      culturalNotes: 'Respeitar convenções literárias lusófonas'
    },
    genreAdaptations: {
      fantasy: 'Usar linguagem rica e descritiva com elementos míticos',
      'science fiction': 'Incorporar terminologia técnica e conceitos futuristas',
      romance: 'Focar na profundidade emocional e dinâmicas relacionais',
      mystery: 'Construir tensão através do ritmo e revelação',
      thriller: 'Manter narrativa rápida e suspensiva'
    },
    warnings: ['May require additional review for Brazilian vs European Portuguese variations']
  },

  sv: {
    code: 'sv',
    name: 'Svenska',
    englishName: 'Swedish',
    rtl: false,
    nativeInstructions: 'Skriv på klar och engagerande svenska',
    qualityModifier: 0.78,
    temperatureAdjustment: 0.15,
    specificInstructions: 'Använd varierade meningsstrukturer, aktiv röst och övertygande berättarflöde. Behåll svensk språklig elegans.',
    commonPhrases: {
      meanwhile: 'Samtidigt',
      suddenly: 'Plötsligt',
      however: 'Dock',
      therefore: 'Därför',
      moreover: 'Dessutom'
    },
    writingStyle: {
      sentenceStructure: 'flytande och uttrycksfull',
      paragraphLength: 'medel till lång',
      formalityLevel: 'tillgänglig',
      culturalNotes: 'Respektera nordiska berättartraditioner'
    },
    genreAdaptations: {
      fantasy: 'Använd rikt, beskrivande språk med mytiska element',
      'science fiction': 'Integrera teknisk terminologi och futuristiska koncept',
      romance: 'Fokusera på emotionellt djup och relationsdynamik',
      mystery: 'Bygga spänning genom tempo och avslöjande',
      thriller: 'Upprätthålla snabbt, spänningsfylt berättande'
    },
    warnings: ['May have slight quality reduction in complex literary expressions']
  },
  
  ru: {
    code: 'ru',
    name: 'Русский',
    englishName: 'Russian',
    rtl: false,
    nativeInstructions: 'Пишите на ясном, захватывающем русском языке',
    qualityModifier: 0.72,
    temperatureAdjustment: 0.15,
    specificInstructions: 'Используйте разнообразные структуры предложений, активный залог и убедительный повествовательный поток. Соблюдайте грамматику русского языка.',
    commonPhrases: {
      meanwhile: 'Тем временем',
      suddenly: 'Внезапно',
      however: 'Однако',
      therefore: 'Поэтому',
      moreover: 'Более того'
    },
    writingStyle: {
      sentenceStructure: 'выразительная и богатая',
      paragraphLength: 'средний до длинного',
      formalityLevel: 'доступный',
      culturalNotes: 'Соблюдать русские литературные традиции'
    },
    genreAdaptations: {
      fantasy: 'Использовать богатый описательный язык с мифическими элементами',
      'science fiction': 'Включать техническую терминологию и футуристические концепции',
      romance: 'Сосредоточиться на эмоциональной глубине и динамике отношений',
      mystery: 'Строить напряжение через темп и раскрытие',
      thriller: 'Поддерживать быстрый напряженный нарратив'
    },
    warnings: ['Significant quality reduction expected - recommend professional review']
  },
  
  zh: {
    code: 'zh',
    name: '中文',
    englishName: 'Chinese (Simplified)',
    rtl: false,
    nativeInstructions: '用清晰、引人入胜的中文写作',
    qualityModifier: 0.65,
    temperatureAdjustment: 0.2,
    specificInstructions: '使用多样的句式结构、主动语态和令人信服的叙述流程。保持中文的表达特色。',
    commonPhrases: {
      meanwhile: '与此同时',
      suddenly: '突然',
      however: '然而',
      therefore: '因此',
      moreover: '此外'
    },
    writingStyle: {
      sentenceStructure: '简洁而富有表现力',
      paragraphLength: '中等长度',
      formalityLevel: '通俗易懂',
      culturalNotes: '遵循中文叙事传统'
    },
    genreAdaptations: {
      fantasy: '使用丰富的描述性语言和神话元素',
      'science fiction': '融入技术术语和未来概念',
      romance: '专注于情感深度和关系动态',
      mystery: '通过节奏和揭示构建紧张感',
      thriller: '保持快节奏和悬疑叙述'
    },
    warnings: ['Major quality reduction expected - strong recommend professional translation review']
  },
  
  ja: {
    code: 'ja',
    name: '日本語',
    englishName: 'Japanese',
    rtl: false,
    nativeInstructions: '明確で魅力的な日本語で書いてください',
    qualityModifier: 0.62,
    temperatureAdjustment: 0.25,
    specificInstructions: '多様な文構造、能動態、説得力のある物語の流れを使用してください。日本語の表現特性を保持してください。',
    commonPhrases: {
      meanwhile: 'その間に',
      suddenly: '突然',
      however: 'しかし',
      therefore: 'したがって',
      moreover: 'さらに'
    },
    writingStyle: {
      sentenceStructure: '繊細で表現豊か',
      paragraphLength: '中程度',
      formalityLevel: 'アクセス可能',
      culturalNotes: '日本の文学的伝統を尊重'
    },
    genreAdaptations: {
      fantasy: '神話的要素を持つ豊かで描写的な言語を使用',
      'science fiction': '技術用語と未来的概念を取り入れる',
      romance: '感情の深さと関係のダイナミクスに焦点を当てる',
      mystery: 'ペースと暴露を通じて緊張感を構築',
      thriller: '速いペースで suspenseful な物語を維持'
    },
    warnings: ['Major quality reduction expected - strong recommend professional translation review']
  },
  
  ko: {
    code: 'ko',
    name: '한국어',
    englishName: 'Korean',
    rtl: false,
    nativeInstructions: '명확하고 매력적인 한국어로 작성하세요',
    qualityModifier: 0.68,
    temperatureAdjustment: 0.18,
    specificInstructions: '다양한 문장 구조, 능동태, 설득력 있는 서사 흐름을 사용하세요. 한국어의 표현 특성을 유지하세요.',
    commonPhrases: {
      meanwhile: '그 동안',
      suddenly: '갑자기',
      however: '그러나',
      therefore: '따라서',
      moreover: '게다가'
    },
    writingStyle: {
      sentenceStructure: '표현력 있고 세련된',
      paragraphLength: '중간 길이',
      formalityLevel: '접근 가능한',
      culturalNotes: '한국 문학 전통을 존중'
    },
    genreAdaptations: {
      fantasy: '신화적 요소를 가진 풍부하고 묘사적인 언어 사용',
      'science fiction': '기술 용어와 미래적 개념 통합',
      romance: '감정적 깊이와 관계 역학에 초점',
      mystery: '페이스와 계시를 통한 긴장감 구축',
      thriller: '빠른 속도와 서스펜스 서사 유지'
    },
    warnings: ['Significant quality reduction expected - recommend professional review']
  },
  
  ar: {
    code: 'ar',
    name: 'العربية',
    englishName: 'Arabic',
    rtl: true,
    nativeInstructions: 'اكتب بالعربية الواضحة والجذابة',
    qualityModifier: 0.58,
    temperatureAdjustment: 0.3,
    specificInstructions: 'استخدم تراكيب جملية متنوعة والصوت الفعال وتدفق سردي مقنع. احتفظ بخصائص التعبير العربي.',
    commonPhrases: {
      meanwhile: 'في هذه الأثناء',
      suddenly: 'فجأة',
      however: 'لكن',
      therefore: 'لذلك',
      moreover: 'علاوة على ذلك'
    },
    writingStyle: {
      sentenceStructure: 'بليغة ومعبرة',
      paragraphLength: 'متوسط إلى طويل',
      formalityLevel: 'مفهوم',
      culturalNotes: 'احترام التقاليد الأدبية العربية'
    },
    genreAdaptations: {
      fantasy: 'استخدام لغة غنية ووصفية مع عناصر أسطورية',
      'science fiction': 'دمج المصطلحات التقنية والمفاهيم المستقبلية',
      romance: 'التركيز على العمق العاطفي وديناميكيات العلاقات',
      mystery: 'بناء التوتر من خلال الإيقاع والكشف',
      thriller: 'الحفاظ على سرد سريع ومشوق'
    },
    warnings: ['Major quality reduction expected - RTL formatting needs special attention - strongly recommend professional review']
  },
  
  hi: {
    code: 'hi',
    name: 'हिन्दी',
    englishName: 'Hindi',
    rtl: false,
    nativeInstructions: 'स्पष्ट और आकर्षक हिंदी में लिखें',
    qualityModifier: 0.60,
    temperatureAdjustment: 0.25,
    specificInstructions: 'विविध वाक्य संरचनाओं, सक्रिय स्वर और प्रेरक कथा प्रवाह का उपयोग करें। हिंदी की अभिव्यक्ति विशेषताओं को बनाए रखें।',
    commonPhrases: {
      meanwhile: 'इस बीच',
      suddenly: 'अचानक',
      however: 'हालांकि',
      therefore: 'इसलिए',
      moreover: 'इसके अलावा'
    },
    writingStyle: {
      sentenceStructure: 'अभिव्यंजक और समृद्ध',
      paragraphLength: 'मध्यम से लंबा',
      formalityLevel: 'सुलभ',
      culturalNotes: 'हिंदी साहित्यिक परंपराओं का सम्मान'
    },
    genreAdaptations: {
      fantasy: 'पौराणिक तत्वों के साथ समृद्ध, वर्णनात्मक भाषा का उपयोग',
      'science fiction': 'तकनीकी शब्दावली और भविष्य की अवधारणाओं को शामिल करना',
      romance: 'भावनात्मक गहराई और रिश्ते की गतिशीलता पर ध्यान',
      mystery: 'गति और प्रकाशन के माध्यम से तनाव का निर्माण',
      thriller: 'तेज़ गति और रहस्यमय कथा बनाए रखना'
    },
    warnings: ['Significant quality reduction expected - recommend professional review']
  },
  
  nl: {
    code: 'nl',
    name: 'Nederlands',
    englishName: 'Dutch',
    rtl: false,
    nativeInstructions: 'Schrijf in helder en boeiend Nederlands',
    qualityModifier: 0.79,
    temperatureAdjustment: 0.13,
    specificInstructions: 'Gebruik gevarieerde zinstructuren, actieve stem en overtuigende verhaallijn. Behoud Nederlandse taaleigenheid.',
    commonPhrases: {
      meanwhile: 'Ondertussen',
      suddenly: 'Plotseling',
      however: 'Echter',
      therefore: 'Daarom',
      moreover: 'Bovendien'
    },
    writingStyle: {
      sentenceStructure: 'vloeiend en expressief',
      paragraphLength: 'middel tot lang',
      formalityLevel: 'toegankelijk',
      culturalNotes: 'Nederlandse literaire conventies respecteren'
    },
    genreAdaptations: {
      fantasy: 'Rijke, beschrijvende taal met mythische elementen gebruiken',
      'science fiction': 'Technische terminologie en futuristische concepten integreren',
      romance: 'Focussen op emotionele diepte en relatiedynamiek',
      mystery: 'Spanning opbouwen door tempo en onthulling',
      thriller: 'Snel, spannend verhaal handhaven'
    },
    warnings: ['Good quality expected with regional variation considerations']
  },
  
  da: {
    code: 'da',
    name: 'Dansk',
    englishName: 'Danish',
    rtl: false,
    nativeInstructions: 'Skriv på klart og engagerende dansk',
    qualityModifier: 0.76,
    temperatureAdjustment: 0.16,
    specificInstructions: 'Brug varierede sætningsstrukturer, aktiv stemme og overbevisende fortælleflow. Bevar dansk sproglig elegance.',
    commonPhrases: {
      meanwhile: 'I mellemtiden',
      suddenly: 'Pludselig',
      however: 'Dog',
      therefore: 'Derfor',
      moreover: 'Desuden'
    },
    writingStyle: {
      sentenceStructure: 'flydende og udtryksfyldt',
      paragraphLength: 'medium til lang',
      formalityLevel: 'tilgængelig',
      culturalNotes: 'Respektere nordiske fortælletraditioner'
    },
    genreAdaptations: {
      fantasy: 'Bruge rigt, beskrivende sprog med mytiske elementer',
      'science fiction': 'Integrere teknisk terminologi og futuristiske koncepter',
      romance: 'Fokusere på følelsesmæssig dybde og relationsdynamik',
      mystery: 'Opbygge spænding gennem tempo og afsløring',
      thriller: 'Opretholde hurtig, spenningsfylt fortelling'
    },
    warnings: ['Good quality expected with minor Nordic language variations']
  },
  
  no: {
    code: 'no',
    name: 'Norsk',
    englishName: 'Norwegian',
    rtl: false,
    nativeInstructions: 'Skriv på klar og engasjerende norsk',
    qualityModifier: 0.77,
    temperatureAdjustment: 0.15,
    specificInstructions: 'Bruk varierte setningsstrukturer, aktiv stemme og overbevisende fortellerflyt. Bevar norsk språklig egenart.',
    commonPhrases: {
      meanwhile: 'I mellomtiden',
      suddenly: 'Plutselig',
      however: 'Imidlertid',
      therefore: 'Derfor',
      moreover: 'Dessuten'
    },
    writingStyle: {
      sentenceStructure: 'flytende og uttrykksfullt',
      paragraphLength: 'medium til lang',
      formalityLevel: 'tilgjengelig',
      culturalNotes: 'Respektere nordiske fortellertradisjonar'
    },
    genreAdaptations: {
      fantasy: 'Bruke rikt, beskrivende språk med mytiske element',
      'science fiction': 'Integrere teknisk terminologi og futuristiske konsept',
      romance: 'Fokusere på emosjonell dybde og relasjonsdynamikk',
      mystery: 'Bygge spenning gjennom tempo og avsløring',
      thriller: 'Opprettholde rask, spenningsfylt fortelling'
    },
    warnings: ['Good quality expected with minor Nordic language variations']
  },
  
  fi: {
    code: 'fi',
    name: 'Suomi',
    englishName: 'Finnish',
    rtl: false,
    nativeInstructions: 'Kirjoita selkeää ja mukaansatempaavaa suomea',
    qualityModifier: 0.73,
    temperatureAdjustment: 0.20,
    specificInstructions: 'Käytä vaihtelevia lauserakenteita, aktiivista ääntä ja vakuuttavaa kerronnan virtausta. Säilytä suomen kielen erityispiirteet.',
    commonPhrases: {
      meanwhile: 'Sillä välin',
      suddenly: 'Äkkiä',
      however: 'Kuitenkin',
      therefore: 'Siksi',
      moreover: 'Lisäksi'
    },
    writingStyle: {
      sentenceStructure: 'sujuva ja ilmeikäs',
      paragraphLength: 'keskipitkä pitkään',
      formalityLevel: 'saavutettava',
      culturalNotes: 'Kunnioittaa suomalaisia kirjallisuusperinteitä'
    },
    genreAdaptations: {
      fantasy: 'Käyttää rikasta, kuvailevaa kieltä myyttisillä elementeillä',
      'science fiction': 'Yhdistää teknistä terminologiaa ja futuristisia käsitteitä',
      romance: 'Keskittyä tunnesyvyyteen ja suhde dynamiikkaan',
      mystery: 'Rakentaa jännitystä tempon ja paljastuksen kautta',
      thriller: 'Ylläpitää nopeaa, jännittävää kerrontaa'
    },
    warnings: ['Moderate quality reduction expected due to unique language structure']
  },
  
  pl: {
    code: 'pl',
    name: 'Polski',
    englishName: 'Polish',
    rtl: false,
    nativeInstructions: 'Pisz w jasnym i angażującym języku polskim',
    qualityModifier: 0.75,
    temperatureAdjustment: 0.17,
    specificInstructions: 'Używaj zróżnicowanych struktur zdaniowych, strony czynnej i przekonującego przepływu narracji. Zachowaj polską elegancję językową.',
    commonPhrases: {
      meanwhile: 'Tymczasem',
      suddenly: 'Nagle',
      however: 'Jednak',
      therefore: 'Dlatego',
      moreover: 'Ponadto'
    },
    writingStyle: {
      sentenceStructure: 'płynna i ekspresyjna',
      paragraphLength: 'średni do długiego',
      formalityLevel: 'dostępny',
      culturalNotes: 'Szanować polskie tradycje literackie'
    },
    genreAdaptations: {
      fantasy: 'Używać bogatego, opisowego języka z elementami mitycznymi',
      'science fiction': 'Integrować terminologię techniczną i futurystyczne koncepcje',
      romance: 'Koncentrować się na głębi emocjonalnej i dynamice relacji',
      mystery: 'Budować napięcie poprzez tempo i odkrycie',
      thriller: 'Utrzymywać szybką, pełną napięcia narrację'
    },
    warnings: ['Good quality expected with attention to complex inflection system']
  },
  
  tr: {
    code: 'tr',
    name: 'Türkçe',
    englishName: 'Turkish',
    rtl: false,
    nativeInstructions: 'Açık ve ilgi çekici Türkçe yazın',
    qualityModifier: 0.71,
    temperatureAdjustment: 0.19,
    specificInstructions: 'Çeşitli cümle yapıları, etken çatı ve ikna edici anlatım akışı kullanın. Türkçenin ifade özelliklerini koruyun.',
    commonPhrases: {
      meanwhile: 'Bu arada',
      suddenly: 'Aniden',
      however: 'Ancak',
      therefore: 'Bu nedenle',
      moreover: 'Üstelik'
    },
    writingStyle: {
      sentenceStructure: 'akıcı ve etkileyici',
      paragraphLength: 'orta ila uzun',
      formalityLevel: 'erişilebilir',
      culturalNotes: 'Türk edebiyat geleneklerini saygı göstermek'
    },
    genreAdaptations: {
      fantasy: 'Mitolojik unsurlarla zengin, betimleyici dil kullanın',
      'science fiction': 'Teknik terminoloji ve fütüristik kavramları entegre edin',
      romance: 'Duygusal derinlik ve ilişki dinamiklerine odaklanın',
      mystery: 'Tempo ve açığa çıkarma yoluyla gerilim oluşturun',
      thriller: 'Hızlı, gerilimli anlatımı sürdürün'
    },
    warnings: ['Moderate quality reduction expected due to agglutinative language structure']
  },
  
  he: {
    code: 'he',
    name: 'עברית',
    englishName: 'Hebrew',
    rtl: true,
    nativeInstructions: 'כתוב בעברית ברורה ומושכת',
    qualityModifier: 0.64,
    temperatureAdjustment: 0.22,
    specificInstructions: 'השתמש במבני משפט מגוונים, בקול פעיל ובזרימה נרטיבית משכנעת. שמור על מאפייני הביטוי של העברית.',
    commonPhrases: {
      meanwhile: 'בינתיים',
      suddenly: 'לפתע',
      however: 'אולם',
      therefore: 'לכן',
      moreover: 'יתר על כן'
    },
    writingStyle: {
      sentenceStructure: 'זורמת ומלאת ביטוי',
      paragraphLength: 'בינוני עד ארוך',
      formalityLevel: 'נגיש',
      culturalNotes: 'כבד מסורות ספרותיות עבריות'
    },
    genreAdaptations: {
      fantasy: 'השתמש בשפה עשירה ותיאורית עם אלמנטים מיתיים',
      'science fiction': 'שלב טרמינולוגיה טכנית ומושגים עתידניים',
      romance: 'התמקד בעומק רגשי ובדינמיקת יחסים',
      mystery: 'בנה מתח דרך קצב וחשיפה',
      thriller: 'שמור על סיפור מהיר ומתח'
    },
    warnings: ['Significant quality reduction expected - RTL formatting needs attention - recommend professional review']
  }
};

export class LanguageManager {
  private static instance: LanguageManager;
  
  private constructor() {}
  
  static getInstance(): LanguageManager {
    if (!LanguageManager.instance) {
      LanguageManager.instance = new LanguageManager();
    }
    return LanguageManager.instance;
  }
  
  /**
   * Get language configuration
   */
  getLanguageConfig(languageCode: string): LanguageConfig {
    return LANGUAGE_CONFIGS[languageCode] || LANGUAGE_CONFIGS.en;
  }
  
  /**
   * Get all supported languages
   */
  getSupportedLanguages(): LanguageConfig[] {
    return Object.values(LANGUAGE_CONFIGS);
  }
  
  /**
   * Check if language is supported
   */
  isLanguageSupported(languageCode: string): boolean {
    return languageCode in LANGUAGE_CONFIGS;
  }
  
  /**
   * Get language-specific system prompt
   */
  getSystemPrompt(languageCode: string, basePrompt: string): string {
    const config = this.getLanguageConfig(languageCode);
    
    if (languageCode === 'en') {
      return basePrompt;
    }
    
    // Natural language requirement at the beginning
    const languagePrefix = `🎯 SPRÅK: Write fluently in ${config.name} (${config.englishName}). 
Use proper ${config.englishName} grammar, structure, and natural expression.
${config.nativeInstructions}

${languageCode === 'sv' ? `SVENSKA: Use Swedish function words (och, att, det) and natural sentence patterns. Include å, ä, ö characters when appropriate.` : ''}

`;
    
    // Add specific writing guidance
    const specificInstructions = `SPRÅKLIGA RIKTLINJER (Language Guidelines):
${config.specificInstructions}
Style: ${config.writingStyle.sentenceStructure} sentences, ${config.writingStyle.formalityLevel} formality.
Cultural context: ${config.writingStyle.culturalNotes}

`;
    
    return languagePrefix + specificInstructions + basePrompt;
  }
  
  /**
   * Get language-specific content prompt additions
   */
  getContentPromptAdditions(languageCode: string, genre?: string): string {
    const config = this.getLanguageConfig(languageCode);
    
    if (languageCode === 'en') {
      return '';
    }
    
    // Natural and effective language instructions
    let additions = `\n\n🎯 SPRÅKKRAV (Language Requirements):
Write naturally and fluently in ${config.name} (${config.englishName}).
Use proper ${config.englishName} grammar, sentence structure, and expressions.

${config.englishName.toUpperCase()} WRITING GUIDELINES:
- ${config.nativeInstructions}
- Use natural ${config.englishName} expressions and idioms
- Follow ${config.writingStyle.sentenceStructure} sentence structure
- Maintain ${config.writingStyle.formalityLevel} formality level
- Respect ${config.writingStyle.culturalNotes}`;
    
    if (genre && config.genreAdaptations[genre.toLowerCase()]) {
      additions += `\n- Genre style: ${config.genreAdaptations[genre.toLowerCase()]}`;
    }
    
    // Add Swedish-specific guidance (more natural approach)
    if (languageCode === 'sv') {
      additions += `\n\n📝 SVENSKA SPRÅKTIPS:
- Use Swedish function words: och, att, det, är, som, på, för, med, av, till
- Include Swedish characters å, ä, ö naturally when appropriate
- Follow Swedish sentence patterns and word order
- Use Swedish idioms and expressions where natural
- International words common in Swedish are fine (film, program, etc.)`;
    }
    
    if (config.warnings.length > 0) {
      additions += `\n\nNOTE: ${config.warnings.join('; ')}`;
    }
    
    return additions;
  }
  
  /**
   * Get adjusted temperature for language
   */
  getAdjustedTemperature(languageCode: string, baseTemperature: number): number {
    const config = this.getLanguageConfig(languageCode);
    return Math.max(0, Math.min(1, baseTemperature + config.temperatureAdjustment));
  }
  
  /**
   * Get quality expectations for language
   */
  getQualityExpectations(languageCode: string): {
    expectedQuality: number;
    qualityModifier: number;
    warnings: string[];
  } {
    const config = this.getLanguageConfig(languageCode);
    
    return {
      expectedQuality: Math.round(85 * config.qualityModifier),
      qualityModifier: config.qualityModifier,
      warnings: config.warnings
    };
  }
  
  /**
   * Get language-specific transition words
   */
  getTransitionWords(languageCode: string): Record<string, string> {
    const config = this.getLanguageConfig(languageCode);
    return config.commonPhrases;
  }
  
  /**
   * Validate language output using multi-factor analysis
   */
  validateLanguageOutput(content: string, languageCode: string): {
    isValid: boolean;
    confidence: number;
    warnings: string[];
  } {
    const config = this.getLanguageConfig(languageCode);
    const warnings: string[] = [];
    
    // Handle English validation separately
    if (languageCode === 'en') {
      return this.validateEnglishContent(content);
    }
    
    // Multi-factor validation for non-English languages
    const validationFactors = {
      stopWords: this.validateByStopWords(content, languageCode),
      languagePatterns: this.validateByLanguagePatterns(content, languageCode),
      characterFrequency: this.validateByCharacterFrequency(content, languageCode),
      rtlValidation: config.rtl ? this.validateRTLContent(content) : 1.0
    };
    
    // Calculate weighted confidence score
    const confidence = this.calculateLanguageConfidence(validationFactors, languageCode);
    
    // Determine if validation passes
    const minConfidence = this.getMinimumConfidence(languageCode);
    const isValid = confidence >= minConfidence;
    
    // Generate warnings based on confidence and factors
    if (!isValid) {
      warnings.push(`Language validation failed for ${config.englishName} (confidence: ${Math.round(confidence * 100)}%)`);
      
      if (validationFactors.stopWords < 0.3) {
        warnings.push(`Low ${config.englishName} stop word frequency detected`);
      }
      
      if (validationFactors.languagePatterns < 0.4) {
        warnings.push(`Content doesn't match expected ${config.englishName} language patterns`);
      }
      
      if (config.rtl && validationFactors.rtlValidation < 0.5) {
        warnings.push('RTL language content may be missing proper characters');
      }
    } else if (confidence < 0.8) {
      warnings.push(`Moderate language confidence for ${config.englishName} (${Math.round(confidence * 100)}%) - content may benefit from review`);
    }
    
    // Log detailed validation info for debugging
    console.log(`🔍 Language validation for ${languageCode}:`, {
      confidence: Math.round(confidence * 100) + '%',
      factors: {
        stopWords: Math.round(validationFactors.stopWords * 100) + '%',
        patterns: Math.round(validationFactors.languagePatterns * 100) + '%',
        charFreq: Math.round(validationFactors.characterFrequency * 100) + '%',
        rtl: config.rtl ? Math.round(validationFactors.rtlValidation * 100) + '%' : 'N/A'
      },
      isValid,
      warnings: warnings.length,
      contentSample: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
      contentLength: content.length
    });
    
    return {
      isValid,
      confidence,
      warnings
    };
  }

  /**
   * Validate English content using character patterns
   */
  private validateEnglishContent(content: string): {
    isValid: boolean;
    confidence: number;
    warnings: string[];
  } {
    const englishPattern = /^[a-zA-Z0-9\s.,!?'";\-:()]+$/;
    const isBasicEnglish = englishPattern.test(content.replace(/[\n\r]/g, ' '));
    
    return {
      isValid: isBasicEnglish,
      confidence: isBasicEnglish ? 0.9 : 0.3,
      warnings: isBasicEnglish ? [] : ['Content may contain non-English characters']
    };
  }

  /**
   * Validate content using language-specific stop words
   */
  private validateByStopWords(content: string, languageCode: string): number {
    const stopWordsDatabase = this.getStopWordsDatabase();
    const stopWords = stopWordsDatabase[languageCode];
    
    if (!stopWords || stopWords.length === 0) {
      return 0.5; // Neutral score if no stop words defined
    }
    
    const words = content.toLowerCase()
      .replace(/[^a-zA-ZÀ-ÿ\u0100-\u017F\u0400-\u04FF\u0600-\u06FF\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\s]/g, ' ') // Remove punctuation, keep letters and spaces
      .split(/\s+/)
      .filter(word => word.length > 1);
    
    if (words.length === 0) return 0.0;
    
    const stopWordMatches = words.filter(word => stopWords.includes(word));
    const stopWordRatio = stopWordMatches.length / words.length;
    
    // Expected stop word frequency: 20-40% for most languages
    if (stopWordRatio >= 0.15) {
      return Math.min(1.0, stopWordRatio * 2.5); // Scale 15%+ to high confidence
    } else if (stopWordRatio >= 0.08) {
      return stopWordRatio * 5; // Scale 8-15% to moderate confidence
    } else {
      return stopWordRatio * 2; // Below 8% is low confidence
    }
  }

  /**
   * Validate content using language-specific patterns and characteristics
   */
  private validateByLanguagePatterns(content: string, languageCode: string): number {
    const patterns = this.getLanguagePatterns();
    const langPatterns = patterns[languageCode];
    
    if (!langPatterns) {
      return 0.5; // Neutral if no patterns defined
    }
    
    let patternScore = 0;
    let totalPatterns = 0;
    
    // Check positive patterns (should be present)
    if (langPatterns.positive) {
      for (const pattern of langPatterns.positive) {
        totalPatterns++;
        if (pattern.test(content)) {
          patternScore += 1;
        }
      }
    }
    
    // Check negative patterns (should be absent)
    if (langPatterns.negative) {
      for (const pattern of langPatterns.negative) {
        totalPatterns++;
        if (!pattern.test(content)) {
          patternScore += 1;
        }
      }
    }
    
    return totalPatterns > 0 ? patternScore / totalPatterns : 0.5;
  }

  /**
   * Validate content using character frequency analysis
   */
  private validateByCharacterFrequency(content: string, languageCode: string): number {
    const charFreqs = this.getCharacterFrequencies();
    const expectedFreq = charFreqs[languageCode];
    
    if (!expectedFreq) {
      return 0.5; // Neutral if no frequency data
    }
    
    // Calculate actual character frequencies in content
    const chars = content.toLowerCase().replace(/[^a-zàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþßÿ]/g, '');
    const charCounts: Record<string, number> = {};
    
    for (const char of chars) {
      charCounts[char] = (charCounts[char] || 0) + 1;
    }
    
    // Calculate similarity to expected frequencies
    let similarity = 0;
    let comparisons = 0;
    
    for (const [char, expectedCharFreq] of Object.entries(expectedFreq)) {
      const actualFreq = (charCounts[char] || 0) / chars.length;
      const difference = Math.abs(expectedCharFreq - actualFreq);
      similarity += Math.max(0, 1 - (difference * 10)); // Scale difference
      comparisons++;
    }
    
    return comparisons > 0 ? similarity / comparisons : 0.5;
  }

  /**
   * Validate RTL content for Arabic and similar languages
   */
  private validateRTLContent(content: string): number {
    const rtlPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    const rtlChars = content.match(rtlPattern);
    const totalChars = content.replace(/\s/g, '').length;
    
    if (totalChars === 0) return 0.0;
    
    const rtlRatio = (rtlChars?.length || 0) / totalChars;
    return rtlRatio > 0.5 ? 1.0 : rtlRatio * 2; // Expect 50%+ RTL characters
  }

  /**
   * Calculate overall language confidence using weighted factors
   */
  private calculateLanguageConfidence(
    factors: Record<string, number>, 
    languageCode: string
  ): number {
    const config = this.getLanguageConfig(languageCode);
    
    // Define weights based on language characteristics
    let weights = {
      stopWords: 0.4,        // Most reliable factor
      languagePatterns: 0.3, // Language-specific features
      characterFrequency: 0.2, // Statistical analysis
      rtlValidation: 0.1     // RTL languages only
    };
    
    // Adjust weights for RTL languages
    if (config.rtl) {
      weights = {
        stopWords: 0.3,
        languagePatterns: 0.2,
        characterFrequency: 0.1,
        rtlValidation: 0.4 // RTL validation is critical for RTL languages
      };
    }
    
    // Calculate weighted average
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const [factor, score] of Object.entries(factors)) {
      const weight = weights[factor as keyof typeof weights] || 0;
      weightedSum += score * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
  }

  /**
   * Get minimum confidence threshold for each language
   */
  private getMinimumConfidence(languageCode: string): number {
    const config = this.getLanguageConfig(languageCode);
    
    // Higher thresholds for languages with better support
    if (config.qualityModifier >= 0.85) return 0.7; // High-quality languages
    if (config.qualityModifier >= 0.75) return 0.6; // Good-quality languages
    if (config.qualityModifier >= 0.65) return 0.5; // Moderate-quality languages
    return 0.4; // Lower-quality languages (more lenient)
  }

  /**
   * Get stop words database for all supported languages
   */
  private getStopWordsDatabase(): Record<string, string[]> {
    return {
      sv: ['och', 'det', 'att', 'i', 'en', 'är', 'som', 'på', 'för', 'av', 'till', 'med', 'om', 'han', 'hon', 'den', 'var', 'sig', 'så', 'här', 'har', 'inte', 'sin', 'sina', 'men', 'ett', 'när', 'vad', 'från', 'vi', 'nu', 'skulle', 'kan', 'de', 'kommer', 'får', 'där', 'alla', 'denna', 'efter', 'utan', 'också', 'hur', 'andra', 'mycket', 'bara', 'sedan', 'varit'],
      es: ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'ser', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'los', 'las', 'una', 'está', 'como', 'todo', 'más', 'pero', 'sus', 'fue', 'muy', 'ya', 'hay', 'mi', 'si', 'sin', 'sobre', 'este', 'me', 'hasta', 'donde', 'quien', 'desde', 'nos', 'durante', 'todos', 'uno', 'les'],
      fr: ['le', 'la', 'les', 'de', 'et', 'à', 'un', 'une', 'ce', 'que', 'qui', 'ne', 'se', 'pas', 'tout', 'être', 'avoir', 'sur', 'avec', 'ne', 'pour', 'par', 'dans', 'du', 'il', 'au', 'elle', 'son', 'sa', 'ses', 'nous', 'vous', 'ils', 'elles', 'leur', 'leurs', 'cette', 'ces', 'mais', 'ou', 'où', 'dont', 'quoi', 'comme', 'si', 'plus', 'très', 'bien', 'encore', 'aussi'],
      de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'im', 'dem', 'nicht', 'ein', 'eine', 'als', 'auch', 'es', 'an', 'werden', 'aus', 'er', 'hat', 'dass', 'sie', 'nach', 'wird', 'bei', 'noch', 'wie', 'einen', 'durch', 'man', 'seinen', 'war', 'nur', 'vor', 'zur', 'bis', 'sind', 'diese', 'einem', 'über', 'so', 'haben', 'zum'],
      it: ['il', 'di', 'che', 'e', 'la', 'un', 'a', 'per', 'non', 'in', 'una', 'si', 'con', 'è', 'da', 'su', 'del', 'le', 'al', 'lo', 'come', 'ma', 'se', 'dei', 'ci', 'questo', 'della', 'nel', 'alla', 'sono', 'io', 'lui', 'lei', 'gli', 'mi', 'ne', 'anche', 'più', 'molto', 'tutto', 'alcuni', 'essere', 'fare', 'dire', 'andare', 'vedere', 'sapere', 'dare', 'stare', 'venire'],
      pt: ['o', 'de', 'a', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os', 'no', 'se', 'na', 'por', 'mais', 'as', 'dos', 'como', 'mas', 'foi', 'ao', 'ele', 'das', 'tem', 'à', 'seu', 'sua', 'ou', 'ser', 'quando', 'muito', 'há', 'nos', 'já', 'está', 'eu', 'também', 'só', 'pelo', 'pela', 'até', 'isso', 'ela', 'entre', 'era', 'depois'],
      nl: ['de', 'en', 'van', 'het', 'een', 'in', 'is', 'dat', 'te', 'met', 'op', 'voor', 'hij', 'aan', 'zijn', 'als', 'ze', 'er', 'maar', 'om', 'had', 'bij', 'ook', 'tot', 'je', 'was', 'heeft', 'dan', 'zou', 'of', 'wat', 'mijn', 'men', 'dit', 'zo', 'door', 'over', 'zij', 'nu', 'onder', 'omdat', 'haar', 'der', 'nog', 'naar', 'hem', 'deze', 'kunnen', 'heb', 'hebben'],
      da: ['og', 'i', 'det', 'at', 'en', 'den', 'til', 'er', 'som', 'på', 'de', 'med', 'han', 'af', 'for', 'ikke', 'der', 'var', 'meg', 'seg', 'men', 'et', 'har', 'om', 'vi', 'min', 'havde', 'ham', 'hun', 'nu', 'over', 'da', 'fra', 'du', 'ud', 'sin', 'dem', 'os', 'op', 'mann', 'hans', 'hvor', 'eller', 'hvad', 'skal', 'selv', 'her', 'alle', 'vil', 'blev'],
      no: ['og', 'i', 'det', 'til', 'en', 'at', 'den', 'er', 'som', 'på', 'de', 'med', 'han', 'av', 'for', 'ikke', 'der', 'var', 'meg', 'seg', 'men', 'et', 'har', 'om', 'vi', 'min', 'hadde', 'ham', 'hun', 'nå', 'over', 'da', 'fra', 'du', 'ut', 'sin', 'dem', 'oss', 'opp', 'mann', 'hans', 'hvor', 'eller', 'hva', 'skal', 'selv', 'her', 'alle', 'vil', 'ble'],
      fi: ['ja', 'on', 'se', 'että', 'ei', 'ole', 'en', 'hän', 'kun', 'kaikki', 'olen', 'vain', 'niin', 'tai', 'olla', 'hänen', 'kanssa', 'jos', 'minä', 'mutta', 'me', 'he', 'kuin', 'minun', 'mitä', 'sinä', 'sen', 'sitten', 'nyt', 'jo', 'ihan', 'tämä', 'tulee', 'voi', 'sitä', 'voisi', 'tuo', 'hyvin', 'saa', 'sanoa', 'myös', 'joka', 'tulla', 'ne', 'hänet', 'tehdä', 'siellä', 'vielä', 'pitää'],
      pl: ['i', 'w', 'na', 'z', 'to', 'że', 'się', 'nie', 'o', 'do', 'a', 'za', 'od', 'jak', 'by', 'po', 'od', 'ma', 'ma', 'jest', 'lub', 'ale', 'dla', 'czy', 'już', 'tak', 'tym', 'tylko', 'być', 'może', 'tej', 'jego', 'są', 'te', 'gdy', 'co', 'jej', 'bo', 'go', 'ja', 'będzie', 'jego', 'tym', 'można', 'niż', 'pod', 'która', 'bardzo', 'oraz', 'bez'],
      ru: ['и', 'в', 'не', 'на', 'с', 'что', 'а', 'по', 'это', 'как', 'он', 'к', 'но', 'они', 'мы', 'за', 'из', 'его', 'от', 'я', 'о', 'до', 'вы', 'все', 'так', 'её', 'их', 'то', 'же', 'у', 'или', 'при', 'быть', 'только', 'для', 'уже', 'если', 'там', 'был', 'да', 'свой', 'ещё', 'бы', 'тот', 'где', 'наш', 'кто', 'мой', 'этот', 'им'],
      ar: ['في', 'من', 'إلى', 'على', 'أن', 'هذا', 'هذه', 'التي', 'الذي', 'كان', 'قد', 'لم', 'كل', 'عن', 'مع', 'أو', 'له', 'بعد', 'كما', 'حتى', 'عند', 'غير', 'بين', 'حول', 'تحت', 'فوق', 'خلال', 'أمام', 'وراء', 'جانب', 'ضد', 'نحو', 'داخل', 'خارج', 'بجانب', 'قبل', 'أثناء', 'منذ', 'أمس', 'اليوم', 'غدا', 'هنا', 'هناك', 'أين', 'كيف', 'متى', 'لماذا', 'ماذا'],
      zh: ['的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '里', '来', '他', '她', '它', '们', '大', '小', '多', '少', '几', '什么', '怎么', '为什么', '哪里', '谁', '什么时候', '怎样', '可以', '应该', '必须'],
      ja: ['の', 'に', 'は', 'を', 'た', 'が', 'で', 'て', 'と', 'し', 'れ', 'さ', 'ある', 'いる', 'も', 'する', 'から', 'な', 'こと', 'として', 'い', 'や', 'れる', 'など', 'なっ', 'ない', 'この', 'ため', 'その', 'あっ', 'よう', 'また', 'もの', 'という', 'あり', 'まで', 'られ', 'なる', 'へ', 'か', 'だ', 'これ', 'によって', 'により', 'おり', 'より', 'による', 'ず', 'なり'],
      ko: ['의', '이', '가', '을', '를', '에', '는', '은', '와', '과', '로', '으로', '에서', '부터', '까지', '에게', '한테', '께', '에게서', '한테서', '께서', '도', '만', '조차', '마저', '뿐', '밖에', '라도', '나마', '이나', '든지', '이든지', '라든지', '이라든지', '야', '아', '이야', '이다', '아니다', '입니다', '아닙니다', '이에요', '예요', '아니에요', '그리고', '그러나', '하지만', '그런데', '그래서'],
      hi: ['का', 'के', 'की', 'को', 'में', 'पर', 'से', 'और', 'है', 'हैं', 'था', 'थी', 'थे', 'होगा', 'होगी', 'होंगे', 'हो', 'ही', 'भी', 'तो', 'या', 'जो', 'वह', 'यह', 'जब', 'तब', 'कि', 'जैसे', 'वैसे', 'कैसे', 'क्यों', 'कहाँ', 'कौन', 'क्या', 'कब', 'अगर', 'मगर', 'लेकिन', 'परन्तु', 'किन्तु', 'चाहिए', 'सकता', 'सकती', 'सकते', 'पाता', 'पाती', 'पाते']
    };
  }

  /**
   * Get language-specific patterns for validation
   */
  private getLanguagePatterns(): Record<string, { positive?: RegExp[]; negative?: RegExp[] }> {
    return {
      sv: {
        positive: [
          /\b(och|att|det|för|från|till|med|på|av|är|var|har|hade|skulle|kan|kommer|får|där|när|som|den|denna|alla|andra|mycket|bara|sedan|varit|något|någon|några)\b/gi,
          /ä|ö|å/gi, // Swedish specific characters
          /\b\w+tion\b/gi, // Swedish words ending in -tion
        ],
        negative: [
          /\b(the|and|that|have|for|not|with|you|this|but|his|from|they|she|her|been|than|its|who|did)\b/gi // Common English words
        ]
      },
      es: {
        positive: [
          /\b(que|con|por|para|como|pero|todo|más|muy|bien|donde|cuando|porque|también|siempre|nunca|cada|otros|otras|entre|durante|según)\b/gi,
          /ñ|á|é|í|ó|ú|ü/gi, // Spanish specific characters
          /\b\w+ción\b/gi, // Spanish words ending in -ción
        ],
        negative: [
          /\b(the|and|that|have|for|not|with|you|this|but|his|from|they|she|her|been|than|its|who|did)\b/gi
        ]
      },
      fr: {
        positive: [
          /\b(dans|pour|avec|sans|sous|après|avant|pendant|depuis|jusqu|alors|encore|toujours|jamais|souvent|parfois|quelque|chaque|autre|même|bien|très|plus|moins|assez|trop)\b/gi,
          /à|è|é|ê|ë|ç|ô|û|ù|î|ï|ÿ/gi, // French specific characters
          /\b\w+tion\b/gi, // French words ending in -tion
        ],
        negative: [
          /\b(the|and|that|have|for|not|with|you|this|but|his|from|they|she|her|been|than|its|who|did)\b/gi
        ]
      },
      de: {
        positive: [
          /\b(aber|alle|allem|allen|aller|alles|andere|anderen|anderer|anderes|auch|beim|beide|beiden|beider|beim|bereits|besonders|better|können|müssen|sollen|wollen|werden|worden|geworden)\b/gi,
          /ä|ö|ü|ß/gi, // German specific characters
          /\b\w+ung\b/gi, // German words ending in -ung
        ],
        negative: [
          /\b(the|and|that|have|for|not|with|you|this|but|his|from|they|she|her|been|than|its|who|did)\b/gi
        ]
      },
      it: {
        positive: [
          /\b(con|per|come|quando|dove|mentre|prima|dopo|durante|secondo|attraverso|dentro|fuori|sopra|sotto|davanti|dietro|accanto|insieme|senza|contro|verso|oltre|circa)\b/gi,
          /à|è|é|ì|í|ò|ó|ù|ú/gi, // Italian specific characters
          /\b\w+zione\b/gi, // Italian words ending in -zione
        ],
        negative: [
          /\b(the|and|that|have|for|not|with|you|this|but|his|from|they|she|her|been|than|its|who|did)\b/gi
        ]
      },
      pt: {
        positive: [
          /\b(para|pela|pelo|pelos|pelas|quando|onde|como|porque|durante|através|dentro|fora|sobre|sob|diante|atrás|junto|sem|contra|além|cerca|sempre|nunca|talvez|apenas|também)\b/gi,
          /ã|õ|á|à|â|ê|é|í|ó|ô|ú|ç/gi, // Portuguese specific characters
          /\b\w+ção\b/gi, // Portuguese words ending in -ção
        ],
        negative: [
          /\b(the|and|that|have|for|not|with|you|this|but|his|from|they|she|her|been|than|its|who|did)\b/gi
        ]
      }
    };
  }

  /**
   * Get character frequency data for statistical analysis
   */
  private getCharacterFrequencies(): Record<string, Record<string, number>> {
    return {
      sv: { 'a': 0.098, 'e': 0.102, 'i': 0.055, 'o': 0.043, 'u': 0.019, 'y': 0.007, 'å': 0.018, 'ä': 0.018, 'ö': 0.013 },
      es: { 'a': 0.125, 'e': 0.139, 'i': 0.063, 'o': 0.088, 'u': 0.039, 'n': 0.067, 'r': 0.069, 's': 0.079, 'l': 0.049, 't': 0.046 },
      fr: { 'a': 0.076, 'e': 0.147, 'i': 0.075, 'o': 0.054, 'u': 0.063, 'n': 0.071, 'r': 0.066, 's': 0.079, 'l': 0.055, 't': 0.072 },
      de: { 'a': 0.065, 'e': 0.174, 'i': 0.076, 'o': 0.025, 'u': 0.044, 'n': 0.098, 'r': 0.070, 's': 0.072, 'l': 0.034, 't': 0.061 },
      it: { 'a': 0.117, 'e': 0.117, 'i': 0.113, 'o': 0.098, 'u': 0.030, 'n': 0.069, 'r': 0.064, 's': 0.050, 'l': 0.065, 't': 0.056 },
      pt: { 'a': 0.146, 'e': 0.127, 'i': 0.062, 'o': 0.103, 'u': 0.046, 'n': 0.051, 'r': 0.065, 's': 0.078, 'l': 0.028, 't': 0.047 }
    };
  }
  
  /**
   * Get language display name
   */
  getDisplayName(languageCode: string): string {
    const config = this.getLanguageConfig(languageCode);
    return `${config.name} (${config.englishName})`;
  }
  
  /**
   * Get language code from name
   */
  getLanguageCodeFromName(name: string): string {
    const config = Object.values(LANGUAGE_CONFIGS).find(
      c => c.name === name || c.englishName === name
    );
    return config?.code || 'en';
  }
  
  /**
   * Get genre-specific instructions for language
   */
  getGenreInstructions(languageCode: string, genre: string): string {
    const config = this.getLanguageConfig(languageCode);
    const genreKey = genre.toLowerCase();
    
    if (config.genreAdaptations[genreKey]) {
      return config.genreAdaptations[genreKey];
    }
    
    return config.genreAdaptations.fantasy || 'Apply genre-appropriate writing style';
  }
}

export default LanguageManager; 