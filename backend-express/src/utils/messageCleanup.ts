import { lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { messages } from "../db/schema.js";

/** Deletes all chat messages whose 3-day retention window has expired. */
async function runCleanup() {
  try {
    const result = await db.delete(messages).where(lt(messages.expiresAt, new Date()));
    console.log(`[message-cleanup] deleted ${(result as { rowCount?: number }).rowCount ?? 0} expired messages`);
  } catch (err) {
    console.error("[message-cleanup] error:", err);
  }
}

/** Starts an hourly cleanup job. Returns a handle that can be used to stop it. */
export function startMessageCleanupJob(): ReturnType<typeof setInterval> {
  // Run once immediately on startup, then every hour.
  void runCleanup();
  return setInterval(() => { void runCleanup(); }, 60 * 60 * 1000);
}
