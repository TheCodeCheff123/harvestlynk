import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { AuthModule } from "@thallesp/nestjs-better-auth";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import { AppService } from "./app.service";
import { auth } from "./auth/auth";
import { MarketplaceModule } from "./marketplace/marketplace.module";
import { OrderModule } from "./order/order.module";
import { PayoutModule } from "./payout/payout.module";
import { SquadModule } from "./squad/squad.module";
import { UsersModule } from "./users/users.module";
import { WalletController } from "./wallet/wallet.controller";
import { WalletModule } from "./wallet/wallet.module";
import { WalletService } from "./wallet/wallet.service";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { AllExceptionsFilter } from "./filters/http-exception.filter";

@Module({
  imports: [
    AuthModule.forRoot({
      auth,
      bodyParser: {
        json: { limit: "2mb" },
        urlencoded: { limit: "2mb", extended: true },
        rawBody: true,
      },
    }),
    MarketplaceModule,
    WalletModule,
    UsersModule,
    OrderModule,
    WebhooksModule,
    SquadModule,
    PayoutModule,
  ],
  controllers: [WalletController],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    AppService,
    WalletService,
  ],
})
export class AppModule {}
