'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { User as PrismaUser } from '@prisma/client'
import { createClient } from '@/lib/supabase'

interface AuthState {
  supabaseUser: User | null
  prismaUser: PrismaUser | null
  loading: boolean
  isAuthenticated: boolean
}

export function useAuth(): AuthState {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null)
  const [prismaUser, setPrismaUser] = useState<PrismaUser | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchPrismaUser = async (supabaseUserData: User) => {
    try {
      const response = await fetch(`/api/users/${supabaseUserData.id}`, {
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000), // 10 second timeout
      })
      
      if (response.ok) {
        const userData = await response.json()
        setPrismaUser(userData)
      } else if (response.status === 404) {
        // User doesn't exist in Prisma, create them
        const createResponse = await fetch('/api/users/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: supabaseUserData.id,
            email: supabaseUserData.email,
            name: supabaseUserData.user_metadata?.name || null,
            avatar: supabaseUserData.user_metadata?.avatar_url || null,
          }),
          signal: AbortSignal.timeout(10000), // 10 second timeout
        })
        
        if (createResponse.ok) {
          const newUser = await createResponse.json()
          setPrismaUser(newUser)
        }
      }
    } catch (error) {
      console.error('Error fetching/creating user:', error)
      console.warn('Database unavailable, continuing with Supabase auth only')
      // Don't set prismaUser to null if it fails - allow login to continue
    }
  }

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      
      const user = session?.user ?? null
      setSupabaseUser(user)
      
      if (user) {
        // Don't block loading on database fetch
        fetchPrismaUser(user)
      } else {
        setPrismaUser(null)
      }
      
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null
      setSupabaseUser(user)
      
      if (user) {
        // Don't block loading on database fetch
        fetchPrismaUser(user)
      } else {
        setPrismaUser(null)
      }
      
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return {
    supabaseUser,
    prismaUser,
    loading,
    // Allow authentication with just Supabase user if database is unavailable
    isAuthenticated: !!supabaseUser,
  }
} 