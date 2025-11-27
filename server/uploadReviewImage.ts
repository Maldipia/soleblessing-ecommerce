import type { Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});

export const uploadReviewImageMiddleware = upload.single("file");

export async function uploadReviewImage(req: Request, res: Response) {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = req.file.originalname.split(".").pop() || "jpg";
    const filename = `review-${timestamp}-${randomString}.${extension}`;

    // Upload to S3
    const { url } = await storagePut(
      `reviews/${filename}`,
      req.file.buffer,
      req.file.mimetype
    );

    res.json({ success: true, url });
  } catch (error) {
    console.error("Review image upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
}
