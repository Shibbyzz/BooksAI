# 📚 BooksAI - Full-Stack Architecture Guide

## 📊 **Development Progress Tracker**

### ✅ **COMPLETED (Phase 1 - PRODUCTION READY)**
- **✅ Database Schema Design** - All BooksAI models defined in Prisma (13 tables)
- **✅ Supabase Setup** - IPv4-compatible session pooler configured
- **✅ Database Migration** - All tables created and tested
- **✅ Environment Configuration** - All API keys and connections working
- **✅ Prisma Client Generation** - TypeScript types available for all models
- **✅ Authentication System** - Complete Supabase Auth + Prisma User integration
- **✅ User Management APIs** - Full CRUD operations with auto-user creation
- **✅ Middleware Protection** - Route protection for dashboard and book routes
- **✅ Dashboard Interface** - Complete book library with status indicators
- **✅ Book Management System** - Full CRUD operations for books
- **✅ Book Creation Wizard** - Complete form for creating new books
- **✅ Book Detail Pages** - Individual book management with metadata sidebar
- **✅ API Layer** - Complete RESTful API with type safety
- **✅ UI Component System** - Reusable components with Tailwind CSS

### 🚀 **NEXT PHASE (AI Integration - High Priority)**
- **🤖 AI Orchestrator** - Connect book creation to OpenAI for content generation
- **📖 Chapter Generation** - AI-powered chapter content creation
- **🧠 Story Memory System** - Context management for long-form content consistency
- **📊 Generation Progress** - Real-time progress tracking during AI generation
- **✏️ Chapter Editor** - Rich text editor for manual chapter refinement

### 📋 **FUTURE PHASES**
- **Phase 3**: Book Export (PDF, EPUB, DOCX) & Templates (Week 3-4)
- **Phase 4**: Advanced Features (Search, Analytics, Collaboration) (Week 5-6) 
- **Phase 5**: Polish & Scale (Performance, Mobile, PWA) (Week 7-8)

### 🔮 **FUTURE PHASES**
- **Phase 2**: Story Memory & AI Consistency (Week 3-4)
- **Phase 3**: Subscription & Export (Week 5-6) 
- **Phase 4**: Polish & Scale (Week 7-8)

---

## 🎯 High-Level Assessment & Suggestions

Your concept is **excellent** and addresses a real market need. The multi-layered AI approach with story memory is sophisticated and necessary for maintaining coherence in long-form content. Here are some key observations and suggestions:

### ✅ **Strengths of Your Approach**
- **Story Memory Architecture**: Critical for maintaining consistency across long books
- **Multi-AI Orchestration**: Planning → Writing → Supervision is the right pattern
- **Incremental Generation**: Chapter-by-section prevents context overload
- **Interactive Editing**: Allows user refinement throughout the process
- **Freemium Model**: Perfect for this type of high-value, resource-intensive product

### 💡 **Additional Considerations**
1. **Version Control**: Track changes when users edit storylines/chapters
2. **Collaborative Features**: Allow sharing drafts with beta readers
3. **Genre-Specific Templates**: Pre-built story structures for different genres
4. **Quality Scoring**: AI-powered quality assessment and improvement suggestions
5. **Multi-language Support**: Different writing styles per language
6. **Audio Generation**: Text-to-speech for generated books (future feature)

## 🏗️ Recommended Backend Architecture

```
src/
├── app/
│   ├── (protected)/
│   │   ├── dashboard/              # User's book library
│   │   ├── book/
│   │   │   ├── [id]/              # Book reader/editor
│   │   │   ├── create/            # New book wizard
│   │   │   └── settings/          # Book preferences
│   │   └── subscription/          # Billing management
│   ├── api/
│   │   ├── books/                 # CRUD operations
│   │   ├── ai/
│   │   │   ├── generate-outline/  # Planning AI
│   │   │   ├── write-section/     # Writing AI
│   │   │   ├── supervise/         # Consistency AI
│   │   │   └── story-memory/      # Context management
│   │   ├── subscription/          # Stripe integration
│   │   └── export/                # PDF/EPUB generation
├── lib/
│   ├── ai/
│   │   ├── orchestrator.ts        # Main AI workflow controller
│   │   ├── planning-agent.ts      # Outline generation
│   │   ├── writing-agent.ts       # Section writing
│   │   ├── supervision-agent.ts   # Consistency checking
│   │   └── story-memory.ts        # Context management
│   ├── subscription/
│   │   ├── stripe.ts              # Payment processing
│   │   ├── usage-tracking.ts      # Feature limits
│   │   └── tier-validation.ts     # Access control
│   └── export/
│       ├── pdf-generator.ts       # PDF export
│       └── epub-generator.ts      # EPUB export
```

