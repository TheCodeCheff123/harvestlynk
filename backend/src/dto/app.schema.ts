import { z } from "zod";
import { createZodDto } from "nestjs-zod";

export const HelloResponseSchema = z.string();

export type HelloResponse = z.infer<typeof HelloResponseSchema>;
