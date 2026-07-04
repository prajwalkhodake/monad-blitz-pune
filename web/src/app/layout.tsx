import type { Metadata } from "next";
import "./globals.css";
import { Web3Provider } from "@/lib/web3";

export const metadata: Metadata = {
  title: "BountyVerifier — AI-Powered Bounty Escrow on Monad",
  description:
    "Autonomous bounty verification: AI reviews GitHub PRs and auto-releases escrow payments on Monad testnet.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Playfair+Display:wght@400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}