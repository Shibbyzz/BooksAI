'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
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

const LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'fi', name: 'Finnish' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'he', name: 'Hebrew' }
]

// Custom Dropdown Component
interface CustomDropdownProps {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({ 
  label, 
  value, 
  options, 
  onChange, 
  placeholder, 
  required = false 
}) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <label className="block text-sm font-medium mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3 py-2 text-left border rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors ${
            value ? 'bg-background border-input' : 'bg-muted border-muted text-muted-foreground'
          }`}
        >
          <span className="block truncate">
            {value || placeholder}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDownIcon className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </span>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            <div className="py-1">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors ${
                    value === option ? 'bg-primary text-primary-foreground' : 'text-gray-900'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Word count helper functions
const getWordCountCategory = (wordCount: number): string => {
  if (wordCount < 12500) return 'Short Story'
  if (wordCount < 40000) return 'Novella'
  if (wordCount < 80000) return 'Novel'
  return 'Epic Novel'
}

const getWordCountExamples = (wordCount: number): string => {
  if (wordCount < 12500) return 'Examples: "The Gift of the Magi", "The Lottery"'
  if (wordCount < 40000) return 'Examples: "Of Mice and Men", "The Great Gatsby"'
  if (wordCount < 80000) return 'Examples: "The Catcher in the Rye", "To Kill a Mockingbird"'
  return 'Examples: "Dune", "The Lord of the Rings", "The Stand"'
}



export default function CreateBookPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<BookCreationForm>({
    title: '',
    prompt: '',
    genre: '',
    targetAudience: '',
    tone: '',
    wordCount: 60000, // Default to middle of novel range
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
        return form.genre && form.targetAudience && form.tone && form.endingType && form.language
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

  const generateTemplate = () => {
    const template = `**🎯 BASIC STORY CONCEPT**
Main Theme: [What is your book really about? Love, redemption, survival, etc.]
Story Hook: [What makes this story unique and compelling?]
Core Conflict: [What is the main problem or challenge driving your story?]

**👥 MAIN CHARACTERS**
Protagonist: 
- Name: [Character name]
- Role: [Hero, antihero, etc.]
- Background: [Profession, age, key traits]
- Motivation: [What drives them?]
- Character Arc: [How do they change?]

Antagonist:
- Name: [Character name]
- Role: [Villain, opposing force, etc.]
- Background: [Their history and motivations]
- Conflict: [Why do they oppose the protagonist?]

Supporting Characters:
- [Name and brief role of 2-3 key supporting characters]

**🌍 SETTING & WORLD-BUILDING**
Time Period: [Modern day, historical, futuristic, etc.]
Location: [Where does the story take place?]
World Rules: [Are there magic systems, technology, social rules we need to know?]
Atmosphere: [Dark and gritty, light and hopeful, mysterious, etc.]

