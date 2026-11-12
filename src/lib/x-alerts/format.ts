import { explorerTx } from "@/lib/config";

export type GmEventKind = "GM" | "GMPlus";

export type IndexedGmEvent = {
  kind: GmEventKind;
  from: `0x${string}`;
  to?: `0x${string}`;
  txHash: `0x${string}`;
  logIndex: number;
  blockNumber: bigint;
};

/** GM+ only — both parties required (Privy @handle or short address). */
export function formatAlertText(params: {
  fromLabel: string;
  toLabel: string;
  txHash: `0x${string}`;
}): string {
  const link = explorerTx(params.txHash);
  return `GM+ sent from ${params.fromLabel} to ${params.toLabel}. Have you said GM today? Return the kindness!\n${link}`;
}
