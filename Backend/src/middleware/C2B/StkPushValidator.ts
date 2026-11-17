import { NextFunction, Request, Response } from "express";

function ValidateStkPush(req: Request, res: Response, nxt: NextFunction) {
  const { PhoneNumber, Amount, ServiceName, ClientCallbackUrl } =
    req.body || {};

  if (!req.body) {
    return res.status(400).json({
      success: false,
      error: "Request body is required",
    });
  }

  if (!PhoneNumber) {
    return res.status(400).json({
      success: false,
      error: "Phone number is required",
    });
  }

  if (!Amount) {
    return res.status(400).json({
      success: false,
      error: "Amount is required",
    });
  }

  if (!ServiceName) {
    return res.status(400).json({
      success: false,
      error: "ServiceName is required (e.g., 'lernesis', 'hostelix')",
    });
  }

  if (!ClientCallbackUrl) {
    return res.status(400).json({
      success: false,
      error: "ClientCallbackUrl is required for downstream notification",
    });
  }

  // Clean and validate Kenyan mobile format
  const cleanPhone = PhoneNumber.toString().trim();
  const phoneRegex = /^254[17]\d{8}$/;

  if (!phoneRegex.test(cleanPhone)) {
    return res.status(400).json({
      success: false,
      error: "Invalid phone number format. Must be in the format 2547XXXXXXXX",
    });
  }

  // Validate amount is a positive number
  const numericAmount = Number(Amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: "Amount must be a valid positive number",
    });
  }

  nxt();
}

export default ValidateStkPush;
