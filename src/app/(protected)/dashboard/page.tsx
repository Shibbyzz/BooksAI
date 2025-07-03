'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PlusIcon, BookOpenIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
import { Book } from '@prisma/client'
import Button from '@/components/ui/Button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface BookWithStatus extends Book {
  statusDisplay: string
  statusColor: string
}

export default function DashboardPage() {
  const { prismaUser, loading: authLoading, isAuthenticated } = useAuth()
  const [books, setBooks] = useState<BookWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    if (prismaUser) {
      fetchBooks()
    }
  }, [prismaUser, authLoading, isAuthenticated])

  const fetchBooks = async () => {
    try {
      const response = await fetch('/api/books')
      if (response.ok) {
        const booksData = await response.json()
        const booksWithStatus = booksData.map((book: Book) => ({
          ...book,
          statusDisplay: getStatusDisplay(book.status),
          statusColor: getStatusColor(book.status),
        }))
        setBooks(booksWithStatus)
      }
    } catch (error) {
      console.error('Error fetching books:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return 'Planning'
      case 'GENERATING':
        return 'Generating'
      case 'COMPLETE':
        return 'Complete'
      case 'DRAFT':
        return 'Draft'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return 'text-yellow-600'
      case 'GENERATING':
        return 'text-blue-600'
      case 'COMPLETE':
        return 'text-green-600'
      case 'DRAFT':
        return 'text-gray-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return ClockIcon
      case 'GENERATING':
        return ClockIcon
      case 'COMPLETE':
        return CheckCircleIcon
      default:
        return BookOpenIcon
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold">📚 BooksAI</h1>
              <p className="text-muted-foreground mt-1">
                Welcome back, {prismaUser?.name || prismaUser?.email}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {prismaUser?.subscriptionTier} Plan
              </span>
              <Link href="/book/create">
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  New Book
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {books.length === 0 ? (
          // Empty State
          <div className="text-center py-12">
            <BookOpenIcon className="mx-auto h-24 w-24 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No books yet</h3>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">
              Get started by creating your first AI-generated book. Just provide a prompt and watch the magic happen!
            </p>
            <div className="mt-6">
              <Link href="/book/create">
                <Button size="lg">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Your First Book
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          // Books Grid
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Your Books ({books.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {books.map((book) => {
                const StatusIcon = getStatusIcon(book.status)
                return (
                  <Link key={book.id} href={`/book/${book.id}`}>
                    <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg line-clamp-2">
                              {book.title}
                            </CardTitle>
                            <CardDescription className="mt-2 line-clamp-3">
                              {book.prompt}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className={`flex items-center space-x-2 ${book.statusColor}`}>
                            <StatusIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">
                              {book.statusDisplay}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(book.updatedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 