import express, { type Express, type ErrorRequestHandler } from "express";
import morgan from "morgan";
import { serve as swaggerServe, setup as swaggerSetup } from "swagger-ui-express";
import { corsMiddleware } from "./middleware/cors.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { swaggerApiKeyGuard } from "./middleware/swaggerAuth.js";
import v1 from "./routes/v1/index.js";
import openapiSpec from "./docs/openapi.js";

const isTest = process.env["NODE_ENV"] === "test";
const app: Express = express();

if (!isTest) {
  app.use(morgan("dev"));
}

app.use(corsMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/docs", swaggerApiKeyGuard, ...swaggerServe, swaggerSetup(openapiSpec));

app.use("/api/v1", v1);

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("[error]", err?.message ?? err);
  if (err?.cause) console.error("[cause]", err.cause);
  if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
};

app.use(errorHandler);

export default app;
