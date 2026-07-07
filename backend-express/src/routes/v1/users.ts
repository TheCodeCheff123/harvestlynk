import { Router, type IRouter } from "express";
import multer from "multer";
import {
  getUser,
  getMe,
  getStats,
  updateUser,
  uploadAvatar,
  uploadNinDocument,
  uploadOwnershipDocument,
  completeOAuthProfile,
  livenessCheck,
  getVerificationStatus,
  checkUsername,
} from "../../controllers/users.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { getFarmerRatings } from "../../controllers/ratings.controller.js";
import { rateLimit } from "express-rate-limit";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const isProduction = process.env["NODE_ENV"] === "production";
const usernameCheckLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: () => !isProduction,
  message: { error: "Too many username checks. Please wait." },
});

// Public — no auth required
router.get("/check-username", usernameCheckLimiter, checkUsername);

router.get("/me", authenticate, getMe);
router.get("/me/stats", authenticate, getStats);
router.get("/me/verification-status", authenticate, getVerificationStatus);
router.patch("/", authenticate, updateUser);
router.post("/complete-oauth", authenticate, completeOAuthProfile);
router.post("/avatar", authenticate, upload.single("file"), uploadAvatar);
router.post("/liveness-check", authenticate, upload.single("selfie"), livenessCheck);
router.post("/verify-nin", authenticate, upload.single("file"), uploadNinDocument);
router.post("/upload-ownership-doc", authenticate, upload.single("file"), uploadOwnershipDocument);
router.get("/:id/ratings", getFarmerRatings);
router.get("/:id", getUser);

export default router;
