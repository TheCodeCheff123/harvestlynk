import { Router, type IRouter } from "express";
import { getBanks, getBalance, getTransactions, verifyBank, withdraw } from "../../controllers/wallet.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router: IRouter = Router();

router.get("/banks", getBanks);

router.use(authenticate);

router.get("/balance", getBalance);
router.get("/transactions", getTransactions);
router.get("/verify-bank", verifyBank);
router.post("/withdraw", withdraw);

export default router;
