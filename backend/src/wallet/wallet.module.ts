import { Module, forwardRef } from "@nestjs/common";
import { SquadModule } from "../squad/squad.module";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";

@Module({
  imports: [forwardRef(() => SquadModule)],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
