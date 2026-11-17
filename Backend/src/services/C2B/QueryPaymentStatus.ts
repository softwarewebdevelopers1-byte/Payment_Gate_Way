import DotEnv from "../../configs/DotEnv.js";
import GetAccessToken from "../../security/C2B/GenerateSafAccessToken.js";
import GenerateTrasactionPassword from "../../security/C2B/GenerateTransactionPassword.js";
import QueryPaymentReturnedData from "../../types/QueryPaymentReturnData.js";
import GenerateTimeStamp from "../GenerateTimeStamp.js";

async function PaymentStatusQuery(
  PaymentRequestId: string,
): Promise<QueryPaymentReturnedData> {
  try {
    // 1. Await the async token function to get the actual string
    const accessToken = await GetAccessToken();

    // 2. Await the fetch network request
    const response = await fetch(DotEnv().PaymentStatusQueryUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: DotEnv().ShortCode,
        Password: GenerateTrasactionPassword(),
        Timestamp: GenerateTimeStamp(),
        CheckoutRequestID: PaymentRequestId,
      }),
    });

    // 3. Await the JSON parsing of the response
    const Data: QueryPaymentReturnedData = await response.json();
    return Data;
  } catch (error) {
    console.error("Error querying payment status:", error);
    return {
      ResponseCode: "",
      ResponseDescription: "",
      MerchantRequestID: "",
      CheckoutRequestID: "",
      ResultCode: "",
      ResultDesc: "",
    };
  }
}

export default PaymentStatusQuery;
