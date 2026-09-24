import { z } from 'zod';

export const statusFormatSchema = z.enum(['summary']).default('summary');

export const statusQuerySchema = z.object({ format: statusFormatSchema }).strict();

export type StatusQuery = z.infer<typeof statusQuerySchema>;

export const statusQuerySwaggerSchema = z.toJSONSchema(statusFormatSchema, {
  target: 'openapi-3.0',
});
