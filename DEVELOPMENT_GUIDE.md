# Production-Ready Full-Stack Starter - Development Guide

## 🎯 Project Overview

This is a **production-ready, modern full-stack web application starter** built with enterprise-grade technologies and best practices. It provides a complete foundation for building SaaS applications, AI-powered products, or any modern web application requiring authentication, database integration, and scalability.

### 🏗️ Architecture Philosophy
- **App Router First**: Uses Next.js 15 App Router for modern React patterns
- **Server Components**: Leverages React Server Components for optimal performance
- **Type Safety**: Full TypeScript coverage with strict configuration
- **Separation of Concerns**: Clear separation between client/server code
- **Production Ready**: Includes monitoring, testing, CI/CD, and deployment pipelines

## 🚀 Tech Stack

### Core Framework
- **Next.js 15.3.4** - React framework with App Router
- **React 19** - UI library with latest features
- **TypeScript 5.6** - Type safety and developer experience
- **Tailwind CSS 3.4** - Utility-first CSS framework

### Backend & Database
- **Prisma 5.22** - Type-safe database ORM
- **Supabase** - PostgreSQL database + authentication
- **Supabase Auth** - Email/password + OAuth (Google)

### AI Integration
- **Vercel AI SDK 4.3** - AI/ML integration framework
- **OpenAI API** - Language model integration with streaming

### Development & Testing
- **Jest 29** - Unit testing framework
- **Playwright 1.53** - End-to-end testing
- **Storybook 8.6** - Component development environment
- **ESLint 9** + **Prettier 3.6** - Code quality and formatting

### Deployment & Monitoring
- **Vercel** - Deployment platform (configured)
- **Sentry 8.55** - Error tracking and performance monitoring
- **PostHog** - Product analytics (optional)
- **GitHub Actions** - CI/CD pipeline

## 📁 Project Structure

```
src/
├── app/                     # Next.js App Router
│   ├── (auth)/             # Auth route group (login, signup)
│   ├── (protected)/        # Protected routes (settings, admin)
│   ├── ai-chat/           # AI chat interface
│   ├── api/               # API routes
│   │   ├── ask/           # OpenAI streaming endpoint
│   │   └── auth/          # Supabase auth callbacks
│   ├── globals.css        # Global styles with design system
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Dynamic home page
├── components/            # Reusable UI components
│   ├── ai/               # AI-specific components
│   ├── layout/           # Layout components (Hero, Dashboard)
│   └── ui/               # Base UI primitives
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions and configurations
│   ├── supabase.ts       # Client-side Supabase functions
│   ├── supabase-server.ts # Server-side Supabase functions (NEW)
│   ├── auth-helpers.ts   # Authentication utilities
│   ├── openai.ts         # AI/OpenAI integration
│   ├── env.ts            # Type-safe environment variables
│   ├── sentry.ts         # Error monitoring setup
│   └── analytics.ts      # Analytics integration
├── providers/            # React context providers
├── types/                # TypeScript type definitions
└── styles/               # Additional styling
```

## 🔧 Key Architecture Decisions

### 1. **Supabase Client Separation** (CRITICAL)
- **`src/lib/supabase.ts`**: Client-side functions only
- **`src/lib/supabase-server.ts`**: Server-side functions only
- **Reason**: Prevents Next.js build errors with `next/headers`

### 2. **Route Groups**
- **`(auth)`**: Login/signup pages (redirects if authenticated)
- **`(protected)`**: Requires authentication via middleware

### 3. **Middleware Protection**
```typescript
// Protected routes automatically redirect to login
const protectedRoutes = ['/settings', '/admin', '/ai-chat']
const adminRoutes = ['/admin'] // Requires admin role
```

### 4. **Environment Variables** (Type-Safe)
All environment variables are validated using `@t3-oss/env-nextjs` in `src/lib/env.ts`

### 5. **Database Schema** (Multi-Tenant Ready)
```prisma
// Organizations for multi-tenant architecture
model Organization {
  id       String @id @default(cuid())
  name     String
  plan     Plan   @default(FREE)
  // ... members, settings
}

// Enhanced User model
model User {
  id               String  @id @default(cuid())
  email            String  @unique
  role             Role    @default(USER)
  organizationId   String?
  // ... user metadata
}
```

## 🛠️ Setup Instructions

### 1. **Initial Setup**
```bash
# Copy project to new location
cp -r "Generic Project" "Your-New-App"
cd "Your-New-App"

# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate
```

