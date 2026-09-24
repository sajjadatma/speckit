import { Injectable } from '@nestjs/common';
import { z } from 'zod';

export const STATUS_OPERATIONAL = 'operational' as const;

export const statusSuccessSchema = z
  .object({
    data: z
      .object({
        status: z.literal(STATUS_OPERATIONAL),
      })
      .strict(),
  })
  .strict();

export type StatusResponse = z.infer<typeof statusSuccessSchema>;

export const statusSuccessSwaggerSchema = z.toJSONSchema(statusSuccessSchema, {
  target: 'openapi-3.0',
});

@Injectable()
export class StatusService {
  getStatus(): StatusResponse {
    return { data: { status: STATUS_OPERATIONAL } };
  }
}
