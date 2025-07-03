import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { NextRequest } from 'next/server'
import { env } from '@/lib/env'

// Allow streaming responses up to 30 seconds
export const maxDuration = 30

export async function POST(req: NextRequest) {
  try {
    const { messages, model = 'gpt-4o-mini' } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return new Response('Messages array is required', { status: 400 })
    }

    const result = await streamText({
      model: openai(model),
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant. Provide clear, concise, and helpful responses.',
        },
        ...messages,
      ],
      temperature: 0.7,
      maxTokens: 1000,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    console.error('OpenAI API error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}

// Helper function for generating responses (not exported as API route)
async function generateResponse(prompt: string) {
  const { generateText } = await import('ai')

  try {
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      maxTokens: 500,
    })

    return result.text
  } catch (error) {
    console.error('Generate text error:', error)
    throw new Error('Failed to generate response')
  }
}
