/**
 * Resolve the scan start block for one cron run.
 * START_BLOCK always wins. Otherwise resume cursor, but if lag behind tip
 * exceeds autoJumpLag, jump to tip − lookback (Hobby-safe; still capped later).
 */
export function resolveFromBlock(params: {
  tip: number;
  cursorLastBlock: number | null;
  startBlock: number | null;
  lookbackBlocks: number;
  autoJumpLagBlocks: number;
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
      return {
        fromBlock: Math.max(0, tip - lookbackBlocks),
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
