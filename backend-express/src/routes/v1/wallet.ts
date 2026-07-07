import { Router, type IRouter } from "express";
import {
  getBanks,
  getBalance,
  getTransactions,
  getLedgerEntries,
  verifyBank,
  withdraw,
  requeryPayout,
  refreshWalletBalance,
  createTopup,
  internalTransfer,
} from "../../controllers/wallet.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import type { AuthRequest } from "../../middleware/auth.js";

const router: IRouter = Router();

const isProduction = process.env["NODE_ENV"] === "production";
const transferLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => !isProduction,
  // Prefer authenticated user ID; fall back to IPv6-safe IP hash
  keyGenerator: (req) => (req as AuthRequest).user?.userId ?? ipKeyGenerator(req.ip ?? ""),
  message: { error: "Too many transfer attempts. Please wait a minute." },
});

router.get("/banks", getBanks);

router.use(authenticate);

router.get("/balance", getBalance);
router.get("/transactions", getTransactions);
router.get("/ledger", getLedgerEntries);
router.get("/verify-bank", verifyBank);
router.post("/withdraw", withdraw);
router.post("/transfer", transferLimiter, internalTransfer);

// Checkout-based wallet top-up — returns a Nomba checkout URL.
router.post("/topup", createTopup);

// Manual balance refresh — queries Nomba for missed VA credits.
router.post("/refresh", refreshWalletBalance);

// Payout requery — farmer polls this when a withdrawal webhook is delayed.
router.get("/payout/:id/requery", requeryPayout);

export default router;
