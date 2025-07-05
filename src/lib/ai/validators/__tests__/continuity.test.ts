import { describe, it, expect, jest } from '@jest/globals';
import {
  safeJsonParse,
  validateConsistencyIssues,
  validateTrackerUpdates,
  validateConsistencyIssuesWithFallback,
  validateTrackerUpdatesWithFallback,
  safeConsistencyIssuesValidator,
  safeTrackerUpdatesValidator,
  logValidationError,
  createSafeValidator,
  isConsistencyIssuesResponse,
  isTrackerUpdates
} from '../continuity';

describe('Continuity Validators', () => {
  describe('safeJsonParse', () => {
    it('should parse valid JSON successfully', () => {
      const validJson = '{"test": "value"}';
      const result = safeJsonParse(validJson);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ test: 'value' });
      expect(result.error).toBeUndefined();
    });

    it('should handle malformed JSON gracefully', () => {
      const invalidJson = '{"test": "value"';
      const result = safeJsonParse(invalidJson);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.data).toBeUndefined();
    });

    it('should clean up markdown code blocks', () => {
      const jsonWithMarkdown = '```json\n{"test": "value"}\n```';
      const result = safeJsonParse(jsonWithMarkdown);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ test: 'value' });
    });

    it('should extract JSON from mixed content', () => {
      const mixedContent = 'Here is some JSON: {"test": "value"} and more text';
      const result = safeJsonParse(mixedContent);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ test: 'value' });
    });
  });

  describe('validateConsistencyIssues', () => {
    it('should validate correct consistency issues format', () => {
      const validData = {
        issues: [
          {
            type: 'character',
            severity: 'major',
            description: 'Character inconsistency',
            suggestion: 'Fix the issue',
            conflictingElements: ['element1']
          }
        ]
      };
      
      const result = validateConsistencyIssues(validData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject invalid consistency issues format', () => {
      const invalidData = {
        issues: [
          {
            type: 'invalid_type',
            severity: 'major',
            description: 'Test'
          }
        ]
      };
      
      const result = validateConsistencyIssues(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.issues).toBeDefined();
    });

    it('should handle empty issues array', () => {
      const emptyData = { issues: [] };
      const result = validateConsistencyIssues(emptyData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(emptyData);
    });
  });

  describe('validateTrackerUpdates', () => {
    it('should validate correct tracker updates format', () => {
      const validData = {
        characterUpdates: [
          {
            name: 'John',
            location: 'New York',
            physicalState: 'healthy'
          }
        ],
        plotPoints: [
          {
            event: 'Test event',
            consequences: ['consequence1'],
            affectedCharacters: ['John'],
            establishedFacts: ['fact1']
          }
        ],
        timeReferences: [
          {
            reference: 'Three hours later'
          }
        ],
        newFacts: ['New fact'],
        worldBuilding: [
          {
            element: 'Magic system',
            description: 'How magic works'
          }
        ]
      };
      
      const result = validateTrackerUpdates(validData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should reject invalid tracker updates format', () => {
      const invalidData = {
        characterUpdates: [
          {
            // Missing required 'name' field
            location: 'New York'
          }
        ],
        plotPoints: [],
        timeReferences: [],
        newFacts: [],
        worldBuilding: []
      };
      
      const result = validateTrackerUpdates(invalidData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('validateWithFallback functions', () => {
    it('should use Zod validation when successful', () => {
      const validData = { issues: [] };
      const result = validateConsistencyIssuesWithFallback(validData);
      
      expect(result.success).toBe(true);
      expect(result.data).toEqual(validData);
    });

    it('should fallback to type guard when Zod fails', () => {
      // Mock data that passes type guard but might fail Zod due to edge cases
      const edgeCaseData = {
        issues: [
          {
            type: 'character',
            severity: 'major',
            description: 'Test',
            suggestion: 'Fix it',
            conflictingElements: []
          }
        ]
      };
      
      const result = validateConsistencyIssuesWithFallback(edgeCaseData);
      
      expect(result.success).toBe(true);
    });
  });

  describe('Type Guards', () => {
    describe('isConsistencyIssuesResponse', () => {
      it('should return true for valid consistency issues', () => {
        const validData = {
          issues: [
            {
              type: 'character',
              severity: 'major',
              description: 'Test',
              suggestion: 'Fix it'
            }
          ]
        };
        
        expect(isConsistencyIssuesResponse(validData)).toBe(true);
      });

      it('should return false for invalid consistency issues', () => {
        const invalidData = {
          issues: [
            {
              type: 'invalid_type',
              severity: 'major'
            }
          ]
        };
        
        expect(isConsistencyIssuesResponse(invalidData)).toBe(false);
      });

      it('should return false for non-object input', () => {
        expect(isConsistencyIssuesResponse(null)).toBe(false);
        expect(isConsistencyIssuesResponse(undefined)).toBe(false);
        expect(isConsistencyIssuesResponse('string')).toBe(false);
      });
    });

    describe('isTrackerUpdates', () => {
      it('should return true for valid tracker updates', () => {
        const validData = {
          characterUpdates: [{ name: 'John' }],
          plotPoints: [{ event: 'Test', consequences: [] }],
          timeReferences: [{ reference: 'Now' }],
          newFacts: [],
          worldBuilding: [{ element: 'Test', description: 'Test desc' }]
        };
        
        expect(isTrackerUpdates(validData)).toBe(true);
      });

      it('should return false for invalid tracker updates', () => {
        const invalidData = {
          characterUpdates: [{}], // Missing name
          plotPoints: [],
          timeReferences: [],
          newFacts: [],
          worldBuilding: []
        };
        
        expect(isTrackerUpdates(invalidData)).toBe(false);
      });
    });
  });

  describe('Safe Validators', () => {
    describe('safeConsistencyIssuesValidator', () => {
      it('should successfully validate and return data', () => {
        const validJsonString = '{"issues": []}';
        const result = safeConsistencyIssuesValidator(validJsonString);
        
        expect(result).toEqual({ issues: [] });
      });

      it('should throw error for invalid JSON', () => {
        const invalidJson = '{"issues": [';
        
        expect(() => safeConsistencyIssuesValidator(invalidJson)).toThrow();
      });

      it('should throw error for invalid data structure', () => {
        const invalidStructure = '{"invalid": "structure"}';
        
        expect(() => safeConsistencyIssuesValidator(invalidStructure)).toThrow();
      });
    });

    describe('safeTrackerUpdatesValidator', () => {
      it('should successfully validate and return data', () => {
        const validJsonString = JSON.stringify({
          characterUpdates: [],
          plotPoints: [],
          timeReferences: [],
          newFacts: [],
          worldBuilding: []
        });
        
        const result = safeTrackerUpdatesValidator(validJsonString);
        
        expect(result.characterUpdates).toEqual([]);
        expect(result.plotPoints).toEqual([]);
      });

      it('should throw error for invalid structure', () => {
        const invalidStructure = '{"invalid": "structure"}';
        
        expect(() => safeTrackerUpdatesValidator(invalidStructure)).toThrow();
      });
    });
  });

  describe('Logging and Error Handling', () => {
    describe('logValidationError', () => {
      it('should log error details without throwing', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        
        const validationResult = {
          success: false,
          error: 'Test error',
          issues: [
            { path: 'test.field', message: 'Test message' }
          ]
        };
        
        logValidationError('Test Context', 'original text', validationResult);
        
        expect(consoleSpy).toHaveBeenCalledWith('🔍 Test Context - Validation failed');
        expect(consoleSpy).toHaveBeenCalledWith('❌ Error: Test error');
        
        consoleSpy.mockRestore();
      });
    });

    describe('createSafeValidator', () => {
      it('should create a validator that throws on validation failure', () => {
        const mockValidator = jest.fn<(data: unknown) => any>().mockReturnValue({
          success: false,
          error: 'Validation failed'
        });
        
        const safeValidator = createSafeValidator(mockValidator, 'Test Context');
        
        expect(() => safeValidator('test')).toThrow('Validation failed');
      });

      it('should create a validator that returns data on success', () => {
        const mockValidator = jest.fn<(data: unknown) => any>().mockReturnValue({
          success: true,
          data: { test: 'value' }
        });
        
        const safeValidator = createSafeValidator(mockValidator, 'Test Context');
        
        expect(safeValidator('{"test": "value"}')).toEqual({ test: 'value' });
      });
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle extremely long JSON strings', () => {
      const longString = '{"data": "' + 'x'.repeat(10000) + '"}';
      const result = safeJsonParse(longString);
      
      expect(result.success).toBe(true);
      expect(result.data.data).toHaveLength(10000);
    });

    it('should handle nested JSON objects', () => {
      const nestedJson = {
        issues: [
          {
            type: 'character',
            severity: 'major',
            description: 'Test',
            suggestion: 'Fix it',
            conflictingElements: ['elem1', 'elem2']
          }
        ]
      };
      
      const result = validateConsistencyIssues(nestedJson);
      
      expect(result.success).toBe(true);
      expect(result.data?.issues[0].conflictingElements).toEqual(['elem1', 'elem2']);
    });

    it('should handle empty strings and null values', () => {
      expect(safeJsonParse('').success).toBe(false);
      expect(safeJsonParse('null').success).toBe(true);
      expect(safeJsonParse('null').data).toBe(null);
    });
  });
}); 