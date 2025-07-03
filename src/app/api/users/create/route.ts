import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, email, name, avatar } = body

    // Create user with default values
    const user = await prisma.user.create({
      data: {
        id,
        email,
        name,
        avatar,
        role: 'USER', // Default role
        subscriptionTier: 'FREE', // Default subscription tier
        booksGenerated: 0,
        wordsGenerated: 0,
        lastResetDate: new Date(),
      },
      include: {
        settings: true,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
} 