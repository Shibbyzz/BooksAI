'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PlusIcon, BookOpenIcon, ClockIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '@/hooks/useAuth'
import { Book } from '@prisma/client'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useTranslations } from '@/providers/IntlProvider'

interface BookWithStatus extends Book {
  statusDisplay: string
  statusColor: string
}

export default function DashboardPage() {
  const { prismaUser, loading: authLoading, isAuthenticated } = useAuth()
  const [books, setBooks] = useState<BookWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')

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
        return t('status.planning')
      case 'GENERATING':
        return t('status.generating')
      case 'COMPLETE':
        return t('status.complete')
      case 'DRAFT':
        return t('status.draft')
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

  // Get book spine color based on status
  const getBookSpineColor = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return 'from-yellow-400 to-yellow-600'
      case 'GENERATING':
        return 'from-blue-400 to-blue-600'
      case 'COMPLETE':
        return 'from-green-400 to-green-600'
      case 'DRAFT':
        return 'from-gray-400 to-gray-600'
      default:
        return 'from-indigo-400 to-indigo-600'
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
    <div className="py-8">
      {/* Header */}
      <div className="bg-card border-b mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold">📚 {t('title')}</h1>
              <p className="text-muted-foreground mt-1">
                {t('welcome')}, {prismaUser?.name || prismaUser?.email || 'User'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                {prismaUser?.subscriptionTier || 'Free'} {t('plan')}
              </span>
              <Link href="/book/create">
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  {t('newBook')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {books.length === 0 ? (
          // Empty State
          <div className="text-center py-12">
            <BookOpenIcon className="mx-auto h-24 w-24 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">{t('empty.title')}</h3>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">
              {t('empty.description')}
            </p>
            <div className="mt-6">
              <Link href="/book/create">
                <Button size="lg">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  {t('empty.createFirst')}
                </Button>
              </Link>
            </div>
          </div>
        ) :
          // Books Grid
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">{t('yourBooks')} ({books.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {books.map((book) => {
                const StatusIcon = getStatusIcon(book.status)
                const spineColor = getBookSpineColor(book.status)
                
                return (
                  <Link key={book.id} href={`/book/${book.id}`}>
                    <div className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:-translate-y-2">
                      {/* Book Container */}
                      <div className="relative perspective-1000">
                        {/* Book */}
                        <div className="relative h-80 w-full transform-style-preserve-3d transition-transform duration-300 group-hover:rotateY-12">
                          {/* Book Spine (Left Side) */}
                          <div className={`absolute left-0 top-0 h-full w-4 bg-gradient-to-b ${spineColor} transform -skew-y-2 shadow-lg`}>
                            <div className="absolute top-4 left-1 right-1 h-1 bg-white/20 rounded"></div>
                            <div className="absolute bottom-4 left-1 right-1 h-1 bg-white/20 rounded"></div>
                          </div>
                          
                          {/* Book Cover */}
                          <div className="absolute left-2 top-0 h-full w-full bg-white border border-gray-200 rounded-r-lg shadow-xl overflow-hidden">
                            {/* Book Cover Content */}
                            <div className="h-full flex flex-col p-4 bg-gradient-to-br from-white via-gray-50 to-gray-100">
                              {/* Title Section */}
                              <div className="flex-1 flex flex-col justify-center text-center border-b-2 border-gray-200 pb-4 mb-4">
                                <h3 className="text-lg font-bold text-gray-800 line-clamp-3 leading-tight">
                                  {book.title}
                                </h3>
                                <div className="mt-2 text-xs text-gray-500 font-medium">
                                  {t('aiGenerated')}
                                </div>
                              </div>
                              
                              {/* Description */}
                              <div className="flex-1 mb-4">
                                <p className="text-xs text-gray-600 line-clamp-4 leading-relaxed">
                                  {book.prompt}
                                </p>
                              </div>
                              
                              {/* Status and Date */}
                              <div className="mt-auto">
                                <div className="flex items-center justify-between text-xs">
                                  <div className={`flex items-center space-x-1 ${book.statusColor}`}>
                                    <StatusIcon className="h-3 w-3" />
                                    <span className="font-medium">
                                      {book.statusDisplay}
                                    </span>
                                  </div>
                                  <span className="text-gray-400">
                                    {new Date(book.updatedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        }
      </div>
      
      {/* Custom Styles */}
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        
        .rotateY-12:hover {
          transform: rotateY(12deg);
        }
        
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        
        .line-clamp-4 {
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  )
} 