import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  
  // Redirect old auth callback URLs to the correct API route
  const newUrl = new URL('/api/auth/callback', requestUrl.origin)
  newUrl.search = requestUrl.search // Preserve query parameters
  
  return NextResponse.redirect(newUrl, 308) // Permanent redirect
} 