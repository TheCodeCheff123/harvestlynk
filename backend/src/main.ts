import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import "dotenv/config";
import { AppModule } from "./app.module";

declare global {
  interface BigInt {
    toJSON(): number;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.enableCors({
    origin: ["https://harvestlynk.vercel.app", "http://localhost:3000"],
    credentials: true,
  });

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle("FarmApp API")
    .setDescription(
      "The FarmApp Authentication and Marketplace API description",
    )
    .setVersion("1.0")
    .addBearerAuth() // This adds the "Authorize" button for JWTs
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document); // Access at http://localhost:3000/api/docs
  BigInt.prototype.toJSON = function () {
    return Number(this);
  };
  // src/main.ts
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  app.enableCors();
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
