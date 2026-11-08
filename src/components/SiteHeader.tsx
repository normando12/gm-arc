"use client";

import { BrandMark } from "@/components/BrandMark";

export function SiteHeader() {
  return (
    <header className="site-header">
      <a className="header-brand" href="/" aria-label="GM ARC home">
        <BrandMark />
      </a>
      <div className="header-right">
        <span className="header-network">
          <span className="header-a" aria-hidden />
          ARC MAINNET
        </span>
      </div>
    </header>
  );
}
