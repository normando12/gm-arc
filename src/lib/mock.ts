"use client";

const STORAGE_KEY = "gm-arc-mock-v1";
export const MOCK_WALLET = "0x4574dE8c0a5f0000000000000000000000002f43" as const;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type MockState = {
  lastGM: number | null;
  lastGmPlusTo: string | null;
  lastTx: string | null;
  lastKind: "gm" | "gmPlus" | null;
};

function empty(): MockState {
  return { lastGM: null, lastGmPlusTo: null, lastTx: null, lastKind: null };
}

export function loadMock(): MockState {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty();
    return { ...empty(), ...JSON.parse(raw) } as MockState;
  } catch {
    return empty();
  }
}

export function saveMock(state: MockState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetMock(): MockState {
  const next = empty();
  saveMock(next);
  return next;
}

export function mockNextGM(lastGM: number | null, now = Date.now()): number {
  if (!lastGM) return 0;
  const readyAt = lastGM + COOLDOWN_MS;
  if (now >= readyAt) return 0;
  return readyAt;
}

export function mockTxHash(seed: string): `0x${string}` {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hex = (h.toString(16) + Date.now().toString(16) + "0".repeat(64)).slice(
    0,
    64,
  );
  return `0x${hex}`;
}
