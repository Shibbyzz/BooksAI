'use client'

import { useState } from 'react'
import { useTheme } from 'next-themes'
import { toast } from 'react-hot-toast'
import { useUser } from '@/hooks/useUser'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'
import { 
  BookOpenIcon, 
  GlobeAltIcon, 
  ChartBarIcon,
  CloudArrowDownIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon
} from '@heroicons/react/24/outline'
import { useTranslations } from '@/providers/IntlProvider'

// Translation-aware options
const useGenreOptions = () => {
  const t = useTranslations('genres')
  return [
    { value: 'fantasy', label: t('fantasy') },
    { value: 'scienceFiction', label: t('scienceFiction') },
    { value: 'romance', label: t('romance') },
    { value: 'mystery', label: t('mystery') },
    { value: 'thriller', label: t('thriller') },
    { value: 'historicalFiction', label: t('historicalFiction') },
    { value: 'contemporaryFiction', label: t('contemporaryFiction') },
    { value: 'youngAdult', label: t('youngAdult') },
    { value: 'horror', label: t('horror') },
    { value: 'adventure', label: t('adventure') },
    { value: 'drama', label: t('drama') },
    { value: 'comedy', label: t('comedy') },
    { value: 'literaryFiction', label: t('literaryFiction') }
  ]
}

const useAudienceOptions = () => {
  const t = useTranslations('audiences')
  return [
    { value: 'children', label: t('children') },
    { value: 'youngAdult', label: t('youngAdult') },
    { value: 'newAdult', label: t('newAdult') },
    { value: 'adult', label: t('adult') },
    { value: 'allAges', label: t('allAges') }
  ]
}

const useToneOptions = () => {
  const t = useTranslations('tones')
  return [
    { value: 'lightHearted', label: t('lightHearted') },
    { value: 'darkSerious', label: t('darkSerious') },
    { value: 'epicGrand', label: t('epicGrand') },
    { value: 'romantic', label: t('romantic') },
    { value: 'mysterious', label: t('mysterious') },
    { value: 'humorous', label: t('humorous') },
    { value: 'dramatic', label: t('dramatic') },
    { value: 'inspiring', label: t('inspiring') },
    { value: 'gritty', label: t('gritty') }
  ]
}

const useEndingOptions = () => {
  const t = useTranslations('endings')
  return [
    { value: 'happy', label: t('happy') },
    { value: 'bittersweet', label: t('bittersweet') },
    { value: 'tragic', label: t('tragic') },
    { value: 'ambiguous', label: t('ambiguous') },
    { value: 'twist', label: t('twist') },
    { value: 'cliffhanger', label: t('cliffhanger') },
    { value: 'satisfying', label: t('satisfying') }
  ]
}

interface CustomDropdownProps {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  placeholder: string
  required?: boolean
}

