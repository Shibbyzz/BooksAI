'use client'

import { useState } from 'react'
import { GlobeAltIcon } from '@heroicons/react/24/outline'
import Button from '@/components/ui/Button'
import { useIntl } from '@/providers/IntlProvider'
import { useTranslations } from '@/providers/IntlProvider'

export default function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false)
  const { locale, setLocale } = useIntl()
  const t = useTranslations('common')

  const languages = [
    { code: 'en' as const, name: 'English' },
    { code: 'sv' as const, name: 'Svenska' }
  ]

  const handleLanguageChange = (newLocale: 'en' | 'sv') => {
    setLocale(newLocale)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
      >
        <GlobeAltIcon className="h-4 w-4" />
        <span className="hidden sm:inline">
          {languages.find(lang => lang.code === locale)?.name || t('language')}
        </span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card border rounded-md shadow-lg z-50">
          <div className="py-1">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`block w-full text-left px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground ${
                  locale === language.code ? 'bg-accent text-accent-foreground' : ''
                }`}
              >
                {language.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
} 