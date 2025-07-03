import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

// Client-side Supabase client
export const createClient = () => {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Note: Server client and middleware client are in separate files to avoid Next.js build issues

// Auth helpers
export const signOut = async () => {
  const supabase = createClient()
  await supabase.auth.signOut()
}

export const signInWithEmail = async (email: string, password: string) => {
  const supabase = createClient()
  return await supabase.auth.signInWithPassword({ email, password })
}

export const signUpWithEmail = async (email: string, password: string) => {
  const supabase = createClient()
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/api/auth/callback`,
    },
  })
}

export const signInWithGoogle = async () => {
  const supabase = createClient()
  return await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback`,
    },
  })
}

// Note: Server-only helpers are now in supabase-server.ts
