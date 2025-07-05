import { z } from 'zod';

export const ResearchTopicSchema = z.object({
  topic: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  scope: z.enum(['broad', 'specific']),
  context: z.string(),
});

export const ResearchResultSchema = z.object({
  topic: z.string(),
  facts: z.array(z.string()),
  sources: z.array(z.string()),
  keyDetails: z.record(z.string(), z.string()),
  contradictions: z.array(z.string()),
  uncertainties: z.array(z.string()),
});

export const ResearchTopicsSchema = z.object({
  domain: z.array(ResearchTopicSchema),
  characters: z.array(ResearchTopicSchema),
  settings: z.array(ResearchTopicSchema),
  technical: z.array(ResearchTopicSchema),
  cultural: z.array(ResearchTopicSchema),
});

export const ComprehensiveResearchSchema = z.object({
  domainKnowledge: z.array(ResearchResultSchema),
  characterBackgrounds: z.array(ResearchResultSchema),
  settingDetails: z.array(ResearchResultSchema),
  technicalAspects: z.array(ResearchResultSchema),
  culturalContext: z.array(ResearchResultSchema),
});

export type ResearchTopic = z.infer<typeof ResearchTopicSchema>;
export type ResearchResult = z.infer<typeof ResearchResultSchema>;
export type ResearchTopics = z.infer<typeof ResearchTopicsSchema>;
export type ComprehensiveResearch = z.infer<typeof ComprehensiveResearchSchema>; 