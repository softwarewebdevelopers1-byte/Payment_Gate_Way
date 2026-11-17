import { Request, Response, Router } from "express";
import QueryPaymentValidator from "../../middleware/C2B/QueryPaymentValidator.js";
import Transaction from "../../Models/C2B/Transaction.js";
import PaymentStatusQuery from "../../services/C2B/QueryPaymentStatus.js";
import { verifyRequestSignature } from "../../security/requestFilter/VerifyRequests.js";

const QueryPaymentRouter = Router();

QueryPaymentRouter.post(
  "/query/payments",
  QueryPaymentValidator,
  verifyRequestSignature,
  // Validates the request body
  async (req: Request, res: Response) => {
    try {
      // Accept either internalTxId or checkoutRequestID from the client body
      const { PaymentId, identifierType = "internalTxId" } = req.body;
      const verifiedServiceName = req.body.verifiedServiceName;

      // 1. Query your gateway database first (Single Source of Truth)
      const queryCriteria =
        identifierType === "checkoutRequestID"
          ? { checkoutRequestID: PaymentId }
          : { internalTxId: PaymentId };

      const transaction = await Transaction.findOne(queryCriteria);

      if (!transaction) {
        return res.status(404).json({
          success: false,
          error: "Transaction not found in gateway records",
        });
      }

      // 2. Multi-tenant isolation check
      if (transaction.serviceName !== verifiedServiceName) {
        return res.status(403).json({
          success: false,
          error: "Forbidden: You do not own this transaction",
        });
      }

      // 3. If transaction is still PENDING locally, optionally pull fresh status from Safaricom
      if (transaction.status === "PENDING" && transaction.checkoutRequestID) {
        const safaricomResult = await PaymentStatusQuery(
          transaction.checkoutRequestID,
        );

        // Update local state if Safaricom resolved it
        const resultCode = Number(safaricomResult?.ResultCode);
        if (!isNaN(resultCode)) {
          if (resultCode === 0) {
            transaction.status = "COMPLETED";
            transaction.resultCode = resultCode;
            // 💡 Provide a fallback string to satisfy exactOptionalPropertyTypes
            transaction.resultDesc =
              safaricomResult.ResultDesc ||
              "Verified successfully via gateway query";
            await transaction.save();
          } else if (resultCode !== 0) {
            transaction.status = resultCode === 1032 ? "CANCELLED" : "FAILED";
            transaction.resultCode = resultCode;
            transaction.resultDesc =
              safaricomResult.ResultDesc || "Transaction failed";
            await transaction.save();
          }
        }
      }

      // 4. Return clean, unified response to the calling service
      return res.status(200).json({
        success: true,
        data: {
          internalTxId: transaction.internalTxId,
          serviceName: transaction.serviceName,
          phoneNumber: transaction.phoneNumber,
          amount: transaction.amount,
          status: transaction.status,
          mpesaReceiptNumber: transaction.mpesaReceiptNumber || null,
          resultCode: transaction.resultCode ?? null,
          resultDesc: transaction.resultDesc || null,
          createdAt: transaction.createdAt,
          updatedAt: transaction.updatedAt,
        },
      });
    } catch (error) {
      console.error("Route error querying payment status:", error);
      return res.status(500).json({
        success: false,
        error: "Internal server error while processing payment status query",
      });
    }
  },
);

export default QueryPaymentRouter;
