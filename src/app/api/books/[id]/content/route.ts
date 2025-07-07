import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const book = await prisma.book.findFirst({
      where: {
        id: resolvedParams.id,
        userId: user.id,
      },
      include: {
        settings: true,
        chapters: {
          orderBy: { chapterNumber: 'asc' },
          include: {
            sections: {
              orderBy: { sectionNumber: 'asc' }
            }
          }
        },
      },
    })

    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 })
    }

    // Only include books that are complete or have some content
    if (book.status !== 'COMPLETE' && book.chapters.length === 0) {
      return NextResponse.json({ 
        error: 'Book content not ready', 
        message: 'This book is still being generated or has no content yet.' 
      }, { status: 400 })
    }

    // Format the response for the reader - combine section content into chapter content
    const bookContent = {
      id: book.id,
      title: book.title,
      backCover: book.backCover,
      chapters: book.chapters.map(chapter => {
        // Combine all sections into a single chapter content
        const combinedContent = chapter.sections
          .map(section => section.content)
          .filter(content => content && content.trim().length > 0)
          .join('\n\n');

        // Calculate total word count
        const totalWordCount = chapter.sections.reduce((sum, section) => sum + section.wordCount, 0);

        return {
          id: chapter.id,
          chapterNumber: chapter.chapterNumber,
          title: chapter.title,
          summary: chapter.summary,
          content: combinedContent, // This is what the read page expects
          wordCount: totalWordCount,
          // Also include sections for debugging/alternate display
          sections: chapter.sections.map(section => ({
            id: section.id,
            sectionNumber: section.sectionNumber,
            title: section.title,
            content: section.content,
            wordCount: section.wordCount
          }))
        };
      })
    }

    return NextResponse.json(bookContent)
  } catch (error) {
    console.error('Error fetching book content:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 