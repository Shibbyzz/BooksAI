import { z } from 'zod';

// Zod schemas for validation
const ConsistencyIssueSchema = z.object({
  type: z.enum(['character', 'plot', 'timeline', 'research', 'worldbuilding', 'relationship']),
  severity: z.enum(['critical', 'major', 'minor']),
  description: z.string().min(1),
  suggestion: z.string().min(1),
  conflictingElements: z.array(z.string()).optional().default([]),
  chapters: z.array(z.number()).optional().default([])
});

const ConsistencyIssuesResponseSchema = z.object({
  issues: z.array(ConsistencyIssueSchema)
});

const CharacterUpdateSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional().nullable(),
  physicalState: z.string().optional().nullable(),
  emotionalState: z.string().optional().nullable(),
  knowledgeState: z.string().optional().nullable(),
  relationshipChanges: z.record(z.string()).optional()
});

const PlotPointSchema = z.object({
  event: z.string().min(1),
  consequences: z.array(z.string()),
  affectedCharacters: z.array(z.string()),
  establishedFacts: z.array(z.string())
});

const TimeReferenceSchema = z.object({
  reference: z.string().min(1),
  duration: z.string().optional().nullable(),
  absoluteTime: z.string().optional().nullable()
});

const WorldBuildingElementSchema = z.object({
  element: z.string().min(1),
  description: z.string().min(1)
});

const TrackerUpdatesSchema = z.object({
  characterUpdates: z.array(CharacterUpdateSchema),
  plotPoints: z.array(PlotPointSchema),
  timeReferences: z.array(TimeReferenceSchema),
  newFacts: z.array(z.string()),
  worldBuilding: z.array(WorldBuildingElementSchema)
});

// Type exports
export type ConsistencyIssue = z.infer<typeof ConsistencyIssueSchema>;
export type ConsistencyIssuesResponse = z.infer<typeof ConsistencyIssuesResponseSchema>;
export type CharacterUpdate = z.infer<typeof CharacterUpdateSchema>;
export type PlotPoint = z.infer<typeof PlotPointSchema>;
export type TimeReference = z.infer<typeof TimeReferenceSchema>;
export type WorldBuildingElement = z.infer<typeof WorldBuildingElementSchema>;
export type TrackerUpdates = z.infer<typeof TrackerUpdatesSchema>;

// Validation result type
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  issues?: Array<{ path: string; message: string }>;
}

/**
 * Safe JSON parsing with comprehensive error handling
 */
export function safeJsonParse(text: string): ValidationResult<any> {
  try {
    // Clean up common formatting issues
    let cleanText = text.trim();
    
    // Remove markdown code blocks
    if (cleanText.startsWith('```')) {
      const firstNewline = cleanText.indexOf('\n');
      const lastBackticks = cleanText.lastIndexOf('```');
      if (firstNewline !== -1 && lastBackticks > firstNewline) {
        cleanText = cleanText.substring(firstNewline + 1, lastBackticks).trim();
      }
    }
    
    // Remove any leading/trailing text that's not JSON
    const jsonStart = cleanText.indexOf('{');
    const jsonEnd = cleanText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanText = cleanText.substring(jsonStart, jsonEnd + 1);
    }
    
    const parsed = JSON.parse(cleanText);
    
    return {
      success: true,
      data: parsed
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    };
  }
}

/**
 * Validate consistency issues response using Zod
 */
export function validateConsistencyIssues(data: unknown): ValidationResult<ConsistencyIssuesResponse> {
  try {
    const validated = ConsistencyIssuesResponseSchema.parse(data);
    return {
      success: true,
      data: validated
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed: Invalid consistency issues format',
        issues: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }))
      };
    }
    return {
      success: false,
      error: 'Unknown validation error'
    };
  }
}

/**
 * Validate tracker updates using Zod
 */
export function validateTrackerUpdates(data: unknown): ValidationResult<TrackerUpdates> {
  try {
    const validated = TrackerUpdatesSchema.parse(data);
    return {
      success: true,
      data: validated
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed: Invalid tracker updates format',
        issues: error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }))
      };
    }
    return {
      success: false,
      error: 'Unknown validation error'
    };
  }
}

/**
 * Fallback type guard for ConsistencyIssuesResponse (if Zod fails)
 */
