import { Response } from "express";
import crypto from "crypto";
import GetAccessToken from "../../security/C2B/GenerateSafAccessToken.js";
import DotEnv from "../../configs/DotEnv.js";
import GenerateTrasactionPassword from "../../security/C2B/GenerateTransactionPassword.js";
import GenerateTimeStamp from "../GenerateTimeStamp.js";
import Transaction from "../../Models/C2B/Transaction.js";

async function SendStkPush(
  PhoneNumber: string,
  Amount: string,
  Res: Response,
  ServiceName: string, // Optional: pass the origin service name
  ClientCallbackUrl: string, // Optional: pass downstream callback URL
) {
  try {
    // 1. Fetch the dynamic Bearer Token first
    const AccessToken = await GetAccessToken();

    const Payload = {
      BusinessShortCode: DotEnv().ShortCode,
      Password: GenerateTrasactionPassword(),
      Timestamp: GenerateTimeStamp(),
      TransactionType: "CustomerPayBillOnline",
      Amount: Amount,
      PartyA: PhoneNumber,
      PartyB: DotEnv().ShortCode,
      PhoneNumber: PhoneNumber,
      CallBackURL: DotEnv().CallBackUrl, // Gateway's global callback URL
      AccountReference: ServiceName.toUpperCase(),
      TransactionDesc: `Payment for ${ServiceName}`,
    };

    // 2. Send request to Safaricom Daraja API
    const DarajaResponse = await fetch(DotEnv().StkPushUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(Payload),
    });

    const Data = await DarajaResponse.json();
    console.log("STK push results ", Data);
    // Check if Safaricom accepted the request (ResponseCode "0")
    if (Data.ResponseCode !== "0") {
      return Res.status(400).json({
        success: false,
        error: `Payment rejected STK Push: ${Data.ResponseDescription || "Unknown error"}`,
      });
    }

    // 3. Generate a unique internal transaction ID for your gateway
    const internalTxId = `TX_${crypto.randomUUID()}`;

    // 4. Save the PENDING transaction document to your database
    await Transaction.create({
      internalTxId,
      serviceName: ServiceName,
      phoneNumber: PhoneNumber,
      amount: Number(Amount),
      accountReference: Payload.AccountReference,
      checkoutRequestID: Data.CheckoutRequestID, //  Saved for webhook/query matching
      merchantRequestID: Data.MerchantRequestID,
      status: "PENDING",
      clientCallbackUrl: ClientCallbackUrl,
    });

    console.log(
      `STK Push sent & recorded. Internal ID: ${internalTxId}, Checkout ID: ${Data.CheckoutRequestID}`,
    );

    // 5. Respond back to the calling application with your internal tracking ID
    return Res.status(200).json({
      success: true,
      message: `STK push sent to ${PhoneNumber}. Amount ksh ${Amount}`,
      internalTxId,
      checkoutRequestID: Data.CheckoutRequestID,
    });
  } catch (error) {
    console.error("Error sending STK Push:", error);
    return Res.status(500).json({
      success: false,
      error: `Unable to push prompt for ${PhoneNumber}. Amount ksh ${Amount}`,
    });
  }
}

export default SendStkPush;
