import { prisma } from '../../prisma';
import { type StoryBible } from '../agents/chief-editor-agent';

export class StoryMemoryManager {
  constructor() {}

  /**
   * Save story memory data to database
   */
  async saveStoryMemoryToDatabase(bookId: string, storyBible: StoryBible, research: any): Promise<void> {
    console.log('💾 Saving story memory data to database...');
    
    try {
      // Create or update StoryMemory record
      const storyMemory = await prisma.storyMemory.upsert({
        where: { bookId },
        create: {
          bookId,
          themes: [storyBible.overview.theme],
          worldRules: {
            premise: storyBible.overview.premise,
            theme: storyBible.overview.theme,
            conflict: storyBible.overview.conflict,
            resolution: storyBible.overview.resolution,
            targetAudience: storyBible.overview.targetAudience,
            tone: storyBible.overview.tone
          }
        },
        update: {
          themes: [storyBible.overview.theme],
          worldRules: {
            premise: storyBible.overview.premise,
            theme: storyBible.overview.theme,
            conflict: storyBible.overview.conflict,
            resolution: storyBible.overview.resolution,
            targetAudience: storyBible.overview.targetAudience,
            tone: storyBible.overview.tone
          },
          updatedAt: new Date()
        }
      });

      // Save characters from story bible
      await this.saveCharactersToDatabase(storyMemory.id, storyBible.characters);

      // Save locations from story bible and research
      await this.saveLocationsToDatabase(storyMemory.id, storyBible, research);

      // Save timeline events from story bible
      await this.saveTimelineEventsToDatabase(storyMemory.id, storyBible);

      console.log(`✅ Story memory saved: ${storyBible.characters.length} characters, ${storyBible.chapterPlans.length} chapters`);

    } catch (error) {
      console.error('Error saving story memory:', error);
      // Don't throw error to avoid breaking the generation flow
    }
  }

  /**
   * Save characters to database
   */
  private async saveCharactersToDatabase(storyMemoryId: string, characters: any[]): Promise<void> {
    // Clear existing characters
    await prisma.character.deleteMany({
      where: { storyMemoryId }
    });

    // Save characters from story bible
    for (const character of characters) {
      await prisma.character.create({
        data: {
          storyMemoryId,
          name: character.name,
          role: character.role || 'supporting',
          description: character.background || character.description || `${character.name} is a character in the story.`,
          personality: character.personality || `${character.name} has a unique personality.`,
          backstory: character.backstory || character.background || null,
          arc: character.arc || null,
          firstAppearance: character.firstAppearance || 'Chapter 1',
          relationships: character.relationships || {}
        }
      });
    }
  }

  /**
   * Save locations to database
   */
  private async saveLocationsToDatabase(storyMemoryId: string, storyBible: StoryBible, research: any): Promise<void> {
    // Clear existing locations
    await prisma.location.deleteMany({
      where: { storyMemoryId }
    });

    // Extract locations from story bible scenes
    const locationsSet = new Set<string>();
    
    for (const chapterPlan of storyBible.chapterPlans) {
      for (const scene of chapterPlan.scenes) {
        if (scene.setting && scene.setting.trim()) {
          locationsSet.add(scene.setting.trim());
        }
      }
    }

    // Add locations from research if available
    if (research && research.settingDetails) {
      for (const settingDetail of research.settingDetails) {
        if (settingDetail.topic && settingDetail.topic.trim()) {
          locationsSet.add(settingDetail.topic.trim());
        }
      }
    }

    // Save unique locations
    for (const locationName of Array.from(locationsSet)) {
      await prisma.location.create({
        data: {
          storyMemoryId,
          name: locationName,
          description: `${locationName} is a location in the story.`,
          importance: 'minor',
          firstMention: 'Chapter 1'
        }
      });
    }
  }

