import { TwitterApi } from "twitter-api-v2";
import { hasXCredentials, xAlertsConfig } from "./config";

export function createXClient(): TwitterApi | null {
  if (!hasXCredentials()) return null;
  return new TwitterApi({
    appKey: xAlertsConfig.xApiKey,
    appSecret: xAlertsConfig.xApiKeySecret,
    accessToken: xAlertsConfig.xAccessToken,
    accessSecret: xAlertsConfig.xAccessTokenSecret,
  });
}

export async function postTweet(text: string): Promise<{ id: string }> {
  const client = createXClient();
  if (!client) {
    throw new Error("X credentials not configured");
  }
  const result = await client.v2.tweet(text);
  return { id: result.data.id };
}
