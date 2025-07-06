import { Inter } from 'next/font/google'
import { Providers } from '@/providers/Providers'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: {
    default: 'BooksAI - Transform Your Ideas Into Complete Books with AI',
    template: '%s | BooksAI'
  },
  description: 'Revolutionary AI-powered book creation platform with multiple intelligent agents. Write complete books about yourself, your dreams, or any topic. One prompt, one full book. Try our freemium book generator today!',
  keywords: [
    'AI book generator',
    'AI book writing',
    'automatic book creation',
    'AI author',
    'book writing software',
    'AI storytelling',
    'personal book creation',
    'AI writing assistant',
    'book generator AI',
    'write a book about yourself',
    'AI book maker',
    'intelligent book creation',
    'multi-agent AI writing',
    'AI book publishing',
    'automated book writing'
  ],
  authors: [{ name: 'BooksAI Team' }],
  creator: 'BooksAI',
  publisher: 'BooksAI',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://booksai.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en',
      'sv-SE': '/sv',
    },
  },
  openGraph: {
    title: 'BooksAI - Transform Your Ideas Into Complete Books with AI',
    description: 'Revolutionary AI-powered book creation platform with multiple intelligent agents. Write complete books about yourself, your dreams, or any topic. One prompt, one full book.',
    url: 'https://booksai.com',
    siteName: 'BooksAI',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'BooksAI - AI-Powered Book Creation Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BooksAI - Transform Your Ideas Into Complete Books with AI',
    description: 'Revolutionary AI-powered book creation platform. Write complete books about yourself, your dreams, or any topic. One prompt, one full book.',
    images: ['/og-image.jpg'],
    creator: '@BooksAI',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
  category: 'AI Tools',
  classification: 'AI-Powered Book Creation Platform',
  referrer: 'origin-when-cross-origin',
  other: {
    'application-name': 'BooksAI',
    'apple-mobile-web-app-title': 'BooksAI',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'mobile-web-app-capable': 'yes',
    'msapplication-TileColor': '#000000',
    'msapplication-config': '/browserconfig.xml',
    'theme-color': '#000000',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'BooksAI',
              description: 'Revolutionary AI-powered book creation platform with multiple intelligent agents. Write complete books about yourself, your dreams, or any topic.',
              url: 'https://booksai.com',
              applicationCategory: 'ProductivityApplication',
              operatingSystem: 'Web',
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                description: 'Free tier available with premium options'
              },
              creator: {
                '@type': 'Organization',
                name: 'BooksAI',
                url: 'https://booksai.com'
              },
              featureList: [
                'AI-powered book generation',
                'Multiple intelligent agents',
                'One prompt to complete book',
                'Personal storytelling',
                'Multiple export formats',
                'Community sharing',
                'Book reviews and ratings'
              ],
              screenshot: 'https://booksai.com/screenshot.jpg',
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.9',
                reviewCount: '1250',
                bestRating: '5',
                worstRating: '1'
              }
            })
          }}
        />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
