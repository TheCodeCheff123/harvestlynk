import {
  formatError,
  type $ZodError,
  type $ZodFormattedError,
} from "zod/v4/core";

export interface ZodValidationError {
  message: string;
  path: string;
  code: string;
}

export function parseZodError<T>(error: $ZodError<T>): ZodValidationError[] {
  const formatted = formatError(error);

  const errors: ZodValidationError[] = [];

  function traverse(node: $ZodFormattedError<unknown>, path: string): void {
    if (node._errors && node._errors.length > 0) {
      for (const msg of node._errors) {
        errors.push({
          message: msg,
          path,
          code: "invalid",
        });
      }
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === "_errors") continue;
      if (value && typeof value === "object" && "_errors" in value) {
        const newPath = path ? `${path}.${key}` : key;
        traverse(value as $ZodFormattedError<unknown>, newPath);
      }
    }
  }

  traverse(formatted, "");
  return errors;
}

export function formatZodErrors<T>(
  error: $ZodError<T>,
): Record<string, string[]> {
  const parsed = parseZodError(error);
  const formatted: Record<string, string[]> = {};

  for (const err of parsed) {
    if (!formatted[err.path]) {
      formatted[err.path] = [];
    }
    formatted[err.path]!.push(err.message);
  }

  return formatted;
}

export function getFirstZodErrorMessage<T>(error: $ZodError<T>): string {
  const errors = parseZodError(error);
  return errors[0]?.message || "Validation failed";
}

export function getZodErrorMessage(error: $ZodError<unknown>): string {
  const errors = parseZodError(error);
  if (errors.length === 1) {
    return errors[0]?.message || "Validation failed";
  }

  return `${errors.length} validation errors`;
}
