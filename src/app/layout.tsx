import type { Metadata } from "next";
import { Orbitron, Exo_2 } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const exo2 = Exo_2({
  variable: "--font-exo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "gm.arc — Tap to GM on Arc",
  description:
    "Say good morning onchain on Arc mainnet. Free daily GM, or send GM+ to a fren for 0.01 USDC.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${orbitron.variable} ${exo2.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
