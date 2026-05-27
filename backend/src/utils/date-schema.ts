import { z, ZodPipe, ZodTransform, type ZodISODateTime } from "zod";

export const dateSchema = z.preprocess<
  string,
  ZodPipe<ZodISODateTime, ZodTransform<Date, string>>,
  Date
>(
  (val) => (val instanceof Date ? val.toISOString() : val),
  z.iso.datetime().transform((val) => new Date(val)),
);
