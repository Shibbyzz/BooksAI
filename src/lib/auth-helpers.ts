import { createServerClient } from '@/lib/supabase-server'
import { User } from '@/types'

/**
 * Get the current user on the server side
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createServerClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return user as User | null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Check if user has admin role
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false
  return user.user_metadata?.role === 'admin'
}

/**
 * Redirect to login if user is not authenticated
 */
export function requireAuth(user: User | null): boolean {
  return !!user
}

/**
 * Redirect to admin login if user is not admin
 */
export function requireAdmin(user: User | null): boolean {
  return requireAuth(user) && isAdmin(user)
}
