import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { WalletService } from "../wallet/wallet.service";
import {
  SquadWebhookRequestDto,
  SquadWebhookRequestSchema,
  SquadWebhookResponseDto,
  SquadWebhookResponseSchema,
} from "./squad-webhook.dto";

@ApiTags("Webhooks")
@Controller("squad-webhook")
export class SquadWebhookController {
  private readonly logger = new Logger(SquadWebhookController.name);

  constructor(private readonly walletService: WalletService) {}

  @Post()
  @HttpCode(HttpStatus.OK) // Squad expects a 200 OK response to confirm receipt
  @ApiOperation({ summary: "Handle Squad transfer webhook" })
  @ApiBody({
    type: SquadWebhookRequestDto,
    description: "Squad webhook payload",
  })
  @ApiResponse({
    status: 200,
    description: "Webhook received successfully",
    type: SquadWebhookResponseDto,
  })
  async handleSquadWebhook(@Body() body: unknown) {
    const payload = SquadWebhookRequestSchema.parse(body);
    // Always respond 200 to acknowledge receipt; process in background safely
    try {
      const event = payload.event;
      const data = payload.data;

      // Only process known transfer events
      if (
        typeof event === "string" &&
        (event === "transfer.success" || event === "transfer.failed")
      ) {
        try {
          await this.walletService.finalizeWithdrawal(event, data);
        } catch (err) {
          this.logger.error("Error processing Squad webhook", err);
        }
      }
    } catch (err) {
      this.logger.error("Malformed Squad webhook payload", err);
    }

    // Always respond with a 200 OK to prevent Squad from retrying the event
    return SquadWebhookResponseSchema.decode({ received: true });
  }
}