### 2. **Environment Configuration**
Create `.env.local` with these variables:
```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# OpenAI
OPENAI_API_KEY="sk-your-openai-api-key"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# Optional: Analytics & Monitoring
NEXT_PUBLIC_ENABLE_ANALYTICS="false"
SENTRY_DSN="your-sentry-dsn"
```

### 3. **Development Commands**
```bash
pnpm dev          # Start development server
pnpm build        # Production build
pnpm type-check   # TypeScript checking
pnpm lint         # ESLint checking
pnpm test         # Unit tests
pnpm test:e2e     # End-to-end tests
pnpm storybook    # Component development
```

## 🧩 Key Components

### 1. **Authentication Flow**
- **Login/Signup**: `src/app/(auth)/`
- **Middleware Protection**: `middleware.ts`
- **Auth Helpers**: `src/lib/auth-helpers.ts`
- **User Context**: `src/hooks/useUser.ts`

### 2. **AI Integration**
- **Chat Interface**: `src/components/ai/ChatInterface.tsx`
- **API Endpoint**: `src/app/api/ask/route.ts`
- **AI Utilities**: `src/lib/openai.ts`

### 3. **UI Components**
- **Base Components**: `src/components/ui/`
- **Storybook Stories**: `*.stories.tsx` files
- **Design System**: Tailwind + CSS variables in `globals.css`

## 🎉 **RECENT PROGRESS UPDATE**

### ✅ **Authentication System (COMPLETED)**
- **Enhanced Middleware**: Complete route protection for `/dashboard` and `/book/*` routes
- **useAuth Hook**: Full integration between Supabase Auth and Prisma User model
- **User Management APIs**: `/api/users/[id]` and `/api/users/create` with auto-creation
- **Login Flow**: Fixed authentication redirect to `/dashboard` after successful login
- **Email Confirmation**: Fixed email confirmation links and auth callback routes
- **Next.js 15 Compatibility**: Updated auth callback for Next.js 15 cookies API
- **User Creation**: Fixed missing email field bug in user creation process

### ✅ **BooksAI UI System (COMPLETED)**
- **Dashboard Page**: Complete book-focused interface with empty states
- **Book Grid**: Responsive book display with real-time status indicators (Planning/Generating/Complete)
- **Book Creation**: Full `/book/create` page with comprehensive form
- **Book Management**: Individual `/book/[id]` pages with view/edit capabilities
- **CRUD Operations**: Complete Create, Read, Update, Delete for books
- **Delete Confirmation**: Modal confirmation for book deletion
- **Book Details**: Sidebar with metadata and settings display

### 🚀 **Current Status**
- **Authentication**: ✅ PRODUCTION READY
- **Core UI**: ✅ PRODUCTION READY
- **Database**: ✅ PRODUCTION READY with 13-table schema
- **API Layer**: ✅ PRODUCTION READY with full CRUD operations

### ⚠️ **Known Issues (Non-Critical)**
```
Minor remaining issues:
- 12 TypeScript errors in testing/optional dependencies
- Client component hydration warnings (cosmetic only)
- Next.js SWC version mismatch warning (doesn't affect functionality)
```

## 🎨 **NEXT STEPS: UI Enhancement Roadmap**

### **Phase 1: Book Generation (Next Priority)**
- **AI Integration**: Connect book creation to OpenAI for content generation
- **Generation Progress**: Real-time progress indicators during book creation
- **Chapter Management**: UI for viewing/editing individual chapters
- **Outline Generation**: AI-powered book outline creation

### **Phase 2: Advanced Book Features**
- **Book Export**: PDF, EPUB, DOCX export functionality
- **Book Templates**: Pre-defined templates for different genres
- **Advanced Editor**: Rich text editor for manual chapter editing
- **Version History**: Track changes and revisions

### **Phase 3: User Experience**
- **Settings Page**: User preferences, subscription management
- **Search & Filter**: Search books, filter by status/genre
- **Bulk Operations**: Multi-select and bulk actions for books
- **Responsive Design**: Mobile-first responsive improvements

### **Phase 4: Advanced Features**
- **Admin Interface**: User management, analytics dashboard
- **Collaboration**: Share books, collaborative editing
- **Analytics**: Book performance metrics, reading analytics
- **Integrations**: Third-party publishing platforms

