import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import type { AuthRequest } from "./auth.js";

const isProduction = process.env["NODE_ENV"] === "production";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => !isProduction,
  message: { error: "Too many requests, please try again later." },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => !isProduction,
  message: { error: "Too many auth attempts, please try again later." },
});

/** 30 messages per minute per user per conversation. */
export const chatMessageLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = (req as AuthRequest).user?.userId;
    const conv = req.params["id"] ?? "";
    if (userId) return `${userId}_${conv}`;
    return `${ipKeyGenerator(req.ip ?? "")}_${conv}`;
  },
  message: { error: "Too many messages. Please slow down." },
});
