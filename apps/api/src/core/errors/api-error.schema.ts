import { z } from 'zod';

export const apiErrorCategorySchema = z.enum([
  'application',
  'validation',
  'service',
  'unexpected',
]);

export const apiErrorDetailSchema = z
  .object({
    field: z.string(),
    code: z.string(),
  })
  .strict();

export const apiErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.string(),
        category: apiErrorCategorySchema,
        message: z.string(),
        details: z.array(apiErrorDetailSchema).max(20).optional(),
      })
      .strict(),
    requestId: z.uuid(),
  })
  .strict();

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export const apiErrorResponseSwaggerSchema = z.toJSONSchema(apiErrorResponseSchema, {
  target: 'openapi-3.0',
});
