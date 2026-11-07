"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAccount } from "wagmi";
import {
  postWalletXHandle,
  requestXHandleRegistration,
  X_HANDLE_REGISTER_EVENT,
} from "@/lib/x-handle-client";

/**
 * When the user is signed in with X (Privy) and has a wagmi wallet connected,
 * register wallet → @handle so the X GM+ cron can mention them by handle.
 *
 * Also listens for `gm-arc:register-x-handle` (fired after Connect wallet /
 * Sign in with X) so registration runs on those explicit paths.
 */
export function RegisterXHandle() {
  const { ready, authenticated, getAccessToken, user } = usePrivy();
  const { address, isConnected } = useAccount();
  /** Last successfully registered pair — do not skip in-flight on Strict Mode remount. */
  const lastOkKey = useRef<string | null>(null);
  const inFlight = useRef(false);

  const register = useCallback(async (): Promise<boolean> => {
    if (!ready || !authenticated || !isConnected || !address) return false;

    const username = user?.twitter?.username?.trim();
    if (!username) return false;

    const key = `${address.toLowerCase()}:${username.toLowerCase()}`;
    if (lastOkKey.current === key || inFlight.current) return lastOkKey.current === key;

    inFlight.current = true;
    try {
      const token = await getAccessToken();
      if (!token) return false;

      const result = await postWalletXHandle({ address, accessToken: token });
      if (!result.ok) {
        console.warn("[x-handle] register failed", result.status, result.error);
        return false;
      }

      lastOkKey.current = key;
      console.info("[x-handle] registered", address.toLowerCase(), result.username);
      return true;
    } catch (err) {
      console.warn("[x-handle] register error", err);
      return false;
    } finally {
      inFlight.current = false;
    }
  }, [
    ready,
    authenticated,
    isConnected,
    address,
    user?.twitter?.username,
    getAccessToken,
  ]);

  // Auto: whenever both X session + wallet are present (reconnect / hydration).
  useEffect(() => {
    void register();
  }, [register]);

  // Explicit connect / sign-in paths.
  useEffect(() => {
    const onRequest = () => {
      void register();
    };
    window.addEventListener(X_HANDLE_REGISTER_EVENT, onRequest);
    return () => window.removeEventListener(X_HANDLE_REGISTER_EVENT, onRequest);
  }, [register]);

  return null;
}

/** Re-export for Connect / Sign-in call sites. */
export { requestXHandleRegistration };
