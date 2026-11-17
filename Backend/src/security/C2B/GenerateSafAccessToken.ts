// src/services/GetAccessToken.ts
import DotEnv from "../../configs/DotEnv.js";
import GenerateSafAuthToken from "./GenerateSafAuthToken.js";

async function GetAccessToken(): Promise<string> {
  const credentials = GenerateSafAuthToken();
  const authUrl = DotEnv().AccessTokenUrlParser;

  const response = await fetch(authUrl, {
    method: "GET",
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  const data = await response.json();

  if (!data.access_token) {
    throw new Error(`Failed to generate access token: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

export default GetAccessToken;
