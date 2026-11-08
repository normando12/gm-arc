/**
 * Resolve the scan start block for one cron run.
 * START_BLOCK always wins. Otherwise resume cursor, but if lag behind tip
 * exceeds autoJumpLag, jump so this run's window covers the tip (Hobby-safe;
 * still capped later by maxScanBlocks).
 */
export function resolveFromBlock(params: {
  tip: number;
  cursorLastBlock: number | null;
  startBlock: number | null;
  lookbackBlocks: number;
  autoJumpLagBlocks: number;
  /** Used as the tip-anchored jump window (newest N blocks). */
  maxScanBlocks: number;
}): {
  fromBlock: number;
  startBlockOverride: boolean;
  autoJumped: boolean;
  lagBlocks: number | null;
} {
  const {
    tip,
    cursorLastBlock,
    startBlock,
    lookbackBlocks,
    autoJumpLagBlocks,
    maxScanBlocks,
  } = params;

  if (startBlock != null) {
    return {
      fromBlock: startBlock,
      startBlockOverride: true,
      autoJumped: false,
      lagBlocks: null,
    };
  }

  if (cursorLastBlock != null) {
    const resume = cursorLastBlock + 1;
    const lagBlocks = Math.max(0, tip - resume + 1);
    if (lagBlocks > autoJumpLagBlocks) {
      // Anchor at tip: scan the newest maxScan window (not tip−lookback, which
      // can miss GM+ still inside the lag but older than lookback).
      const window = Math.max(1, maxScanBlocks);
      return {
        fromBlock: Math.max(0, tip - window + 1),
        startBlockOverride: false,
        autoJumped: true,
        lagBlocks,
      };
    }
    return {
      fromBlock: resume,
      startBlockOverride: false,
      autoJumped: false,
      lagBlocks,
    };
  }

  return {
    fromBlock: Math.max(0, tip - lookbackBlocks),
    startBlockOverride: false,
    autoJumped: false,
    lagBlocks: null,
  };
}
