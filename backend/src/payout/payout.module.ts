import { Module } from "@nestjs/common";
import { PayoutController } from "./payout.controller";
import { PayoutService } from "./payout.service";
import { SquadModule } from "../squad/squad.module";
import { WalletModule } from "../wallet/wallet.module";

@Module({
  imports: [SquadModule, WalletModule],
  controllers: [PayoutController],
  providers: [PayoutService],
  exports: [PayoutService],
})
export class PayoutModule {}
