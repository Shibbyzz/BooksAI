'use client'

import Link from 'next/link'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'

export function Hero() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="font-bold text-xl">
            <Link href="/">ModernScaffold</Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              href="/login" 
              className="inline-flex items-center justify-center font-medium rounded-md focus-ring transition-colors duration-200 hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Sign in
            </Link>
            <Link 
              href="/signup" 
              className="inline-flex items-center justify-center font-medium rounded-md focus-ring transition-colors duration-200 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="container mx-auto px-4 py-24">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Modern Full-Stack{' '}
              <span className="text-primary">Web Application</span> Scaffold
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto">
              A production-ready scaffold built with Next.js, React, TypeScript,
              Tailwind CSS, Supabase, and OpenAI integration. Perfect for rapid
              development of modern web applications.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link 
                href="/signup"
                className="inline-flex items-center justify-center font-medium rounded-md focus-ring transition-colors duration-200 bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 text-lg gap-2"
              >
                Get started
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link 
                href="#features"
                className="inline-flex items-center justify-center font-medium rounded-md focus-ring transition-colors duration-200 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-11 px-8 text-lg"
              >
                Learn more
              </Link>
            </div>
          </div>

          {/* Features */}
          <div id="features" className="mt-32">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Everything you need to build modern web apps
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Pre-configured with the best tools and practices
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>🚀 Modern Stack</CardTitle>
                  <CardDescription>
                    Built with Next.js 14, React 18, TypeScript, and Tailwind
                    CSS
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>🔐 Authentication</CardTitle>
                  <CardDescription>
                    Complete auth system with Supabase including email/password
                    and OAuth
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>🧠 AI Ready</CardTitle>
                  <CardDescription>
                    OpenAI integration with streaming responses for intelligent
                    features
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>💾 Database</CardTitle>
                  <CardDescription>
                    PostgreSQL with Prisma ORM for type-safe database operations
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>🎨 Beautiful UI</CardTitle>
                  <CardDescription>
                    Modern design system with dark mode and responsive
                    components
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>⚡ Developer Experience</CardTitle>
                  <CardDescription>
                    ESLint, Prettier, TypeScript, and hot reloading for
                    productive development
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>
            &copy; 2024 Modern Full-Stack Scaffold. Built with ❤️ for
            developers.
          </p>
        </div>
      </footer>
    </div>
  )
}
