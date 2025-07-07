'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import Button from '@/components/ui/Button'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { useTranslations } from '@/providers/IntlProvider'

interface Chapter {
  chapterNumber: number
  title: string
  content: string  // This field now comes from combined sections
  wordCount: number
  status?: string
  sections?: Section[]  // Optional for debugging
}

interface Section {
  id: string
  sectionNumber: number
  title?: string
  content: string
  wordCount: number
}

interface BookData {
  id: string
  title: string
  author?: string
  genre?: string
  chapters: Chapter[]
  totalWordCount?: number
  status?: string
  createdAt?: string
  updatedAt?: string
}

export default function BookReaderPage() {
  const [book, setBook] = useState<BookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentChapter, setCurrentChapter] = useState(0)
  const router = useRouter()
  const params = useParams()
  const bookId = params.id as string
  const t = useTranslations('bookReader')
  const tCommon = useTranslations('common')

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
          toast.error(t('noContent'))
        }
      } else if (response.status === 404) {
        toast.error(t('notFound'))
        router.push('/dashboard')
      } else {
        toast.error(t('loadError'))
      }
    } catch (error) {
      console.error('Error fetching book content:', error)
      toast.error(t('loadError'))
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
          <h2 className="text-xl font-semibold">{t('notFound')}</h2>
          <Button className="mt-4" onClick={() => router.push('/dashboard')}>
            {t('backToDashboard')}
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
                {t('backToBook')}
              </Button>
              <div>
                <h1 className="text-xl font-bold">{book.title}</h1>
                <p className="text-sm text-muted-foreground">
                  {currentChapterData ? `${currentChapterData.title}` : t('chapterNotFound')}
                </p>
              </div>
            </div>
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
          </div>
        </div>
      </div>

      {/* Reading Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentChapterData ? (
          <div className="prose prose-lg max-w-none">
            <h1 className="text-3xl font-bold mb-8">
              {currentChapterData.title}
            </h1>
            
            <div 
              className="text-lg leading-relaxed"
              style={{ lineHeight: '1.8' }}
              dangerouslySetInnerHTML={{ 
                __html: currentChapterData.content?.replace(/\n/g, '<br><br>') || '' 
              }}
            />

            {/* Chapter Navigation */}
            <div className="flex justify-between items-center pt-8 border-t">
              <Button
                variant="outline"
                onClick={goToPreviousChapter}
                disabled={currentChapter === 0}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                {t('previousChapter')}
              </Button>
              
              <span className="text-sm text-muted-foreground">
                {t('chapterProgress')} {currentChapter + 1} / {book.chapters.length}
              </span>
              
              <Button
                variant="outline"
                onClick={goToNextChapter}
                disabled={currentChapter === book.chapters.length - 1}
              >
                {t('nextChapter')}
                <ArrowRightIcon className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('chapterNotFound')}</p>
          </div>
        )}
      </div>
    </div>
  )
} 