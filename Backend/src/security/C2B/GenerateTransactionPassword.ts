import DotEnv from "../../configs/DotEnv.js";

function GenerateTrasactionPassword(): string {
  // 1. Define your credentials
  const ShortCode = DotEnv().ShortCode;
  const Passkey = DotEnv().PassKey;

  // 2. Generate current timestamp in YYYYMMDDHHMMSS format
  const Now = new Date();
  const timestamp =
    Now.getFullYear().toString() +
    String(Now.getMonth() + 1).padStart(2, "0") +
    String(Now.getDate()).padStart(2, "0") +
    String(Now.getHours()).padStart(2, "0") +
    String(Now.getMinutes()).padStart(2, "0") +
    String(Now.getSeconds()).padStart(2, "0");

  // 3. Concatenate and encode to Base64 using Node.js Buffer
  const RawString = `${ShortCode}${Passkey}${timestamp}`;
  return Buffer.from(RawString).toString("base64");
}
export default GenerateTrasactionPassword;
