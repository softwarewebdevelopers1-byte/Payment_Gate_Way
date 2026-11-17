export default interface QueryPaymentReturnedData {
  ResponseCode?: string;
  ResponseDescription?: string;
  MerchantRequestID?: string;
  CheckoutRequestID?: string;
  ResultCode?: string | number;
  ResultDesc?: string;
  errorCode?: string;
  errorMessage?: string;
  fault?: {
    faultstring?: string;
    detail?: {
      errorcode?: string;
    };
  };
}
