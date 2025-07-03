'use client'

import { ChatInterface } from '@/components/ai/ChatInterface'

export default function AIChatPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">AI Chat</h1>
          <p className="text-muted-foreground">
            Test the OpenAI integration with our intelligent assistant.
          </p>
        </div>

        <ChatInterface />
      </div>
    </div>
  )
}
