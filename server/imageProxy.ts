import { Router, Request, Response } from "express";
import sharp from "sharp";
import fetch from "node-fetch";

const router = Router();

/**
 * Image proxy service for automatic compression and WebP conversion
 * 
 * Usage: /api/image-proxy?url=<encoded_image_url>&width=<optional_width>&quality=<optional_quality>
 * 
 * Features:
 * - Automatic WebP conversion
 * - Image compression with quality control
 * - Responsive image sizing
 * - Caching headers for browser optimization
 */

interface ImageProxyQuery {
  url?: string;
  width?: string;
  quality?: string;
}

router.get("/", async (req: Request<{}, {}, {}, ImageProxyQuery>, res: Response) => {
  try {
    const { url, width, quality } = req.query;

    if (!url) {
      return res.status(400).json({ error: "Missing 'url' parameter" });
    }

    // Decode the URL
    const imageUrl = decodeURIComponent(url);

    // Validate URL
    if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
      return res.status(400).json({ error: "Invalid URL" });
    }

    // Parse width and quality
    const targetWidth = width ? parseInt(width, 10) : undefined;
    const imageQuality = quality ? parseInt(quality, 10) : 80;

    // Validate parameters
    if (targetWidth && (isNaN(targetWidth) || targetWidth < 1 || targetWidth > 4000)) {
      return res.status(400).json({ error: "Invalid width parameter (1-4000)" });
    }

    if (isNaN(imageQuality) || imageQuality < 1 || imageQuality > 100) {
      return res.status(400).json({ error: "Invalid quality parameter (1-100)" });
    }

    // Fetch the original image
    const imageResponse = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000, // 10 second timeout
    });

    if (!imageResponse.ok) {
      return res.status(imageResponse.status).json({ 
        error: `Failed to fetch image: ${imageResponse.statusText}` 
      });
    }

    // Get image buffer
    const imageBuffer = await imageResponse.buffer();

    // Process image with sharp
    let sharpInstance = sharp(imageBuffer);

    // Resize if width is specified
    if (targetWidth) {
      sharpInstance = sharpInstance.resize(targetWidth, undefined, {
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    // Convert to WebP with compression
    const webpBuffer = await sharpInstance
      .webp({ quality: imageQuality })
      .toBuffer();

    // Set caching headers (1 week)
    res.set({
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=604800, immutable",
      "Content-Length": webpBuffer.length.toString(),
    });

    // Send the compressed image
    res.send(webpBuffer);
  } catch (error: any) {
    console.error("[Image Proxy] Error:", error);
    
    if (error.message?.includes("timeout")) {
      return res.status(504).json({ error: "Image fetch timeout" });
    }
    
    res.status(500).json({ 
      error: "Failed to process image",
      details: error.message 
    });
  }
});

export default router;
