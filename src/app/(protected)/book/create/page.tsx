'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon } from '@heroicons/react/24/outline'
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

interface BookCreationForm {
  // Step 1: Basic Info
  title: string
  prompt: string
  
  // Step 2: Settings
  genre: string
  targetAudience: string
  tone: string
  wordCount: number
  endingType: string
  language: string
  structure: string
  characterNames: string[]
  inspirationBooks: string[]
  
  // Step 3: Generated Content
  backCover?: string
}

interface WizardStep {
  id: number
  title: string
  description: string
}

const WIZARD_STEPS: WizardStep[] = [
  { id: 1, title: 'Book Concept', description: 'Title and story idea' },
  { id: 2, title: 'Book Settings', description: 'Genre, tone, and preferences' },
  { id: 3, title: 'Back Cover', description: 'AI-generated book description' },
  { id: 4, title: 'Final Review', description: 'Approve and start writing' }
]

const GENRE_OPTIONS = [
  'Fantasy', 'Science Fiction', 'Romance', 'Mystery', 'Thriller', 
  'Historical Fiction', 'Contemporary Fiction', 'Young Adult', 
  'Horror', 'Adventure', 'Drama', 'Comedy', 'Literary Fiction'
]

const AUDIENCE_OPTIONS = [
  'Children (Ages 5-12)', 'Young Adult (Ages 13-17)', 'New Adult (Ages 18-25)', 
  'Adult (Ages 25+)', 'All Ages'
]

const TONE_OPTIONS = [
  'Light-hearted & Fun', 'Dark & Serious', 'Epic & Grand', 'Romantic & Emotional',
  'Mysterious & Suspenseful', 'Humorous & Witty', 'Dramatic & Intense', 
  'Inspiring & Uplifting', 'Gritty & Realistic'
]

const ENDING_OPTIONS = [
  'Happy Ending', 'Bittersweet', 'Tragic', 'Open/Ambiguous', 
  'Twist Ending', 'Cliffhanger', 'Satisfying Resolution'
]

