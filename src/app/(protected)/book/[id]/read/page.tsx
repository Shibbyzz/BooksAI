'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { 
  ArrowLeftIcon, 
  ArrowRightIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import Button from '@/components/ui/Button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface BookChapter {
  id: string
  chapterNumber: number
  title: string
  summary: string
  sections: {
    id: string
    sectionNumber: number
    title?: string
    content: string
    wordCount: number
  }[]
}

interface BookData {
  id: string
  title: string
  backCover?: string
  chapters: BookChapter[]
}

export default function BookReaderPage() {
  const [book, setBook] = useState<BookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentChapter, setCurrentChapter] = useState(0)
  const router = useRouter()
  const params = useParams()
  const bookId = params.id as string

  useEffect(() => {
    if (bookId) {
      fetchBookContent()
    }
  }, [bookId])

  const fetchBookContent = async () => {
    try {
      const response = await fetch(`/api/books/${bookId}/content`)
      if (response.ok) {
        const bookData = await response.json()
        setBook(bookData)
        
        if (bookData.chapters.length === 0) {
          toast.error('This book has no readable content yet.')
        }
      } else if (response.status === 404) {
        toast.error('Book not found')
        router.push('/dashboard')
      } else {
        toast.error('Failed to load book content')
      }
    } catch (error) {
      console.error('Error fetching book content:', error)
      toast.error('Failed to load book content')
    } finally {
      setLoading(false)
    }
  }

  const goToNextChapter = () => {
    if (book && currentChapter < book.chapters.length - 1) {
      setCurrentChapter(prev => prev + 1)
    }
  }

  const goToPreviousChapter = () => {
    if (currentChapter > 0) {
      setCurrentChapter(prev => prev - 1)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!book) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Book not found</h2>
          <Button className="mt-4" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const currentChapterData = book.chapters[currentChapter]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/book/${bookId}`)}
                className="mr-4"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Book
              </Button>
              <div>
                <h1 className="text-xl font-bold">{book.title}</h1>
                {currentChapterData && (
                  <p className="text-sm text-muted-foreground">
                    Chapter {currentChapterData.chapterNumber}: {currentChapterData.title}
                  </p>
                )}
              </div>
            </div>
            
            {/* Chapter Navigation */}
            {book.chapters.length > 1 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousChapter}
                  disabled={currentChapter === 0}
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  {currentChapter + 1} / {book.chapters.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextChapter}
                  disabled={currentChapter === book.chapters.length - 1}
                >
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {book.chapters.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpenIcon className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No content available</h3>
              <p className="text-muted-foreground mb-4">
                This book doesn't have any readable content yet. The generation might still be in progress.
              </p>
              <Button onClick={() => router.push(`/book/${bookId}`)}>
                Back to Book Details
              </Button>
            </CardContent>
          </Card>
        ) : currentChapterData ? (
          <div className="space-y-8">
            {/* Chapter Header */}
            <div className="text-center border-b pb-6">
              <h2 className="text-3xl font-bold mb-2">
                Chapter {currentChapterData.chapterNumber}
              </h2>
              <h3 className="text-xl text-muted-foreground">
                {currentChapterData.title}
              </h3>
            </div>

            {/* Chapter Content */}
            <div className="space-y-6">
              {currentChapterData.sections.map((section) => (
                <div key={section.id} className="prose max-w-none">
                  {section.title && section.title !== `Section ${section.sectionNumber}` && (
                    <h4 className="text-lg font-semibold mb-4">{section.title}</h4>
                  )}
                  <div className="text-base leading-relaxed whitespace-pre-wrap">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Chapter Navigation */}
            <div className="flex justify-between items-center pt-8 border-t">
              <Button
                variant="outline"
                onClick={goToPreviousChapter}
                disabled={currentChapter === 0}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Previous Chapter
              </Button>
              
              <span className="text-sm text-muted-foreground">
                Chapter {currentChapter + 1} of {book.chapters.length}
              </span>
              
              <Button
                variant="outline"
                onClick={goToNextChapter}
                disabled={currentChapter === book.chapters.length - 1}
              >
                Next Chapter
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Chapter not found</p>
          </div>
        )}
      </div>
    </div>
  )
} 