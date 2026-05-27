import { DrizzleQueryError, DrizzleError } from "drizzle-orm";
import { DatabaseError } from "pg-protocol";

export enum PostgresErrorCode {
  UNIQUE_VIOLATION = "23505",
  FOREIGN_KEY_VIOLATION = "23503",
  NOT_NULL_VIOLATION = "23502",
  CHECK_VIOLATION = "23514",
  INVALID_TEXT_REPRESENTATION = "22P02",
  UNDEFINED_COLUMN = "42703",
  SYNTAX_ERROR = "42601",
  INVALID_TRANSACTION_STATE = "25000",
  CONNECTION_FAILURE = "08006",
  SERIALIZATION_FAILURE = "40001",
  TABLE_NOT_FOUND = "42P01",
}

interface DbErrorResult {
  code: string | null;
  message: string;
  constraint: string | null;
  table: string | null;
}

const PostgresErrorHandlers: Record<string, (error: DatabaseError) => string> =
  {
    [PostgresErrorCode.UNIQUE_VIOLATION]: (error) =>
      `A record with this ${error.constraint || "value"} already exists`,
    [PostgresErrorCode.FOREIGN_KEY_VIOLATION]: (error) =>
      `The ${error.constraint || "reference"} you are trying to link does not exist`,
    [PostgresErrorCode.NOT_NULL_VIOLATION]: (error) =>
      `A required field is missing: ${error.column || "field"} cannot be null`,
    [PostgresErrorCode.CHECK_VIOLATION]: (error) =>
      `A check constraint was violated: ${error.constraint || "constraint"}`,
    [PostgresErrorCode.INVALID_TEXT_REPRESENTATION]: () =>
      "Invalid data format provided",
    [PostgresErrorCode.UNDEFINED_COLUMN]: (error) =>
      `Invalid column: ${error.column || "column"} does not exist`,
    [PostgresErrorCode.SYNTAX_ERROR]: () => "Database query syntax error",
    [PostgresErrorCode.INVALID_TRANSACTION_STATE]: () =>
      "Transaction failed: please retry",
    [PostgresErrorCode.CONNECTION_FAILURE]: () => "Database connection failed",
    [PostgresErrorCode.SERIALIZATION_FAILURE]: () =>
      "Transaction conflict: please retry",
    [PostgresErrorCode.TABLE_NOT_FOUND]: () =>
      "Invalid operation: table not found",
  };

export function parseDatabaseError(error: unknown): DbErrorResult {
  if (
    error instanceof DrizzleQueryError &&
    error.cause instanceof DatabaseError
  ) {
    const cause = error.cause;
    const code = cause.code || null;
    const handler = code ? PostgresErrorHandlers[code] : null;

    return {
      code,
      message: handler ? handler(cause) : cause.message,
      constraint: cause.constraint || null,
      table: cause.table || null,
    };
  }

  if (error instanceof DrizzleError || error instanceof Error) {
    return {
      code: null,
      message: error.message,
      constraint: null,
      table: null,
    };
  }

  return {
    code: null,
    message: "An unknown error occurred",
    constraint: null,
    table: null,
  };
}

export function isUniqueConstraintError(error: unknown): boolean {
  if (
    error instanceof DrizzleQueryError &&
    error.cause instanceof DatabaseError
  ) {
    return error.cause.code === PostgresErrorCode.UNIQUE_VIOLATION;
  }
  return false;
}

export function isForeignKeyViolation(error: unknown): boolean {
  if (
    error instanceof DrizzleQueryError &&
    error.cause instanceof DatabaseError
  ) {
    return error.cause.code === PostgresErrorCode.FOREIGN_KEY_VIOLATION;
  }
  return false;
}
