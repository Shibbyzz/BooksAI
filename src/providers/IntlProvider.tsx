'use client'

import { createContext, useContext, useState, useEffect } from 'react'

// Import messages
import enMessages from '@/messages/en.json'
import svMessages from '@/messages/sv.json'

const messages = {
  en: enMessages,
  sv: svMessages,
}

type Locale = 'en' | 'sv'

interface IntlContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  messages: typeof enMessages
  t: (key: string) => string
}

const IntlContext = createContext<IntlContextType | undefined>(undefined)

// Helper function to get nested value from object using dot notation
function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) || path
}

export function IntlProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en')

  // Detect browser language on mount
  useEffect(() => {
    const detectLocale = () => {
      // Check localStorage first
      const stored = localStorage.getItem('locale') as Locale
      if (stored && (stored === 'en' || stored === 'sv')) {
        return stored
      }

      // Check browser language
      const browserLang = navigator.language.toLowerCase()
      if (browserLang.startsWith('sv')) {
        return 'sv'
      }
      
      return 'en'
    }

    setLocale(detectLocale())
  }, [])

  // Save locale to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('locale', locale)
  }, [locale])

  const currentMessages = messages[locale]

  const t = (key: string): string => {
    return getNestedValue(currentMessages, key)
  }

  return (
    <IntlContext.Provider
      value={{
        locale,
        setLocale,
        messages: currentMessages,
        t,
      }}
    >
      {children}
    </IntlContext.Provider>
  )
}

export function useIntl() {
  const context = useContext(IntlContext)
  if (context === undefined) {
    throw new Error('useIntl must be used within an IntlProvider')
  }
  return context
}

// Custom hook that mimics next-intl's useTranslations
export function useTranslations(namespace?: string) {
  const { t } = useIntl()
  
  return (key: string): string => {
    const fullKey = namespace ? `${namespace}.${key}` : key
    return t(fullKey)
  }
} 