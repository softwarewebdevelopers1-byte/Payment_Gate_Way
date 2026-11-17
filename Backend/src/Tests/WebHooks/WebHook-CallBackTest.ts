import mongoose from "mongoose";
import DotEnv from "../../configs/DotEnv.js";
import Transaction from "../../Models/C2B/Transaction.js";

async function simulateSafaricomCallback() {
  try {
    // 1. Connect to your database to insert a dummy PENDING transaction for testing
    await mongoose.connect(DotEnv().DatabaseUrl);
    console.log("Connected to MongoDB for webhook test...");

    const testCheckoutRequestId = `ws_CO_${Date.now()}`;
    const testInternalTxId = `TX_${Date.now()}`;
    const testClientCallbackUrl = "http://localhost:4000/mock-client-webhook"; // Local endpoint to catch dispatched webhook

    // Create a mock PENDING transaction in DB
    await Transaction.create({
      internalTxId: testInternalTxId,
      serviceName: "lernesis",
      phoneNumber: "254712345678",
      amount: 100,
      accountReference: "TestRef",
      checkoutRequestID: testCheckoutRequestId,
      status: "PENDING",
      clientCallbackUrl: testClientCallbackUrl,
    });

    console.log(
      `Created mock PENDING transaction with CheckoutRequestID: ${testCheckoutRequestId}`,
    );

    // 2. Build the exact payload structure that Safaricom Daraja sends on success
    const mockSafaricomPayload = {
      Body: {
        stkCallback: {
          MerchantRequestID: "29115-34620561-1",
          CheckoutRequestID: testCheckoutRequestId,
          ResultCode: 0,
          ResultDesc: "The service request is processed successfully.",
          CallbackMetadata: {
            Item: [
              { Name: "Amount", Value: 100 },
              { Name: "MpesaReceiptNumber", Value: "NLJ7RT61SV" },
              { Name: "Balance", Value: "" },
              { Name: "TransactionDate", Value: 20261111230000 },
              { Name: "PhoneNumber", Value: 254712345678 },
            ],
          },
        },
      },
    };

    // 3. Send the mock webhook to your local gateway callback endpoint
    const gatewayUrl = `http://localhost:${DotEnv().ServerPort}/api/v1/mpesa/callback`; // Adjust port if your server runs elsewhere
    console.log(`Sending mock callback to gateway: ${gatewayUrl}`);

    const response = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mockSafaricomPayload),
    });

    const responseData = await response.json();
    console.log("Gateway Response:", responseData);

    // 4. Verify DB update after a short moment
    setTimeout(async () => {
      const updatedTx = await Transaction.findOne({
        checkoutRequestID: testCheckoutRequestId,
      });
      console.log("Database Verification - Updated Status:", updatedTx?.status);
      console.log(
        "Database Verification - Receipt:",
        updatedTx?.mpesaReceiptNumber,
      );

      await mongoose.disconnect();
      process.exit(0);
    }, 2000);
  } catch (error) {
    console.error("Error running webhook test:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

simulateSafaricomCallback();
