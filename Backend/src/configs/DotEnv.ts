import dotenv from "dotenv";
import path from "path";
import DotEnvTypes from "../types/DotEvType.js";

dotenv.config({ path: path.resolve(`${process.cwd()}`, ".env") });

function DotEnv(): DotEnvTypes {
  const CorsOrigins: string = process.env.CORS_ORIGINS || "";
  const ArrayOfCrossOrigins: string[] = CorsOrigins.split(",");

  return {
    DatabaseUrl: process.env.DATABASE_URL
      ? process.env.DATABASE_URL
      : process.exit(1),
    ServerPort: process.env.SERVER_PORT || "8000",
    Environment: process.env.ENVIRONMENT || "Development",
    ConsumerKey: process.env.CONSUMER_KEY
      ? process.env.CONSUMER_KEY
      : process.exit(1),
    ConsumerSecret: process.env.CONSUMER_SECRET
      ? process.env.CONSUMER_SECRET
      : process.exit(1),
    PassKey: process.env.PASSKEY ? process.env.PASSKEY : process.exit(1),
    ShortCode: process.env.SHORT_CODE
      ? process.env.SHORT_CODE
      : process.exit(1),
    StkPushUrl: process.env.STK_PUSH_URL
      ? process.env.STK_PUSH_URL
      : process.exit(1),
    AccessTokenUrlParser: process.env.URL_ACCESS_TOKEN_PARSER
      ? process.env.URL_ACCESS_TOKEN_PARSER
      : process.exit(1),
    CallBackUrl: process.env.PAYMENT_CALLBACK_URL
      ? process.env.PAYMENT_CALLBACK_URL
      : process.exit(1),
    PaymentStatusQueryUrl: process.env.PAYMENT_STATUS_QUERY_URL
      ? process.env.PAYMENT_STATUS_QUERY_URL
      : "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query",
    CorsOrigins: ArrayOfCrossOrigins,

    // 🚀 New B2C Environment Bindings
    B2CInitiatorName: process.env.B2C_INITIATOR_NAME
      ? process.env.B2C_INITIATOR_NAME
      : process.exit(1),
    B2CInitiatorPassword: process.env.B2C_INITIATOR_PASSWORD
      ? process.env.B2C_INITIATOR_PASSWORD
      : process.exit(1),
    B2CShortCode: process.env.B2C_SHORT_CODE
      ? process.env.B2C_SHORT_CODE
      : process.exit(1),
    B2CPayoutUrl: process.env.B2C_PAYOUT_URL
      ? process.env.B2C_PAYOUT_URL
      : "https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest",
    B2CResultUrl: process.env.B2C_RESULT_URL
      ? process.env.B2C_RESULT_URL
      : process.exit(1),
    B2CQueueTimeoutUrl: process.env.B2C_QUEUE_TIMEOUT_URL
      ? process.env.B2C_QUEUE_TIMEOUT_URL
      : process.exit(1),
    JwtSecretKey: process.env.JWT_SECRET
      ? process.env.JWT_SECRET
      : process.exit(1),
  };
}

export default DotEnv;
