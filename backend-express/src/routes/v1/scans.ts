import { Router, type IRouter } from "express";
import multer from "multer";
import { createScan, getMyScans } from "../../controllers/scans.controller.js";
import { authenticate } from "../../middleware/auth.js";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.use(authenticate);

router.post("/", upload.single("image"), createScan);
router.get("/my", getMyScans);

export default router;
