import DotEnv from "../../configs/DotEnv.js";

function GenerateSafAuthToken(): string {
  const ConsumerKey = DotEnv().ConsumerKey;
  const ConsumerSecret = DotEnv().ConsumerSecret;
  const Credentials = Buffer.from(`${ConsumerKey}:${ConsumerSecret}`).toString(
    "base64",
  );
  return Credentials;
}

export default GenerateSafAuthToken;
