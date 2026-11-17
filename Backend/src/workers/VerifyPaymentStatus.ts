import cron from "node-cron";
import Transaction from "../Models/C2B/Transaction.js";
import PaymentStatusQuery from "../services/C2B/QueryPaymentStatus.js";
import DispatchClientWebhook from "../services/webhooks/C2B/DispatchClientWebhook.js";

function StartPaymentReconciliationWorker() {
  // Run every 5 minutes: "*/5 * * * *"
  cron.schedule("*/5 * * * *", async () => {
    console.log("Running scheduled payment reconciliation check...");

    try {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);

      // Fetch pending transactions, but cap them to a safe batch size (e.g., max 10 per run)
      // to prevent long-running loops and rate-limiting when backlogs grow.
      const pendingTransactions = await Transaction.find({
        status: "PENDING",
        createdAt: { $lte: threeMinutesAgo },
        checkoutRequestID: { $exists: true, $ne: null },
      }).limit(10);

      if (pendingTransactions.length === 0) {
        console.log("No stale pending transactions found.");
        return;
      }

      console.log(
        `Found ${pendingTransactions.length} pending transactions to check in this batch.`,
      );

      for (const tx of pendingTransactions) {
        try {
          console.log(
            `Querying Safaricom for CheckoutID: ${tx.checkoutRequestID} (Internal ID: ${tx.internalTxId})`,
          );

          const queryResult = await PaymentStatusQuery(tx.checkoutRequestID!);

          if (!queryResult) {
            console.warn(`No response received for ${tx.checkoutRequestID}`);
            continue;
          }

          // 1. Handle Rate Limit / Spike Arrest separately (Abort loop to protect quota)
          if (
            queryResult.fault?.detail?.errorcode ===
              "policies.ratelimit.SpikeArrestViolation" ||
            queryResult.fault?.faultstring?.includes("Spike arrest")
          ) {
            console.warn(
              " Safaricom Spike Arrest Rate Limit hit! Aborting remaining reconciliation checks for this cycle.",
            );
            break;
          }

          // 2. Handle non-existent transaction errors strictly
          if (queryResult.errorCode === "500.001.1001") {
            console.warn(
              `Transaction does not exist on gateway for ${tx.checkoutRequestID}. Marking as FAILED.`,
            );

            tx.status = "FAILED";
            tx.resultDesc =
              queryResult.errorMessage ||
              "Transaction does not exist on gateway";
            await tx.save();

            await DispatchClientWebhook(tx.clientCallbackUrl, {
              internalTxId: tx.internalTxId,
              serviceName: tx.serviceName,
              phoneNumber: tx.phoneNumber,
              amount: tx.amount,
              status: "FAILED",
              resultCode: 500,
              resultDesc: tx.resultDesc,
            });

            continue;
          }

          if (!queryResult.ResultCode) {
            console.warn(
              `No valid result code received for ${tx.checkoutRequestID}`,
            );
            continue;
          }

          const resultCode = Number(queryResult.ResultCode);

          if (resultCode === 0) {
            tx.status = "COMPLETED";
            tx.resultCode = resultCode;
            tx.resultDesc =
              queryResult.ResultDesc ||
              "Verified via background reconciliation";
            await tx.save();

            console.log(
              `Reconciled: Transaction ${tx.internalTxId} marked as COMPLETED.`,
            );

            await DispatchClientWebhook(tx.clientCallbackUrl, {
              internalTxId: tx.internalTxId,
              serviceName: tx.serviceName,
              phoneNumber: tx.phoneNumber,
              amount: tx.amount,
              status: "COMPLETED",
              resultCode: resultCode,
              resultDesc: tx.resultDesc,
            });
          } else {
            tx.status = resultCode === 1032 ? "CANCELLED" : "FAILED";
            tx.resultCode = resultCode;
            tx.resultDesc = queryResult.ResultDesc || "Failed transaction";
            await tx.save();

            console.log(
              `Reconciled: Transaction ${tx.internalTxId} marked as ${tx.status}.`,
            );

            await DispatchClientWebhook(tx.clientCallbackUrl, {
              internalTxId: tx.internalTxId,
              serviceName: tx.serviceName,
              phoneNumber: tx.phoneNumber,
              amount: tx.amount,
              status: tx.status,
              resultCode: resultCode,
              resultDesc: tx.resultDesc,
            });
          }

          //  Safe Interval Pacing: 6-second delay between queries
          // Ensures max ~10 requests/minute, comfortably below Safaricom's 30 req/min spike arrest limit.
          await new Promise((resolve) => setTimeout(resolve, 6000));
        } catch (queryErr) {
          console.error(
            `Failed to reconcile transaction ${tx.internalTxId}:`,
            queryErr,
          );
        }
      }
    } catch (error) {
      console.error("Error running payment reconciliation worker:", error);
    }
  });

  console.log(
    "Payment Reconciliation Cron Worker initialized (Runs every 5 mins with safety throttling).",
  );
}

export default StartPaymentReconciliationWorker;
