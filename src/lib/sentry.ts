import { env } from './env'

/**
 * Initialize Sentry for error tracking
 */
export function initSentry() {
  // Temporarily disabled - uncomment when needed
  return
}

/**
 * Capture an exception with additional context
 */
export async function captureError(
  error: Error,
  context?: Record<string, any>
) {
  // Temporarily disabled - log to console instead
  console.error('Error:', error, context)
  return
}

/**
 * Add user context to Sentry
 */
export async function setSentryUser(user: {
  id: string
  email?: string
  username?: string
}) {
  // Temporarily disabled
  return
}

/**
 * Set organization context
 */
export async function setSentryOrganization(org: {
  id: string
  name: string
  plan?: string
}) {
  // Temporarily disabled
  return
}

/**
 * Performance monitoring - start a transaction
 */
export async function startTransaction(name: string, operation: string) {
  // Temporarily disabled
  return null
}

/**
 * Add breadcrumb for debugging
 */
export async function addBreadcrumb(
  message: string,
  category?: string,
  level?: 'info' | 'warning' | 'error'
) {
  // Temporarily disabled
  return
}