export function isConsistencyIssuesResponse(obj: any): obj is ConsistencyIssuesResponse {
  return obj && 
         Array.isArray(obj.issues) &&
         obj.issues.every((issue: any) => 
           issue.type && 
           issue.severity && 
           issue.description && 
           issue.suggestion &&
           ['character', 'plot', 'timeline', 'research', 'worldbuilding', 'relationship'].includes(issue.type) &&
           ['critical', 'major', 'minor'].includes(issue.severity)
         );
}

/**
 * Fallback type guard for TrackerUpdates (if Zod fails)
 */
export function isTrackerUpdates(obj: any): obj is TrackerUpdates {
  return obj && 
         Array.isArray(obj.characterUpdates) &&
         Array.isArray(obj.plotPoints) &&
         Array.isArray(obj.timeReferences) &&
         Array.isArray(obj.newFacts) &&
         Array.isArray(obj.worldBuilding) &&
         obj.characterUpdates.every((update: any) => update.name) &&
         obj.plotPoints.every((point: any) => point.event && Array.isArray(point.consequences)) &&
         obj.timeReferences.every((ref: any) => ref.reference) &&
         obj.worldBuilding.every((wb: any) => wb.element && wb.description);
}

/**
 * Comprehensive validation with fallback
 */
export function validateWithFallback<T>(
  data: unknown,
  zodValidator: (data: unknown) => ValidationResult<T>,
  typeGuard: (obj: any) => obj is T,
  errorContext: string
): ValidationResult<T> {
  // First try Zod validation
  const zodResult = zodValidator(data);
  if (zodResult.success && zodResult.data) {
    return zodResult;
  }
  
  // Fallback to type guard
  if (typeGuard(data)) {
    return {
      success: true,
      data: data as T
    };
  }
  
  // Both failed
  return {
    success: false,
    error: `${errorContext}: Both Zod validation and type guard failed`,
    issues: zodResult.issues
  };
}

/**
 * Validate consistency issues with fallback
 */
export function validateConsistencyIssuesWithFallback(data: unknown): ValidationResult<ConsistencyIssuesResponse> {
  return validateWithFallback(
    data,
    validateConsistencyIssues,
    isConsistencyIssuesResponse,
    'Consistency issues validation'
  );
}

/**
 * Validate tracker updates with fallback
 */
export function validateTrackerUpdatesWithFallback(data: unknown): ValidationResult<TrackerUpdates> {
  return validateWithFallback(
    data,
    validateTrackerUpdates,
    isTrackerUpdates,
    'Tracker updates validation'
  );
}

/**
 * Log validation errors with detailed information
 */
export function logValidationError(
  context: string,
  originalText: string,
  validationResult: ValidationResult<any>
): void {
  console.error(`🔍 ${context} - Validation failed`);
  console.error(`📝 Original text length: ${originalText.length}`);
  console.error(`❌ Error: ${validationResult.error}`);
  
  if (validationResult.issues && validationResult.issues.length > 0) {
    console.error('🚨 Validation issues:');
    validationResult.issues.forEach((issue, index) => {
      console.error(`  ${index + 1}. ${issue.path}: ${issue.message}`);
    });
  }
  
  // Log a snippet of the original text for debugging
  const snippet = originalText.length > 200 
    ? originalText.substring(0, 200) + '...'
    : originalText;
  console.error(`📄 Text snippet: ${snippet}`);
}

/**
 * Create a safe validation wrapper that logs errors
 */
export function createSafeValidator<T>(
  validator: (data: unknown) => ValidationResult<T>,
  context: string
) {
  return (text: string): T => {
    const parseResult = safeJsonParse(text);
    if (!parseResult.success) {
      const error = `${context} - JSON parsing failed: ${parseResult.error}`;
      console.error(error);
      throw new Error(error);
    }
    
    const validationResult = validator(parseResult.data);
    if (!validationResult.success) {
      logValidationError(context, text, validationResult);
      throw new Error(validationResult.error || `${context} - Validation failed`);
    }
    
    return validationResult.data!;
  };
}

// Pre-built safe validators
export const safeConsistencyIssuesValidator = createSafeValidator(
  validateConsistencyIssuesWithFallback,
  'Consistency Issues Validation'
);

export const safeTrackerUpdatesValidator = createSafeValidator(
  validateTrackerUpdatesWithFallback,
  'Tracker Updates Validation'
); 