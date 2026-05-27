import { BetterAuthError } from "@better-auth/core/error";
import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ArgumentsHost,
} from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import type { Response } from "express";
import { ZodSerializationException, ZodValidationException } from "nestjs-zod";
import { ZodError } from "zod";
import { parseAuthError } from "./errors/auth.error";
import {
  isForeignKeyViolation,
  isUniqueConstraintError,
  parseDatabaseError,
} from "./errors/database.error";
import { formatZodErrors } from "./errors/zod.error";

@Catch(HttpException)
export class AllExceptionsFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(error: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest();

    if (
      error instanceof ZodSerializationException ||
      error instanceof ZodValidationException
    ) {
      const zodError = error.getZodError();
      if (zodError instanceof ZodError) {
        const status = HttpStatus.BAD_REQUEST;
        const details = formatZodErrors(zodError);

        this.logger.warn("Validation error", null, {
          method: req.method,
          url: req.url,
          details: Object.keys(details),
        });

        res.status(status).json({
          statusCode: status,
          message: "Validation failed",
          error: "ValidationError",
          details,
        });
        return;
      }
    }

    if (error instanceof BetterAuthError) {
      const parsed = parseAuthError(error);
      const status =
        parsed.code === "INVALID_TOKEN" || parsed.code === "SESSION_EXPIRED"
          ? HttpStatus.UNAUTHORIZED
          : HttpStatus.BAD_REQUEST;

      this.logger.warn("Auth error", null, {
        method: req.method,
        url: req.url,
        code: parsed.code,
      });

      res.status(status).json({
        statusCode: status,
        message: parsed.message,
        error: parsed.code,
      });
      return;
    }

    if (error instanceof HttpException) {
      const status = error.getStatus();
      const response = error.getResponse();

      if (status === HttpStatus.UNAUTHORIZED) {
        this.logger.warn("Unauthorized access attempt", null, {
          method: req.method,
          url: req.url,
        });
      }

      if (typeof response === "object" && response !== null) {
        const resp = response as Record<string, unknown>;
        res.status(status).json({
          statusCode: status,
          message: resp.message || error.message,
          error: error.name,
        });
        return;
      }

      res.status(status).json({
        statusCode: status,
        message: error.message,
        error: error.name,
      });
      return;
    }

    const dbError = parseDatabaseError(error);

    if (isUniqueConstraintError(error)) {
      this.logger.warn("Unique constraint violation", null, {
        method: req.method,
        url: req.url,
        constraint: dbError.constraint,
      });

      res.status(HttpStatus.CONFLICT).json({
        statusCode: HttpStatus.CONFLICT,
        message: dbError.message,
        error: "Conflict",
      });
      return;
    }

    if (isForeignKeyViolation(error)) {
      this.logger.warn("Foreign key violation", null, {
        method: req.method,
        url: req.url,
        constraint: dbError.constraint,
      });

      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: dbError.message,
        error: "BadRequest",
      });
      return;
    }

    if (dbError.code) {
      this.logger.warn("Database error", null, {
        method: req.method,
        url: req.url,
        code: dbError.code,
      });

      res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: dbError.message,
        error: "BadRequest",
      });
      return;
    }

    this.logger.error("Unhandled error", error, {
      method: req.method,
      url: req.url,
    });

    super.catch(error, host);
  }
}
