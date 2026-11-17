import express, { Request, Response } from "express";
import helmet from "helmet";
import mongoose from "mongoose"; // Or your specific DB driver client
import DbConnect from "./configs/Database/DbConnect.js";
import DotEnv from "./configs/DotEnv.js";
import BannerLabel from "./configs/Banner.js";
import cors from "cors";
import StartPaymentReconciliationWorker from "./workers/VerifyPaymentStatus.js";
import StkPushRouter from "./Controllers/C2B_controllers/MpseaStkPushController.js";
import CallBackRouter from "./Controllers/C2B_controllers/MpesaPaymentCallBack.js";
import QueryPaymentRouter from "./Controllers/C2B_controllers/QueryPaymentController.js";
import B2CCallbackRouter from "./Controllers/B2C_controllers/B2CCallback.js";

const app = express();

app.use(express.json());
app.use(helmet());
app.use(
  cors({
    origin: DotEnv().CorsOrigins,
    credentials: true,
    allowedHeaders: ["GET", "POST", "PATCH", "OPTIONS", "PUT"],
  }),
);
// start cron job
StartPaymentReconciliationWorker();
// Connect to Database
DbConnect();
// C2B ROUTERS
app.use("/api/v1", StkPushRouter);
app.use("/api/v1", CallBackRouter);
app.use("/api/v1", QueryPaymentRouter);

// B2C ROUTERS
app.use("/api/v1", B2CCallbackRouter);

// for unhandled API endpoints
app.use((req: Request, res: Response) => {
  const AuthHeader = req.headers.authorization;
  if (!AuthHeader) {
    return res.status(403).json({
      success: false,
      error: "forbidden",
    });
  } else if (
    !AuthHeader.startsWith("Bearer") ||
    !AuthHeader.startsWith("Basic")
  ) {
    return res.status(403).json({
      success: false,
      error: "forbidden",
    });
  }
  res.status(404).json({
    error: `endpoint ${req?.url ? req?.url : "/"} not found for method ${req?.method ? req?.method : "/"}`,
  });
});
const PORT = DotEnv().ServerPort;

const server = app.listen(PORT, () => {
  BannerLabel();
});

// Graceful Shutdown Function
async function GracefulShutDown(signal: string) {
  console.log(
    `\n[${signal}] Received termination signal. Starting graceful shutdown...`,
  );

  // 1. Stop the HTTP server from accepting new connections
  server.close(async () => {
    console.log("HTTP server closed. No longer accepting new requests.");

    try {
      // 2. Close Database Connections cleanly
      // (Example using Mongoose; adjust if you use MongoDB native driver or SQL/Prisma)
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close(false);
        console.log("Database connection closed successfully.");
      }

      console.log("Graceful shutdown complete. Exiting process.");
      process.exit(0);
    } catch (error) {
      console.error("Error during database shutdown:", error);
      process.exit(1);
    }
  });

  // 3. Force shutdown fallback (Safety net if connections hang)
  setTimeout(() => {
    console.error(
      "Could not close connections in time, forcefully shutting down process.",
    );
    process.exit(1);
  }, 10000); // 10-second timeout limit
}

// Listen for termination (SIGTERM) and interruption (SIGINT) signals
process.on("SIGTERM", () => GracefulShutDown("SIGTERM"));
process.on("SIGINT", () => GracefulShutDown("SIGINT"));
