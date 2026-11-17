interface DotEnvTypes {
  DatabaseUrl: string;
  ServerPort: string;
  Environment: string;
  // C2B Configuration Fields
  ConsumerKey: string;
  ConsumerSecret: string;
  PassKey: string;
  ShortCode: string;
  StkPushUrl: string;
  AccessTokenUrlParser: string;
  CallBackUrl: string;
  PaymentStatusQueryUrl: string;
  CorsOrigins: string[];

  // New B2C Configuration Fields
  B2CInitiatorName: string;
  B2CInitiatorPassword: string;
  B2CShortCode: string;
  B2CPayoutUrl: string;
  B2CResultUrl: string;
  B2CQueueTimeoutUrl: string;

  // JWT
  JwtSecretKey: string;
}

export default DotEnvTypes;
