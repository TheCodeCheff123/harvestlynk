import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { TransactionStatus, TransactionType } from "generated/prisma";
import { prisma } from "src/db";
import { SquadService, SquadTransferPayload } from "../squad/squad.service";

interface WithdrawalBankDetails {
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name?: string;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private readonly squadService: SquadService, // Injected SquadService
  ) {}

  /**
   * Initialize a wallet for a new user
   */
  createWallet(userId: string) {
    return prisma.wallet.create({
      data: {
        user_id: userId,
        available_balance: BigInt(0),
        pending_balance: BigInt(0),
        total_paid_in: BigInt(0),
        total_paid_out: 0,
      },
    });
  }

  /**
   * Add incoming payment to pending balance (escrow)
   * Triggered by Squad webhook for received payments
   * Includes idempotency check to prevent duplicate credits
   * @param userId - The user receiving the payment
   * @param amount - Payment amount in the smallest currency unit (Kobo)
   * @param referenceId - Unique payment reference for idempotency
   * @returns Updated wallet state
   */
  addPendingFunds(userId: string, amount: number, referenceId: string) {
    const amountBigInt: bigint = BigInt(amount);

    return prisma.$transaction(async (tx) => {
      // --- IDEMPOTENCY CHECK ---
      const existingTx = await tx.transaction.findFirst({
        where: { reference_id: referenceId },
      });

      if (existingTx) {
        return tx.wallet.findUnique({ where: { user_id: userId } });
      }

      // 1. Fetch current state
      const walletBefore = await tx.wallet.findUnique({
        where: { user_id: userId },
      });
      if (!walletBefore)
        throw new InternalServerErrorException("Wallet not found");

      // 2. Update Wallet
      const walletAfter = await tx.wallet.update({
        where: { user_id: userId },
        data: {
          pending_balance: { increment: amountBigInt },
          total_paid_in: { increment: amountBigInt },
          updated_at: new Date(),
        },
      });

      // 3. Create Transaction Log
      await tx.transaction.create({
        data: {
          wallet_id: walletAfter.wallet_id,
          user_id: userId,
          amount: amountBigInt,
          type: TransactionType.credit,
          status: TransactionStatus.completed,
          balance_before: walletBefore.pending_balance,
          balance_after: walletAfter.pending_balance,
          reference_id: referenceId,
          description: "Payment received into escrow",
        },
      });

      return walletAfter;
    });
  }

  /**
   * Fetch user's wallet information
   * @param userId - The unique identifier of the user
   * @returns Wallet details including balances
   */
  getWallet(userId: string) {
    return prisma.wallet.findUnique({
      where: { user_id: userId },
    });
  }

  /**
   * Retrieve transaction history for a user
   * @param userId - The unique identifier of the user
   * @returns List of transactions ordered by most recent first
   */
  getTransactionHistory(userId: string) {
    return prisma.transaction.findMany({
      where: { user_id: userId },
      orderBy: { created_at: "desc" },
    });
  }

  /**
   * Release escrowed funds to available balance after order completion
   * Splits total amount into net amount and commission deducted atomically
   * @param userId - The user whose funds to release
   * @param totalOrderAmount - Total order amount including commission
   * @param orderId - The order identifier for commission calculation
   * @returns Updated wallet state with released funds
   */
  async releaseEscrowFunds(
    userId: string,
    totalOrderAmount: number,
    orderId: string,
  ) {
    const totalBigInt = BigInt(totalOrderAmount);

    return await prisma.$transaction(async (tx) => {
      // 1. Get Wallet and Payout details
      const walletBefore = await tx.wallet.findUnique({
        where: { user_id: userId },
      });

      const payoutInfo = await tx.payout.findFirst({
        where: { order_id: orderId },
      });

      if (!walletBefore || !payoutInfo) {
        throw new InternalServerErrorException(
          `Wallet or Payout record missing for Order: ${orderId}`,
        );
      }

      // Idempotency check
      if (payoutInfo.status === "success") {
        throw new BadRequestException(
          "Funds for this order have already been released",
        );
      }

      // 2. Calculate the commission split
      const rate = Number(payoutInfo.commission_rate);
      const commissionBigInt = BigInt(Math.round(totalOrderAmount * rate));
      const netAmountBigInt = totalBigInt - commissionBigInt;

      // 3. Update Wallet: Atomic balance shift
      const walletAfter = await tx.wallet.update({
        where: { user_id: userId },
        data: {
          pending_balance: { decrement: totalBigInt },
          available_balance: { increment: netAmountBigInt },
          updated_at: new Date(),
        },
      });

      // 4. Update the Payout record status
      await tx.payout.update({
        where: { payout_id: payoutInfo.payout_id },
        data: {
          gross_amount: totalOrderAmount,
          commission_amount: Number(commissionBigInt),
          net_amount: Number(netAmountBigInt),
          status: "success",
          processed_at: new Date(),
        },
      });

      // 5. Create Transaction Log for the Farmer
      const uniqueRef = `ESCROW-REL-${orderId.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

      await tx.transaction.create({
        data: {
          wallet_id: walletAfter.wallet_id,
          user_id: userId,
          amount: netAmountBigInt,
          type: TransactionType.credit,
          status: TransactionStatus.completed,
          balance_before: walletBefore.available_balance,
          balance_after: walletAfter.available_balance,
          reference_id: uniqueRef,
          reference_type: "ORDER_COMPLETED",
          description: `Payout for order ${orderId} (Net of platform commission)`,
        },
      });

      return walletAfter;
    });
  }

  /**
   * Initiate a withdrawal request from available balance
   * Immediately debits the balance to prevent double spending
   * Dispatches transfer parameters out to Squad's live payout API
   * @param userId - The user initiating the withdrawal
   * @param amount - Withdrawal amount in smallest currency unit (Kobo)
   * @param bankDetails - Bank account details for transfer
   */
  /**
   * Initiate a withdrawal request from available balance
   * Immediately debits the balance to prevent double spending
   * Dispatches transfer parameters out to Squad's live payout API via transferToBank
   * @param userId - The user initiating the withdrawal
   * @param amount - Withdrawal amount in smallest currency unit (Kobo)
   * @param bankDetails - Bank account details for transfer
   */
  async initiateWithdrawal(
    userId: string,
    amount: number,
    bankDetails: WithdrawalBankDetails,
  ) {
    const amountBigInt = BigInt(amount);

    // Step A: Local DB Ledger updates (Run inside atomic database isolation block)
    const dbResult = await prisma.$transaction(async (tx) => {
      // 1. Check Balance
      const wallet = await tx.wallet.findUnique({
        where: { user_id: userId },
      });

      if (!wallet || wallet.available_balance < amountBigInt) {
        throw new BadRequestException("Insufficient available funds");
      }

      const balanceBefore = wallet.available_balance; //as bigint;
      const balanceAfter: bigint = balanceBefore - amountBigInt;

      // 2. Immediate Debit (Prevent "Double Spend")
      const updatedWallet = await tx.wallet.update({
        where: { user_id: userId },
        data: {
          available_balance: { decrement: amountBigInt },
          updated_at: new Date(),
        },
      });

      // 3. Create a Pending Transaction log
      const transaction = await tx.transaction.create({
        data: {
          wallet_id: updatedWallet.wallet_id,
          user_id: userId,
          amount: amountBigInt,
          type: TransactionType.debit,
          status: TransactionStatus.pending,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          description: `Withdrawal to ${bankDetails.bank_name} (${bankDetails.account_number})`,
          reference_type: "WITHDRAWAL",
        },
      });

      return { updatedWallet, transaction };
    });

    // Step B: Outbound Live Squad Transfer Execution (Executed outside DB Transaction lock)
    try {
      const internalRemark = `Withdrawal of NGN ${(amount / 100).toFixed(2)}`;

      // Generate the tracking identifier required by your SquadTransferPayload interface
      const txReferenceId = `WD-${dbResult.transaction.transaction_id.substring(0, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

      // CORRECTED: Call transferToBank with the accurate payload contract matching your interface
      const squadResponse = await this.squadService.transferToBank({
        amount: amount, // Managed in Kobo integer format
        bank_code: bankDetails.bank_code,
        account_number: bankDetails.account_number,
        remark: internalRemark,
        transaction_reference: txReferenceId,
      });

      // Your SquadService catches errors internally and returns { success: false, message: ... } instead of throwing
      if (squadResponse && squadResponse.success === false) {
        // TODO
        // eslint-disable-next-line no-restricted-syntax
        throw new Error(
          squadResponse.message || "Squad core rejected payout initialization",
        );
      }

      // Update the transaction log with the immutable tracking reference id
      await prisma.transaction.update({
        where: { transaction_id: dbResult.transaction.transaction_id },
        data: {
          reference_id: txReferenceId,
        },
      });
    } catch (error) {
      // Step C: Automated Reversal Guard
      // Safely extract error message and reverse the local debit
      const errMsg = error instanceof Error ? error.message : String(error);

      await this.reverseWithdrawal(
        userId,
        amount,
        dbResult.transaction.transaction_id,
        `Squad API rejection: ${errMsg}`,
      );

      throw new InternalServerErrorException(
        `Transfer initialization failed: ${errMsg}`,
      );
    }

    return dbResult;
  }
  /**
   * Reverse a withdrawal transaction on failure
   * Credits the amount back to available balance and logs the reversal
   * @param userId - The user whose withdrawal is being reversed
   * @param amount - Amount to reverse
   * @param transactionId - Transaction to mark as failed
   * @param reason - Optional reason for the reversal
   * @returns Updated wallet state
   */
  reverseWithdrawal(
    userId: string,
    amount: number,
    transactionId: string,
    reason?: string,
  ) {
    const amountBigInt = BigInt(amount);

    return prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.update({
        where: { user_id: userId },
        data: {
          available_balance: { increment: amountBigInt },
          updated_at: new Date(),
        },
      });

      await tx.transaction.update({
        where: { transaction_id: transactionId },
        data: {
          status: TransactionStatus.failed,
          description: `Reversed failed payout: ${reason ?? "Squad transfer failed"}`,
        },
      });

      return wallet;
    });
  }

  /**
   * Transition transaction record to completed state upon asynchronous webhook success
   */
  completeWithdrawal(transactionId: string) {
    return prisma.transaction.update({
      where: { transaction_id: transactionId },
      data: {
        status: TransactionStatus.completed,
      },
    });
  }
  // Inside src/modules/wallet/wallet.service.ts example logic:
  async processWithdrawal(userId: string, payload: SquadTransferPayload) {
    // Parse incoming amount and use bigint for all ledger operations
    const amountNumber = Number(payload.amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      throw new BadRequestException("Invalid withdrawal amount value provided");
    }

    const amountBigInt: bigint = BigInt(Math.trunc(amountNumber));

    // 1. Fetch the user's active wallet
    const wallet = await prisma.wallet.findUnique({
      where: { user_id: userId },
    });

    if (!wallet) {
      throw new NotFoundException("User wallet record not found");
    }

    // 2. Perform safety verification using bigint types
    if (wallet.available_balance < amountBigInt) {
      throw new BadRequestException(
        "Inaccessible operation: Insufficient wallet balance",
      );
    }

    // 3. Fire the external payload to Squad Service
    const squadResult = await this.squadService.transferToBank(payload);
    if (!squadResult.success) {
      throw new BadRequestException(squadResult.message);
    }

    // 4. Secure isolated database transaction block using bigint arithmetic
    return prisma.$transaction(async (tx) => {
      const updatedWallet = await tx.wallet.update({
        where: { wallet_id: wallet.wallet_id },
        data: {
          available_balance: {
            decrement: amountBigInt,
          },
        },
      });

      const balanceAfter: bigint = updatedWallet.available_balance; //as bigint;
      const balanceBefore: bigint = balanceAfter + amountBigInt;

      const generatedReference = (() => {
        const sr = squadResult; // as unknown as Record<string, unknown>;
        const val = sr["generated_reference"];
        return typeof val === "string" ? val : undefined;
      })();

      return tx.transaction.create({
        data: {
          user_id: userId,
          wallet_id: wallet.wallet_id,
          amount: amountBigInt,
          type: TransactionType.debit,
          status: TransactionStatus.pending,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          reference_id: generatedReference,
        },
      });
    });
  }
  async finalizeWithdrawal(event: string, data: unknown) {
    // eslint-disable-next-line no-restricted-syntax
    const sd = data as Record<string, unknown>;

    const candidates = [
      sd["transaction_reference"],
      sd["reference_id"],
      sd["generated_reference"],
      sd["payment_id"],
      sd["id"],
      // eslint-disable-next-line no-restricted-syntax
    ].filter((v): v is string => typeof v === "string");

    if (candidates.length === 0) {
      this.logger.warn(
        "No transaction reference found in Squad webhook payload",
      );
      return;
    }

    const reference = candidates[0];

    const tx = await prisma.transaction.findFirst({
      where: { reference_id: reference },
    });

    if (!tx) {
      this.logger.warn(
        `No matching transaction found for Squad reference ${reference}`,
      );
      return;
    }

    if (tx.status !== TransactionStatus.pending) {
      this.logger.log(
        `Transaction ${tx.transaction_id} not pending (${tx.status})`,
      );
      return;
    }

    if (event === "transfer.success") {
      await prisma.transaction.update({
        where: { transaction_id: tx.transaction_id },
        data: { status: TransactionStatus.completed },
      });
      this.logger.log(
        `Marked transaction ${tx.transaction_id} as completed (Squad)`,
      );
      return;
    }

    if (event === "transfer.failed") {
      const amt =
        typeof tx.amount === "bigint" ? Number(tx.amount) : Number(tx.amount);
      const reasonVal = sd["message"];
      const reason = typeof reasonVal === "string" ? reasonVal : undefined;
      await this.reverseWithdrawal(tx.user_id, amt, tx.transaction_id, reason);
      this.logger.log(
        `Reversed transaction ${tx.transaction_id} due to Squad failure`,
      );
      return;
    }
  }
}
