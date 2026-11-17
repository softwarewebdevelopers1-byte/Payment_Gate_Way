import DotEnv from "../../configs/DotEnv.js";
import GenerateB2CCredential from "../../security/B2C/GenerateB2CCredential.js";
import GetAccessToken from "../../security/C2B/GenerateSafAccessToken.js";

interface B2CPayoutParams {
  phoneNumber: string; // Recipient (e.g., Landlord: 2547XXXXXXXX)
  amount: number;
  internalTxId: string;
  remarks?: string;
}

async function MpesaB2CPayout({
  phoneNumber,
  amount,
  internalTxId,
  remarks = "Payout disbursement",
}: B2CPayoutParams) {
  try {
    const accessToken = await GetAccessToken();
    const securityCredential = GenerateB2CCredential();

    const payload = {
      OriginatorConversationID: internalTxId, //  Required by Daraja B2C API
      InitiatorName: DotEnv().B2CInitiatorName,
      SecurityCredential: securityCredential,
      CommandID: "BusinessPayment", // Use 'SalaryPayment', 'BusinessPayment', or 'PromotionPayment'
      Amount: amount,
      PartyA: DotEnv().B2CShortCode, // Your paybill/till disbursing the money
      PartyB: phoneNumber, // Recipient phone number
      Remarks: remarks,
      QueueTimeOutURL: DotEnv().B2CQueueTimeoutUrl,
      ResultURL: DotEnv().B2CResultUrl,
      Occasion: internalTxId, // Pass your internal transaction ID to track it in callbacks
    };

    const response = await fetch(DotEnv().B2CPayoutUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("B2C Payout Request Initialized:", data);

    return data;
  } catch (error) {
    console.error("Error executing M-Pesa B2C payout:", error);
    throw error;
  }
}

export default MpesaB2CPayout;
