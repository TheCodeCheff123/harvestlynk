import { ListingStatus } from "generated/prisma";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

// ─── Create Listing ───────────────────────────────────────────────────────────

export const CreateListingRequestSchema = z.object({
  product_name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(20),
  price_per_unit: z.number().int().positive(),
  location_state: z.string().min(1).max(50),
  location_lga: z.string().max(50).optional().nullable(),
  pickup_address: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  harvest_date: z.string().optional().nullable(),
  delivery_options: z.array(z.string()).default(["pickup"]),
  images: z.array(z.string().url()).optional().default([]),
  status: z.nativeEnum(ListingStatus).default(ListingStatus.active),
});

export type CreateListingRequest = z.infer<typeof CreateListingRequestSchema>;
export class CreateListingRequestDto extends createZodDto(
  CreateListingRequestSchema,
) {}

// ─── Listing Response ─────────────────────────────────────────────────────────

export const ListingResponseSchema = z.object({
  listing_id: z.string(),
  farmer_id: z.string(),
  product_name: z.string(),
  category: z.string(),
  quantity: z.string(),
  unit: z.string(),
  price_per_unit: z.number(),
  total_price: z.number(),
  location_state: z.string(),
  location_lga: z.string().nullish(),
  pickup_address: z.string().nullish(),
  description: z.string().nullish(),
  status: z.nativeEnum(ListingStatus),
  views: z.number(),
  inquiries: z.number(),
  harvest_date: z.string().nullish(),
  delivery_options: z.unknown().nullish(),
  images: z.unknown().nullish(),
  expires_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type ListingResponse = z.infer<typeof ListingResponseSchema>;
export class ListingResponseDto extends createZodDto(ListingResponseSchema) {}

export const ListingsArrayResponseSchema = z.array(ListingResponseSchema);
export class ListingsArrayResponseDto extends createZodDto(
  ListingsArrayResponseSchema,
) {}

// ─── Public Listing (with farmer info) ────────────────────────────────────────

export const PublicListingResponseSchema = ListingResponseSchema.extend({
  farmer: z.object({
    name: z.string(),
    farmName: z.string().nullish(),
    location_state: z.string().nullish(),
    location_lga: z.string().nullish(),
  }),
});

export type PublicListingResponse = z.infer<typeof PublicListingResponseSchema>;
export class PublicListingResponseDto extends createZodDto(
  PublicListingResponseSchema,
) {}

export const PublicListingsArrayResponseSchema = z.array(
  PublicListingResponseSchema,
);
export class PublicListingsArrayResponseDto extends createZodDto(
  PublicListingsArrayResponseSchema,
) {}
