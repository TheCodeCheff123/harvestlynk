import { Router, type IRouter } from "express";
import { getNotifications, markAsRead, markAllAsRead, getUnreadCount } from "../../controllers/notifications.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router: IRouter = Router();

router.use(authenticate);

router.get("/", getNotifications);
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);
router.patch("/:id/read", markAsRead);

export default router;