export default function CreateBookPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<BookCreationForm>({
    title: '',
    prompt: '',
    genre: '',
    targetAudience: '',
    tone: '',
    wordCount: 50000,
    endingType: '',
    language: 'en',
    structure: 'three-act',
    characterNames: [''],
    inspirationBooks: [''],
    backCover: undefined
  })
  const [bookId, setBookId] = useState<string | null>(null)
  const [refinementPrompt, setRefinementPrompt] = useState('')
  const router = useRouter()

  const handleInputChange = (field: keyof BookCreationForm, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const addCharacterName = () => {
    setForm(prev => ({ ...prev, characterNames: [...prev.characterNames, ''] }))
  }

  const updateCharacterName = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      characterNames: prev.characterNames.map((name, i) => i === index ? value : name)
    }))
  }

  const removeCharacterName = (index: number) => {
    setForm(prev => ({
      ...prev,
      characterNames: prev.characterNames.filter((_, i) => i !== index)
    }))
  }

  const addInspirationBook = () => {
    setForm(prev => ({ ...prev, inspirationBooks: [...prev.inspirationBooks, ''] }))
  }

  const updateInspirationBook = (index: number, value: string) => {
    setForm(prev => ({
      ...prev,
      inspirationBooks: prev.inspirationBooks.map((book, i) => i === index ? value : book)
    }))
  }

  const removeInspirationBook = (index: number) => {
    setForm(prev => ({
      ...prev,
      inspirationBooks: prev.inspirationBooks.filter((_, i) => i !== index)
    }))
  }

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return form.title.trim() && form.prompt.trim()
      case 2:
        return form.genre && form.targetAudience && form.tone && form.endingType
      case 3:
        return form.backCover
      default:
        return true
    }
  }

  const handleNext = async () => {
    if (!validateStep(currentStep)) {
      toast.error('Please fill in all required fields')
      return
    }

    if (currentStep === 1) {
      // Create book after step 1
      await createBook()
    } else if (currentStep === 2) {
      // Add settings and generate back cover after step 2
      await addSettingsAndGenerateBackCover()
    }

    setCurrentStep(prev => prev + 1)
  }

  const handleBack = () => {
    setCurrentStep(prev => prev - 1)
  }

  const createBook = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          prompt: form.prompt
        })
      })

      if (response.ok) {
        const book = await response.json()
        setBookId(book.id)
      } else {
        throw new Error('Failed to create book')
      }
    } catch (error) {
      toast.error('Failed to create book')
    } finally {
      setLoading(false)
    }
  }

  const addSettingsAndGenerateBackCover = async () => {
    if (!bookId) return

    try {
      setLoading(true)
      
      // Add settings
      const settingsResponse = await fetch(`/api/books/${bookId}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: form.genre,
          targetAudience: form.targetAudience,
          tone: form.tone,
          wordCount: form.wordCount,
          endingType: form.endingType,
          language: form.language,
          structure: form.structure,
          characterNames: form.characterNames.filter(name => name.trim()),
          inspirationBooks: form.inspirationBooks.filter(book => book.trim())
        })
      })

      if (!settingsResponse.ok) {
        throw new Error('Failed to save settings')
      }

      // Generate back cover
      const backCoverResponse = await fetch('/api/ai/generate-backcover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          userPrompt: form.prompt,
          settings: {
            genre: form.genre,
            targetAudience: form.targetAudience,
            tone: form.tone,
            wordCount: form.wordCount,
            endingType: form.endingType,
            language: form.language,
            structure: form.structure,
            characterNames: form.characterNames.filter(name => name.trim()),
            inspirationBooks: form.inspirationBooks.filter(book => book.trim())
          }
        })
      })

      if (backCoverResponse.ok) {
        const data = await backCoverResponse.json()
        setForm(prev => ({ ...prev, backCover: data.data.backCover }))
      } else {
        throw new Error('Failed to generate back cover')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const refineBackCover = async () => {
    if (!bookId || !refinementPrompt.trim()) {
      toast.error('Please enter refinement instructions')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/ai/generate-backcover', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          refinementRequest: refinementPrompt
        })
      })

      if (response.ok) {
        const data = await response.json()
        setForm(prev => ({ ...prev, backCover: data.data.backCover }))
        setRefinementPrompt('')
        toast.success('Back cover refined!')
      } else {
        throw new Error('Failed to refine back cover')
      }
    } catch (error) {
      toast.error('Failed to refine back cover')
    } finally {
      setLoading(false)
    }
  }

  const startBookGeneration = async () => {
    if (!bookId) return

    try {
      setLoading(true)
      
      // Start actual book generation
      const response = await fetch(`/api/ai/generate-book/${bookId}`, { 
        method: 'POST' 
      })
      
      if (response.ok) {
        toast.success('Book generation started! Redirecting to progress page...')
        router.push(`/book/${bookId}`)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to start book generation')
      }
    } catch (error) {
      toast.error('Failed to start book generation')
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <Input
              label="Book Title"
              value={form.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter a compelling title for your book"
              required
            />

            <div>
              <label className="block text-sm font-medium mb-2">
                Book Concept & Story Idea
              </label>
              <textarea
                value={form.prompt}
                onChange={(e) => handleInputChange('prompt', e.target.value)}
                placeholder="Describe your book idea in detail. Include genre, main characters, plot points, setting, and any specific requirements. The more specific you are, the better your book will be!"
                className="w-full min-h-[200px] px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-vertical"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Be as detailed as possible - this will guide the AI in creating your book
              </p>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Genre *</label>
                <select
                  value={form.genre}
                  onChange={(e) => handleInputChange('genre', e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Select a genre</option>
                  {GENRE_OPTIONS.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Audience *</label>
                <select
                  value={form.targetAudience}
                  onChange={(e) => handleInputChange('targetAudience', e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Select target audience</option>
                  {AUDIENCE_OPTIONS.map(audience => (
                    <option key={audience} value={audience}>{audience}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tone & Style *</label>
                <select
                  value={form.tone}
                  onChange={(e) => handleInputChange('tone', e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Select tone</option>
                  {TONE_OPTIONS.map(tone => (
                    <option key={tone} value={tone}>{tone}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ending Type *</label>
                <select
                  value={form.endingType}
                  onChange={(e) => handleInputChange('endingType', e.target.value)}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Select ending type</option>
                  {ENDING_OPTIONS.map(ending => (
                    <option key={ending} value={ending}>{ending}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Target Word Count: {form.wordCount.toLocaleString()} words
              </label>
              <input
                type="range"
                min="10000"
                max="200000"
                step="5000"
                value={form.wordCount}
                onChange={(e) => handleInputChange('wordCount', parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Short (10K)</span>
                <span>Novella (50K)</span>
                <span>Novel (100K)</span>
                <span>Epic (200K)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Character Names (Optional)
              </label>
              {form.characterNames.map((name, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={name}
                    onChange={(e) => updateCharacterName(index, e.target.value)}
                    placeholder="Character name"
                    className="flex-1"
                  />
                  {form.characterNames.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeCharacterName(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCharacterName}
              >
                Add Character
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Inspiration Books (Optional)
              </label>
              {form.inspirationBooks.map((book, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={book}
                    onChange={(e) => updateInspirationBook(index, e.target.value)}
                    placeholder="Book title or author"
                    className="flex-1"
                  />
                  {form.inspirationBooks.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeInspirationBook(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addInspirationBook}
              >
                Add Book
              </Button>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">📖 Generated Back Cover</h3>
              {form.backCover ? (
                <div className="bg-muted p-4 rounded-md mb-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{form.backCover}</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Generating back cover...</p>
                </div>
              )}
            </div>

            {form.backCover && (
              <div>
                <h4 className="text-md font-medium mb-2">✏️ Refine the Storyline (Optional)</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Not happy with the back cover? Describe what you'd like to change:
                </p>
                <textarea
                  value={refinementPrompt}
                  onChange={(e) => setRefinementPrompt(e.target.value)}
                  placeholder="e.g., 'Make it more mysterious', 'Add more action', 'Focus on the romance subplot', etc."
                  className="w-full min-h-[100px] px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring resize-vertical"
                />
                <Button
                  className="mt-2"
                  onClick={refineBackCover}
                  loading={loading}
                  disabled={!refinementPrompt.trim()}
                >
                  Refine Back Cover
                </Button>
              </div>
            )}
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CheckIcon className="mx-auto h-16 w-16 text-green-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Ready to Write Your Book!</h3>
              <p className="text-muted-foreground mb-6">
                Your book concept and settings are complete. Click below to start the AI generation process.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">📋 Book Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="font-medium">Title:</span> {form.title}
                </div>
                <div>
                  <span className="font-medium">Genre:</span> {form.genre}
                </div>
                <div>
                  <span className="font-medium">Audience:</span> {form.targetAudience}
                </div>
                <div>
                  <span className="font-medium">Length:</span> {form.wordCount.toLocaleString()} words
                </div>
                <div>
                  <span className="font-medium">Tone:</span> {form.tone}
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button
                size="lg"
                onClick={startBookGeneration}
                loading={loading}
                className="px-8"
              >
                🚀 Write My Book
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                This will start the AI generation process. You can monitor progress on the next page.
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Progress */}
      <div className="bg-card border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mr-4"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Create New Book</h1>
              <p className="text-muted-foreground mt-1">
                Step {currentStep} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep - 1]?.description}
              </p>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center space-x-4 pb-6">
            {WIZARD_STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`
                  flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  ${currentStep > step.id 
                    ? 'bg-green-100 text-green-600' 
                    : currentStep === step.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {currentStep > step.id ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <span className={`ml-2 text-sm ${
                  currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                }`}>
                  {step.title}
                </span>
                {index < WIZARD_STEPS.length - 1 && (
                  <div className={`w-12 h-px mx-4 ${
                    currentStep > step.id ? 'bg-green-200' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>{WIZARD_STEPS[currentStep - 1]?.title}</CardTitle>
            <CardDescription>
              {WIZARD_STEPS[currentStep - 1]?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderStepContent()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < WIZARD_STEPS.length ? (
            <Button
              onClick={handleNext}
              loading={loading}
              disabled={!validateStep(currentStep)}
            >
              Next
              <ArrowRightIcon className="h-4 w-4 ml-2" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
} 