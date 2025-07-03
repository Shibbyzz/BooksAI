import React from 'react'
import { env } from './env'

/**
 * Initialize PostHog analytics
 */
export function initPostHog() {
  if (!env.NEXT_PUBLIC_ENABLE_ANALYTICS || !env.NEXT_PUBLIC_POSTHOG_KEY) {
    return
  }

  // Dynamic import to avoid bundle size
  import('posthog-js').then(({ default: posthog }) => {
    posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      loaded: posthog => {
        if (env.NODE_ENV === 'development') posthog.debug()
      },
      capture_pageview: false, // We'll handle this manually
      capture_pageleave: true,
    })
  })
}

/**
 * Track an event
 */
export async function trackEvent(
  event: string,
  properties?: Record<string, any>
) {
  if (!env.NEXT_PUBLIC_ENABLE_ANALYTICS) {
    console.log('Analytics Event:', event, properties)
    return
  }

  // PostHog tracking
  if (env.NEXT_PUBLIC_POSTHOG_KEY) {
    const { default: posthog } = await import('posthog-js')
    posthog.capture(event, properties)
  }

  // Plausible tracking (for simple events)
  if (env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && typeof window !== 'undefined') {
    ;(window as any).plausible?.(event, { props: properties })
  }
}

/**
 * Track page view
 */
export async function trackPageView(url?: string) {
  if (!env.NEXT_PUBLIC_ENABLE_ANALYTICS) {
    return
  }

  const page = url || window.location.pathname

  // PostHog page view
  if (env.NEXT_PUBLIC_POSTHOG_KEY) {
    const { default: posthog } = await import('posthog-js')
    posthog.capture('$pageview', {
      $current_url: page,
    })
  }

  // Plausible page view
  if (env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN && typeof window !== 'undefined') {
    ;(window as any).plausible?.('pageview', { u: page })
  }
}

/**
 * Identify user for analytics
 */
export async function identifyUser(
  userId: string,
  properties?: {
    email?: string
    name?: string
    plan?: string
    organizationId?: string
    organizationName?: string
    [key: string]: any
  }
) {
  if (!env.NEXT_PUBLIC_ENABLE_ANALYTICS) {
    return
  }

  // PostHog identify
  if (env.NEXT_PUBLIC_POSTHOG_KEY) {
    const { default: posthog } = await import('posthog-js')
    posthog.identify(userId, properties)
  }
}

/**
 * Track user signup
 */
export function trackSignup(method: 'email' | 'google' | 'github') {
  trackEvent('user_signup', {
    method,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Track user login
 */
export function trackLogin(method: 'email' | 'google' | 'github') {
  trackEvent('user_login', {
    method,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(
  feature: string,
  properties?: Record<string, any>
) {
  trackEvent('feature_used', {
    feature,
    ...properties,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Track AI interaction
 */
export function trackAIInteraction(
  type: 'chat' | 'completion' | 'tool_use',
  properties?: {
    model?: string
    tokens?: number
    latency?: number
    success?: boolean
    [key: string]: any
  }
) {
  trackEvent('ai_interaction', {
    type,
    ...properties,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Track organization events
 */
export function trackOrganizationEvent(
  event: 'created' | 'joined' | 'left' | 'invited',
  orgId: string,
  properties?: Record<string, any>
) {
  trackEvent('organization_event', {
    event,
    organization_id: orgId,
    ...properties,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Reset analytics (on logout)
 */
export async function resetAnalytics() {
  if (!env.NEXT_PUBLIC_ENABLE_ANALYTICS) {
    return
  }

  // PostHog reset
  if (env.NEXT_PUBLIC_POSTHOG_KEY) {
    const { default: posthog } = await import('posthog-js')
    posthog.reset()
  }
}

/**
 * Analytics provider component for Next.js
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  // Initialize analytics on mount
  React.useEffect(() => {
    initPostHog()
  }, [])

  return <>{children}</>
}

// Re-export for convenience
export { trackEvent as track, trackPageView as pageview }