## 📊 Core Data Models

### Enhanced Prisma Schema

```prisma
model User {
  id                String         @id @default(cuid())
  email            String         @unique
  role             Role           @default(USER)
  
  // Subscription
  subscriptionTier SubscriptionTier @default(FREE)
  subscriptionId   String?        // Stripe subscription ID
  currentPeriodEnd DateTime?
  
  // Usage tracking
  booksGenerated   Int            @default(0)
  wordsGenerated   Int            @default(0)
  lastResetDate    DateTime       @default(now())
  
  books            Book[]
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
}

model Book {
  id               String         @id @default(cuid())
  userId           String
  user             User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Basic info
  title            String
  prompt           String         @db.Text
  backCover        String?        @db.Text
  storylineSummary String?        @db.Text
  
  // Settings
  settings         BookSettings?
  
  // Structure
  outline          BookOutline?
  chapters         Chapter[]
  storyMemory      StoryMemory?
  
  // Status
  status           BookStatus     @default(PLANNING)
  generationStep   GenerationStep @default(PROMPT)
  
  // Export
  lastExportedAt   DateTime?
  exportFormats    String[]       @default([])
  
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
}

model BookSettings {
  id              String @id @default(cuid())
  bookId          String @unique
  book            Book   @relation(fields: [bookId], references: [id], onDelete: Cascade)
  
  language        String @default("en")
  wordCount       Int    @default(50000)
  genre           String
  targetAudience  String
  tone            String
  endingType      String
  structure       String
  
  characterNames  String[] @default([])
  inspirationBooks String[] @default([])
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model BookOutline {
  id          String    @id @default(cuid())
  bookId      String    @unique
  book        Book      @relation(fields: [bookId], references: [id], onDelete: Cascade)
  
  summary     String    @db.Text
  themes      String[]
  plotPoints  Json      // Key story beats and arcs
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model Chapter {
  id          String    @id @default(cuid())
  bookId      String
  book        Book      @relation(fields: [bookId], references: [id], onDelete: Cascade)
  
  chapterNumber Int
  title       String
  summary     String    @db.Text
  
  sections    Section[]
  
  status      ChapterStatus @default(PLANNED)
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@unique([bookId, chapterNumber])
}

model Section {
  id          String    @id @default(cuid())
  chapterId   String
  chapter     Chapter   @relation(fields: [chapterId], references: [id], onDelete: Cascade)
  
  sectionNumber Int
  title       String?
  content     String    @db.Text
  wordCount   Int       @default(0)
  
  // AI metadata
  prompt      String    @db.Text
  aiModel     String
  tokensUsed  Int       @default(0)
  
  status      SectionStatus @default(PLANNED)
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@unique([chapterId, sectionNumber])
}

model StoryMemory {
  id          String     @id @default(cuid())
  bookId      String     @unique
  book        Book       @relation(fields: [bookId], references: [id], onDelete: Cascade)
  
  characters  Character[]
  locations   Location[]
  timeline    TimelineEvent[]
  themes      String[]
  worldRules  Json       // Fantasy/sci-fi world building rules
  
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model Character {
  id              String      @id @default(cuid())
  storyMemoryId   String
  storyMemory     StoryMemory @relation(fields: [storyMemoryId], references: [id], onDelete: Cascade)
  
  name            String
  role            String      // protagonist, antagonist, supporting
  description     String      @db.Text
  personality     String      @db.Text
  backstory       String?     @db.Text
  arc             String?     @db.Text
  
  firstAppearance String?     // Chapter reference
  relationships   Json        // Relationships with other characters
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model Location {
  id              String      @id @default(cuid())
  storyMemoryId   String
  storyMemory     StoryMemory @relation(fields: [storyMemoryId], references: [id], onDelete: Cascade)
  
  name            String
  description     String      @db.Text
  importance      String      // major, minor, mentioned
  
  firstMention    String?     // Chapter reference
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

model TimelineEvent {
  id              String      @id @default(cuid())
  storyMemoryId   String
  storyMemory     StoryMemory @relation(fields: [storyMemoryId], references: [id], onDelete: Cascade)
  
  title           String
  description     String      @db.Text
  chapterReference String
  importance      EventImportance
  
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt
}

enum Role {
  USER
  ADMIN
}

enum SubscriptionTier {
  FREE
  BASIC
  PREMIUM
}

enum BookStatus {
  PLANNING
  GENERATING
  COMPLETE
  ARCHIVED
}

enum GenerationStep {
  PROMPT
  BACK_COVER
  OUTLINE
  CHAPTERS
  SECTIONS
  SUPERVISION
  COMPLETE
}

enum ChapterStatus {
  PLANNED
  GENERATING
  COMPLETE
  NEEDS_REVISION
}

enum SectionStatus {
  PLANNED
  GENERATING
  COMPLETE
  NEEDS_REVISION
}

enum EventImportance {
  CRITICAL
  MAJOR
  MINOR
}
```

