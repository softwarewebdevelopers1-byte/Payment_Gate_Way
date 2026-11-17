import crypto from "crypto";
import fs from "fs";
import path from "path";
import DotEnv from "../../configs/DotEnv.js";

function GenerateB2CCredential(): string {
  try {
    const initiatorPassword = DotEnv().B2CInitiatorPassword;

    const certPath = path.resolve(
      process.cwd(),
      "src/certs/SandboxCertificate.cer",
    );

    // FIX: Read as a raw Buffer (omit 'utf8') so the DER certificate bytes stay intact
    const publicKey = fs.readFileSync(certPath);

    // Encrypt using RSA public key (PKCS1 padding)
    const buffer = Buffer.from(initiatorPassword, "utf8");
    const encrypted = crypto.publicEncrypt(
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PADDING,
      },
      buffer,
    );

    return encrypted.toString("base64");
  } catch (error) {
    console.error("Error generating B2C security credential:", error);
    throw new Error("Failed to generate B2C security credential");
  }
}

export default GenerateB2CCredential;
