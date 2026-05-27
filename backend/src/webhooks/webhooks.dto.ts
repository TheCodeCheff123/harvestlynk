import { z } from "zod";
import { createZodDto } from "nestjs-zod";

export const SquadWebhookRequestSchema = z.object({
  event: z.string(),
  data: z.object({
    customer_id: z.string().optional(),
    amount: z.number(),
    transaction_ref: z.string().optional(),
    transaction_reference: z.string().optional(),
    gateway_response: z.string().optional(),
    meta_data: z
      .object({
        order_id: z.string().optional(),
      })
      .optional(),
  }),
});

export type SquadWebhookRequest = z.infer<typeof SquadWebhookRequestSchema>;
export class SquadWebhookRequestDto2 extends createZodDto(
  SquadWebhookRequestSchema,
) {}

export const SquadWebhookResponseSchema = z.object({
  status: z.string(),
  message: z.string().optional(),
});

export type SquadWebhookResponse = z.infer<typeof SquadWebhookResponseSchema>;
export class SquadWebhookResponseDto extends createZodDto(
  SquadWebhookResponseSchema,
) {}
