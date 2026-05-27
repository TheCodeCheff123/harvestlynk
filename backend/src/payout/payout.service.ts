import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { SquadService } from "../squad/squad.service";
import { WalletService } from "../wallet/wallet.service";

interface WithdrawalDto {
  amount: number;
  bank_code: string;
  bank_name: string;
  account_number: string;
  remark: string;
  transaction_reference?: string;
}

@Injectable()
export class PayoutService {
  constructor(
    private walletService: WalletService,
    private squadService: SquadService,
  ) {}

  /**
   * Process a withdrawal request with automatic reversal on failure
   * Performs three-step process: debit wallet -> call Squad API -> reverse on error
   * @param userId - The unique identifier of the user initiating withdrawal
   * @param dto - Withdrawal details including amount, bank info, and reference
   * @returns Confirmation message on successful initiation
   * @throws InternalServerErrorException if Squad API call fails
   */
  async processWithdrawal(userId: string, dto: WithdrawalDto) {
    const { transaction } = await this.walletService.initiateWithdrawal(
      userId,
      dto.amount,
      dto,
    );

    const squadResponse = await this.squadService.transferToBank({
      ...dto,
      transaction_reference: transaction.transaction_id,
    });

    if (!squadResponse.success) {
      await this.walletService.reverseWithdrawal(
        userId,
        dto.amount,
        transaction.transaction_id,
        squadResponse.message,
      );
      throw new InternalServerErrorException(squadResponse.message);
    }

    return { message: "Withdrawal initiated successfully" };
  }
}
