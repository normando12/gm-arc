import { DawnBackground } from "@/components/DawnBackground";
import { GmConsole } from "@/components/GmConsole";
import {
  ARC_BRIDGE_URL,
  ARC_DOCS_URL,
  GM_PLUS_FEE_USDC,
  IS_MOCK_MODE,
} from "@/lib/config";

export default function Home() {
  return (
    <div className="page">
      <DawnBackground />

      <header className="site-header">
        <span className="chip chip--left">Arc Mainnet</span>
        <a
          className="chip chip--right"
          href={ARC_DOCS_URL}
          target="_blank"
          rel="noreferrer"
        >
          Network Docs
        </a>
      </header>

      <main className="site-main">
        <h1 className="brand">
          gm<span className="brand-dot">.</span>arc
        </h1>
        <p className="tagline">
          Say good morning onchain. One tap a day — or send a GM+ to a fren.
        </p>
        <p className="status-line">
          Free GM · GM+ {GM_PLUS_FEE_USDC} USDC
          {IS_MOCK_MODE ? " · running in mock mode" : ""}
        </p>
        <GmConsole />
        <p className="bridge-cta">
          <a href={ARC_BRIDGE_URL} target="_blank" rel="noopener noreferrer">
            Bridge USDC to Arc
          </a>
        </p>
      </main>

      <footer className="site-footer">
        <span>Built on Arc for the community</span>
      </footer>
    </div>
  );
}
