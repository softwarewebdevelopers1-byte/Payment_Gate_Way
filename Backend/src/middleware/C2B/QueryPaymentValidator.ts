import { Request, Response, NextFunction } from "express";

function QueryPaymentValidator(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { PaymentId, identifierType } = req?.body || {};

  if (!PaymentId) {
    return res.status(400).json({
      success: false,
      error: "Payment ID is required",
    });
  }

  // Optional: validate identifierType if provided
  if (
    identifierType &&
    !["internalTxId", "checkoutRequestID"].includes(identifierType)
  ) {
    return res.status(400).json({
      success: false,
      error:
        "Invalid identifierType. Must be either 'internalTxId' or 'checkoutRequestID'",
    });
  }

  next();
}

export default QueryPaymentValidator;
