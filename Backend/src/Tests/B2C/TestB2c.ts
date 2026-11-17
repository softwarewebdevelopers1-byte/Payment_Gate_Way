import mongoose from "mongoose";
import DotEnv from "../../configs/DotEnv.js";
import Transaction from "../../Models/C2B/Transaction.js";
import MpesaB2CPayout from "../../services/B2C/B2CPayoutParams.js";

async function TestB2cPayment() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(DotEnv().DatabaseUrl);
      console.log("Database connected for test");
    }

    const uniqueTxId = `TEST_TX_${Date.now()}`;
    const testPhoneNumber = "254708374149";

    //Include all required fields matching your schema model
    await Transaction.create({
      internalTxId: uniqueTxId,
      amount: 1,
      disbursementStatus: "PENDING",
      phoneNumber: testPhoneNumber, //  Required by schema
      accountReference: "RENT_PAYMENT_001", //  Required by schema
      serviceName: "Hostelix", //  Required by schema
      clientCallbackUrl: "https://webhook.site/test-callback", //  Required by schema
      recipientDetails: {
        destination: testPhoneNumber,
      },
    });

    console.log(`Initiating B2C test payout for ${uniqueTxId}...`);

    const response = await MpesaB2CPayout({
      phoneNumber: testPhoneNumber,
      amount: 1,
      internalTxId: uniqueTxId,
      remarks: "payout disbursed",
    });

    console.log("B2C Test Response:", response);
  } catch (error) {
    console.error("B2C Test Failed:", error);
  }
}

TestB2cPayment();
