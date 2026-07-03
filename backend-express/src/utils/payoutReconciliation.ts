import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { payouts, wallets, transactions, walletLedgerEntries } from "../db/schema.js";

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
const DEFAULT_STALE_MS = 24 * 60 * 60 * 1000;

let poller: ReturnType<typeof setInterval> | null = null;

export async function reconcileStalePayouts() {
  const staleAfterMs = Number(process.env["NOMBA_PAYOUT_RECONCILIATION_STALE_MS"] ?? DEFAULT_STALE_MS);
  const cutoff = new Date(Date.now() - staleAfterMs);

  const stalePayouts = await db
    .select()
    .from(payouts)
    .where(and(inArray(payouts.status, ["pending", "processing"]), lt(payouts.createdAt, cutoff)))
    .limit(50);

  for (const payout of stalePayouts) {
    const [wallet] = await db.select().from(wallets).where(eq(wallets.userId, payout.farmerId)).limit(1);
    if (!wallet) continue;

    const restoredBalance = wallet.availableBalance + payout.netAmount;

    await db.transaction(async (tx) => {
      await tx.update(payouts)
        .set({
          status: "failed",
          failureReason: "Timed out awaiting Nomba settlement",
          settledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payouts.payoutId, payout.payoutId));

      await tx.update(wallets)
        .set({ availableBalance: restoredBalance, updatedAt: new Date() })
        .where(eq(wallets.walletId, wallet.walletId));

      await tx.update(walletLedgerEntries)
        .set({ status: "failed", updatedAt: new Date() })
        .where(eq(walletLedgerEntries.referenceId, payout.payoutId));

      await tx.insert(walletLedgerEntries).values({
        walletId: wallet.walletId,
        userId: payout.farmerId,
        type: "credit",
        amount: payout.netAmount,
        balanceBefore: wallet.availableBalance,
        balanceAfter: restoredBalance,
        referenceId: payout.payoutId,
        referenceType: "payout_refund",
        description: `Reconciliation refund for payout ${payout.payoutId}`,
        status: "completed",
      });

      await tx.update(transactions)
        .set({ status: "failed" })
        .where(eq(transactions.referenceId, payout.payoutId));

      await tx.insert(transactions).values({
        walletId: wallet.walletId,
        userId: payout.farmerId,
        type: "credit",
        amount: payout.netAmount,
        balanceBefore: wallet.availableBalance,
        balanceAfter: restoredBalance,
        referenceId: payout.payoutId,
        referenceType: "payout_refund",
        description: `Reconciliation refund for payout ${payout.payoutId}`,
        status: "completed",
      });
    });
  }
}

export function startPayoutReconciliationPoller() {
  if (poller || process.env["NODE_ENV"] === "test") return;

  const intervalMs = Number(process.env["NOMBA_PAYOUT_RECONCILIATION_INTERVAL_MS"] ?? DEFAULT_INTERVAL_MS);
  poller = setInterval(() => {
    void reconcileStalePayouts().catch((error) => {
      console.error("[payout-reconciliation]", error);
    });
  }, intervalMs);

  poller.unref?.();
}