/**
 * Client helper: POST wallet → X handle for GM+ tweet labels.
 * Server verifies the Privy access token and reads the twitter username.
 */
export async function postWalletXHandle(params: {
  address: string;
  accessToken: string;
}): Promise<{ ok: boolean; status: number; username?: string; error?: string }> {
  const res = await fetch("/api/x-handle", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ address: params.address }),
  });

  let body: { ok?: boolean; username?: string; error?: string } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    /* ignore */
  }

  if (!res.ok || !body.ok) {
    return {
      ok: false,
      status: res.status,
      error: body.error || `HTTP ${res.status}`,
    };
  }

  return { ok: true, status: res.status, username: body.username };
}

/** Browser events that should re-attempt wallet↔handle registration. */
export const X_HANDLE_REGISTER_EVENT = "gm-arc:register-x-handle";

export function requestXHandleRegistration(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(X_HANDLE_REGISTER_EVENT));
}
