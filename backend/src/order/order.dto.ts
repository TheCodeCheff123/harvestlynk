import { OrderStatus } from "generated/prisma";
import { createZodDto } from "nestjs-zod";
import { OrderSchema } from "src/db/schemas/models";
import { dateSchema } from "src/utils/date-schema";
import { z } from "zod";

// ─── Farmer Orders List ───────────────────────────────────────────────────────

export const FarmerOrderItemSchema = z.object({
  order_id: z.string(),
  buyer_id: z.string(),
  quantity: z.string(),
  unit_price: z.number(),
  total_amount: z.number(),
  delivery_method: z.string(),
  delivery_address: z.string().nullish(),
  status: z.nativeEnum(OrderStatus),
  completed_at: dateSchema.nullish(),
  created_at: dateSchema,
  updated_at: dateSchema,
  listing: z.object({ product_name: z.string(), unit: z.string() }),
  buyer: z.object({ name: z.string() }),
});

export const FarmerOrdersResponseSchema = z.array(FarmerOrderItemSchema);
export type FarmerOrdersResponse = z.infer<typeof FarmerOrdersResponseSchema>;
export class FarmerOrdersResponseDto extends createZodDto(
  FarmerOrdersResponseSchema,
) {}

// ─── Create Order ─────────────────────────────────────────────────────────────

export const CreateOrderRequestSchema = z.object({
  listing_id: z.string().uuid(),
  quantity: z.number().positive(),
  delivery_method: z.enum(["pickup", "delivery"]),
  delivery_address: z.string().optional().nullable(),
  special_instructions: z.string().optional().nullable(),
});

export type CreateOrderRequest = z.infer<typeof CreateOrderRequestSchema>;
export class CreateOrderRequestDto extends createZodDto(
  CreateOrderRequestSchema,
) {}

// ─── Buyer Orders List ────────────────────────────────────────────────────────

export const BuyerOrderItemSchema = z.object({
  order_id: z.string(),
  farmer_id: z.string(),
  quantity: z.string(),
  unit_price: z.number(),
  total_amount: z.number(),
  delivery_method: z.string(),
  delivery_address: z.string().nullish(),
  special_instructions: z.string().nullish(),
  status: z.nativeEnum(OrderStatus),
  completed_at: dateSchema.nullish(),
  created_at: dateSchema,
  updated_at: dateSchema,
  listing: z.object({ product_name: z.string(), unit: z.string() }),
  farmer: z.object({ name: z.string(), farmName: z.string().nullish() }),
});

export const BuyerOrdersResponseSchema = z.array(BuyerOrderItemSchema);
export type BuyerOrdersResponse = z.infer<typeof BuyerOrdersResponseSchema>;
export class BuyerOrdersResponseDto extends createZodDto(
  BuyerOrdersResponseSchema,
) {}

// ─── Confirm Delivery ─────────────────────────────────────────────────────────

export const ConfirmDeliveryResponseSchema = z.object({
  message: z.string(),
  order: OrderSchema.extend({
    quantity: z.any(), // Handle Decimal from Prisma
    completed_at: dateSchema.nullish(),
    created_at: dateSchema,
    updated_at: dateSchema,
  }),
});

export type ConfirmDeliveryResponse = z.infer<
  typeof ConfirmDeliveryResponseSchema
>;
export class ConfirmDeliveryResponseDto extends createZodDto(
  ConfirmDeliveryResponseSchema,
) {}
