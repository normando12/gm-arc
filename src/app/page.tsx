import { FloatingSideBubbles } from "@/components/FloatingSideBubbles";
import { GmConsole } from "@/components/GmConsole";
import { SiteHeader } from "@/components/SiteHeader";
import { SpaceTalkshowBackground } from "@/components/SpaceTalkshowBackground";
import {
  ARC_BRIDGE_URL,
  GM_PLUS_FEE_USDC,
  GM_PLUS_FRIEND_TIP_USDC,
  GM_PLUS_OWNER_FEE_USDC,
  IS_MOCK_MODE,
} from "@/lib/config";
import { GM_ARC_X_MENTION, GM_ARC_X_URL } from "@/lib/privy";

export default function Home() {
  return (
    <div className="page">
      <SpaceTalkshowBackground />

      <SiteHeader />

      <section className="hero-banner" aria-label="GM ARC talk-show banner">
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative hero cast strip */}
        <img
          className="hero-banner-img"
          src="/talkshow-banner-sam-tim-v4.jpg"
          alt="GM ARC space talk-show panel — cast behind the desk with GM speech bubble and ARC NETWORK"
        />
        <div className="hero-banner-fade" aria-hidden />
      </section>

      <main className="site-main">
        <h1 className="sr-only">GM ARC</h1>
        <p className="tagline">
          Say good morning onchain. One tap a day — or send a GM+ to a fren.
        </p>
        <p className="status-line">
          Free GM · GM+ {GM_PLUS_FEE_USDC} USDC ({GM_PLUS_FRIEND_TIP_USDC} tip +{" "}
          {GM_PLUS_OWNER_FEE_USDC} ops)
          {IS_MOCK_MODE ? " · running in mock mode" : ""}
        </p>
        <div className="console-stage">
          <FloatingSideBubbles />
          <GmConsole />
        </div>
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
