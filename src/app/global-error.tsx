'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { RefreshCcwIcon, HomeIcon, BugIcon } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error)

    // You can integrate with Sentry or other error tracking services here
    if (
      typeof window !== 'undefined' &&
      process.env.NODE_ENV === 'production'
    ) {
      // Example: Sentry.captureException(error)
    }
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
          <div className="text-center max-w-md">
            <div className="mb-8">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                <BugIcon className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Something went wrong!</h1>
              <p className="text-muted-foreground">
                An unexpected error occurred. We've been notified and are
                working to fix it.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-muted rounded-lg text-left">
                <details>
                  <summary className="cursor-pointer font-medium text-sm">
                    Error details (development only)
                  </summary>
                  <pre className="mt-2 text-xs whitespace-pre-wrap">
                    {error.message}
                  </pre>
                  {error.stack && (
                    <pre className="mt-2 text-xs whitespace-pre-wrap opacity-70">
                      {error.stack}
                    </pre>
                  )}
                  {error.digest && (
                    <p className="mt-2 text-xs">
                      <strong>Error ID:</strong> {error.digest}
                    </p>
                  )}
                </details>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={reset} className="w-full sm:w-auto">
                <RefreshCcwIcon className="w-4 h-4 mr-2" />
                Try again
              </Button>
              <Link href="/">
                <Button variant="outline" className="w-full sm:w-auto">
                  <HomeIcon className="w-4 h-4 mr-2" />
                  Go home
                </Button>
              </Link>
            </div>

            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground">
                If this problem persists, please{' '}
                <Link href="/contact" className="text-primary hover:underline">
                  contact our support team
                </Link>
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
