import { DawnBackground } from "@/components/DawnBackground";
import { GmConsole } from "@/components/GmConsole";
import {
  ARC_BRIDGE_URL,
  GM_PLUS_FEE_USDC,
  IS_MOCK_MODE,
} from "@/lib/config";
import { GM_ARC_X_MENTION, GM_ARC_X_URL } from "@/lib/privy";

export default function Home() {
  return (
    <div className="page">
      <DawnBackground />

      <header className="site-header">
        <span>ARC MAINNET</span>
      </header>

      <main className="site-main">
        <h1 className="brand">gm·arc</h1>
        <p className="tagline">
          Say good morning onchain. One tap a day — or send a GM+ to a fren.
        </p>
        <p className="status-line">
          Free GM · GM+ {GM_PLUS_FEE_USDC} USDC
          {IS_MOCK_MODE ? " · running in mock mode" : ""}
        </p>
        <GmConsole />
        <div className="after-console">
          <a
            className="bridge-cta"
            href={ARC_BRIDGE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Bridge USDC to Arc
          </a>
          <a
            className="x-follow"
            href={GM_ARC_X_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow {GM_ARC_X_MENTION}
          </a>
          <p className="footer-note">Built on Arc for the community</p>
        </div>
      </main>
    </div>
  );
}
