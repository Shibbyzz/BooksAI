import React from 'react'

// Database types (will be replaced with Prisma types after generation)
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  role: Role
  createdAt: Date
  updatedAt: Date
  settings?: UserSettings
  user_metadata?: {
    role?: string
    name?: string
    [key: string]: any
  }
}

export interface UserSettings {
  id: string
  userId: string
  theme: Theme
  language: string
  emailNotifications: boolean
  pushNotifications: boolean
  marketingEmails: boolean
  profileVisibility: Visibility
  createdAt: Date
  updatedAt: Date
}

// Enums
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum Theme {
  LIGHT = 'LIGHT',
  DARK = 'DARK',
  SYSTEM = 'SYSTEM',
}

export enum Visibility {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
  FRIENDS = 'FRIENDS',
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  name?: string
  avatar?: string
  role: Role
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Navigation types
export interface NavItem {
  name: string
  href: string
  icon?: React.ComponentType<any>
  current?: boolean
  disabled?: boolean
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system'

// OpenAI types
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface OpenAIStreamResponse {
  choices: Array<{
    delta: {
      content?: string
    }
    finish_reason?: string
  }>
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface SignupForm {
  email: string
  password: string
  confirmPassword: string
  name: string
}

export interface SettingsForm {
  name: string
  email: string
  theme: Theme
  language: string
  emailNotifications: boolean
  pushNotifications: boolean
  marketingEmails: boolean
  profileVisibility: Visibility
}

// Component prop types
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helper?: string
}

// BooksAI specific types
export interface BookSettings {
  id: string
  bookId: string
  language: string
  wordCount: number
  genre: string
  targetAudience: string
  tone: string
  endingType: string
  structure: string
  characterNames: string[]
  inspirationBooks: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Book {
  id: string
  userId: string
  title: string
  prompt: string
  backCover?: string
  storylineSummary?: string
  settings?: BookSettings
  status: BookStatus
  generationStep: GenerationStep
  lastExportedAt?: Date
  exportFormats: string[]
  createdAt: Date
  updatedAt: Date
}

export interface BookOutline {
  id: string
  bookId: string
  summary: string
  themes: string[]
  plotPoints: any // JSON type
  createdAt: Date
  updatedAt: Date
}

export interface Chapter {
  id: string
  bookId: string
  chapterNumber: number
  title: string
  summary: string
  status: ChapterStatus
  createdAt: Date
  updatedAt: Date
}

export interface Section {
  id: string
  chapterId: string
  sectionNumber: number
  title?: string
  content: string
  wordCount: number
  prompt: string
  aiModel: string
  tokensUsed: number
  status: SectionStatus
  createdAt: Date
  updatedAt: Date
}

// BooksAI Enums
export enum BookStatus {
  PLANNING = 'PLANNING',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  ARCHIVED = 'ARCHIVED'
}

export enum GenerationStep {
  PROMPT = 'PROMPT',
  BACK_COVER = 'BACK_COVER',
  RESEARCH = 'RESEARCH',
  OUTLINE = 'OUTLINE',
  STRATEGIC_PLANNING = 'STRATEGIC_PLANNING',
  CONTINUITY_INIT = 'CONTINUITY_INIT',
  CHAPTERS = 'CHAPTERS',
  SECTIONS = 'SECTIONS',
  SUPERVISION = 'SUPERVISION',
  COMPLETE = 'COMPLETE'
}

export enum ChapterStatus {
  PLANNED = 'PLANNED',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  NEEDS_REVISION = 'NEEDS_REVISION'
}

export enum SectionStatus {
  PLANNED = 'PLANNED',
  GENERATING = 'GENERATING',
  COMPLETE = 'COMPLETE',
  NEEDS_REVISION = 'NEEDS_REVISION'
}

// AI Generation types
export interface GenerationProgress {
  bookId: string
  step: GenerationStep
  currentChapter?: number
  totalChapters: number
  currentSection?: number
  totalSections?: number
  progress: number // 0-100
  estimatedCompletion?: Date
  status: 'queued' | 'processing' | 'paused' | 'completed' | 'error'
  error?: string
}
