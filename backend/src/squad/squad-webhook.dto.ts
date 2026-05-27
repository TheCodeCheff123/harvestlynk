import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export const SquadWebhookRequestSchema = z
  .object({
    event: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export class SquadWebhookRequestDto extends createZodDto(
  SquadWebhookRequestSchema,
) {}

export const SquadWebhookResponseSchema = z.object({
  received: z.literal(true),
});

export type SquadWebhookResponse = z.infer<typeof SquadWebhookResponseSchema>;
export class SquadWebhookResponseDto extends createZodDto(
  SquadWebhookResponseSchema,
) {}
