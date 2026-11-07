import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { isAddress } from "viem";
import { hasUpstash, xAlertsConfig } from "./config";

/** Upstash / local map: wallet (lowercase) → X username (no @). */
export const X_HANDLE_KEY_PREFIX = "gm-arc:x-handle:";

const memoryHandles = new Map<string, string>();

function normalizeAddress(address: string): string | null {
  const trimmed = address.trim();
  if (!isAddress(trimmed)) return null;
  return trimmed.toLowerCase();
}

function normalizeUsername(username: string): string | null {
  const cleaned = username.trim().replace(/^@/, "");
  if (!/^[A-Za-z0-9_]{1,15}$/.test(cleaned)) return null;
  return cleaned;
}

function redisKey(addressLower: string): string {
  return `${X_HANDLE_KEY_PREFIX}${addressLower}`;
}

function localHandlesPath(): string {
  return path.join(process.cwd(), ".data", "x-handles.json");
}

async function upstashCommand(command: unknown[]): Promise<unknown> {
  const res = await fetch(xAlertsConfig.upstashUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${xAlertsConfig.upstashToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Upstash ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { result?: unknown };
  return json.result;
}

async function loadLocalMap(): Promise<Record<string, string>> {
  try {
    const text = await readFile(localHandlesPath(), "utf8");
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string" && normalizeUsername(v)) {
        out[k.toLowerCase()] = normalizeUsername(v)!;
      }
    }
    return out;
  } catch {
    return {};
  }
}

async function saveLocalMap(map: Record<string, string>): Promise<void> {
  const file = localHandlesPath();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(map, null, 2)}\n`, "utf8");
}

/**
 * Look up a registered X username for a wallet (no leading @).
 * Order: in-memory → Upstash → local JSON.
 */
export async function getRegisteredHandle(
  address: string,
): Promise<string | null> {
  const key = normalizeAddress(address);
  if (!key) return null;

  const mem = memoryHandles.get(key);
  if (mem) return mem;

  if (hasUpstash()) {
    try {
      const result = await upstashCommand(["GET", redisKey(key)]);
      if (typeof result === "string" && result) {
        const username = normalizeUsername(result);
        if (username) {
          memoryHandles.set(key, username);
          return username;
        }
      }
    } catch (err) {
      console.warn("[x-alerts] handle registry GET failed:", err);
    }
  }

  const local = await loadLocalMap();
  const fromLocal = local[key];
  if (fromLocal) {
    memoryHandles.set(key, fromLocal);
    return fromLocal;
  }

  return null;
}

/**
 * Persist wallet → X username for cron tweet labels.
 * Returns the stored username (no @) or null if inputs are invalid.
 */
export async function setRegisteredHandle(
  address: string,
  username: string,
): Promise<string | null> {
  const key = normalizeAddress(address);
  const handle = normalizeUsername(username);
  if (!key || !handle) return null;

  memoryHandles.set(key, handle);

  if (hasUpstash()) {
    try {
      // 180 days — re-register on next visit keeps it fresh.
      await upstashCommand(["SET", redisKey(key), handle, "EX", 15_552_000]);
      return handle;
    } catch (err) {
      console.warn("[x-alerts] handle registry SET failed:", err);
    }
  }

  try {
    const map = await loadLocalMap();
    map[key] = handle;
    await saveLocalMap(map);
  } catch {
    try {
      const tmp = path.join("/tmp", "gm-arc-x-handles.json");
      const existing = await readFile(tmp, "utf8")
        .then((t) => JSON.parse(t) as Record<string, string>)
        .catch(() => ({} as Record<string, string>));
      existing[key] = handle;
      await writeFile(tmp, `${JSON.stringify(existing, null, 2)}\n`, "utf8");
    } catch {
      /* memory only */
    }
  }

  return handle;
}
