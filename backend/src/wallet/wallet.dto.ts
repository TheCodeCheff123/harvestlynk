import { TransactionStatus } from "generated/prisma";
import { createZodDto } from "nestjs-zod";
import { dateSchema } from "src/utils/date-schema";
import { z } from "zod";

export const WalletBalanceResponseSchema = z.object({
  wallet_id: z.string().optional(),
  user_id: z.string().optional(),
  available_balance: z.string(),
  pending_balance: z.string(),
  total_paid_in: z.string(),
  created_at: dateSchema.optional(),
  updated_at: dateSchema.optional(),
});

export type WalletBalanceResponse = z.infer<typeof WalletBalanceResponseSchema>;
export class WalletBalanceResponseDto extends createZodDto(
  WalletBalanceResponseSchema,
) {}

export const TransactionHistoryItemSchema = z.object({
  transaction_id: z.string(),
  wallet_id: z.string(),
  user_id: z.string(),
  type: z.string(),
  amount: z.string(),
  balance_before: z.string(),
  balance_after: z.string(),
  reference_id: z.string().nullish(),
  reference_type: z.string().nullish(),
  description: z.string().nullish(),
  status: z.nativeEnum(TransactionStatus),
  created_at: dateSchema,
});

export const TransactionHistoryResponseSchema = z.array(
  TransactionHistoryItemSchema,
);

export type TransactionHistoryResponse = z.infer<
  typeof TransactionHistoryResponseSchema
>;
export class TransactionHistoryResponseDto extends createZodDto(
  TransactionHistoryResponseSchema,
) {}

export const VerifyBankResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.object({
    account_name: z.string(),
  }),
});

export type VerifyBankResponse = z.infer<typeof VerifyBankResponseSchema>;
export class VerifyBankResponseDto extends createZodDto(
  VerifyBankResponseSchema,
) {}

export const WithdrawRequestSchema = z.object({
  amount: z.number(),
  bank_name: z.string(),
  bank_code: z.string(),
  account_number: z.string(),
});

export type WithdrawRequest = z.infer<typeof WithdrawRequestSchema>;
export class WithdrawRequestDto extends createZodDto(WithdrawRequestSchema) {}

export const WithdrawResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  transaction_id: z.string(),
  status: z.nativeEnum(TransactionStatus),
});

export type WithdrawResponse = z.infer<typeof WithdrawResponseSchema>;
export class WithdrawResponseDto extends createZodDto(WithdrawResponseSchema) {}
