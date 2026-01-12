import { z } from 'zod';

export const birthInputSchema = z.object({
  date: z.string().min(10),
  time: z.string().optional(),
  gender: z.string().optional(),
  timezone: z.string().default('Asia/Bangkok'),
  locationName: z.string().optional(),
  calendar: z.enum(['solar', 'lunar']).optional(),
});

export type BirthInput = z.infer<typeof birthInputSchema>;

export const createSubmissionSchema = z.object({
  birthInput: birthInputSchema,
});

export const createCorrectionSchema = z.object({
  type: z.enum(['FACT', 'LOGIC', 'STYLE', 'MISSING', 'OTHER']),
  severity: z.number().int().min(1).max(5),
  correctedText: z.string().min(1),
  notes: z.string().optional(),
  span: z.record(z.any()).optional(),
  originalExcerpt: z.string().optional(),
});

export const createPromptVersionSchema = z.object({
  name: z.string().min(1),
  systemPrompt: z.string().min(1),
  rubric: z.record(z.any()).optional(),
  temperature: z.number().optional(),
  maxOutputTokens: z.number().int().optional(),
  notes: z.string().optional(),
});
