'use client'

import Link from 'next/link'
import { useTranslations, useIntl } from '@/providers/IntlProvider'
import { ArrowRightIcon, BookOpenIcon, SparklesIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { 
  RocketLaunchIcon, 
  HeartIcon, 
  CloudArrowUpIcon,
  DocumentTextIcon,
  StarIcon,
  CheckCircleIcon,
  LightBulbIcon,
  CpuChipIcon,
  ShareIcon,
  PencilSquareIcon,
  ChartBarIcon,
  BoltIcon
} from '@heroicons/react/24/solid'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card'

export function Hero() {
  const t = useTranslations('hero')
  const { messages } = useIntl()

  const freeFeatures = Array.isArray(messages.hero?.pricing?.freeFeatures) ? messages.hero.pricing.freeFeatures : ['1 book generation', 'Up to 3,000 words per book', 'Basic AI agents', 'Read in-app only']
  const starterFeatures = Array.isArray(messages.hero?.pricing?.starterFeatures) ? messages.hero.pricing.starterFeatures : ['5 books per month', 'Up to 15,000 words per book', 'Advanced AI agents', 'PDF & EPUB export', 'Share 1 book publicly']
  const proFeatures = Array.isArray(messages.hero?.pricing?.proFeatures) ? messages.hero.pricing.proFeatures : ['15 books per month', 'Up to 100,000 words per book', 'All AI agents', 'All export formats', 'Priority generation', 'Unlimited sharing', 'Chapter editing']

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-gradient-to-r from-green-400 to-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      {/* Header */}
      <header className="relative z-50 border-b border-white/20 bg-white/80 backdrop-blur-xl sticky top-0 shadow-lg">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <div className="font-bold text-2xl">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative">
                <BookOpenIcon className="h-8 w-8 text-primary transition-transform group-hover:scale-110" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-orange-400 to-red-400 rounded-full animate-pulse"></div>
              </div>
              <span className="bg-gradient-to-r from-primary via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                BooksAI
              </span>
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link 
              href="/login" 
              className="inline-flex items-center justify-center font-semibold rounded-xl focus-ring transition-all duration-300 hover:bg-white/80 hover:shadow-lg hover:scale-105 h-12 px-6 py-3 text-slate-700"
            >
              Sign in
            </Link>
            <Link 
              href="/signup" 
              className="inline-flex items-center justify-center font-semibold rounded-xl focus-ring transition-all duration-300 bg-gradient-to-r from-primary to-purple-600 text-white hover:from-primary/90 hover:to-purple-600/90 hover:shadow-xl hover:scale-105 h-12 px-6 py-3"
            >
              {t('ctaPrimary')}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 relative z-10">
        <section className="container mx-auto px-6 py-20 lg:py-32">
          <div className="text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/10 to-purple-600/10 border border-primary/20 px-6 py-3 text-sm font-semibold text-primary mb-8 shadow-lg backdrop-blur-sm">
              <SparklesIcon className="h-5 w-5 animate-pulse" />
              {t('tagline')}
              <BoltIcon className="h-4 w-4 text-yellow-500" />
            </div>
            
            <h1 className="text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl mb-8">
              <span className="block text-slate-900 mb-2">
                {t('title')}
              </span>
              <span className="block bg-gradient-to-r from-primary via-purple-600 to-indigo-600 bg-clip-text text-transparent animate-pulse">
                {t('titleHighlight')}
              </span>
            </h1>
            
            <p className="text-xl leading-relaxed text-slate-600 max-w-4xl mx-auto lg:text-2xl mb-12 font-medium">
              {t('subtitle')}
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16">
              <Link 
                href="/signup"
                className="group relative inline-flex items-center justify-center font-bold rounded-2xl focus-ring transition-all duration-300 bg-gradient-to-r from-primary to-purple-600 text-white hover:from-primary/90 hover:to-purple-600/90 hover:shadow-2xl hover:scale-105 h-16 px-10 text-xl gap-3 shadow-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <RocketLaunchIcon className="h-6 w-6 group-hover:animate-bounce" />
                {t('ctaPrimary')}
                <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="#features"
                className="inline-flex items-center justify-center font-semibold rounded-2xl focus-ring transition-all duration-300 border-2 border-slate-200 bg-white/80 hover:bg-white hover:shadow-xl hover:scale-105 h-16 px-10 text-xl text-slate-700 backdrop-blur-sm"
              >
                {t('ctaSecondary')}
              </Link>
            </div>

            {/* Stats/Social Proof */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900 mb-2">10K+</div>
                <div className="text-sm text-slate-600 font-medium">{t('stats.booksCreated')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900 mb-2">50M+</div>
                <div className="text-sm text-slate-600 font-medium">{t('stats.wordsGenerated')}</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-slate-900 mb-2">4.9★</div>
                <div className="text-sm text-slate-600 font-medium">{t('stats.userRating')}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="relative py-20 lg:py-32">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-blue-50"></div>
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-4xl font-black tracking-tight lg:text-5xl mb-6 text-slate-900">
                {t('features.title')}
              </h2>
              <p className="text-xl text-slate-600 max-w-3xl mx-auto font-medium">
                {t('features.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: CpuChipIcon,
                  title: t('features.aiAgents.title'),
                  description: t('features.aiAgents.description'),
                  color: 'from-blue-500 to-purple-600'
                },
                {
                  icon: BoltIcon,
                  title: t('features.onePrompt.title'),
                  description: t('features.onePrompt.description'),
                  color: 'from-yellow-500 to-orange-600'
                },
                {
                  icon: PencilSquareIcon,
                  title: t('features.personal.title'),
                  description: t('features.personal.description'),
                  color: 'from-green-500 to-teal-600'
                },
                {
                  icon: ShareIcon,
                  title: t('features.community.title'),
                  description: t('features.community.description'),
                  color: 'from-pink-500 to-red-600'
                },
                {
                  icon: StarIcon,
                  title: t('features.quality.title'),
                  description: t('features.quality.description'),
                  color: 'from-indigo-500 to-purple-600'
                },
                {
                  icon: DocumentTextIcon,
                  title: t('features.export.title'),
                  description: t('features.export.description'),
                  color: 'from-emerald-500 to-cyan-600'
                }
              ].map((feature, index) => (
                <Card key={index} className="group relative border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 bg-white/80 backdrop-blur-sm overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <CardHeader className="text-center p-8 relative z-10">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.color} text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl font-bold mb-4 text-slate-900">{feature.title}</CardTitle>
                    <CardDescription className="text-lg text-slate-600 leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-20 lg:py-32 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 25% 25%, white 2px, transparent 2px)`,
              backgroundSize: '50px 50px'
            }}></div>
          </div>
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-20">
                             <h2 className="text-4xl font-black tracking-tight lg:text-5xl mb-6">
                {t('useCases.title')}
              </h2>
              <p className="text-xl text-slate-300 max-w-3xl mx-auto">
                {t('useCasesSubtitle')}
              </p>
            </div>

                         <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {[
                { key: 'personal', color: 'from-blue-500 to-purple-600' },
                { key: 'dreams', color: 'from-purple-500 to-pink-600' },
                { key: 'loved', color: 'from-red-500 to-orange-600' },
                { key: 'fiction', color: 'from-green-500 to-teal-600' },
                { key: 'educational', color: 'from-indigo-500 to-blue-600' },
                { key: 'business', color: 'from-yellow-500 to-orange-600' }
              ].map((item, index) => (
                <div key={item.key} className="group relative">
                  <div className={`flex items-center justify-center p-6 rounded-2xl bg-gradient-to-r ${item.color} hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl`}>
                    <span className="font-bold text-lg text-white text-center">{t(`useCases.${item.key}`)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Coming Soon Section */}
        <section className="py-20 lg:py-32 bg-gradient-to-br from-primary/5 via-purple-600/5 to-indigo-600/5 relative">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-100 to-red-100 border border-orange-200 px-6 py-3 text-sm font-semibold text-orange-600 mb-8">
                <RocketLaunchIcon className="h-5 w-5" />
                {t('comingSoon.title')}
              </div>
                             <h2 className="text-4xl font-black tracking-tight lg:text-5xl text-slate-900">
                {t('comingSoonSubtitle')}
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-5xl mx-auto">
              {[
                {
                  title: t('comingSoon.hardcopy'),
                  description: 'Order physical copies of your AI-generated books',
                  icon: CloudArrowUpIcon,
                  color: 'from-emerald-500 to-teal-600'
                },
                {
                  title: t('comingSoon.export'),
                  description: 'Direct export to Kindle, iPad, and other reading devices',
                  icon: DocumentTextIcon,
                  color: 'from-blue-500 to-indigo-600'
                },
                {
                  title: t('comingSoon.advanced'),
                  description: 'Even more specialized AI agents for specific genres',
                  icon: CpuChipIcon,
                  color: 'from-purple-500 to-pink-600'
                }
              ].map((item, index) => (
                <Card key={index} className="group text-center border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 bg-white/80 backdrop-blur-sm overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <CardHeader className="p-8 relative z-10">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${item.color} text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300 mx-auto`}>
                      <item.icon className="h-8 w-8" />
                    </div>
                    <CardTitle className="text-2xl font-bold mb-4 text-slate-900">{item.title}</CardTitle>
                    <CardDescription className="text-lg text-slate-600 leading-relaxed">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 lg:py-32 bg-gradient-to-br from-white via-blue-50 to-indigo-50">
          <div className="container mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-4xl font-black tracking-tight lg:text-5xl mb-6 text-slate-900">
                {t('pricing.title')}
              </h2>
              <p className="text-xl text-slate-600 font-medium">
                {t('pricing.freemium')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3 max-w-6xl mx-auto">
              {[
                {
                  name: t('pricing.free'),
                  description: t('pricing.freeDescription'),
                  price: t('pricing.freePrice'),
                  features: freeFeatures,
                  color: 'from-slate-500 to-slate-600'
                },
                {
                  name: t('pricing.starter'),
                  description: t('pricing.starterDescription'),
                  price: t('pricing.starterPrice'),
                  features: starterFeatures,
                  color: 'from-green-500 to-emerald-600'
                },
                {
                  name: t('pricing.pro'),
                  description: t('pricing.proDescription'),
                  price: t('pricing.proPrice'),
                  features: proFeatures,
                  color: 'from-primary to-purple-600',
                  popular: true
                }
              ].map((plan, index) => (
                <Card key={index} className={`relative border-0 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-105 bg-white/80 backdrop-blur-sm overflow-hidden ${plan.popular ? 'ring-2 ring-primary scale-105' : ''}`}>
                  {plan.popular && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-purple-600 text-white text-center py-2 text-sm font-bold">
                      {t('pricing.mostPopular')}
                    </div>
                  )}
                  <CardHeader className={`text-center p-8 ${plan.popular ? 'pt-12' : ''}`}>
                    <CardTitle className="text-3xl font-bold mb-4 text-slate-900">{plan.name}</CardTitle>
                    <div className="mb-6">
                      <span className="text-5xl font-black text-slate-900">{plan.price}</span>
                      <span className="text-slate-600 font-medium">/month</span>
                    </div>
                    <CardDescription className="text-lg text-slate-600 mb-8">
                      {plan.description}
                    </CardDescription>
                    <ul className="space-y-3 mb-8">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-3">
                          <CheckCircleIcon className="h-5 w-5 text-green-500" />
                          <span className="text-slate-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link 
                      href="/signup"
                      className={`inline-flex items-center justify-center font-bold rounded-xl focus-ring transition-all duration-300 hover:scale-105 h-12 px-8 text-lg w-full ${
                        plan.popular 
                          ? 'bg-gradient-to-r from-primary to-purple-600 text-white hover:from-primary/90 hover:to-purple-600/90 shadow-xl' 
                          : 'border-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {t('pricing.getStarted')}
                    </Link>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="relative py-20 lg:py-32 bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 text-white overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-full h-full">
              <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
              <div className="absolute bottom-20 right-20 w-96 h-96 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse delay-1000"></div>
            </div>
          </div>
          
          <div className="container mx-auto px-6 text-center relative z-10">
            <h2 className="text-4xl font-black tracking-tight lg:text-6xl mb-8">
              {t('finalCta.title')}
            </h2>
            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-12 font-medium">
              {t('finalCta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link 
                href="/signup"
                className="group relative inline-flex items-center justify-center font-bold rounded-2xl focus-ring transition-all duration-300 bg-gradient-to-r from-white to-slate-100 text-slate-900 hover:from-white/90 hover:to-slate-100/90 hover:shadow-2xl hover:scale-105 h-16 px-10 text-xl gap-3 shadow-xl overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <RocketLaunchIcon className="h-6 w-6 group-hover:animate-bounce" />
                {t('ctaPrimary')}
                <ArrowRightIcon className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="text-slate-300">
                <span className="text-sm">✨ {t('finalCta.disclaimer')}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 bg-gradient-to-r from-slate-50 to-blue-50">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpenIcon className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              BooksAI
            </span>
          </div>
          <p className="text-slate-600">
            &copy; 2024 BooksAI. Transform your ideas into complete books with AI.
          </p>
        </div>
      </footer>
    </div>
  )
}
