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

export function formatAlertText(params: {
  kind: GmEventKind;
  fromLabel: string;
  toLabel?: string;
  txHash: `0x${string}`;
}): string {
  const link = explorerTx(params.txHash);
  const cta = "Have you GM’d today?";

  if (params.kind === "GMPlus" && params.toLabel) {
    return `GM sent from ${params.fromLabel} to ${params.toLabel}. ${cta}\n${link}`;
  }

  return `GM from ${params.fromLabel}. ${cta}\n${link}`;
}
