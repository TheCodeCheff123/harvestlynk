import { Module, forwardRef } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { SquadService } from "./squad.service";
import { SquadWebhookController } from "./squad.webhook.controller";

@Module({
  imports: [forwardRef(() => WalletModule)],
  providers: [SquadService],
  exports: [SquadService],
  controllers: [SquadWebhookController],
})
export class SquadModule {}
