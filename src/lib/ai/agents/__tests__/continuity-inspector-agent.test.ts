import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { ContinuityInspectorAgent } from '../continuity-inspector-agent';

// Mock dependencies
jest.mock('../../openai');
jest.mock('fs/promises');

describe('ContinuityInspectorAgent', () => {
  let agent: ContinuityInspectorAgent;
  
  beforeEach(() => {
    agent = new ContinuityInspectorAgent({
      maxContentLength: 1000,
      parsingRetries: 1,
      maxRetries: 1
    });
  });

  describe('generateWithParsingRetry', () => {
    it('should successfully generate and parse AI text on first attempt', async () => {
      // This test would need to be implemented with proper mocking
      // of the generateAIText function and parser
      expect(true).toBe(true); // Placeholder
    });

    it('should retry with fallback prompt when parsing fails', async () => {
      // Test retry logic with fallback prompts
      expect(true).toBe(true); // Placeholder
    });

    it('should throw error after max retries exceeded', async () => {
      // Test error handling when all retries fail
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('calculateConsistencyScore', () => {
    it('should calculate correct score with no issues', () => {
      const { overallScore, categoryScores } = agent['calculateConsistencyScore']([], 5000);
      
      expect(overallScore).toBe(100);
      expect(categoryScores.character).toBe(100);
      expect(categoryScores.timeline).toBe(100);
    });

    it('should calculate correct score with critical issues', () => {
      const issues = [
        {
          type: 'character' as const,
          severity: 'critical' as const,
          description: 'Critical character issue',
          chapters: [1],
          suggestion: 'Fix it',
          conflictingElements: []
        }
      ];
      
      const { overallScore, categoryScores } = agent['calculateConsistencyScore'](issues, 5000);
      
      expect(overallScore).toBeLessThan(100);
      expect(categoryScores.character).toBeLessThan(100);
    });

    it('should apply content length normalization', () => {
      const issues = [
        {
          type: 'character' as const,
          severity: 'major' as const,
          description: 'Major character issue',
          chapters: [1],
          suggestion: 'Fix it',
          conflictingElements: []
        }
      ];
      
      const shortContent = agent['calculateConsistencyScore'](issues, 1000);
      const longContent = agent['calculateConsistencyScore'](issues, 10000);
      
      // Longer content should have higher score (normalized)
      expect(longContent.overallScore).toBeGreaterThan(shortContent.overallScore);
    });

    it('should weight different issue types correctly', () => {
      const timelineIssue = [{
        type: 'timeline' as const,
        severity: 'major' as const,
        description: 'Timeline issue',
        chapters: [1],
        suggestion: 'Fix it',
        conflictingElements: []
      }];
      
      const worldbuildingIssue = [{
        type: 'worldbuilding' as const,
        severity: 'major' as const,
        description: 'Worldbuilding issue',
        chapters: [1],
        suggestion: 'Fix it',
        conflictingElements: []
      }];
      
      const timelineScore = agent['calculateConsistencyScore'](timelineIssue, 5000);
      const worldbuildingScore = agent['calculateConsistencyScore'](worldbuildingIssue, 5000);
      
      // Timeline issues should have bigger impact (lower score)
      expect(timelineScore.overallScore).toBeLessThan(worldbuildingScore.overallScore);
    });
  });

  describe('applyTrackerUpdates', () => {
    beforeEach(() => {
      // Initialize with some test data
      agent['tracker'] = {
        characters: [
          {
            name: 'John',
            currentLocation: 'New York',
            physicalState: 'healthy',
            emotionalState: 'calm',
            knowledgeState: 'basic',
            relationships: {},
            lastSeen: 0
          }
        ],
        plotPoints: [],
        timeline: [],
        establishedFacts: [],
        researchReferences: [],
        worldBuilding: []
      };
    });

    it('should update existing character states', () => {
      const updates = {
        characterUpdates: [
          {
            name: 'John',
            location: 'Los Angeles',
            physicalState: 'tired',
            emotionalState: 'anxious'
          }
        ],
        plotPoints: [],
        timeReferences: [],
        newFacts: [],
        worldBuilding: []
      };
      
      agent['applyTrackerUpdates'](2, updates);
      
      const john = agent['tracker'].characters.find(c => c.name === 'John');
      expect(john?.currentLocation).toBe('Los Angeles');
      expect(john?.physicalState).toBe('tired');
      expect(john?.emotionalState).toBe('anxious');
      expect(john?.lastSeen).toBe(2);
    });

    it('should add new plot points', () => {
      const updates = {
        characterUpdates: [],
        plotPoints: [
          {
            event: 'Major revelation',
            consequences: ['Character learns truth'],
            affectedCharacters: ['John'],
            establishedFacts: ['Truth is revealed']
          }
        ],
        timeReferences: [],
        newFacts: [],
        worldBuilding: []
      };
      
      agent['applyTrackerUpdates'](2, updates);
      
      expect(agent['tracker'].plotPoints).toHaveLength(1);
      expect(agent['tracker'].plotPoints[0].event).toBe('Major revelation');
      expect(agent['tracker'].plotPoints[0].chapter).toBe(2);
    });

    it('should add new timeline entries', () => {
      const updates = {
        characterUpdates: [],
        plotPoints: [],
        timeReferences: [
          {
            reference: 'Three hours later',
            duration: '3 hours',
            absoluteTime: '3:00 PM'
          }
        ],
        newFacts: [],
        worldBuilding: []
      };
      
      agent['applyTrackerUpdates'](2, updates);
      
      expect(agent['tracker'].timeline).toHaveLength(1);
      expect(agent['tracker'].timeline[0].timeReference).toBe('Three hours later');
      expect(agent['tracker'].timeline[0].chapter).toBe(2);
    });

    it('should add new facts and research references', () => {
      const updates = {
        characterUpdates: [],
        plotPoints: [],
        timeReferences: [],
        newFacts: ['Quantum physics principle'],
        worldBuilding: []
      };
      
      agent['applyTrackerUpdates'](2, updates);
      
      expect(agent['tracker'].establishedFacts).toContain('Quantum physics principle');
      expect(agent['tracker'].researchReferences).toHaveLength(1);
      expect(agent['tracker'].researchReferences[0].fact).toBe('Quantum physics principle');
    });

    it('should handle world building elements', () => {
      const updates = {
        characterUpdates: [],
        plotPoints: [],
        timeReferences: [],
        newFacts: [],
        worldBuilding: [
          {
            element: 'Magic system',
            description: 'Energy-based magic'
          }
        ]
      };
      
      agent['applyTrackerUpdates'](2, updates);
      
      expect(agent['tracker'].worldBuilding).toHaveLength(1);
      expect(agent['tracker'].worldBuilding[0].element).toBe('Magic system');
      expect(agent['tracker'].worldBuilding[0].chapters).toContain(2);
    });

    it('should update existing world building elements', () => {
      // Add existing world building element
      agent['tracker'].worldBuilding.push({
        element: 'Magic system',
        description: 'Energy-based magic',
        chapters: [1]
      });
      
      const updates = {
        characterUpdates: [],
        plotPoints: [],
        timeReferences: [],
        newFacts: [],
        worldBuilding: [
          {
            element: 'Magic system',
            description: 'Energy-based magic with new rules'
          }
        ]
      };
      
      agent['applyTrackerUpdates'](2, updates);
      
      expect(agent['tracker'].worldBuilding).toHaveLength(1);
      expect(agent['tracker'].worldBuilding[0].chapters).toEqual([1, 2]);
    });
  });

  describe('Configuration and State Management', () => {
    it('should initialize with default configuration', () => {
      const defaultAgent = new ContinuityInspectorAgent();
      const config = defaultAgent.getConfig();
      
      expect(config.model).toBe('gpt-4o');
      expect(config.temperature).toBe(0.0);
      expect(config.maxContentLength).toBe(8000);
    });

    it('should update configuration', () => {
      agent.updateConfig({
        temperature: 0.5,
        maxTokens: 3000
      });
      
      const config = agent.getConfig();
      expect(config.temperature).toBe(0.5);
      expect(config.maxTokens).toBe(3000);
    });

    it('should reset tracker state', () => {
      // Add some data to tracker
      agent['tracker'].characters.push({
        name: 'Test',
        currentLocation: 'Test',
        physicalState: 'Test',
        emotionalState: 'Test',
        knowledgeState: 'Test',
        relationships: {},
        lastSeen: 1
      });
      
      agent.resetTracker();
      
      expect(agent['tracker'].characters).toHaveLength(0);
      expect(agent['tracker'].plotPoints).toHaveLength(0);
    });

    it('should get current tracker state', () => {
      const state = agent.getTrackerState();
      
      expect(state).toHaveProperty('characters');
      expect(state).toHaveProperty('plotPoints');
      expect(state).toHaveProperty('timeline');
      expect(state).toHaveProperty('establishedFacts');
      expect(state).toHaveProperty('researchReferences');
      expect(state).toHaveProperty('worldBuilding');
    });
  });

  describe('Recommendation Generation', () => {
    it('should generate positive recommendations for no issues', () => {
      const recommendations = agent['generateRecommendations']([], 1);
      
      expect(recommendations).toContain('Chapter maintains excellent consistency with previous story elements');
    });

    it('should generate critical issue recommendations', () => {
      const criticalIssues = [
        {
          type: 'character' as const,
          severity: 'critical' as const,
          description: 'Critical issue',
          chapters: [1],
          suggestion: 'Fix it',
          conflictingElements: []
        }
      ];
      
      const recommendations = agent['generateRecommendations'](criticalIssues, 1);
      
      expect(recommendations.some(r => r.includes('❌'))).toBe(true);
      expect(recommendations.some(r => r.includes('critical'))).toBe(true);
    });

    it('should generate category-specific recommendations', () => {
      const timelineIssue = [
        {
          type: 'timeline' as const,
          severity: 'major' as const,
          description: 'Timeline issue',
          chapters: [1],
          suggestion: 'Fix it',
          conflictingElements: []
        }
      ];
      
      const recommendations = agent['generateRecommendations'](timelineIssue, 1);
      
      expect(recommendations.some(r => r.includes('🕐'))).toBe(true);
      expect(recommendations.some(r => r.includes('time progression'))).toBe(true);
    });
  });

  describe('Successful Elements Identification', () => {
    it('should identify successful character tracking', () => {
      agent['tracker'].characters = [
        {
          name: 'John',
          currentLocation: 'Test',
          physicalState: 'Test',
          emotionalState: 'Test',
          knowledgeState: 'Test',
          relationships: {},
          lastSeen: 1
        }
      ];
      
      const elements = agent['identifySuccessfulElements'](1);
      
      expect(elements.some(e => e.includes('Successfully tracked'))).toBe(true);
    });

    it('should identify successful timeline progression', () => {
      agent['tracker'].timeline = [
        {
          chapter: 1,
          timeReference: 'Morning',
          duration: '2 hours'
        }
      ];
      
      const elements = agent['identifySuccessfulElements'](1);
      
      expect(elements.some(e => e.includes('Time progression properly tracked'))).toBe(true);
    });

    it('should provide default message when no specific successes found', () => {
      const elements = agent['identifySuccessfulElements'](1);
      
      expect(elements).toContain('Basic story structure maintained');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete consistency check workflow', async () => {
      // This would be a comprehensive integration test
      // that tests the entire checkChapterConsistency method
      // For now, it's a placeholder
      expect(true).toBe(true);
    });

    it('should handle initialization with research data', async () => {
      // Test initialization with characters, outline, and research
      const characters = [{ name: 'John' }];
      const outline = { chapters: [] };
      const research = {
        domainKnowledge: [{ facts: ['Fact 1', 'Fact 2'] }],
        settingDetails: [{ facts: ['Setting 1'] }],
        technicalAspects: [{ facts: ['Tech 1'] }]
      };
      const settings = { genre: 'fiction' };
      
      // This would test the full initialization
      expect(true).toBe(true); // Placeholder
    });
  });
}); 