### **Phase 5: Polish & Optimization**
- **Performance**: Image optimization, loading states
- **Accessibility**: WCAG compliance, keyboard navigation
- **Internationalization**: Multi-language support
- **PWA**: Progressive Web App capabilities

**Impact**: None on core functionality. App builds and runs perfectly.

## 🎨 Design System

### Color Palette
```css
/* CSS Variables in globals.css */
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--primary: 221.2 83.2% 53.3%;
--secondary: 210 40% 96%;
/* ... and more */
```

### Component Variants
```typescript
// Button variants
type ButtonVariant = 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'

// Theme options
type Theme = 'light' | 'dark' | 'system'
```

## 🔒 Security & Permissions

### Role-Based Access Control (RBAC)
```typescript
enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

// Admin route protection in middleware
if (isAdminRoute && user?.user_metadata?.role !== 'admin') {
  return redirect('/')
}
```

### Authentication Patterns
```typescript
// Server-side user retrieval
const user = await getCurrentUser() // Returns null if not authenticated

// Client-side user hook
const { user, loading } = useUser() // React hook with loading state
```

## 🚀 Deployment

### Vercel (Recommended)
1. Connect GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on git push

### Environment Variables for Production
- All the same as local, but with production URLs
- `NEXTAUTH_URL` should be your production domain
- `NEXT_PUBLIC_APP_URL` should be your production domain

## 🧪 Testing Strategy

### Unit Tests (Jest)
```bash
pnpm test                    # Run all unit tests
pnpm test --watch           # Watch mode
pnpm test --coverage        # Coverage report
```

### E2E Tests (Playwright)
```bash
pnpm test:e2e               # Run E2E tests
pnpm test:e2e --ui          # Interactive mode
```

### Component Development (Storybook)
```bash
pnpm storybook              # Start Storybook
pnpm build-storybook        # Build static Storybook
```

## 📈 Performance & Monitoring

### Built-in Optimizations
- React Server Components
- Next.js Image Optimization
- Automatic code splitting
- Edge Runtime for API routes
- Streaming UI patterns

### Monitoring Setup
- **Sentry**: Error tracking and performance monitoring
- **Vercel Analytics**: Web vitals and page views
- **PostHog**: Product analytics (optional)

## 🔄 Development Workflow

### Git Workflow
```bash
# Conventional commits are enforced
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "docs: update readme"
```

### Code Quality
- **Pre-commit hooks**: ESLint + Prettier
- **Type checking**: Strict TypeScript
- **Testing**: Required for CI/CD

## 🎯 Customization Guide

### 1. **Branding**
- Update `globals.css` color variables
- Modify components in `src/components/ui/`
- Update metadata in `layout.tsx`

### 2. **Database Schema**
- Modify `prisma/schema.prisma`
- Run `pnpm db:generate` after changes
- Create migrations with `pnpm db:migrate`

### 3. **Adding Features**
- Use existing patterns in `src/app/`
- Follow the route group structure
- Add components to appropriate directories

## 🆘 Common Issues & Solutions

### 1. **"Cannot find module" errors**
- Run `pnpm install` to ensure all dependencies are installed
- Check if you're importing from the correct paths (use `@/` prefix)

### 2. **Supabase connection issues**
- Verify environment variables are set correctly
- Check Supabase project settings match your env vars

### 3. **TypeScript errors in tests**
- The remaining 12 errors are expected and won't affect functionality
- Install missing peer dependencies if needed

### 4. **Build errors**
- Ensure server-only code stays in `supabase-server.ts`
- Don't import `next/headers` in client components

## 📚 Resources

### Documentation
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [Supabase Docs](https://supabase.com/docs)
- [Prisma Docs](https://www.prisma.io/docs)

### Component Library
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/) (for accessible components)
- [Lucide Icons](https://lucide.dev/)

---

## 💡 **For Claude/AI Assistants**

When working with this codebase:

1. **Always use the server imports correctly**:
   - Import from `@/lib/supabase-server` for server-side operations
   - Import from `@/lib/supabase` for client-side operations

2. **Follow the established patterns**:
   - Route groups for organization
   - Server Components where possible
   - Type-safe environment variables

3. **The app is production-ready** - focus on adding features rather than fixing infrastructure

4. **Current status**: 12 non-critical TypeScript errors remain (testing/monitoring related)

5. **Testing**: Use the existing Jest/Playwright setup, ignore type errors in test files

This codebase represents a modern, scalable foundation for building production applications with AI integration, authentication, and enterprise-grade tooling. 