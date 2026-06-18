import { Router, type IRouter } from "express";
import multer from "multer";
import {
  getAllListings,
  getListing,
  createListing,
  updateListing,
  getMyListings,
  deleteListing,
  uploadImage,
} from "../../controllers/marketplace.controller.js";
import { authenticate, requireRole } from "../../middleware/auth.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Public
router.get("/listings", getAllListings);
router.get("/listings/my", authenticate, requireRole("farmer"), getMyListings);
router.get("/listings/:id", getListing);

// Auth required
router.post("/listings", authenticate, requireRole("farmer"), createListing);
router.patch("/listings/:id", authenticate, requireRole("farmer"), updateListing);
router.delete("/listings/:id", authenticate, requireRole("farmer"), deleteListing);
router.post("/upload", authenticate, upload.single("file"), uploadImage);

export default router;
