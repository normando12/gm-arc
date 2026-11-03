import { DawnBackground } from "@/components/DawnBackground";
import { GmConsole } from "@/components/GmConsole";
import { ARC_DOCS_URL, GM_PLUS_FEE_USDC, IS_MOCK_MODE } from "@/lib/config";

export default function Home() {
  return (
    <div className="page">
      <DawnBackground />

      <header className="site-header">
        <span>Arc Mainnet</span>
        <a href={ARC_DOCS_URL} target="_blank" rel="noreferrer">
          Network docs
        </a>
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
      </main>

      <footer className="site-footer">
        <span className="mark-n" aria-hidden>
          N
        </span>
        <span>Inspired by gm.ink · built for Arc · v1 is GM and GM+ only</span>
      </footer>
    </div>
  );
}
