import { Router, type IRouter } from "express";
import { createOrder, getMyBuyerOrders, getMyFarmerOrders, confirmDelivery, updateOrderStatus, cancelOrder } from "../../controllers/orders.controller.js";
import { rateOrder } from "../../controllers/ratings.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.post("/", createOrder);
router.get("/buyer", getMyBuyerOrders);
router.get("/my", getMyFarmerOrders);
router.patch("/:id/confirm-delivery", confirmDelivery);
router.patch("/:id/status", updateOrderStatus);
router.patch("/:id/cancel", cancelOrder);
router.post("/:id/rate", rateOrder);

export default router;
