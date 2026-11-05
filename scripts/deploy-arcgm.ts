/**
 * Deploy ArcGM v2 (Option A fees) to Arc mainnet.
 *
 * Prerequisites:
 *   - Funded deployer wallet on Arc (USDC for gas)
 *   - PRIVATE_KEY in env (never commit)
 *
 *   OWNER=0xe8fE5893E7eeC69DF7B06787b8b25dd64CeC3773 \
 *   PRIVATE_KEY=0x… \
 *   npm run deploy:arcgm
 *
 * After success: set NEXT_PUBLIC_CONTRACT_ADDRESS to the printed address on Vercel,
 * reset X-alerts cursor if needed, Redeploy.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import solc from "solc";
import {
  createPublicClient,
  createWalletClient,
  encodeDeployData,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arc } from "../src/lib/arc";

const DEFAULT_OWNER = "0xe8fE5893E7eeC69DF7B06787b8b25dd64CeC3773" as const;

function compileArcGm(): { abi: unknown; bytecode: Hex } {
  const sourcePath = path.join(process.cwd(), "contracts/ArcGM.sol");
  const source = readFileSync(sourcePath, "utf8");
  const input = {
    language: "Solidity",
    sources: { "ArcGM.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode.object"] },
      },
    },
  };
  const raw = solc.compile(JSON.stringify(input));
  const out = JSON.parse(raw) as {
    errors?: Array<{ severity: string; formattedMessage: string }>;
    contracts: {
      "ArcGM.sol": {
        ArcGM: { abi: unknown; evm: { bytecode: { object: string } } };
      };
    };
  };
  const errors = (out.errors || []).filter((e) => e.severity === "error");
  if (errors.length) {
    throw new Error(errors.map((e) => e.formattedMessage).join("\n"));
  }
  const art = out.contracts["ArcGM.sol"].ArcGM;
  const object = art.evm.bytecode.object;
  if (!object) throw new Error("Empty bytecode");
  return { abi: art.abi, bytecode: `0x${object}` as Hex };
}

async function main() {
  const pk = process.env.PRIVATE_KEY?.trim();
  if (!pk) {
    throw new Error("Set PRIVATE_KEY (0x…) — do not commit it");
  }
  const owner = (process.env.OWNER?.trim() || DEFAULT_OWNER) as `0x${string}`;

  const { abi, bytecode } = compileArcGm();
  const account = privateKeyToAccount(pk as Hex);
  const publicClient = createPublicClient({
    chain: arc,
    transport: http(process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io"),
  });
  const walletClient = createWalletClient({
    account,
    chain: arc,
    transport: http(process.env.ARC_RPC_URL || "https://rpc.mainnet.arc.io"),
  });

  // solc ABI is untyped JSON — cast for viem encode helpers
  const data = encodeDeployData({
    abi: abi as Parameters<typeof encodeDeployData>[0]["abi"],
    bytecode,
    args: [owner],
  } as Parameters<typeof encodeDeployData>[0]);

  console.log("Deployer:", account.address);
  console.log("Owner:  ", owner);
  console.log("Chain:  ", arc.id, arc.name);

  const hash = await walletClient.sendTransaction({
    data,
  });
  console.log("Deploy tx:", hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) {
    throw new Error("No contractAddress in receipt");
  }
  console.log("Contract:", receipt.contractAddress);
  console.log("Explorer:", `https://explorer.arc.io/address/${receipt.contractAddress}`);
  console.log("\nNext:");
  console.log(
    `  NEXT_PUBLIC_CONTRACT_ADDRESS=${receipt.contractAddress}`,
  );
  console.log("  Redeploy Vercel Production with that env.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
