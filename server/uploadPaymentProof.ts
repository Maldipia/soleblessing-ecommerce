import { Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import crypto from "crypto";

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const uploadPaymentProofMiddleware = upload.single("file");

export async function uploadPaymentProof(req: any, res: Response) {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    // Generate unique filename
    const file = req.file;
    const fileExt = file.originalname.split(".").pop() || "jpg";
    const randomSuffix = crypto.randomBytes(8).toString("hex");
    const fileName = `payment-proof-${Date.now()}-${randomSuffix}.${fileExt}`;
    const fileKey = `payment-proofs/${fileName}`;

    // Upload to S3
    const { url } = await storagePut(
      fileKey,
      file.buffer,
      file.mimetype
    );

    res.json({ url, fileName });
  } catch (error) {
    console.error("Payment proof upload error:", error);
    res.status(500).json({ error: "Failed to upload payment proof" });
  }
}
