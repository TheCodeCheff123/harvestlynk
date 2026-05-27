import { createZodDto } from "nestjs-zod";
import { UserSchema, WalletSchema } from "src/db/schemas/models";
import { dateSchema } from "src/utils/date-schema";
import { z } from "zod";

export const GetUserResponseSchema = UserSchema.extend({
  latitude: z.any(),
  longitude: z.any(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  banExpires: dateSchema.nullish(),
  last_active_at: dateSchema.nullish(),
  wallet: WalletSchema.extend({
    available_balance: z.any(),
    pending_balance: z.any(),
    total_paid_in: z.any(),
    created_at: dateSchema,
    updated_at: dateSchema,
    last_updated: dateSchema,
  }).nullish(),
});

export type GetUserResponse = z.infer<typeof GetUserResponseSchema>;
export class GetUserResponseDto extends createZodDto(GetUserResponseSchema) {}

export const UpdateProfileRequestSchema = z.object({
  fullName: z.string().optional(),
  locationState: z.string().optional(),
  locationLga: z.string().optional(),
  locationVillage: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  preferredLanguage: z.string().optional(),
});

export type UpdateProfileRequest = z.infer<typeof UpdateProfileRequestSchema>;
export class UpdateProfileRequestDto extends createZodDto(
  UpdateProfileRequestSchema,
) {}

export const UpdateProfileResponseSchema = UserSchema.extend({
  latitude: z.any(),
  longitude: z.any(),
  // banExpires, createdat, updatedat, lastactiveat
  banExpires: dateSchema.nullish(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  last_active_at: dateSchema.nullish(),
});

export type UpdateProfileResponse = z.infer<typeof UpdateProfileResponseSchema>;
export class UpdateProfileResponseDto extends createZodDto(
  UpdateProfileResponseSchema,
) {}

export const CompleteOAuthRequestSchema = z.object({
  role: z.enum(["farmer", "buyer"]),
  farmName: z.string().optional(),
  location: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export type CompleteOAuthRequest = z.infer<typeof CompleteOAuthRequestSchema>;
export class CompleteOAuthRequestDto extends createZodDto(CompleteOAuthRequestSchema) {}

export const SignupRequestSchema = z.object({
  role: z.enum(["farmer", "buyer"]),
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  email: z.string().email("Enter a valid email address"),
  farmName: z.string(),
  location: z.string(),
  phoneNumber: z.string(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SignupRequest = z.infer<typeof SignupRequestSchema>;
export class SignupRequestDto extends createZodDto(SignupRequestSchema) {}

export const SignupResponseSchema = GetUserResponseSchema;

export type SignupResponse = z.infer<typeof SignupResponseSchema>;
export class SignupResponseDto extends createZodDto(SignupResponseSchema) {}
