import { Router, type IRouter } from "express";
import authRoutes from "./auth.js";
import usersRoutes from "./users.js";
import walletRoutes from "./wallet.js";
import marketplaceRoutes from "./marketplace.js";
import ordersRoutes from "./orders.js";
import paymentsRoutes from "./payments.js";
import notificationsRoutes from "./notifications.js";
import scansRoutes from "./scans.js";
import virtualAccountsRoutes from "./virtual-accounts.js";
import chatRoutes from "./chat.js";

const v1: IRouter = Router();

v1.use("/auth", authRoutes);
v1.use("/users", usersRoutes);
v1.use("/wallet", walletRoutes);
v1.use("/marketplace", marketplaceRoutes);
v1.use("/orders", ordersRoutes);
v1.use("/payments", paymentsRoutes);
v1.use("/notifications", notificationsRoutes);
v1.use("/scans", scansRoutes);
v1.use("/virtual-accounts", virtualAccountsRoutes);
v1.use("/conversations", chatRoutes);

export default v1;
