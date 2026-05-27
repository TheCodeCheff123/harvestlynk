import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Session, type UserSession } from "@thallesp/nestjs-better-auth";
import { SquadService } from "../squad/squad.service";
import { WalletService } from "./wallet.service";
import {
  TransactionHistoryResponseDto,
  TransactionHistoryResponseSchema,
  VerifyBankResponseDto,
  VerifyBankResponseSchema,
  WalletBalanceResponseDto,
  WalletBalanceResponseSchema,
  WithdrawRequestDto,
  WithdrawRequestSchema,
  WithdrawResponseDto,
  WithdrawResponseSchema,
} from "./wallet.dto";

@ApiTags("Wallet")
@ApiBearerAuth()
@Controller("wallet")
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly squadService: SquadService,
  ) {}

  /**
   * Fetch current user's wallet balances
   */
  @Get("balance")
  @ApiOperation({ summary: "Get current user wallet balance" })
  @ApiResponse({
    status: 200,
    description: "Balance retrieved successfully",
    type: WalletBalanceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid user session",
  })
  async getBalance(@Session() session: UserSession) {
    const userId = session.user.id;
    if (!userId) {
      throw new BadRequestException(
        "Could not extract user identification from token context.",
      );
    }

    const wallet = await this.walletService.getWallet(userId);

    const result = {
      wallet_id: wallet?.wallet_id,
      user_id: wallet?.user_id,
      available_balance: wallet?.available_balance?.toString() ?? "0",
      pending_balance: wallet?.pending_balance?.toString() ?? "0",
      total_paid_in: wallet?.total_paid_in?.toString() ?? "0",
      created_at: wallet?.created_at,
      updated_at: wallet?.updated_at,
    };

    return WalletBalanceResponseSchema.decode(result);
  }

  /**
   * Fetch current user's transaction audit trail
   */
  @Get("transactions")
  @ApiOperation({ summary: "Get transaction history" })
  @ApiResponse({
    status: 200,
    description: "History retrieved successfully",
    type: TransactionHistoryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid user session",
  })
  async getHistory(@Session() session: UserSession) {
    const userId = session.user.id;
    if (!userId) {
      throw new BadRequestException(
        "Could not extract user identification from token context.",
      );
    }

    const transactions = await this.walletService.getTransactionHistory(userId);

    const result = transactions.map((tx) => ({
      ...tx,
      amount: tx.amount.toString(),
      balance_before: tx.balance_before.toString(),
      balance_after: tx.balance_after.toString(),
    }));

    return TransactionHistoryResponseSchema.decode(result);
  }

  /**
   * Resolve a bank account number to verify the account holder name
   * GET /wallet/verify-bank?bank_code=058&account_number=0123456789
   */
  @Get("verify-bank")
  @ApiOperation({
    summary: "Resolve a bank account number to verify the account holder name",
  })
  @ApiResponse({
    status: 200,
    description: "Account resolved successfully",
    type: VerifyBankResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: "Could not verify bank account",
  })
  @ApiQuery({
    name: "bank_code",
    type: "string",
    example: "058",
    description: "CBN Bank Code (e.g., 058 for GTB)",
  })
  @ApiQuery({
    name: "account_number",
    type: "string",
    example: "0123456789",
    description: "10-digit NUBAN account number",
  })
  async verifyBank(
    @Query("bank_code") bankCode: string,
    @Query("account_number") accountNumber: string,
  ) {
    const accountData = await this.squadService.verifyAccount(
      bankCode,
      accountNumber,
    );

    const result = {
      success: true,
      message: "Account resolved successfully.",
      data: {
        account_name: accountData.account_name,
      },
    };

    return VerifyBankResponseSchema.decode(result);
  }

  /**
   * Initiate an outbound bank payout from available funds
   */
  @Post("withdraw")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Initiate a bank withdrawal from available balance",
  })
  @ApiResponse({
    status: 200,
    description: "Withdrawal processing initiated",
    type: WithdrawResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Insufficient available ledger funds or invalid request",
  })
  @ApiBody({
    type: WithdrawRequestDto,
    description: "Withdrawal request details",
  })
  async withdraw(@Session() session: UserSession, @Body() body: unknown) {
    const userId = session.user.id;
    if (!userId) {
      throw new BadRequestException(
        "Could not extract user identification from token context.",
      );
    }

    const dto = WithdrawRequestSchema.parse(body);

    const result = await this.walletService.initiateWithdrawal(
      userId,
      dto.amount,
      {
        bank_name: dto.bank_name,
        bank_code: dto.bank_code,
        account_number: dto.account_number,
      },
    );

    const response = {
      success: true,
      message: "Withdrawal successfully initiated via clearing network.",
      transaction_id: result.transaction.transaction_id,
      status: result.transaction.status,
    };

    return WithdrawResponseSchema.decode(response);
  }
}