**📖 PLOT STRUCTURE**
Opening: [How does the story begin? What's the inciting incident?]
Rising Action: [What obstacles and challenges does the protagonist face?]
Climax: [What's the major confrontation or turning point?]
Resolution: [How does the story end? What's resolved?]

**🎭 EMOTIONAL BEATS & THEMES**
Key Themes: [What deeper messages or questions does your story explore?]
Emotional Journey: [What emotional arc do you want readers to experience?]

**🔬 RESEARCH & TECHNICAL ELEMENTS**
Specialized Knowledge: [Any professions, sciences, historical periods, or technical subjects?]
Cultural Context: [Any specific cultures, time periods, or social settings?]
Technical Aspects: [Technology, magic systems, specialized skills, etc.]

**✨ STYLE & PREFERENCES**
Writing Style: [First person, third person, multiple POVs, etc.]
Pacing: [Fast-paced thriller, slow-burn character study, etc.]
Inspiration: [Any books, movies, or stories that inspire your vision?]
Special Requests: [Anything else specific you want included?]

**💡 ADDITIONAL NOTES**
[Any other details, preferences, or specific scenes you want included]

---
*Fill in as much detail as possible - the more specific you are, the better your AI-generated book will be!*`
    
    setForm(prev => ({ ...prev, prompt: template }))
    toast.success('Template generated! Fill in the sections with your story details.')
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
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">
                  Book Concept & Story Idea
                </label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generateTemplate}
                  className="text-xs"
                >
                  ✨ Generate Template
                </Button>
              </div>
              <textarea
                value={form.prompt}
                onChange={(e) => handleInputChange('prompt', e.target.value)}
                placeholder="Describe your book idea in detail. Include genre, main characters, plot points, setting, and any specific requirements. The more specific you are, the better your book will be!"
                className="w-full min-h-[200px] px-3 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent resize-vertical"
                required
              />
              
              {/* Settings Info Box */}
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs font-bold">ℹ</span>
                    </div>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-900">Settings Configuration</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Focus on your story concept here. You'll configure <strong>genre, target audience, tone, language, and other settings</strong> in the next step.
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground mt-1">
                Be as detailed as possible - this will guide the AI in creating your book. 
                <button 
                  type="button"
                  onClick={generateTemplate}
                  className="text-primary hover:underline ml-1"
                >
                  Use our template for best results.
                </button>
              </p>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CustomDropdown
                label="Genre"
                value={form.genre}
                options={GENRE_OPTIONS}
                onChange={(value) => handleInputChange('genre', value)}
                placeholder="Select a genre"
                required
              />

              <CustomDropdown
                label="Target Audience"
                value={form.targetAudience}
                options={AUDIENCE_OPTIONS}
                onChange={(value) => handleInputChange('targetAudience', value)}
                placeholder="Select target audience"
                required
              />

              <CustomDropdown
                label="Tone & Style"
                value={form.tone}
                options={TONE_OPTIONS}
                onChange={(value) => handleInputChange('tone', value)}
                placeholder="Select tone"
                required
              />

              <CustomDropdown
                label="Ending Type"
                value={form.endingType}
                options={ENDING_OPTIONS}
                onChange={(value) => handleInputChange('endingType', value)}
                placeholder="Select ending type"
                required
              />

              <CustomDropdown
                label="Language"
                value={LANGUAGE_OPTIONS.find(lang => lang.code === form.language)?.name || 'English'}
                options={LANGUAGE_OPTIONS.map(lang => lang.name)}
                onChange={(value) => handleInputChange('language', LANGUAGE_OPTIONS.find(lang => lang.name === value)?.code || 'en')}
                placeholder="Select language"
                required
              />
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Target Word Count: {form.wordCount.toLocaleString()} words
                </label>
                <div className="text-lg font-semibold text-blue-700 mb-1">
                  {getWordCountCategory(form.wordCount)}
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  {getWordCountExamples(form.wordCount)}
                </div>
              </div>
              
              <div className="relative">
                <input
                  type="range"
                  min="1000"
                  max="120000"
                  step="1000"
                  value={form.wordCount}
                  onChange={(e) => handleInputChange('wordCount', parseInt(e.target.value))}
                  className="w-full h-2 bg-gradient-to-r from-green-200 via-blue-200 to-purple-200 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, 
                      #10B981 0%, 
                      #10B981 ${((12500 - 1000) / (120000 - 1000)) * 100}%, 
                      #3B82F6 ${((12500 - 1000) / (120000 - 1000)) * 100}%, 
                      #3B82F6 ${((40000 - 1000) / (120000 - 1000)) * 100}%, 
                      #F59E0B ${((40000 - 1000) / (120000 - 1000)) * 100}%, 
                      #F59E0B ${((80000 - 1000) / (120000 - 1000)) * 100}%, 
                      #EF4444 ${((80000 - 1000) / (120000 - 1000)) * 100}%, 
                      #EF4444 100%)`
                  }}
                />
                <div className="relative mt-2 text-xs text-gray-500">
                  {/* Position labels to align with color sections */}
                  <div className="absolute" style={{ left: `${((6750 - 1000) / (120000 - 1000)) * 100}%`, transform: 'translateX(-50%)' }}>
                    <span>Short Story<br/>(1K-12.5K)</span>
                  </div>
                  <div className="absolute" style={{ left: `${((26250 - 1000) / (120000 - 1000)) * 100}%`, transform: 'translateX(-50%)' }}>
                    <span>Novella<br/>(12.5K-40K)</span>
                  </div>
                  <div className="absolute" style={{ left: `${((60000 - 1000) / (120000 - 1000)) * 100}%`, transform: 'translateX(-50%)' }}>
                    <span>Novel<br/>(40K-80K)</span>
                  </div>
                  <div className="absolute" style={{ left: `${((100000 - 1000) / (120000 - 1000)) * 100}%`, transform: 'translateX(-50%)' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>Epic Novel<br/>(80K-120K)</span>
                  </div>
                  {/* Add height to container */}
                  <div style={{ height: '32px' }}></div>
                </div>

              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Character Names (Optional)
              </label>
              <div className="space-y-2">
                {form.characterNames.map((name, index) => (
                  <div key={index} className="flex gap-2">
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
                        className="px-3"
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
                  className="mt-2"
                >
                  + Add Character
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Inspiration Books (Optional)
              </label>
              <div className="space-y-2">
                {form.inspirationBooks.map((book, index) => (
                  <div key={index} className="flex gap-2">
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
                        className="px-3"
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
                  className="mt-2"
                >
                  + Add Book
                </Button>
              </div>
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
                  <span className="font-medium">Language:</span> {LANGUAGE_OPTIONS.find(lang => lang.code === form.language)?.name || 'English'}
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

// Add CSS for the custom slider
const styles = `
.slider::-webkit-slider-thumb {
  appearance: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #3B82F6;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.slider::-moz-range-thumb {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #3B82F6;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
`

// Inject styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style')
  styleElement.textContent = styles
  document.head.appendChild(styleElement)
} 