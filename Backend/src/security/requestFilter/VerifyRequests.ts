import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import ClientCredential from "../../Models/security/ClientCredentialModel.js";

interface SecureRequest extends Request {
  clientId?: string;
}

export async function verifyRequestSignature(
  req: SecureRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const clientId = req.headers["x-client-id"] as string;
    const timestamp = req.headers["x-timestamp"] as string;
    const clientSignature = req.headers["x-signature"] as string;

    if (!clientId || !timestamp || !clientSignature) {
      return res.status(401).json({
        success: false,
        error:
          "Missing security headers (X-Client-Id, X-Timestamp, or X-Signature)",
      });
    }

    // 1. Anti-Replay Protection: Reject requests older than 5 minutes
    const requestTime = parseInt(timestamp, 10);
    const currentTime = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (
      isNaN(requestTime) ||
      Math.abs(currentTime - requestTime) > fiveMinutes
    ) {
      return res.status(401).json({
        success: false,
        error: "Request expired or timestamp skewed",
      });
    }

    // 2. Fetch active client credentials from MongoDB
    const clientRecord = await ClientCredential.findOne({
      clientId,
      isActive: true,
    });

    if (!clientRecord) {
      return res.status(403).json({
        success: false,
        error: "Invalid or inactive client identity",
      });
    }

    // 3. Reconstruct the canonical string
    const rawString = `${req.method.toUpperCase()}:${req.baseUrl}${req.path}:${timestamp}:${JSON.stringify(req.body)}`;

    // 4. Compute expected signature using the database secret
    const expectedSignature = crypto
      .createHmac("sha256", clientRecord.clientSecret)
      .update(rawString)
      .digest("hex");

    // 5. Timing-safe comparison
    const signatureBuffer = Buffer.from(clientSignature, "hex");
    const expectedBuffer = Buffer.from(expectedSignature, "hex");

    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return res.status(403).json({
        success: false,
        error: "Cryptographic signature verification failed",
      });
    }

    req.clientId = clientId;
    // Attach verified service name to request body so controllers know who owns the transaction
    req.body.verifiedServiceName = clientRecord.serviceName;

    next();
  } catch (error) {
    console.error("Signature verification error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal security verification error",
    });
  }
}
