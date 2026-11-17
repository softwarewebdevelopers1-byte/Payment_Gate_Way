import { Request, Response, Router } from "express";
import Transaction from "../../Models/C2B/Transaction.js";
import { verifyRequestSignature } from "../../security/requestFilter/VerifyRequests.js";

const B2CCallbackRouter = Router();

// 1. Handle Successful or Failed B2C Result Callback
B2CCallbackRouter.post(
  "/mpesa/b2c-result",
  verifyRequestSignature,
  async (req: Request, res: Response) => {
    try {
      const callbackData = req.body;
      const result = callbackData?.Result;

      if (!result) {
        return res
          .status(400)
          .json({ error: "Invalid B2C callback structure" });
      }

      const {
        ResultCode,
        ResultDesc,
        OriginatorConversationID,
        ConversationID,
        TransactionID,
      } = result;

      // The Occasion / OriginatorConversationID field maps back to our internalTxId
      const internalTxId = result.Occasion || OriginatorConversationID;

      console.log(
        `Received B2C Result for Transaction ${internalTxId}. Code: ${ResultCode}`,
      );

      const transaction = await Transaction.findOne({ internalTxId });

      if (!transaction) {
        console.warn(
          `B2C Callback received for unknown internalTxId: ${internalTxId}`,
        );
        return res
          .status(200)
          .json({ ResultCode: 0, ResultDesc: "Transaction not found locally" });
      }

      if (ResultCode === 0) {
        // Payout Successful! Money is now in the recipient's phone / till
        transaction.disbursementStatus = "DISBURSED";
        transaction.recipientReceiptNumber = TransactionID; // M-Pesa payout receipt code
        await transaction.save();

        console.log(
          `Payout successful! Receipt: ${TransactionID} sent to ${transaction.recipientDetails?.destination}`,
        );

        // Notify downstream app (Hostelix / Lernesis) via their registered clientCallbackUrl
        if (transaction.clientCallbackUrl) {
          try {
            await fetch(transaction.clientCallbackUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                internalTxId: transaction.internalTxId,
                serviceName: transaction.serviceName,
                status: "COMPLETED",
                disbursementStatus: "DISBURSED",
                amount: transaction.amount,
                mpesaReceiptNumber: transaction.mpesaReceiptNumber,
                recipientReceiptNumber: transaction.recipientReceiptNumber,
                recipientDetails: transaction.recipientDetails,
              }),
            });
            console.log(
              ` Dispatched downstream webhook to ${transaction.serviceName}`,
            );
          } catch (webhookError) {
            console.error(
              `Failed to dispatch client webhook for ${internalTxId}:`,
              webhookError,
            );
          }
        }
      } else {
        // Payout Failed (e.g., subscriber offline, limits reached, etc.)
        transaction.disbursementStatus = "FAILED";
        transaction.resultDesc = ResultDesc;
        await transaction.save();

        console.error(`Payout failed for ${internalTxId}: ${ResultDesc}`);
      }

      return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
    } catch (error) {
      console.error("Error processing B2C callback:", error);
      return res
        .status(200)
        .json({ ResultCode: 0, ResultDesc: "Internal Error Handled" });
    }
  },
);

// 2. Handle B2C Queue Timeouts
B2CCallbackRouter.post(
  "/mpesa/b2c-timeout",
  async (req: Request, res: Response) => {
    try {
      const timeoutData = req.body;
      console.warn(" B2C Queue Timeout received:", timeoutData);

      const internalTxId = timeoutData?.Result?.OriginatorConversationID;

      if (internalTxId) {
        await Transaction.findOneAndUpdate(
          { internalTxId },
          {
            disbursementStatus: "FAILED",
            resultDesc: "B2C Transaction Timed Out on Safaricom Queue",
          },
        );
      }

      return res
        .status(200)
        .json({ ResultCode: 0, ResultDesc: "Timeout Received" });
    } catch (error) {
      console.error("Error processing B2C timeout callback:", error);
      return res
        .status(200)
        .json({ ResultCode: 0, ResultDesc: "Error Handled" });
    }
  },
);

export default B2CCallbackRouter;
