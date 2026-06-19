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
} from "../../controllers/users.controller.js";
import { authenticate } from "../../middleware/auth.js";
import { getFarmerRatings } from "../../controllers/ratings.controller.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/me", authenticate, getMe);
router.get("/me/stats", authenticate, getStats);
router.patch("/", authenticate, updateUser);
router.post("/complete-oauth", authenticate, completeOAuthProfile);
router.post("/avatar", authenticate, upload.single("file"), uploadAvatar);
router.post("/liveness-check", authenticate, upload.single("selfie"), livenessCheck);
router.post("/verify-nin", authenticate, upload.single("file"), uploadNinDocument);
router.post("/upload-ownership-doc", authenticate, upload.single("file"), uploadOwnershipDocument);
router.get("/:id/ratings", getFarmerRatings);
router.get("/:id", getUser);

export default router;
