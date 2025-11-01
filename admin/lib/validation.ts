// ABOUTME: Zod validation schemas for API requests
// ABOUTME: Ensures data integrity and prevents invalid updates

import { z } from 'zod';

export const UpdateNodeSchema = z.object({
  label: z.string().min(1, 'Label is required').max(200, 'Label too long'),
  type: z.string().min(1, 'Type is required'),
  branch: z.string().min(1, 'Branch is required'),
  factoid: z.string().max(1000, 'Factoid too long'),
});

export const UpdateScopeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(1000, 'Description too long'),
});

export const UpdateProcessSchema = z.object({
  label: z.string().min(1, 'Label is required').max(200, 'Label too long'),
  description: z.string().min(1, 'Description is required').max(2000, 'Description too long'),
});

export type UpdateNodeInput = z.infer<typeof UpdateNodeSchema>;
export type UpdateScopeInput = z.infer<typeof UpdateScopeSchema>;
export type UpdateProcessInput = z.infer<typeof UpdateProcessSchema>;
