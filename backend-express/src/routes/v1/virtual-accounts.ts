import express, { type IRouter } from "express";
import { authenticate } from "../../middleware/auth.js";
import {
  createBuyerVirtualAccount,
  getMyVirtualAccount,
  suspendMyVirtualAccount,
  getWalletBalance,
} from "../../controllers/virtual-accounts.controller.js";

const router: IRouter = express.Router();

// All virtual account routes require authentication
router.use(authenticate);

// Both buyers and farmers can create a virtual account to fund their wallet.
router.post("/", createBuyerVirtualAccount);

// Get my virtual account
router.get("/", getMyVirtualAccount);

// Suspend my virtual account
router.put("/suspend", suspendMyVirtualAccount);

// Get wallet balance
router.get("/wallet/balance", getWalletBalance);

export default router;
