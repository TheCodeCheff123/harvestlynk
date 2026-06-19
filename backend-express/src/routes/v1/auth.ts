import { Router, type IRouter } from "express";
import { signup, login, refresh, logout, verifyEmail, resendVerification, revokeSession, getSessions, revokeOtherSessions } from "../../controllers/auth.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { authLimiter } from "../../middleware/rateLimiter.js";

const router: IRouter = Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/refresh", authLimiter, refresh);
router.post("/logout", logout);
router.get("/verify-email", verifyEmail);
router.post("/resend-verification", authLimiter, resendVerification);
router.get("/revoke-session", revokeSession);      // email link, no auth
router.get("/sessions", authenticate, getSessions);
router.post("/sessions/revoke-others", authenticate, revokeOtherSessions);

export default router;
