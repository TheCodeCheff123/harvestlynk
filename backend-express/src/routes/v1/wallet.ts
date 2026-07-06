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
} from "../../controllers/wallet.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router: IRouter = Router();

router.get("/banks", getBanks);

router.use(authenticate);

router.get("/balance", getBalance);
router.get("/transactions", getTransactions);
router.get("/ledger", getLedgerEntries);
router.get("/verify-bank", verifyBank);
router.post("/withdraw", withdraw);

// Manual balance refresh — queries Nomba for missed VA credits.
router.post("/refresh", refreshWalletBalance);

// Payout requery — farmer polls this when a withdrawal webhook is delayed.
router.get("/payout/:id/requery", requeryPayout);

export default router;
