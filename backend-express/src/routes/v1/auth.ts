import { Router, type IRouter } from "express";
import { signup, login, logout, getSession } from "../../controllers/auth.controller.js";
import { authLimiter } from "../../middleware/rateLimiter.js";

const router: IRouter = Router();

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);

// Dashboard-compatible paths (Better-Auth shape)
router.post("/sign-in/email", authLimiter, login);
router.post("/sign-out", logout);
router.get("/get-session", getSession);

export default router;
