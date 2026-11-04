/** Public Privy app id — safe in the browser. Empty disables Privy UI. */
export const PRIVY_APP_ID =
  process.env.NEXT_PUBLIC_PRIVY_APP_ID?.trim() || "";

/** Optional Privy app client id for multi-environment apps. */
export const PRIVY_CLIENT_ID =
  process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID?.trim() || "";

/** Default public X account for gm-arc (override with NEXT_PUBLIC_GM_ARC_X_HANDLE). */
export const DEFAULT_GM_ARC_X_HANDLE = "GMARCxlm";

/**
 * Public X/Twitter handle for the gm-arc account (display / follow CTA).
 * Stored without leading @.
 */
export const GM_ARC_X_HANDLE =
  process.env.NEXT_PUBLIC_GM_ARC_X_HANDLE?.trim().replace(/^@/, "") ||
  DEFAULT_GM_ARC_X_HANDLE;

export const GM_ARC_X_URL = `https://x.com/${GM_ARC_X_HANDLE}`;
export const GM_ARC_X_MENTION = `@${GM_ARC_X_HANDLE}`;

/** Privy client features only run when an app id is configured. */
export const IS_PRIVY_ENABLED = Boolean(PRIVY_APP_ID);
