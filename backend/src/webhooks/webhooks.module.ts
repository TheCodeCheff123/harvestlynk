import { Module } from "@nestjs/common";
import { OrderModule } from "../order/order.module";
import { WalletModule } from "../wallet/wallet.module";
import { WebhookController } from "./webhooks.controller";

@Module({
  imports: [WalletModule, OrderModule],
  controllers: [WebhookController],
})
export class WebhooksModule {}
