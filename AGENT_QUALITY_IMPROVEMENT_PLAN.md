# Agent Quality Improvement Plan
## Addressing Critical Issues in Book Generation

### 🎉 **MAJOR PROGRESS UPDATE**
**✅ Phase 1, 2 & 3 COMPLETED** - Critical quality issues addressed + Advanced intelligent features implemented:

**Phase 1-2 (Completed):**
- **✅ Scene Sanity Checker** - Rule-based validation preventing genre violations
- **✅ Enhanced ContinuityInspectorAgent** - Real-time section-level consistency checking  
- **✅ ChapterGenerator Validation Pipeline** - Multi-stage quality gates before content persistence
- **✅ Hard-Fail Error Handling** - Eliminated poor fallback content (no more "spretigare")
- **✅ DriftGuard Agent** - Vector-based semantic consistency checking (>35% drift detection)
- **✅ RedundancyReducer Agent** - N-gram analysis preventing repetitive phrases
- **✅ Style Governor** - Narrative voice fingerprint maintenance

**Phase 3 (Just Completed):**
- **✅ Memory-Aware Prompting System** - Intelligent context injection for all agents
- **✅ Enhanced SectionTransitionAgent** - Future planning capability to prevent dead ends
- **✅ Automatic Revision Triggers** - SupervisionAgent now auto-triggers revisions for quality issues

**Phase 4 (In Progress - Character Continuity Focus):**
- **✅ Character Name Continuity System** - Fixed critical user-reported issue where names changed between back cover and book
- **✅ Universal Prompt Analysis** - System now extracts character names from any prompt type (minimal to detailed character sheets)
- **✅ Real-time Name Validation** - Ensures character name consistency across all planning stages

**Current Status**: System now features truly adaptive intelligence that prevents issues before they occur through forward planning and comprehensive context awareness.

### **🎯 Phase 3 Key Achievements**

**1. Memory-Aware Intelligence:**
- Every agent now receives relevant story context automatically
- Character states, locations, and recent events injected into prompts
- Intelligent caching system for performance optimization
- Context relevance scoring for optimal memory injection

**2. Future Planning Capabilities:**
- Section transitions now analyze upcoming plot requirements
- Dead-end prevention through forward narrative analysis
- Strategic setup identification for future plot points
- Character arc progression compatibility checking

**3. Adaptive Quality Management:**
- Automatic revision triggers based on quality thresholds
- Real-time detection of arc stagnation and pacing issues
- Intelligent revision task queue with priority management
- Prevention of infinite revision loops with smart limits

**4. System Evolution:**
- **From Reactive to Proactive**: Issues prevented before they occur
- **From Isolated to Context-Aware**: Agents work with full story memory
- **From Manual to Adaptive**: Quality maintained automatically
- **From Sequential to Intelligent**: Forward planning prevents narrative problems

---

### 📋 **Original Problems (Now Addressed)**

