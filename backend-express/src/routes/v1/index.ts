import { Router } from "express";
import authRoutes from "./auth.js";
import usersRoutes from "./users.js";
import walletRoutes from "./wallet.js";
import marketplaceRoutes from "./marketplace.js";
import ordersRoutes from "./orders.js";
import notificationsRoutes from "./notifications.js";
import scansRoutes from "./scans.js";

const v1 = Router();

v1.use("/auth", authRoutes);
v1.use("/users", usersRoutes);
v1.use("/wallet", walletRoutes);
v1.use("/marketplace", marketplaceRoutes);
v1.use("/orders", ordersRoutes);
v1.use("/notifications", notificationsRoutes);
v1.use("/scans", scansRoutes);

export default v1;