function CustomDropdown({ label, value, options, onChange, placeholder, required = false }: CustomDropdownProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        required={required}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useUser()
  const { prismaUser } = useAuth()
  const { theme, setTheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const t = useTranslations('settings')
  const tCommon = useTranslations('common')
  const tFormats = useTranslations('settings')
  const tPlaceholders = useTranslations('placeholders')
  const genreOptions = useGenreOptions()
  const audienceOptions = useAudienceOptions()
  const toneOptions = useToneOptions()
  const endingOptions = useEndingOptions()
  
  const [profile, setProfile] = useState({
    name: user?.user_metadata?.name || prismaUser?.name || '',
    email: user?.email || '',
  })

  // Book Creation Defaults
  const [bookDefaults, setBookDefaults] = useState({
    favoriteGenre: '',
    defaultAudience: '',
    defaultTone: '',
    defaultEndingType: 'happy',
  })

  // Export Settings
  const [exportSettings, setExportSettings] = useState({
    preferredFormat: 'pdf',
    includeMetadata: true,
    autoBackup: true,
  })

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: profile.name }),
      })

      if (response.ok) {
        toast.success(t('profile.saveSuccess'))
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || t('profile.saveError'))
      }
    } catch (error) {
      toast.error(t('profile.saveError'))
    } finally {
      setLoading(false)
    }
  }

  const handleBookDefaultsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Here you would update book defaults via API
      toast.success(t('bookDefaults.saveSuccess'))
    } catch (error) {
      toast.error(t('bookDefaults.saveError'))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setProfile(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenIcon className="h-5 w-5" />
                {t('profile.title')}
              </CardTitle>
              <CardDescription>
                {t('profile.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={t('profile.name')}
                    name="name"
                    value={profile.name}
                    onChange={handleInputChange}
                    placeholder={tPlaceholders('enterName')}
                  />
                  <Input
                    label={t('profile.email')}
                    name="email"
                    type="email"
                    value={profile.email}
                    onChange={handleInputChange}
                    placeholder={tPlaceholders('enterEmail')}
                  />
                </div>
                <Button type="submit" loading={loading}>
                  {t('profile.save')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Book Creation Defaults */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GlobeAltIcon className="h-5 w-5" />
                {t('bookDefaults.title')}
              </CardTitle>
              <CardDescription>
                {t('bookDefaults.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBookDefaultsSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CustomDropdown
                    label={t('bookDefaults.favoriteGenre')}
                    value={bookDefaults.favoriteGenre}
                    options={genreOptions}
                    onChange={(value) => setBookDefaults(prev => ({ ...prev, favoriteGenre: value }))}
                    placeholder={t('bookDefaults.selectGenre')}
                  />
                  <CustomDropdown
                    label={t('bookDefaults.defaultAudience')}
                    value={bookDefaults.defaultAudience}
                    options={audienceOptions}
                    onChange={(value) => setBookDefaults(prev => ({ ...prev, defaultAudience: value }))}
                    placeholder={t('bookDefaults.selectAudience')}
                  />
                  <CustomDropdown
                    label={t('bookDefaults.defaultTone')}
                    value={bookDefaults.defaultTone}
                    options={toneOptions}
                    onChange={(value) => setBookDefaults(prev => ({ ...prev, defaultTone: value }))}
                    placeholder={t('bookDefaults.selectTone')}
                  />
                  <CustomDropdown
                    label={t('bookDefaults.defaultEndingType')}
                    value={bookDefaults.defaultEndingType}
                    options={endingOptions}
                    onChange={(value) => setBookDefaults(prev => ({ ...prev, defaultEndingType: value }))}
                    placeholder={t('bookDefaults.selectEndingType')}
                  />
                </div>
                <Button type="submit" loading={loading}>
                  {t('profile.save')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5" />
                {t('usage.title')}
              </CardTitle>
              <CardDescription>
                {t('usage.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {prismaUser?.subscriptionTier || 'Free'}
                    </div>
                    <div className="text-sm text-muted-foreground">{t('usage.currentPlan')}</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {prismaUser?.booksGenerated || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">{t('usage.booksCreated')}</div>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {prismaUser?.wordsGenerated ? `${Math.round(prismaUser.wordsGenerated / 1000)}k` : '0'}
                    </div>
                    <div className="text-sm text-muted-foreground">{t('usage.wordsGenerated')}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">{t('usage.viewHistory')}</Button>
                  <Button variant="outline">{t('usage.upgradePlan')}</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export & Storage Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CloudArrowDownIcon className="h-5 w-5" />
                {t('export.title')}
              </CardTitle>
              <CardDescription>
                {t('export.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('export.format')}</label>
                    <select
                      value={exportSettings.preferredFormat}
                      onChange={(e) => setExportSettings(prev => ({ ...prev, preferredFormat: e.target.value }))}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="pdf">{t('formats.pdf')}</option>
                      <option value="docx">{t('formats.docx')}</option>
                      <option value="epub">{t('formats.epub')}</option>
                      <option value="txt">{t('formats.txt')}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('export.exportOptions')}</label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={exportSettings.includeMetadata}
                          onChange={(e) => setExportSettings(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{t('export.includeMetadata')}</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={exportSettings.autoBackup}
                          onChange={(e) => setExportSettings(prev => ({ ...prev, autoBackup: e.target.checked }))}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{t('export.autoBackup')}</span>
                      </label>
                    </div>
                  </div>
                </div>
                <Button variant="outline">
                  {t('export.save')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('appearance.title')}</CardTitle>
              <CardDescription>
                {t('appearance.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">{t('appearance.theme')}</label>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('light')}
                      className="flex items-center gap-2"
                    >
                      <SunIcon className="h-4 w-4" />
                      {t('appearance.light')}
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('dark')}
                      className="flex items-center gap-2"
                    >
                      <MoonIcon className="h-4 w-4" />
                      {t('appearance.dark')}
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTheme('system')}
                      className="flex items-center gap-2"
                    >
                      <ComputerDesktopIcon className="h-4 w-4" />
                      {t('appearance.system')}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Manage your password and security preferences.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button variant="outline">Change password</Button>
                <div className="text-sm text-muted-foreground">
                  <p>Two-factor authentication: Not enabled</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Enable 2FA
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                These actions are irreversible. Please be careful.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border border-destructive/20 rounded-lg p-4">
                  <h4 className="font-medium text-destructive">
                    Delete Account
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently delete your account and all associated data, including all your books.
                  </p>
                  <Button variant="destructive" size="sm" className="mt-3">
                    Delete account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