| **Area** | **Core Problem** | **Impact on Reader** |
|----------|------------------|---------------------|
| **Structure** | Sudden genre/environment shifts (war camps, spaceships) without warning | Breaks immersion, creates confusion |
| **Chapter Transitions** | Episodic detours that don't connect | Loose narrative coherence |
| **Continuity** | Some subplots (e.g., Goma's betrayal) lack resolution | Character arcs feel incomplete |
| **Prose** | Heavily repetitive imagery ("heart pounds"/"spark ignites") | Risk of reader fatigue |
| **Pacing** | Long, descriptive passages in the middle of action | Loses dramatic momentum |

---

## 🔍 **Why Current Agent Architecture Allows These Issues**

### 1. **Continuity Control Happens Too Late**
- `ContinuityInspectorAgent` runs only after a complete chapter is finished
- Genre drift that creeps in mid-chapter isn't detected until after the fact
- Chapter gets published anyway if inspection fails (fallback logic)

### 2. **Transitions Are Only Checked Locally**
- `SectionTransitionAgent` can create elegant bridges between two given sections
- But it has no holistic view of the chapter's red thread
- Doesn't check if a new scene happens to be a sci-fi jump that conflicts with genre

### 3. **Orchestrator Uses "Fire-and-Forget" Pipeline**
- `BookGenerationOrchestrator` calls `ChapterGenerator` sequentially
- Trusts that each sub-agent does its job
- If an agent fails, error is logged but process continues with fallback content

### 4. **Memory System Is Passive**
- `StoryMemoryManager` saves facts to database
- But doesn't seem to do active retrieval during writing to stop deviations in real-time

---

## 🛠️ **Proposed Solution: New Agents & Enhanced Architecture**

### **Phase 1: Immediate Quality Gates (New Agents)**

| **Agent** | **Description** | **Pipeline Position** |
|-----------|-----------------|----------------------|
| **DriftGuard Agent** | Checks each new paragraph against vector profile of established environment/genre. Flags >35% semantic deviation. | After WritingAgent but before text is added to section |
| **Real-Time Continuity Hooks** | Move parts of ContinuityInspectorAgent to "stream-mode" that runs per section (not just per chapter) and stops generation if timeline or POV breaks. | In ChapterGenerator.generateSectionContext before section is saved |
| **RedundancyReducer Agent** | Analyzer that scans last ~2,000 words and counts n-grams. If >X repetitions of "heart pounded" type → rewrite prompt to WritingAgent with "reduce clichés". | Directly after Proofreader pass |
| **Style Governor** | Maintains a "voice fingerprint" (perspective, rhythm, vocabulary) and compares new paragraphs against average. If deviation >Y → asks WritingAgent to adjust. | Shared library, used by both Writing- and Transition-agents |
| **Scene Sanity Checker** | Simple rule engine (Zod schema + regex) that must return TRUE before a section can persist. Example rules:<br/>• Can't contain modern military jargon if genre ≠ 'military'<br/>• Can't switch narrative tense without time/place marker | Between SectionTransitionAgent and Continuity hooks |
| **Memory-Aware Prompting** | Build retrieval function that injects relevant world-facts into each WritingAgent prompt (current chapter + nearest preceding). | In ChapterGenerator under buildSceneContext |

### **Phase 2: Enhanced Existing Agents**

| **Agent** | **Current Problem** | **Proposed Fix** |
|-----------|--------------------|--------------------|
| **SectionTransitionAgent** | Doesn't see the overall plot | Send in next two sections' plans in TransitionContext and let agent weigh in future beats – less risk of dead ends |
| **ContinuityInspectorAgent** | Too many Zod failures lead to fallback | Increase maxRetries and decrease retryDelay; if parse still fails → throw hard error and roll back section in CheckpointManager |
| **ProofreaderAgent** | Focuses primarily on grammar | Add "conciseness" check that flags >25% filler words per 300 words |
| **SupervisionAgent** | Gives book recommendations but no automatic iteration | After every second chapter, let Supervision score <80 trigger automatic "revise previous chapter" task |

---

## 🏗️ **New Architecture: Four-Phase Pipeline**

### **Phase 1: Plan & Research** *(unchanged)*
- PlanningAgent
- ResearchAgent  
- ChiefEditorAgent

### **Phase 2a: Draft Generation (per section)**
- WritingAgent
- **DriftGuard Agent** ← *NEW*
- **Style Governor** ← *NEW*

### **Phase 2b: Polish & Validate (per section)**
- ProofreaderAgent
- **Real-Time Continuity** (lightweight)
- **Scene Sanity Checker** ← *NEW*

### **Phase 3: Assemble Chapter**
- SectionTransitionAgent
- ContinuityInspectorAgent (full chapter pass)

### **Phase 4: QA Loop**
- SupervisionAgent → potentially redo Phase 2a-3

---

## 📁 **Implementation Plan**

### **Immediate Actions (Low-Hanging Fruit)**

1. **Minimal Code Change**: Call existing `ContinuityInspectorAgent.checkChapterConsistency` also per section
   - Accept chapter number but send section as pseudo-chapter ID
   - Catch drift before chapter is locked

2. **Enhance ChapterGenerator**: Add `preSectionValidators[]` step before `saveSection`

3. **Improve Error Handling**: Hard fail instead of fallback when critical validation fails

### **✅ Phase 3 Implementation Details**

**New Files Created:**
```
src/lib/ai/services/
└── MemoryAwarePrompting.ts       # Intelligent context injection service

src/lib/ai/
└── test-enhanced-system.ts       # Phase 3 testing suite
```

**Enhanced Existing Files:**
```
src/lib/ai/agents/section-transition-agent.ts
├── ✅ Added futureSections to TransitionContext
├── ✅ Implemented analyzeFuturePlanning method
├── ✅ Added dead-end risk assessment
└── ✅ Strategic setup identification

src/lib/ai/agents/supervision-agent.ts
├── ✅ Added AutoRevisionConfig interface
├── ✅ Implemented automatic revision triggers
├── ✅ Added RevisionTrigger and RevisionTask systems
└── ✅ Quality threshold monitoring

src/lib/ai/orchestrator-v2.ts
├── ✅ Integrated MemoryAwarePrompting service
└── ✅ Enhanced coordination of all Phase 3 features

src/lib/ai/services/ChapterGenerator.ts
├── ✅ Added MemoryAwarePrompting dependency
└── ✅ Enhanced with intelligent context awareness
```

### **Legacy Implementation Plan**

**New Files to Create:**
```
src/lib/ai/agents/
├── drift-guard-agent.ts          # Vector-based genre consistency
├── redundancy-reducer-agent.ts   # N-gram analysis for repetition
├── scene-sanity-checker.ts       # Rule-based validation
└── style-governor.ts             # Voice fingerprint maintenance

src/lib/ai/validators/
├── genre-consistency.ts          # Genre drift detection
├── prose-repetition.ts           # Repetitive phrase detection
└── narrative-voice.ts            # Voice consistency validation
```

**Enhanced Existing Files:**
```
src/lib/ai/orchestrator-v2.ts
├── Add real-time validation pipeline
├── Implement section-level continuity checks
└── Add quality gate before section persistence

src/lib/ai/services/ChapterGenerator.ts
├── Integrate new validation agents
├── Add memory-aware prompting
└── Implement section-level quality gates

src/lib/ai/agents/continuity-inspector-agent.ts
├── Add stream-mode operation
├── Implement section-level checks
└── Enhance error handling (hard fail vs fallback)
```

---

## 🎯 **Success Metrics**

### **Quality Improvements**
- **Genre Consistency**: <5% semantic deviation from established setting
- **Prose Variety**: <3 repetitions of the same phrase per 2,000 words
- **Continuity Score**: >85% consistency across all chapters
- **Pacing**: Action scenes maintain >80% "action vocabulary" density

### **Reader Experience**
- **Immersion**: Zero sudden genre shifts without narrative justification
- **Coherence**: All subplots have clear resolution or continuation
- **Engagement**: Varied sentence structure and imagery
- **Flow**: Smooth transitions between all sections

---

## 🚀 **Implementation Priority**

### **✅ Phase 1: Critical Fixes (Week 1-2) - COMPLETED**
1. ✅ Implement section-level continuity checks
2. ✅ Add Scene Sanity Checker with basic rules  
3. ✅ Enhance error handling to prevent fallback content

### **✅ Phase 2: Quality Enhancements (Week 3-4) - COMPLETED**
1. ✅ Build DriftGuard Agent with vector similarity
2. ✅ Implement RedundancyReducer Agent
3. ✅ Create Style Governor for voice consistency

### **✅ Phase 3: Advanced Features (Week 5-6) - COMPLETED**
1. ✅ Memory-aware prompting system (`src/lib/ai/services/MemoryAwarePrompting.ts`)
2. ✅ Enhanced SectionTransitionAgent with future planning (enhanced transition context)
3. ✅ Automatic revision triggers from SupervisionAgent (auto-revision configuration)

### **🚀 Phase 4: Optimization (Week 7-8) - IN PROGRESS**
1. ✅ **Character Name Continuity System** - Fixed critical issue where user-specified names weren't consistent between back cover and book content
2. ✅ **Enhanced Prompt Analysis** - System now intelligently extracts character names from any prompt type (minimal to detailed)
3. ✅ **Universal Character Detection** - Supports everything from "a book about sailing" to detailed character sheets
4. 🔄 Performance tuning for real-time validation
5. 🔄 Enhanced fallback strategies  
6. 🔄 Comprehensive testing and validation
7. 🔄 Memory-aware prompting integration with all existing agents
8. 🔄 Future planning optimization for large chapter sequences

**Phase 4 Key Achievements So Far:**
- **Character Name Analysis**: New `CharacterNameContinuityAgent` extracts names from any prompt complexity
- **Back Cover Fix**: Updated prompts to include user-specified character names
- **Validation Pipeline**: Real-time character name consistency checking across planning stages
- **Smart Detection**: Handles minimal prompts ("sailing book") vs detailed character sheets
- **Comprehensive Testing**: Created test suite validating all prompt types

---

## 💡 **Key Principles**

1. **Fail Fast**: Hard errors instead of degraded fallback content
2. **Real-Time Validation**: Catch issues before they compound
3. **Contextual Awareness**: Every agent has access to story memory
4. **Consistent Voice**: Maintain narrative fingerprint throughout
5. **Genre Integrity**: Never allow unexplained genre deviations

---

## 🔧 **Technical Implementation Notes**

### **DriftGuard Agent Implementation**
```typescript
// Pseudo-code for genre consistency checking
const semanticSimilarity = await compareEmbeddings(
  newParagraph,
  establishedGenreProfile
);

if (semanticSimilarity < 0.65) {
  throw new GenreConsistencyError(
    `Genre drift detected: ${semanticSimilarity} similarity`
  );
}
```

### **Real-Time Continuity Hooks**
```typescript
// Call continuity check per section instead of per chapter
const continuityResult = await continuityAgent.checkSectionConsistency(
  sectionNumber,
  sectionContent,
  accumulatedChapterContext
);

if (continuityResult.criticalIssues.length > 0) {
  throw new ContinuityError(continuityResult.criticalIssues);
}
```

### **RedundancyReducer Agent**
```typescript
// Scan for repetitive phrases
const recentText = getLastNWords(2000);
const ngramAnalysis = analyzeNgrams(recentText, [2, 3, 4]);
const repetitivePatterns = findExcessiveRepetition(ngramAnalysis);

if (repetitivePatterns.length > 0) {
  modifyPrompt(originalPrompt, {
    avoidPhrases: repetitivePatterns,
    emphasizeVariety: true
  });
}
```

This plan addresses the core issues identified in your book generation system and provides a roadmap for implementing real-time quality control that prevents problems before they compound into larger narrative issues. 