  /**
   * Save timeline events to database
   */
  private async saveTimelineEventsToDatabase(storyMemoryId: string, storyBible: StoryBible): Promise<void> {
    // Clear existing timeline events
    await prisma.timelineEvent.deleteMany({
      where: { storyMemoryId }
    });

    // Create timeline events from chapter plans
    for (const chapterPlan of storyBible.chapterPlans) {
      // Create event for each chapter's main purpose
      await prisma.timelineEvent.create({
        data: {
          storyMemoryId,
          title: `Chapter ${chapterPlan.number}: ${chapterPlan.title}`,
          description: chapterPlan.purpose || `Events of chapter ${chapterPlan.number}`,
          chapterReference: `Chapter ${chapterPlan.number}`,
          importance: chapterPlan.number <= 3 ? 'MAJOR' : 
                      chapterPlan.number >= storyBible.chapterPlans.length - 2 ? 'MAJOR' : 'MINOR'
        }
      });

      // Create events for significant scenes
      for (const scene of chapterPlan.scenes) {
        if (scene.purpose && scene.purpose.toLowerCase().includes('climax') || 
            scene.purpose && scene.purpose.toLowerCase().includes('conflict') ||
            scene.purpose && scene.purpose.toLowerCase().includes('resolution')) {
          await prisma.timelineEvent.create({
            data: {
              storyMemoryId,
              title: `Scene: ${scene.purpose}`,
              description: scene.purpose,
              chapterReference: `Chapter ${chapterPlan.number}`,
              importance: 'MAJOR'
            }
          });
        }
      }
    }
  }

  /**
   * Update story memory with continuity tracking data
   */
  async updateStoryMemoryFromContinuityTracking(bookId: string, chapterNumber: number, trackerState: any): Promise<void> {
    try {
      // Get story memory record
      const storyMemory = await prisma.storyMemory.findUnique({
        where: { bookId }
      });

      if (!storyMemory) {
        console.warn('No story memory found for book:', bookId);
        return;
      }

      // Update character states from continuity tracking
      for (const characterState of trackerState.characters) {
        await prisma.character.updateMany({
          where: {
            storyMemoryId: storyMemory.id,
            name: characterState.name
          },
          data: {
            // Update character with latest state information
            description: characterState.physicalState ? 
              `${characterState.name} - Physical: ${characterState.physicalState}` : 
              undefined,
            personality: characterState.emotionalState ? 
              `${characterState.name} - Emotional: ${characterState.emotionalState}` : 
              undefined,
            relationships: characterState.relationships || {}
          }
        });
      }

      // Add new timeline events from plot points
      for (const plotPoint of trackerState.plotPoints) {
        // Check if this event already exists
        const existingEvent = await prisma.timelineEvent.findFirst({
          where: {
            storyMemoryId: storyMemory.id,
            title: plotPoint.event,
            chapterReference: `Chapter ${chapterNumber}`
          }
        });

        if (!existingEvent) {
          await prisma.timelineEvent.create({
            data: {
              storyMemoryId: storyMemory.id,
              title: plotPoint.event,
              description: plotPoint.consequences.join('; '),
              chapterReference: `Chapter ${chapterNumber}`,
              importance: plotPoint.affectedCharacters.length > 0 ? 'MAJOR' : 'MINOR'
            }
          });
        }
      }

      // Update locations with new information
      for (const location of trackerState.worldBuilding) {
        // Check if location already exists
        const existingLocation = await prisma.location.findFirst({
          where: {
            storyMemoryId: storyMemory.id,
            name: location.element
          }
        });

        if (existingLocation) {
          // Update existing location
          await prisma.location.update({
            where: { id: existingLocation.id },
            data: {
              description: location.description
            }
          });
        } else {
          // Create new location
          await prisma.location.create({
            data: {
              storyMemoryId: storyMemory.id,
              name: location.element,
              description: location.description,
              importance: 'minor',
              firstMention: `Chapter ${chapterNumber}`
            }
          });
        }
      }

      console.log(`📊 Updated story memory for Chapter ${chapterNumber}`);

    } catch (error) {
      console.error('Error updating story memory from continuity tracking:', error);
      // Don't throw error to avoid breaking the generation flow
    }
  }

