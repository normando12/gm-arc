"use client";

import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="header-brand" href="/" aria-label="GM ARC home">
        <BrandMark />
      </Link>
      <div className="header-right">
        <span className="header-network">
          <span className="header-a" aria-hidden />
          ARC MAINNET
        </span>
      </div>
    </header>
  );
}
