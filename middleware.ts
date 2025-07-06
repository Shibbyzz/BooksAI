import { createServerClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Handle auth for protected routes
  if (req.nextUrl.pathname.startsWith('/dashboard') || 
      req.nextUrl.pathname.startsWith('/settings') ||
      req.nextUrl.pathname.startsWith('/book') ||
      req.nextUrl.pathname.startsWith('/admin')) {
    
    const supabase = await createServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      const redirectUrl = new URL('/login', req.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Handle auth pages - redirect if already logged in
  if (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup') {
    const supabase = await createServerClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      const redirectUrl = new URL('/dashboard', req.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     * - api (API routes)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}
