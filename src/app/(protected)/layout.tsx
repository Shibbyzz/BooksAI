'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import {
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline'
import { useUser } from '@/hooks/useUser'
import { signOut } from '@/lib/supabase'
import Button from '@/components/ui/Button'
import { NavItem } from '@/types'
import { useTranslations } from '@/providers/IntlProvider'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user } = useUser()
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('navigation')

  const navigation: NavItem[] = [
    { name: t('myBooks'), href: '/dashboard', icon: BookOpenIcon },
    { name: t('settings'), href: '/settings', icon: Cog6ToothIcon },
  ]

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}
      >
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75"
          onClick={() => setSidebarOpen(false)}
        />
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-card">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <span className="text-xl font-bold">📚 BooksAI</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map(item => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/')
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {Icon && <Icon className="mr-3 h-5 w-5" />}
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t p-4">
            <div className="flex items-center w-full">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {user?.user_metadata?.name || user?.email}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <LanguageSwitcher />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="ml-2"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Static sidebar for desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r bg-card">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <span className="text-xl font-bold">📚 BooksAI</span>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigation.map(item => {
                const Icon = item.icon
                const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/')
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {Icon && <Icon className="mr-3 h-5 w-5" />}
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t p-4">
            <div className="flex items-center w-full">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {user?.user_metadata?.name || user?.email}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="ml-2"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-background">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
} 