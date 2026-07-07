import { Router, type IRouter } from "express";
import {
  createConversation,
  getConversations,
  getConversation,
  sendMessage,
  markConversationRead,
  buyViaChat,
} from "../../controllers/chat.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { chatMessageLimiter } from "../../middleware/rateLimiter.js";

const router: IRouter = Router();

router.use(authenticate);

router.post("/", createConversation);
router.get("/", getConversations);
router.get("/:id", getConversation);
router.post("/:id/messages", chatMessageLimiter, sendMessage);
router.patch("/:id/read", markConversationRead);
router.post("/:id/buy", buyViaChat);

export default router;
