async function DispatchClientWebhook(
  clientCallbackUrl: string,
  transactionData: {
    internalTxId: string;
    serviceName: string;
    phoneNumber: string;
    amount: number;
    status: string;
    mpesaReceiptNumber?: string;
    resultCode?: number | string;
    resultDesc?: string;
  },
) {
  if (!clientCallbackUrl) {
    console.warn(
      `No client callback URL provided for transaction ${transactionData.internalTxId}`,
    );
    return;
  }

  try {
    console.log(
      `Dispatching webhook to ${transactionData.serviceName} at ${clientCallbackUrl}...`,
    );

    // Optional: Generate a signature or payload secret for security verification
    const payload = {
      event: "payment.updated",
      timestamp: new Date().toISOString(),
      data: transactionData,
    };

    const response = await fetch(clientCallbackUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // "X-Gateway-Signature": generateHmacSignature(payload) // Optional security signature
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `Failed to deliver webhook to ${clientCallbackUrl}. Status: ${response.status}`,
      );
      // TODO: Implement a retry queue (e.g., BullMQ) if downstream service is down
    } else {
      console.log(
        `Webhook successfully delivered to ${transactionData.serviceName}!`,
      );
    }
  } catch (error) {
    console.error(
      `Network error dispatching webhook to ${clientCallbackUrl}:`,
      error,
    );
  }
}

export default DispatchClientWebhook;
