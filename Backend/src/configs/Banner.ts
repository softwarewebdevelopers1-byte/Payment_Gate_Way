import { printBanner as Print } from "node-cli-banner";
import DotEnv from "./DotEnv.js";
function BannerLabel() {
  const PORT = DotEnv().ServerPort;

  Print({
    title: "PAYMENT GATEWAY",
    version: "1.0.0",
    environment: DotEnv().Environment,
    fields: [
      { label: "Port", value: String(PORT) },
      { label: "Status", value: "Online 🚀" },
    ],
  });
}
export default BannerLabel;
