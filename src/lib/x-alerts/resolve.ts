import { shortAddress } from "@/lib/config";
import { hasPrivyCredentials, xAlertsConfig } from "./config";

type PrivyLinkedAccount = {
  type?: string;
  username?: string | null;
  address?: string | null;
};

type PrivyUser = {
  linked_accounts?: PrivyLinkedAccount[];
};

const handleCache = new Map<string, string | null>();

function basicAuth(appId: string, appSecret: string): string {
  return Buffer.from(`${appId}:${appSecret}`).toString("base64");
}

function twitterUsernameFromUser(user: PrivyUser | null): string | null {
  const accounts = user?.linked_accounts ?? [];
  for (const account of accounts) {
    if (account.type === "twitter_oauth" || account.type === "twitter") {
      const username = account.username?.trim().replace(/^@/, "");
      if (username) return username;
    }
  }
  return null;
}

/**
 * Resolve an Arc wallet to an X handle via Privy when the wallet is linked.
 * Returns `@handle` or a shortened `0x…` fallback (no leading @ on addresses).
 */
export async function displayNameForAddress(
  address: `0x${string}`,
): Promise<string> {
  const key = address.toLowerCase();
  if (handleCache.has(key)) {
    const cached = handleCache.get(key);
    return cached ? `@${cached}` : shortAddress(address);
  }

  if (!hasPrivyCredentials()) {
    return shortAddress(address);
  }

  try {
    const res = await fetch("https://api.privy.io/v1/users/wallet/address", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth(
          xAlertsConfig.privyAppId,
          xAlertsConfig.privyAppSecret,
        )}`,
        "Content-Type": "application/json",
        "privy-app-id": xAlertsConfig.privyAppId,
      },
      body: JSON.stringify({ address }),
    });

    if (res.status === 404) {
      handleCache.set(key, null);
      return shortAddress(address);
    }

    if (!res.ok) {
      const body = await res.text();
      console.warn(
        `[x-alerts] Privy lookup ${res.status} for ${shortAddress(address)}: ${body.slice(0, 120)}`,
      );
      return shortAddress(address);
    }

    const user = (await res.json()) as PrivyUser;
    const username = twitterUsernameFromUser(user);
    handleCache.set(key, username);
    return username ? `@${username}` : shortAddress(address);
  } catch (err) {
    console.warn(
      `[x-alerts] Privy lookup failed for ${shortAddress(address)}:`,
      err,
    );
    return shortAddress(address);
  }
}
