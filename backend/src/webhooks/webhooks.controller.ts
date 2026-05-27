import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  InternalServerErrorException,
  Logger,
  Post,
} from "@nestjs/common";
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import * as crypto from "crypto";
import { prisma } from "src/db";
import { env } from "src/env";
import { OrderService } from "../order/order.service";
import { WalletService } from "../wallet/wallet.service";
import {
  SquadWebhookRequestDto2,
  SquadWebhookRequestSchema,
  SquadWebhookResponseDto,
  SquadWebhookResponseSchema,
} from "./webhooks.dto";

@ApiTags("Webhooks")
@Controller("webhooks")
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly orderService: OrderService,
  ) {}

  @Post("squad")
  @HttpCode(200)
  @ApiOperation({
    summary: "Handle Squad payment webhook with signature verification",
  })
  @ApiBody({
    type: SquadWebhookRequestDto2,
    description: "Squad webhook payload",
  })
  @ApiHeader({
    name: "x-squad-signature",
    description: "Squad webhook HMAC-SHA512 signature for verification",
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: "Webhook processed successfully",
    type: SquadWebhookResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid signature or malformed payload",
  })
  @ApiResponse({
    status: 500,
    description: "Error processing webhook",
  })
  async handleSquadWebhook(
    @Body() body: unknown,
    @Headers("x-squad-signature") signature: string,
  ) {
    // 1. SIGNATURE VERIFICATION
    const secret = env.SQUAD_SECRET_KEY;

    if (!signature) {
      this.logger.error("Missing x-squad-signature header");
      throw new BadRequestException("No signature provided");
    }

    const hash = crypto
      .createHmac("sha512", secret)
      .update(JSON.stringify(body))
      .digest("hex");

    if (hash.toLowerCase() !== signature.toLowerCase()) {
      this.logger.error("Invalid Webhook Signature");
      throw new BadRequestException("Invalid signature");
    }

    const payload = SquadWebhookRequestSchema.parse(body);
    const { event, data } = payload;
    const trackingRef =
      data.transaction_ref || data.transaction_reference || "UNKNOWN";

    this.logger.log(
      `Received Squad Webhook: [${event}] for Ref: ${trackingRef}`,
    );

    try {
      // 2. EVENT ROUTING LOGIC FILTER
      switch (event) {
        /**
         * CASE A: INBOUND COLLECTION SUCCESSFUL (Buyer Paid into Escrow)
         */
        case "charge.success": {
          if (!data.customer_id || !data.transaction_ref) {
            throw new BadRequestException(
              "Incomplete data payload for charge.success event",
            );
          }

          // 3. Process the escrow credit
          await this.walletService.addPendingFunds(
            data.customer_id,
            data.amount,
            data.transaction_ref,
          );

          // 4. Update the marketplace order status if an order_id exists
          const orderId = data.meta_data?.order_id;
          if (orderId) {
            this.logger.log(
              `Found order_id ${orderId} in webhook metadata. Updating order status to processing...`,
            );
            await this.orderService.markAsPaid(orderId);
          } else {
            this.logger.warn(
              `Payment received (Ref: ${data.transaction_ref}), but no order_id was found in payload meta_data.`,
            );
          }
          break;
        }

        /**
         * CASE B: OUTBOUND PAYOUT SUCCESSFUL (Farmer's Withdrawal Cleared by Bank Switch)
         */
        case "payout.success": // Matches Squad's official outbound payout event string
        case "transfer.success": {
          const referenceId =
            data.transaction_reference || data.transaction_ref;
          if (!referenceId)
            throw new BadRequestException("Missing payout tracking reference");

          // Find the locally recorded ledger entry by the tracking reference string
          const transaction = await prisma.transaction.findFirst({
            where: { reference_id: referenceId },
          });

          if (!transaction) {
            this.logger.warn(
              `Payout webhook success received for unmapped reference: ${referenceId}`,
            );
            return SquadWebhookResponseSchema.decode({
              status: "ignored",
              message: "Transaction tracking mapping missing",
            });
          }

          // Complete the ledger audit record
          await this.walletService.completeWithdrawal(
            transaction.transaction_id,
          );
          this.logger.log(
            `Withdrawal transaction ${transaction.transaction_id} successfully marked as completed.`,
          );
          break;
        }

        /**
         * CASE C: OUTBOUND PAYOUT FAILED (Wrong account credentials / Bank network drops)
         */
        case "payout.failed":
        case "transfer.failed": {
          const referenceId =
            data.transaction_reference || data.transaction_ref;
          if (!referenceId)
            throw new BadRequestException("Missing payout tracking reference");

          const transaction = await prisma.transaction.findFirst({
            where: { reference_id: referenceId },
          });

          if (!transaction) {
            this.logger.warn(
              `Payout webhook failure received for unmapped reference: ${referenceId}`,
            );
            return SquadWebhookResponseSchema.decode({
              status: "ignored",
              message: "Transaction tracking mapping missing",
            });
          }

          // Guard: Avoid double processing if webhook triggers a retry
          if (transaction.status === "pending") {
            this.logger.warn(
              `Payout failed for reference: ${referenceId}. Reason: ${data.gateway_response || "Unknown"}. Executing wallet refund...`,
            );

            // Convert BigInt amount parameter back into an integer number safely for execution
            await this.walletService.reverseWithdrawal(
              transaction.user_id,
              Number(transaction.amount),
              transaction.transaction_id,
              `Squad transfer rejection: ${data.gateway_response || "Clearing network fault"}`,
            );

            this.logger.log(
              `Successfully reversed ${transaction.amount} Kobo back to user: ${transaction.user_id}`,
            );
          }
          break;
        }

        /**
         * DEFAULT SAFETY BALANCER
         */
        default:
          this.logger.log(
            `Event type [${event}] not explicitly processed by this pipeline.`,
          );
          return SquadWebhookResponseSchema.decode({
            status: "ignored",
            message: "Event type not handled",
          });
      }

      return SquadWebhookResponseSchema.decode({ status: "success" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Webhook processing failed: ${message}`);
      throw new InternalServerErrorException(
        `Error processing payment notification: ${message}`,
      );
    }
  }
}
