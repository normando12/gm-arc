import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "gm·arc — Tap to GM on Arc",
  description:
    "Say good morning onchain on Arc mainnet. Free daily GM, or send GM+ to a fren (0.01 tip + 1 USDC ops fee).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${syne.variable} ${dmSans.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