  /**
   * Get complete story memory data for a book
   */
  async getStoryMemoryData(bookId: string): Promise<any> {
    try {
      const storyMemory = await prisma.storyMemory.findUnique({
        where: { bookId },
        include: {
          characters: true,
          locations: true,
          timeline: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!storyMemory) {
        return null;
      }

      return {
        id: storyMemory.id,
        themes: storyMemory.themes,
        worldRules: storyMemory.worldRules,
        characters: storyMemory.characters.map(char => ({
          id: char.id,
          name: char.name,
          role: char.role,
          description: char.description,
          personality: char.personality,
          backstory: char.backstory,
          arc: char.arc,
          firstAppearance: char.firstAppearance,
          relationships: char.relationships
        })),
        locations: storyMemory.locations.map(loc => ({
          id: loc.id,
          name: loc.name,
          description: loc.description,
          importance: loc.importance,
          firstMention: loc.firstMention
        })),
        timeline: storyMemory.timeline.map(event => ({
          id: event.id,
          title: event.title,
          description: event.description,
          chapterReference: event.chapterReference,
          importance: event.importance,
          createdAt: event.createdAt
        })),
        createdAt: storyMemory.createdAt,
        updatedAt: storyMemory.updatedAt
      };

    } catch (error) {
      console.error('Error fetching story memory data:', error);
      return null;
    }
  }

  /**
   * Update character information in story memory
   */
  async updateCharacter(
    bookId: string,
    characterName: string,
    updates: {
      description?: string;
      personality?: string;
      relationships?: any;
      currentLocation?: string;
      emotionalState?: string;
    }
  ): Promise<void> {
    try {
      const storyMemory = await prisma.storyMemory.findUnique({
        where: { bookId }
      });

      if (!storyMemory) {
        console.warn('No story memory found for book:', bookId);
        return;
      }

      await prisma.character.updateMany({
        where: {
          storyMemoryId: storyMemory.id,
          name: characterName
        },
        data: updates
      });

      console.log(`Updated character ${characterName} in story memory`);

    } catch (error) {
      console.error('Error updating character in story memory:', error);
    }
  }

  /**
   * Add new timeline event
   */
  async addTimelineEvent(
    bookId: string,
    title: string,
    description: string,
    chapterReference: string,
    importance: 'MAJOR' | 'MINOR' = 'MINOR'
  ): Promise<void> {
    try {
      const storyMemory = await prisma.storyMemory.findUnique({
        where: { bookId }
      });

      if (!storyMemory) {
        console.warn('No story memory found for book:', bookId);
        return;
      }

      await prisma.timelineEvent.create({
        data: {
          storyMemoryId: storyMemory.id,
          title,
          description,
          chapterReference,
          importance
        }
      });

      console.log(`Added timeline event: ${title}`);

    } catch (error) {
      console.error('Error adding timeline event:', error);
    }
  }

  /**
   * Get story memory summary
   */
  async getStoryMemorySummary(bookId: string): Promise<{
    hasStoryMemory: boolean;
    characterCount: number;
    locationCount: number;
    timelineEventCount: number;
    lastUpdated?: Date;
  }> {
    try {
      const storyMemory = await prisma.storyMemory.findUnique({
        where: { bookId },
        include: {
          _count: {
            select: {
              characters: true,
              locations: true,
              timeline: true
            }
          }
        }
      });

      if (!storyMemory) {
        return {
          hasStoryMemory: false,
          characterCount: 0,
          locationCount: 0,
          timelineEventCount: 0
        };
      }

      return {
        hasStoryMemory: true,
        characterCount: storyMemory._count.characters,
        locationCount: storyMemory._count.locations,
        timelineEventCount: storyMemory._count.timeline,
        lastUpdated: storyMemory.updatedAt
      };

    } catch (error) {
      console.error('Error getting story memory summary:', error);
      return {
        hasStoryMemory: false,
        characterCount: 0,
        locationCount: 0,
        timelineEventCount: 0
      };
    }
  }

  /**
   * Clear story memory for a book
   */
  async clearStoryMemory(bookId: string): Promise<void> {
    try {
      const storyMemory = await prisma.storyMemory.findUnique({
        where: { bookId }
      });

      if (!storyMemory) {
        console.log('No story memory found to clear for book:', bookId);
        return;
      }

      // Delete all related data (cascade should handle this, but being explicit)
      await prisma.character.deleteMany({
        where: { storyMemoryId: storyMemory.id }
      });

      await prisma.location.deleteMany({
        where: { storyMemoryId: storyMemory.id }
      });

      await prisma.timelineEvent.deleteMany({
        where: { storyMemoryId: storyMemory.id }
      });

      await prisma.storyMemory.delete({
        where: { bookId }
      });

      console.log(`Cleared story memory for book: ${bookId}`);

    } catch (error) {
      console.error('Error clearing story memory:', error);
    }
  }
} 