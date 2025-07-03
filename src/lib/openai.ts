import { openai } from '@ai-sdk/openai'
import { generateText, streamText, tool } from 'ai'
import { z } from 'zod'
import { env } from './env'

/**
 * Validate OpenAI configuration
 */
function validateOpenAIConfig() {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured. Please add it to your .env file.');
  }
  if (env.OPENAI_API_KEY.length < 20) {
    throw new Error('OPENAI_API_KEY appears to be invalid. Please check your API key.');
  }
}

/**
 * Generate text response using OpenAI
 */
export async function generateAIText(
  prompt: string,
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
    system?: string
  }
) {
  try {
    validateOpenAIConfig();
    
    const {
      model = 'gpt-4o-mini',
      temperature = 0.7,
      maxTokens = 1000,
      system = 'You are a helpful assistant.',
    } = options || {}

    console.log(`Calling OpenAI with model: ${model}, maxTokens: ${maxTokens}`);

    const result = await generateText({
      model: openai(model),
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature,
      maxTokens,
    });

    console.log(`OpenAI response received, tokens used: ${result.usage?.totalTokens || 'unknown'}`);
    return result;
    
  } catch (error) {
    console.error('OpenAI API Error:', error);
    if (error instanceof Error) {
      throw new Error(`OpenAI API failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create a streaming chat completion
 */
export async function streamAIText(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
    onFinish?: (text: string) => void
  }
) {
  const {
    model = 'gpt-4o-mini',
    temperature = 0.7,
    maxTokens = 1000,
    onFinish,
  } = options || {}

  return await streamText({
    model: openai(model),
    messages,
    temperature,
    maxTokens,
    onFinish: (event: any) => {
      if (onFinish) {
        onFinish(event.text)
      }
    },
  })
}

/**
 * AI Tool for getting current weather (example)
 */
export const weatherTool = tool({
  description: 'Get the current weather for a location',
  parameters: z.object({
    location: z.string().describe('The location to get weather for'),
    unit: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }),
  execute: async ({ location, unit }) => {
    // This would typically call a weather API
    return {
      location,
      temperature: unit === 'celsius' ? '22°C' : '72°F',
      condition: 'Sunny',
      humidity: '65%',
    }
  },
})

/**
 * AI Tool for calculations (example)
 */
export const calculatorTool = tool({
  description: 'Perform basic mathematical calculations',
  parameters: z.object({
    expression: z.string().describe('The mathematical expression to evaluate'),
  }),
  execute: async ({ expression }) => {
    try {
      // Simple safe evaluation for basic math
      const result = Function(`"use strict"; return (${expression})`)()
      return { result: String(result) }
    } catch (error) {
      return { error: 'Invalid mathematical expression' }
    }
  },
})

/**
 * Generate text with tool support
 */
export async function generateWithTools(
  prompt: string,
  availableTools: Record<string, any> = {},
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
    system?: string
  }
) {
  const {
    model = 'gpt-4o',
    temperature = 0.7,
    maxTokens = 1000,
    system = 'You are a helpful assistant with access to tools.',
  } = options || {}

  return await generateText({
    model: openai(model),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    tools: availableTools,
    temperature,
    maxTokens,
  })
}
