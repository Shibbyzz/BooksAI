'use client'

import { ThemeProvider } from 'next-themes'
import { IntlProvider } from './IntlProvider'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <IntlProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </IntlProvider>
  )
}
