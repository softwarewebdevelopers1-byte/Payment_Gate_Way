import { Request, Response, Router } from "express";
import SendStkPush from "../../services/C2B/MpesaStkPush.js";
import ValidateStkPush from "../../middleware/C2B/StkPushValidator.js";
import { verifyRequestSignature } from "../../security/requestFilter/VerifyRequests.js";

const StkPushRouter = Router();

StkPushRouter.post(
  "/stk/push",
  ValidateStkPush,
  verifyRequestSignature,
  async (req: Request, res: Response) => {
    try {
      const { PhoneNumber, Amount, ServiceName, ClientCallbackUrl } = req.body;

      // Pass all parameters into your updated SendStkPush service
      await SendStkPush(
        PhoneNumber,
        Amount,
        res,
        ServiceName,
        ClientCallbackUrl,
      );
    } catch (error) {
      console.error("Router error handling STK push:", error);
      if (!res.headersSent) {
        return res.status(500).json({
          success: false,
          error: "Internal gateway server error",
        });
      }
    }
  },
);

export default StkPushRouter;
