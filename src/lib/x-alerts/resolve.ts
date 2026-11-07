import { PrivyClient, type User } from "@privy-io/server-auth";
import { shortAddress } from "@/lib/config";
import { hasPrivyCredentials, xAlertsConfig } from "./config";
import { getRegisteredHandle } from "./handles";

type PrivyLinkedAccount = {
  type?: string;
  username?: string | null;
  address?: string | null;
};

type PrivyUserJson = {
  linked_accounts?: PrivyLinkedAccount[];
  twitter?: { username?: string | null } | null;
};

/** In-process cache: address → username (no @) or null (known miss). */
const handleCache = new Map<string, string | null>();

let privyClient: PrivyClient | null = null;

function getPrivyClient(): PrivyClient | null {
  if (!hasPrivyCredentials()) return null;
  if (!privyClient) {
    privyClient = new PrivyClient(
      xAlertsConfig.privyAppId,
      xAlertsConfig.privyAppSecret,
    );
  }
  return privyClient;
}

function basicAuth(appId: string, appSecret: string): string {
  return Buffer.from(`${appId}:${appSecret}`).toString("base64");
}

function normalizeUsername(raw: string | null | undefined): string | null {
  const username = raw?.trim().replace(/^@/, "");
  if (!username || !/^[A-Za-z0-9_]{1,15}$/.test(username)) return null;
  return username;
}

function twitterUsernameFromLinkedAccounts(
  accounts: PrivyLinkedAccount[] | undefined,
): string | null {
  for (const account of accounts ?? []) {
    if (account.type === "twitter_oauth" || account.type === "twitter") {
      const username = normalizeUsername(account.username);
      if (username) return username;
    }
  }
  return null;
}

function twitterUsernameFromUser(
  user: User | PrivyUserJson | null,
): string | null {
  if (!user) return null;

  const fromSdk =
    "twitter" in user ? normalizeUsername(user.twitter?.username) : null;
  if (fromSdk) return fromSdk;

  if ("linkedAccounts" in user && Array.isArray(user.linkedAccounts)) {
    const fromCamel = twitterUsernameFromLinkedAccounts(
      user.linkedAccounts as PrivyLinkedAccount[],
    );
    if (fromCamel) return fromCamel;
  }

  if ("linked_accounts" in user) {
    return twitterUsernameFromLinkedAccounts(user.linked_accounts);
  }

  return null;
}

async function privyLookupViaSdk(
  address: `0x${string}`,
): Promise<string | null> {
  const client = getPrivyClient();
  if (!client) return null;
  try {
    const user = await client.getUserByWalletAddress(address);
    return twitterUsernameFromUser(user);
  } catch (err) {
    // 404 / not found surfaces as thrown error in some SDK versions.
    const msg = err instanceof Error ? err.message : String(err);
    if (!/404|not found|no user/i.test(msg)) {
      console.warn(
        `[x-alerts] Privy SDK lookup failed for ${shortAddress(address)}:`,
        msg.slice(0, 160),
      );
    }
    return null;
  }
}

/**
 * Fallback REST lookup — tries api.privy.io then auth.privy.io.
 */
async function privyLookupViaRest(
  address: `0x${string}`,
): Promise<string | null> {
  if (!hasPrivyCredentials()) return null;

  const headers = {
    Authorization: `Basic ${basicAuth(
      xAlertsConfig.privyAppId,
      xAlertsConfig.privyAppSecret,
    )}`,
    "Content-Type": "application/json",
    "privy-app-id": xAlertsConfig.privyAppId,
  };
  const body = JSON.stringify({ address });
  const urls = [
    "https://api.privy.io/v1/users/wallet/address",
    "https://auth.privy.io/api/v1/users/wallet/address",
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "POST", headers, body });
      if (res.status === 404) continue;
      if (!res.ok) {
        const text = await res.text();
        console.warn(
          `[x-alerts] Privy REST ${res.status} (${url}): ${text.slice(0, 120)}`,
        );
        continue;
      }
      const user = (await res.json()) as PrivyUserJson;
      const username = twitterUsernameFromUser(user);
      if (username) return username;
    } catch (err) {
      console.warn(
        `[x-alerts] Privy REST failed (${url}) for ${shortAddress(address)}:`,
        err,
      );
    }
  }
  return null;
}

/**
 * Resolve an Arc wallet to an X handle.
 * Order: in-memory → app registry (Upstash/local) → Privy wallet link → short address.
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

  const registered = await getRegisteredHandle(address);
  if (registered) {
    handleCache.set(key, registered);
    return `@${registered}`;
  }

  if (!hasPrivyCredentials()) {
    handleCache.set(key, null);
    return shortAddress(address);
  }

  const fromSdk = await privyLookupViaSdk(address);
  if (fromSdk) {
    handleCache.set(key, fromSdk);
    return `@${fromSdk}`;
  }

  const fromRest = await privyLookupViaRest(address);
  if (fromRest) {
    handleCache.set(key, fromRest);
    return `@${fromRest}`;
  }

  handleCache.set(key, null);
  return shortAddress(address);
}

/** Test helper — clear in-process resolve cache. */
export function clearDisplayNameCache(): void {
  handleCache.clear();
}
