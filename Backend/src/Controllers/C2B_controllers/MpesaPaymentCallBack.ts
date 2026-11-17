import { Request, Response, Router } from "express";
import Transaction from "../../Models/C2B/Transaction.js";
//  Import your dispatcher
import DispatchClientWebhook from "../../services/webhooks/C2B/DispatchClientWebhook.js";

const CallBackRouter = Router();

CallBackRouter.post("/mpesa/callback", async (req: Request, res: Response) => {
  try {
    const callbackData = req.body;

    const stkCallback = callbackData?.Body?.stkCallback;

    if (!stkCallback) {
      return res.status(400).json({ error: "Invalid callback structure" });
    }

    const { CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

    console.log(`Received callback for CheckoutID: ${CheckoutRequestID}`);

    const transaction = await Transaction.findOne({
      checkoutRequestID: CheckoutRequestID,
    });

    if (!transaction) {
      console.warn(
        `Callback received for unknown CheckoutID: ${CheckoutRequestID}`,
      );
      return res
        .status(200)
        .json({ ResultCode: 0, ResultDesc: "Transaction not found locally" });
    }

    if (transaction.status !== "PENDING") {
      console.log(
        `Transaction ${transaction.internalTxId} is already marked as ${transaction.status}. Skipping.`,
      );
      return res
        .status(200)
        .json({ ResultCode: 0, ResultDesc: "Already processed" });
    }

    if (ResultCode === 0) {
      const metadataItems = stkCallback.CallbackMetadata.Item;

      const getMetaValue = (name: string) =>
        metadataItems.find((item: any) => item.Name === name)?.Value;

      const amount = getMetaValue("Amount");
      const mpesaReceiptNumber = getMetaValue("MpesaReceiptNumber");
      const phoneNumber = getMetaValue("PhoneNumber");

      console.log(
        `Payment Success! Receipt: ${mpesaReceiptNumber}, Amount: ${amount}`,
      );

      // Update database for success
      transaction.status = "COMPLETED";
      transaction.resultCode = ResultCode;
      transaction.resultDesc = ResultDesc;
      transaction.mpesaReceiptNumber = mpesaReceiptNumber;
      await transaction.save();

      //Dispatch final confirmation webhook downstream
      await DispatchClientWebhook(transaction.clientCallbackUrl, {
        internalTxId: transaction.internalTxId,
        serviceName: transaction.serviceName,
        phoneNumber: transaction.phoneNumber,
        amount: transaction.amount,
        status: "COMPLETED",
        mpesaReceiptNumber,
        resultCode: ResultCode,
        resultDesc: ResultDesc,
      });
    } else {
      console.log(
        `Payment Failed/Cancelled. Reason: ${ResultDesc} (Code: ${ResultCode})`,
      );

      // Update database for failure/cancellation
      transaction.status = ResultCode === 1032 ? "CANCELLED" : "FAILED";
      transaction.resultCode = ResultCode;
      transaction.resultDesc = ResultDesc;
      await transaction.save();

      //Dispatch failure/cancellation webhook downstream
      await DispatchClientWebhook(transaction.clientCallbackUrl, {
        internalTxId: transaction.internalTxId,
        serviceName: transaction.serviceName,
        phoneNumber: transaction.phoneNumber,
        amount: transaction.amount,
        status: transaction.status,
        resultCode: ResultCode,
        resultDesc: ResultDesc,
      });
    }

    return res.status(200).json({ ResultCode: 0, ResultDesc: "Success" });
  } catch (error) {
    console.error("Error processing callback:", error);
    return res
      .status(200)
      .json({ ResultCode: 0, ResultDesc: "Internal Error Handled" });
  }
});

export default CallBackRouter;
