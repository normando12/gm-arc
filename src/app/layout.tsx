import type { Metadata } from "next";
import { Fredoka, Outfit } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GM ARC — Tap to GM on Arc",
  description:
    "Say good morning onchain on Arc mainnet. Free daily GM, or send GM+ to a fren. Gm on @arc.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/profits-rain-gmplus.mp3" as="audio" />
      </head>
      <body className={`${fredoka.variable} ${outfit.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