## 🤖 AI Orchestration Strategy

### Core AI Workflow Controller

```typescript
// src/lib/ai/orchestrator.ts
export class BookGenerationOrchestrator {
  private book: Book;
  private storyMemory: StoryMemory;
  
  async generateBook(prompt: string, settings: BookSettings) {
    try {
      // Step 1: Generate back cover and storyline
      await this.generateBackCover(prompt, settings);
      
      // Step 2: Create detailed outline
      await this.generateOutline();
      
      // Step 3: Generate chapters sequentially
      await this.generateChapters();
      
      // Step 4: Final supervision pass
      await this.superviseConsistency();
      
      return this.book;
    } catch (error) {
      await this.handleGenerationError(error);
      throw error;
    }
  }
  
  private async generateChapters() {
    for (const chapter of this.book.chapters) {
      await this.generateChapterSections(chapter);
      await this.updateStoryMemory(chapter);
    }
  }
  
  private async generateChapterSections(chapter: Chapter) {
    for (const section of chapter.sections) {
      const context = await this.buildContextForSection(section);
      const content = await this.writingAgent.generateSection(
        section.prompt,
        context,
        this.storyMemory
      );
      
      await this.saveSectionContent(section, content);
      await this.updateStoryMemoryFromSection(section, content);
    }
  }
  
  private async buildContextForSection(section: Section): Promise<AIContext> {
    const recentSections = await this.getRecentSections(section, 3);
    const relevantCharacters = await this.getRelevantCharacters(section);
    const plotContext = await this.getCurrentPlotContext(section);
    
    return {
      recentContent: recentSections,
      activeCharacters: relevantCharacters,
      plotContext,
      storyMemory: this.storyMemory,
      bookSettings: this.book.settings
    };
  }
}
```

### Token Management Strategy

```typescript
// src/lib/ai/context-manager.ts
export class ContextManager {
  private maxTokens = 8000; // Adjust based on model
  
  async optimizeContext(context: AIContext): Promise<OptimizedContext> {
    const tokenCount = this.estimateTokens(context);
    
    if (tokenCount <= this.maxTokens) {
      return context;
    }
    
    // Prioritize context elements
    return {
      essential: await this.getEssentialContext(context),
      recent: await this.getRecentContent(context, 2000),
      characters: await this.getActiveCharacters(context, 1000),
      plot: await this.getCurrentPlotPoints(context, 1000)
    };
  }
  
  private estimateTokens(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
}
```

## 💳 Subscription Architecture

### Stripe Integration

