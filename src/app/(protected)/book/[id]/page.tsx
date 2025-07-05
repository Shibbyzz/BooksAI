'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'
import { 
  ArrowLeftIcon, 
  PencilIcon, 
  TrashIcon, 
  BookOpenIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

interface BookDetail {
  id: string
  title: string
  prompt: string
  status: string
  generationStep: string
  createdAt: string
  updatedAt: string
  backCover?: string
  chapters?: any[]
  settings?: any
}

interface GenerationProgress {
  status: string
  generationStep: string
  progress: number
  totalChapters: number
  completedChapters: number
  statusMessage?: string
  chapters: {
    id: string
    chapterNumber: number
    title: string
    status: string
    sectionsComplete: number
    sectionsTotal: number
  }[]
}

export default function BookDetailPage() {
  const [book, setBook] = useState<BookDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ title: '', prompt: '' })
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [generationLoading, setGenerationLoading] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null)
  const [lastKnownProgress, setLastKnownProgress] = useState<GenerationProgress | null>(null) // Track best known progress
  const [usingFallback, setUsingFallback] = useState(false) // Track if using fallback data
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null) // Track when progress was last updated
  const [isPolling, setIsPolling] = useState(false)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  const router = useRouter()
  const params = useParams()
  const bookId = params.id as string

  useEffect(() => {
    if (bookId) {
      fetchBook()
    }
  }, [bookId])

  useEffect(() => {
    // Start polling if book is generating
    if (book?.status === 'GENERATING' && !isPolling && !pollIntervalRef.current) {
      startProgressPolling()
    } else if (book?.status !== 'GENERATING' && isPolling) {
      stopProgressPolling()
    }
  }, [book?.status]) // Remove isPolling from dependencies to prevent infinite loop

  // Cleanup effect
  useEffect(() => {
    return () => {
      stopProgressPolling()
    }
  }, [])

  const fetchBook = async () => {
    try {
      const response = await fetch(`/api/books/${bookId}`)
      if (response.ok) {
        const bookData = await response.json()
        setBook(bookData)
        setEditForm({ title: bookData.title, prompt: bookData.prompt })
      } else if (response.status === 404) {
        toast.error('Book not found')
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error fetching book:', error)
      toast.error('Failed to load book')
    } finally {
      setLoading(false)
    }
  }

  const fetchGenerationProgress = async () => {
    try {
      // Use new Redis-based progress endpoint (much faster, no database overload)
      const response = await fetch(`/api/ai/progress/${bookId}`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const progressData = result.data
          
          console.log('✅ Redis progress data received:', progressData) // Debug log
          
          // Transform Redis data to match existing UI expectations
          const transformedProgress: GenerationProgress = {
            status: progressData.status,
            generationStep: progressData.generationStep,
            progress: progressData.overallProgress, // Fix: use overallProgress from Redis
            totalChapters: progressData.totalChapters,
            completedChapters: progressData.currentChapter,
            statusMessage: progressData.message, // Fix: use message from Redis
            chapters: [] // TODO: Add chapter details from Redis if needed
          }
          
          setGenerationProgress(transformedProgress)
          setLastKnownProgress(transformedProgress) // Update last known good progress
          setUsingFallback(false) // We're using live Redis data
          setLastUpdateTime(Date.now()) // Track when we got fresh data
          
          // Only update book status if it significantly changed (and avoid micro-updates that cause loops)
          if (book && (
            progressData.status !== book.status || 
            (progressData.generationStep !== book.generationStep && progressData.status === 'COMPLETE')
          )) {
            setBook(prev => prev ? { 
              ...prev, 
              status: progressData.status, 
              generationStep: progressData.generationStep 
            } : null)
          }
          
          return // Exit early if Redis data was successfully processed
        } else {
          console.warn('⚠️ Redis API returned success but no data:', result)
        }
      } else {
        console.warn('⚠️ Redis API returned non-200 status:', response.status)
      }
    } catch (error) {
      console.error('❌ Redis progress fetch failed:', error)
    }
    
    // Fallback to database-based endpoint if Redis fails
    console.log('🔄 Falling back to database-based progress...')
    try {
      const fallbackResponse = await fetch(`/api/ai/generate-book/${bookId}`)
      if (fallbackResponse.ok) {
        const progressData = await fallbackResponse.json()
        console.log('✅ Database fallback progress data received:', progressData) // Debug log
        
        // Only use fallback data if we don't have better Redis data, or if fallback shows higher progress
        if (!lastKnownProgress || progressData.progress >= (lastKnownProgress.progress || 0)) {
          setGenerationProgress(progressData)
          setUsingFallback(true) // We're using fallback data
          setLastUpdateTime(Date.now()) // Track when we got fallback data
          console.log('📊 Using fallback data (no better Redis data available)')
        } else {
          // Keep the last known good Redis data instead of downgrading
          setGenerationProgress(lastKnownProgress)
          setUsingFallback(true) // We're using cached data because Redis failed
          // Don't update lastUpdateTime - keep it from the last good Redis data
          console.log('📊 Keeping last known Redis data (fallback would downgrade progress)')
        }
      } else {
        console.error('❌ Database fallback also failed:', fallbackResponse.status)
        // If both fail, keep last known progress
        if (lastKnownProgress) {
          setGenerationProgress(lastKnownProgress)
          setUsingFallback(true)
        }
      }
    } catch (fallbackError) {
      console.error('❌ Database fallback error:', fallbackError)
      // If both fail, keep last known progress
      if (lastKnownProgress) {
        setGenerationProgress(lastKnownProgress)
        setUsingFallback(true)
      }
    }
  }

  const startProgressPolling = () => {
    if (pollIntervalRef.current || isPolling) return // Double check to prevent duplicates
    
    console.log('Starting progress polling...')
    setIsPolling(true)
    fetchGenerationProgress() // Initial fetch
    
    pollIntervalRef.current = setInterval(() => {
      fetchGenerationProgress()
    }, 3000) // Poll every 3 seconds
  }

  const stopProgressPolling = () => {
    if (pollIntervalRef.current) {
      console.log('Stopping progress polling...')
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    setIsPolling(false)
  }

  const handleSaveEdit = async () => {
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        const updatedBook = await response.json()
        setBook(updatedBook)
        setEditing(false)
        toast.success('Book updated successfully!')
      } else {
        toast.error('Failed to update book')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Book deleted successfully!')
        router.push('/dashboard')
      } else {
        toast.error('Failed to delete book')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    }
  }

  const startGeneration = async () => {
    if (!book?.settings || !book?.backCover) {
      toast.error('Book needs settings and back cover before generation can start')
      return
    }

    try {
      setGenerationLoading(true)
      
      const response = await fetch(`/api/ai/generate-book/${bookId}`, { 
        method: 'POST' 
      })

      if (response.ok) {
        const result = await response.json()
        toast.success('Book generation started! 🚀')
        
        // Update book status immediately
        setBook(prev => prev ? { 
          ...prev, 
          status: 'GENERATING', 
          generationStep: 'OUTLINE' 
        } : null)
        
        // Start polling for progress
        startProgressPolling()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to start book generation')
      }
    } catch (error) {
      toast.error('Failed to start book generation')
    } finally {
      setGenerationLoading(false)
    }
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'PLANNING':
        return { 
          text: 'Planning', 
          color: 'text-yellow-600 bg-yellow-50', 
          icon: ClockIcon,
          description: 'Setting up your book concept and structure'
        }
      case 'GENERATING':
        return { 
          text: 'Writing', 
          color: 'text-blue-600 bg-blue-50', 
          icon: PencilIcon,
          description: 'AI is actively writing your book chapters'
        }
      case 'COMPLETE':
        return { 
          text: 'Complete', 
          color: 'text-green-600 bg-green-50', 
          icon: CheckCircleIcon,
          description: 'Your book is finished and ready to read'
        }
      default:
        return { 
          text: status, 
          color: 'text-gray-600 bg-gray-50', 
          icon: BookOpenIcon,
          description: 'Processing...'
        }
    }
  }

  const getProgressPercentage = () => {
    if (generationProgress) {
      return generationProgress.progress || 0 // Fix: use progress field (now correctly mapped)
    }
    
    // Fallback to step-based progress
    switch (book?.generationStep) {
      case 'PROMPT': return 10
      case 'BACK_COVER': return 25
      case 'OUTLINE': return 40
      case 'CHAPTERS': return 70
      case 'COMPLETE': return 100
      default: return 0
    }
  }

  const getGenerationStepDescription = () => {
    // Fix: Prioritize Redis statusMessage over fallback logic
    if (generationProgress?.statusMessage) {
      console.log('📝 Displaying Redis status message:', generationProgress.statusMessage) // Debug log
      return generationProgress.statusMessage
    }
    
    console.log('⚠️ No Redis status message, using fallback. GenerationProgress:', generationProgress) // Debug log
    
    if (!generationProgress) {
      console.log('❌ No generationProgress data available') // Debug log
      return ''
    }
    
    // Fallback descriptions based on generation step
    switch (generationProgress.generationStep) {
      case 'PLANNING':
        return 'Planning your book structure and outline...'
      case 'RESEARCH':
        return 'Conducting research and gathering information...'
      case 'OUTLINE':
        return 'Creating detailed book outline...'
      case 'STRUCTURE':
        return 'Organizing chapters and structure...'
      case 'CHAPTERS':
        return `Writing chapters (${generationProgress.completedChapters}/${generationProgress.totalChapters} complete)...`
      case 'PROOFREADING':
        return 'Applying final proofreading and polish...'
      case 'COMPLETE':
        return 'Book generation complete!'
      default:
        return 'Processing...'
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

  const statusInfo = getStatusDisplay(book.status)
  const progress = getProgressPercentage()
  const isGenerating = book.status === 'GENERATING'
  const canStartGeneration = book.status === 'PLANNING' && book.settings && book.backCover && book.generationStep === 'BACK_COVER'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="mr-4"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back to Library
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{book.title}</h1>
                <div className="flex items-center mt-1">
                  <statusInfo.icon className={`h-4 w-4 mr-2 ${statusInfo.color.split(' ')[0]}`} />
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                    {statusInfo.text}
                  </span>
                  <span className="text-sm text-muted-foreground ml-3">
                    {statusInfo.description}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
                disabled={book.status === 'GENERATING'}
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {editing ? (
          <Card>
            <CardHeader>
              <CardTitle>Edit Book</CardTitle>
              <CardDescription>Update your book details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Title"
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
              <div>
                <label className="block text-sm font-medium mb-2">Prompt</label>
                <textarea
                  value={editForm.prompt}
                  onChange={(e) => setEditForm({ ...editForm, prompt: e.target.value })}
                  className="w-full min-h-[200px] px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-vertical"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Progress Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    📈 Generation Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      {isGenerating && (
                        <div className="mt-3">
                          <div className="flex items-center justify-center mb-2">
                            <LoadingSpinner size="sm" className="mr-2" />
                            <span className="text-sm font-medium text-foreground">
                              {getGenerationStepDescription() || 'Processing...'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground text-center">
                            Updates every few seconds • This process may take 10-30 minutes
                            {usingFallback && (
                              <span className="block mt-1 text-yellow-600">
                                ⚠️ Using cached progress (Redis temporarily unavailable)
                              </span>
                            )}
                            {lastUpdateTime && (
                              <span className="block mt-1 text-xs text-gray-500">
                                Last updated: {new Date(lastUpdateTime).toLocaleTimeString()}
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {canStartGeneration && (
                      <div className="text-center">
                        <Button
                          size="lg"
                          onClick={startGeneration}
                          loading={generationLoading}
                          disabled={generationLoading}
                          className="px-8"
                        >
                          <PlayIcon className="h-5 w-5 mr-2" />
                          Start Writing Book
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          This will begin the AI generation process
                        </p>
                      </div>
                    )}

                    {book.status === 'COMPLETE' && (
                      <div className="text-center">
                        <CheckCircleIcon className="mx-auto h-12 w-12 text-green-600 mb-2" />
                        <h3 className="text-lg font-semibold mb-2">Book Complete!</h3>
                        <div className="space-x-2">
                          <Button 
                            size="lg"
                            onClick={() => router.push(`/book/${bookId}/read`)}
                          >
                            📖 Read Book
                          </Button>
                          <Button variant="outline">
                            📤 Export
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Back Cover */}
              {book.backCover && (
                <Card>
                  <CardHeader>
                    <CardTitle>📖 Back Cover</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-4 rounded-md">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {book.backCover}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Chapters (if any) */}
              {generationProgress && generationProgress.chapters.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>📚 Chapters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {generationProgress.chapters.map((chapter) => (
                        <div
                          key={chapter.id}
                          className="flex items-center justify-between p-3 border rounded-md"
                        >
                          <div>
                            <h4 className="font-medium">
                              Chapter {chapter.chapterNumber}: {chapter.title}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {chapter.sectionsTotal > 0 
                                ? `${chapter.sectionsComplete}/${chapter.sectionsTotal} sections complete`
                                : 'Planning...'
                              }
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            chapter.status === 'COMPLETE' 
                              ? 'bg-green-100 text-green-700'
                              : chapter.status === 'GENERATING'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {chapter.status === 'COMPLETE' ? 'Done' : 
                             chapter.status === 'GENERATING' ? 'Writing...' : 'Planned'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Book Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {book.settings && (
                    <>
                      <div>
                        <span className="text-sm text-muted-foreground">Genre</span>
                        <p className="text-sm font-medium">{book.settings.genre}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Target Length</span>
                        <p className="text-sm font-medium">{book.settings.wordCount?.toLocaleString()} words</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Tone</span>
                        <p className="text-sm font-medium">{book.settings.tone}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Audience</span>
                        <p className="text-sm font-medium">{book.settings.targetAudience}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <span className="text-sm text-muted-foreground">Created</span>
                    <p className="text-sm">{new Date(book.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Last Updated</span>
                    <p className="text-sm">{new Date(book.updatedAt).toLocaleDateString()}</p>
                  </div>
                </CardContent>
              </Card>

              {!book.settings && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-yellow-600">⚠️ Setup Required</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      This book needs to complete the setup process before generation can begin.
                    </p>
                    <Button 
                      className="w-full" 
                      onClick={() => router.push('/book/create')}
                    >
                      Complete Setup
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Delete Book</CardTitle>
              <CardDescription>
                Are you sure you want to delete "{book.title}"? This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                >
                  Delete Book
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 