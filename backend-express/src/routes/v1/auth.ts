import { Router, type IRouter } from "express";
import {
  signup, login, refresh, logout,
  verifyEmail, resendVerification,
  revokeSession, getSessions, revokeOtherSessions,
  forgotPassword, resetPassword, changePassword,
  googleAuth,
} from "../../controllers/auth.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/rateLimiter.js";

const router: IRouter = Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/google", authLimiter, googleAuth);
router.post("/refresh", authLimiter, refresh);
router.post("/logout", logout);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", authLimiter, resendVerification);
router.post("/forgot-password", authLimiter, forgotPassword);
router.post("/reset-password", authLimiter, resetPassword);
router.patch("/change-password", authenticate, changePassword);
router.get("/revoke-session", revokeSession);
router.get("/sessions", authenticate, getSessions);
router.post("/sessions/revoke-others", authenticate, revokeOtherSessions);

export default router;
