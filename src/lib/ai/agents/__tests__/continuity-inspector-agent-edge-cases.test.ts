import { ContinuityInspectorAgent } from '../continuity-inspector-agent';
import { generateAIText } from '@/lib/openai';
import fs from 'fs/promises';

// Mock the OpenAI module
jest.mock('@/lib/openai', () => ({
  generateAIText: jest.fn()
}));

// Mock fs promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn()
}));

const mockGenerateAIText = generateAIText as jest.MockedFunction<typeof generateAIText>;
const mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
const mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
const mockMkdir = fs.mkdir as jest.MockedFunction<typeof fs.mkdir>;

describe('ContinuityInspectorAgent Edge Cases', () => {
  let agent: ContinuityInspectorAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new ContinuityInspectorAgent();
  });

  describe('Empty Content Handling', () => {
    it('should handle empty chapter content gracefully', async () => {
      mockGenerateAIText.mockResolvedValue({
        text: '{"issues": []}',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      const result = await agent.checkChapterConsistency(1, '', 'Empty chapter', []);
      
      expect(result.overallScore).toBe(100);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle undefined/null chapter content', async () => {
      mockGenerateAIText.mockResolvedValue({
        text: '{"issues": []}',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      const result = await agent.checkChapterConsistency(1, undefined as any, 'Empty chapter', []);
      
      expect(result.overallScore).toBe(100);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle whitespace-only chapter content', async () => {
      mockGenerateAIText.mockResolvedValue({
        text: '{"issues": []}',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      const result = await agent.checkChapterConsistency(1, '   \n\n   ', 'Whitespace chapter', []);
      
      expect(result.overallScore).toBe(100);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('Malformed AI Response Handling', () => {
    it('should handle invalid JSON responses', async () => {
      mockGenerateAIText.mockResolvedValue({
        text: 'This is not valid JSON',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      await expect(agent.checkChapterConsistency(1, 'Test content', 'Test summary', []))
        .rejects.toThrow('Consistency check failed');
    });

    it('should handle JSON with missing required fields', async () => {
      mockGenerateAIText.mockResolvedValue({
        text: '{"issues": [{"type": "character"}]}', // Missing severity, description, etc.
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      await expect(agent.checkChapterConsistency(1, 'Test content', 'Test summary', []))
        .rejects.toThrow('Consistency check failed');
    });

    it('should handle JSON with invalid enum values', async () => {
      mockGenerateAIText.mockResolvedValue({
        text: '{"issues": [{"type": "invalid_type", "severity": "unknown", "description": "test", "suggestion": "test"}]}',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      await expect(agent.checkChapterConsistency(1, 'Test content', 'Test summary', []))
        .rejects.toThrow('Consistency check failed');
    });

    it('should handle responses wrapped in markdown code blocks', async () => {
      mockGenerateAIText.mockResolvedValue({
        text: '```json\n{"issues": []}\n```',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      const result = await agent.checkChapterConsistency(1, 'Test content', 'Test summary', []);
      
      expect(result.overallScore).toBe(100);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle responses with extra text before/after JSON', async () => {
      mockGenerateAIText.mockResolvedValue({
        text: 'Here is the analysis:\n{"issues": []}\nThat concludes the analysis.',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      const result = await agent.checkChapterConsistency(1, 'Test content', 'Test summary', []);
      
      expect(result.overallScore).toBe(100);
      expect(result.issues).toHaveLength(0);
    });

    it('should retry with fallback prompt on parsing failure', async () => {
      mockGenerateAIText
        .mockResolvedValueOnce({
          text: 'Invalid response',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        } as any)
        .mockResolvedValue({
          text: '{"issues": []}',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        } as any);

      const result = await agent.checkChapterConsistency(1, 'Test content', 'Test summary', []);
      
      expect(result.overallScore).toBe(100);
      expect(result.issues).toHaveLength(0);
      expect(mockGenerateAIText).toHaveBeenCalledTimes(6); // 2 attempts per category (timeline, worldbuilding, research) + tracker updates
    });
  });

  describe('Network Failure Handling', () => {
    it('should handle network timeouts gracefully', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('Network timeout'));

      await expect(agent.checkChapterConsistency(1, 'Test content', 'Test summary', []))
        .rejects.toThrow('Consistency check failed');
    });

    it('should handle API rate limiting', async () => {
      mockGenerateAIText.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(agent.checkChapterConsistency(1, 'Test content', 'Test summary', []))
        .rejects.toThrow('Consistency check failed');
    });

    it('should retry on transient failures', async () => {
      mockGenerateAIText
        .mockRejectedValueOnce(new Error('Transient failure'))
        .mockResolvedValue({
          text: '{"issues": []}',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        } as any);

      const result = await agent.checkChapterConsistency(1, 'Test content', 'Test summary', []);
      
      expect(result.overallScore).toBe(100);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('Tracker State Management', () => {
    it('should handle missing tracker file gracefully', async () => {
      mockReadFile.mockRejectedValue(Object.assign(new Error('File not found'), { code: 'ENOENT' }));
      
      await agent.loadTrackerState();
      
      const state = agent.getTrackerState();
      expect(state.characters).toHaveLength(0);
      expect(state.plotPoints).toHaveLength(0);
    });

    it('should handle corrupted tracker file', async () => {
      mockReadFile.mockResolvedValue('{ invalid json');
      
      await expect(agent.loadTrackerState()).rejects.toThrow('Failed to load tracker state');
    });

    it('should handle tracker file with invalid structure', async () => {
      mockReadFile.mockResolvedValue('{"invalid": "structure"}');
      
      await expect(agent.loadTrackerState()).rejects.toThrow('Invalid tracker data structure');
    });

    it('should handle file system errors when saving', async () => {
      mockMkdir.mockRejectedValue(new Error('Permission denied'));
      
      await expect(agent.saveTrackerState()).rejects.toThrow('Failed to save tracker state');
    });
  });

  describe('Invalid Input Handling', () => {
    it('should handle negative chapter numbers', async () => {
      mockGenerateAIText.mockResolvedValue({
        text: '{"issues": []}',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      const result = await agent.checkChapterConsistency(-1, 'Test content', 'Test summary', []);
      
      expect(result.overallScore).toBe(100);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle zero chapter number', async () => {
      mockGenerateAIText.mockResolvedValue({
        text: '{"issues": []}',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      const result = await agent.checkChapterConsistency(0, 'Test content', 'Test summary', []);
      
      expect(result.overallScore).toBe(100);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle very large chapter numbers', async () => {
      mockGenerateAIText.mockResolvedValue({
        text: '{"issues": []}',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      const result = await agent.checkChapterConsistency(999999, 'Test content', 'Test summary', []);
      
      expect(result.overallScore).toBe(100);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle extremely long content', async () => {
      const longContent = 'x'.repeat(100000);
      mockGenerateAIText.mockResolvedValue({
        text: '{"issues": []}',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      const result = await agent.checkChapterConsistency(1, longContent, 'Test summary', []);
      
      expect(result.overallScore).toBe(100);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle undefined researchUsed array', async () => {
      mockGenerateAIText.mockResolvedValue({
        text: '{"issues": []}',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      const result = await agent.checkChapterConsistency(1, 'Test content', 'Test summary', undefined as any);
      
      expect(result.overallScore).toBe(100);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('Caching and Performance', () => {
    it('should cache character lookups', async () => {
      // Initialize with some characters
      await agent.initializeTracking(
        [{ name: 'John', description: 'Main character' }],
        {},
        { domainKnowledge: [], settingDetails: [], technicalAspects: [] } as any,
        {} as any
      );

      mockGenerateAIText.mockResolvedValue({
        text: '{"characterUpdates": [{"name": "John", "location": "Kitchen"}], "plotPoints": [], "timeReferences": [], "newFacts": [], "worldBuilding": []}',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      // First call should populate cache
      await agent.checkChapterConsistency(1, 'John goes to kitchen', 'John moves', []);
      
      // Second call should use cache
      await agent.checkChapterConsistency(2, 'John cooks', 'John cooks', []);
      
      // Verify character was found and updated
      const state = agent.getTrackerState();
      expect(state.characters[0].currentLocation).toBe('Kitchen');
    });

    it('should invalidate cache when tracker is reset', async () => {
      await agent.initializeTracking(
        [{ name: 'John', description: 'Main character' }],
        {},
        { domainKnowledge: [], settingDetails: [], technicalAspects: [] } as any,
        {} as any
      );

      agent.resetTracker();
      
      const state = agent.getTrackerState();
      expect(state.characters).toHaveLength(0);
    });

    it('should handle memory pressure gracefully', async () => {
      // Create a scenario with many characters and large data
      const manyCharacters = Array.from({ length: 1000 }, (_, i) => ({
        name: `Character${i}`,
        description: `Description for character ${i}`
      }));

      await agent.initializeTracking(
        manyCharacters,
        {},
        { domainKnowledge: [], settingDetails: [], technicalAspects: [] } as any,
        {} as any
      );

      mockGenerateAIText.mockResolvedValue({
        text: '{"issues": []}',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      const result = await agent.checkChapterConsistency(1, 'Test content', 'Test summary', []);
      
      expect(result.overallScore).toBe(100);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe('Configuration Edge Cases', () => {
    it('should handle zero max retries', async () => {
      agent = new ContinuityInspectorAgent({ maxRetries: 0 });
      
      mockGenerateAIText.mockRejectedValue(new Error('Failed'));

      await expect(agent.checkChapterConsistency(1, 'Test content', 'Test summary', []))
        .rejects.toThrow('Consistency check failed');
    });

    it('should handle very short content length limit', async () => {
      agent = new ContinuityInspectorAgent({ maxContentLength: 10 });
      
      mockGenerateAIText.mockResolvedValue({
        text: '{"issues": []}',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      const result = await agent.checkChapterConsistency(1, 'This is a very long content that exceeds the limit', 'Test summary', []);
      
      expect(result.overallScore).toBe(100);
      expect(result.issues).toHaveLength(0);
    });

    it('should handle zero temperature setting', async () => {
      agent = new ContinuityInspectorAgent({ temperature: 0 });
      
      mockGenerateAIText.mockResolvedValue({
        text: '{"issues": []}',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      } as any);

      const result = await agent.checkChapterConsistency(1, 'Test content', 'Test summary', []);
      
      expect(result.overallScore).toBe(100);
      expect(result.issues).toHaveLength(0);
    });
  });
}); 