```typescript
// src/lib/subscription/stripe.ts
export class SubscriptionManager {
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  
  async createCheckoutSession(userId: string, tier: SubscriptionTier) {
    const session = await this.stripe.checkout.sessions.create({
      customer_email: user.email,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{
        price: this.getPriceId(tier),
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/subscription`,
      metadata: { userId, tier }
    });
    
    return session.url;
  }
  
  async handleWebhook(event: Stripe.Event) {
    switch (event.type) {
      case 'customer.subscription.created':
        await this.activateSubscription(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.cancelSubscription(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.updateUsageLimits(event.data.object);
        break;
    }
  }
}
```

### Usage Tracking

```typescript
// src/lib/subscription/usage-tracking.ts
export class UsageTracker {
  async checkGenerationLimit(userId: string, wordCount: number): Promise<boolean> {
    const user = await this.getUser(userId);
    const limits = this.getTierLimits(user.subscriptionTier);
    
    const currentUsage = await this.getCurrentPeriodUsage(userId);
    
    return currentUsage.wordsGenerated + wordCount <= limits.monthlyWords;
  }
  
  async trackGeneration(userId: string, wordCount: number, tokensUsed: number) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        wordsGenerated: { increment: wordCount },
        // Track additional metrics
      }
    });
  }
  
  private getTierLimits(tier: SubscriptionTier) {
    const limits = {
      FREE: { monthlyWords: 10000, booksPerMonth: 1, exportFormats: ['txt'] },
      BASIC: { monthlyWords: 100000, booksPerMonth: 5, exportFormats: ['txt', 'pdf'] },
      PREMIUM: { monthlyWords: 500000, booksPerMonth: 20, exportFormats: ['txt', 'pdf', 'epub'] }
    };
    
    return limits[tier];
  }
}
```

## 🚀 Implementation Roadmap

### Phase 1: Core Generation Pipeline (Week 1-2) - **IN PROGRESS**
1. **✅ Database setup**: Implement core models (Book, Chapter, Section) - **COMPLETED**
2. **🔄 Simple UI**: Book creation wizard, chapter viewer - **NEXT**
3. **📋 Basic AI workflow**: Prompt → Back cover → Simple outline - **PLANNED**
4. **🤖 Single chapter generation**: Test the writing agent with story memory - **PLANNED**

### Phase 2: Story Memory & Consistency (Week 3-4)
1. **Story memory tracking**: Characters, locations, timeline
2. **Context optimization**: Token management and context building
3. **Supervision agent**: Consistency checking across chapters
4. **Interactive editing**: Allow users to refine outlines and sections

### Phase 3: Subscription & Export (Week 5-6)
1. **Stripe integration**: Payment processing and webhooks
2. **Usage tracking**: Word limits and feature gates
3. **Export functionality**: PDF and EPUB generation
4. **User dashboard**: Book library and management

### Phase 4: Polish & Scale (Week 7-8)
1. **Performance optimization**: Caching and background processing
2. **Advanced features**: Version control, collaboration
3. **Quality improvements**: Better prompts and error handling
4. **Analytics**: Usage metrics and optimization

## ⚠️ Scaling Considerations

### 1. **AI Cost Management**
- **Token optimization**: Implement aggressive context pruning
- **Model selection**: Use cheaper models for planning, premium for writing
- **Caching**: Cache similar prompts and reuse generated content
- **Batch processing**: Queue non-urgent generations

### 2. **Database Performance**
- **Indexing**: Add indexes on userId, bookId, status fields
- **Pagination**: Implement cursor-based pagination for large books
- **Read replicas**: Separate read/write databases as you scale
- **Content storage**: Consider moving large text to blob storage (S3)

### 3. **Background Processing**
- **Queue system**: Use BullMQ or similar for long-running generations
- **Progressive generation**: Stream updates to users as sections complete
- **Error recovery**: Implement retry logic and graceful degradation
- **Rate limiting**: Prevent abuse of AI generation endpoints

### 4. **Monitoring & Observability**
- **AI metrics**: Track token usage, generation time, quality scores
- **User analytics**: Monitor conversion rates and feature usage
- **Error tracking**: Comprehensive logging for AI failures
- **Performance monitoring**: Database queries and API response times

## 🔧 Recommended Folder Structure

```
src/
├── app/
│   ├── (protected)/
│   │   ├── dashboard/
│   │   │   ├── page.tsx                    # Book library
│   │   │   └── components/                 # Dashboard components
│   │   ├── book/
│   │   │   ├── create/
│   │   │   │   ├── page.tsx               # Book creation wizard
│   │   │   │   └── components/            # Creation flow components
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx               # Book reader
│   │   │   │   ├── edit/                  # Interactive editing
│   │   │   │   └── components/            # Book-specific components
│   │   │   └── export/
│   │   │       └── [id]/                  # Export handling
│   │   └── subscription/
│   │       ├── page.tsx                   # Billing dashboard
│   │       ├── success/                   # Payment success
│   │       └── components/                # Subscription components
│   └── api/
│       ├── books/                         # Book CRUD
│       ├── ai/
│       │   ├── generate-outline/          # Planning endpoints
│       │   ├── write-section/             # Writing endpoints
│       │   ├── supervise/                 # Consistency endpoints
│       │   └── story-memory/              # Memory management
│       ├── subscription/                  # Stripe integration
│       └── export/                        # File generation
├── components/
│   ├── book/                              # Book-related components
│   │   ├── BookCard.tsx
│   │   ├── ChapterList.tsx
│   │   ├── SectionEditor.tsx
│   │   └── StoryMemoryViewer.tsx
│   ├── creation/                          # Book creation flow
│   │   ├── PromptInput.tsx
│   │   ├── SettingsForm.tsx
│   │   └── GenerationProgress.tsx
│   ├── subscription/                      # Billing components
│   │   ├── PricingTable.tsx
│   │   ├── UsageDisplay.tsx
│   │   └── BillingHistory.tsx
│   └── ui/                               # Base components (existing)
├── lib/
│   ├── ai/
│   │   ├── orchestrator.ts               # Main workflow controller
│   │   ├── agents/
│   │   │   ├── planning-agent.ts         # Outline generation
│   │   │   ├── writing-agent.ts          # Section writing
│   │   │   └── supervision-agent.ts      # Consistency checking
│   │   ├── context-manager.ts            # Token optimization
│   │   ├── story-memory.ts               # Memory management
│   │   └── prompts/                      # AI prompt templates
│   ├── subscription/
│   │   ├── stripe.ts                     # Payment processing
│   │   ├── usage-tracking.ts             # Feature limits
│   │   └── tier-validation.ts            # Access control
│   ├── export/
│   │   ├── pdf-generator.ts              # PDF creation
│   │   ├── epub-generator.ts             # EPUB creation
│   │   └── templates/                    # Export templates
│   └── queue/                            # Background processing
│       ├── book-generation.ts
│       └── export-processing.ts
├── types/
│   ├── book.ts                          # Book-related types
│   ├── ai.ts                            # AI-related types
│   └── subscription.ts                  # Billing types
└── hooks/
    ├── useBookGeneration.ts             # Generation state management
    ├── useStoryMemory.ts                # Memory hooks
    └── useSubscription.ts               # Billing hooks
```

## 📝 Development Notes

### Key Technical Decisions
1. **Prisma Schema**: Comprehensive data model supporting all features
2. **AI Orchestration**: Centralized controller with specialized agents
3. **Token Management**: Context optimization to prevent overruns
4. **Subscription Model**: Stripe-based with usage tracking
5. **Export System**: PDF/EPUB generation with templates

### Critical Implementation Points
- **Server/Client Separation**: Follow existing Supabase patterns
- **Error Handling**: Comprehensive retry and fallback logic
- **Performance**: Background processing for long operations
- **Security**: Proper access control and data validation
- **Monitoring**: Track AI costs and user engagement

### Testing Strategy
- **Unit Tests**: AI agents and utility functions
- **Integration Tests**: Full generation pipeline
- **E2E Tests**: User workflows from creation to export
- **Performance Tests**: AI response times and database queries

This architecture provides a solid foundation for your AI-powered book generation app while maintaining the production-ready qualities of your existing scaffold. The key is to start with the core generation pipeline and iterate based on user feedback and usage patterns.
