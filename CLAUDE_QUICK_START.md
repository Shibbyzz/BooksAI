# 🚀 Claude Quick Start - Read This First

## ⚡ Critical Information for AI Assistants

### 🎯 **What This Is**
Production-ready Next.js 15 + React 19 + TypeScript starter with authentication, AI integration, and full-stack tooling.

### 🚨 **Most Important Rules**

1. **Server vs Client Imports** (CRITICAL):
   ```typescript
   // ✅ For server-side operations
   import { createServerClient } from '@/lib/supabase-server'
   
   // ✅ For client-side operations  
   import { createClient } from '@/lib/supabase'
   ```

2. **Current Status**: 12 non-critical TypeScript errors (testing only) - **ignore them**

3. **App is production-ready** - focus on adding features, not fixing infrastructure

### 📁 **Key File Locations**

```
src/
├── app/                     # Next.js App Router pages
│   ├── (auth)/             # Login/signup (unauthenticated only)
│   ├── (protected)/        # Requires auth (middleware enforced)
│   └── api/ask/            # OpenAI streaming endpoint
├── components/ui/          # Base UI components
├── lib/
│   ├── supabase.ts         # CLIENT-side Supabase
│   ├── supabase-server.ts  # SERVER-side Supabase ⚠️
│   ├── openai.ts           # AI integration (Vercel AI SDK 4.3)
│   └── env.ts              # Type-safe environment variables
└── types/index.ts          # TypeScript definitions
```

### 🔧 **Common Tasks**

#### Add New Page
```typescript
// For public pages
src/app/new-page/page.tsx

// For authenticated pages
src/app/(protected)/new-page/page.tsx
```

#### Database Operations
```typescript
// Server Component
import { createServerClient } from '@/lib/supabase-server'
const supabase = await createServerClient()

// Client Component
import { createClient } from '@/lib/supabase'
const supabase = createClient()
```

### ⚠️ **Known Issues (Non-Critical)**
- 12 TypeScript errors in test files - **safe to ignore**
- All core functionality works perfectly
- App builds and deploys successfully

### 🛠️ **Development Commands**
```bash
pnpm dev           # Start development server (localhost:3000)
pnpm type-check    # Check TypeScript (expect 12 errors)
pnpm build         # Production build
```

**Full documentation**: See `DEVELOPMENT_GUIDE.md` for complete details. 