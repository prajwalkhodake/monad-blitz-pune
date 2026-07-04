"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWeb3 } from "@/lib/web3";
import Link from "next/link";

export default function LoginPage() {
  const { account, connect, connecting } = useWeb3();
  const router = useRouter();

  useEffect(() => {
    // If the user connects, redirect them to the dashboard
    if (account) {
      router.push("/");
    }
  }, [account, router]);

  return (
    <div className="min-h-screen pb-24 font-mono flex flex-col" style={{ background: "#f6f3f1" }}>
      {/* Navbar */}
      <nav className="mx-auto flex max-w-page items-center justify-between px-8 py-6 w-full animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-lake-blue" />
          <Link href="/" className="font-serif text-2xl tracking-tight hover:opacity-85 transition">
            MergeMint
          </Link>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 animate-slide-up">
        <div className="text-center mb-12 max-w-2xl">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white border border-ash text-[10px] uppercase tracking-wider text-smoke mb-6 shadow-sm">
            Web3 Onboarding
          </div>
          <h1 className="font-serif text-5xl md:text-6xl tracking-tight leading-tight mb-4">
            Sign in to start earning.
          </h1>
          <p className="text-graphite text-base md:text-lg">
            Connect your Web3 wallet to access bounties, submit solutions, and receive automated payouts on the Monad Testnet.
          </p>
        </div>

        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="card text-center hover:scale-[1.02] transition-transform duration-300">
            <div className="h-12 w-12 rounded-full bg-white border border-ash flex items-center justify-center mx-auto mb-4 text-xl">
              🦊
            </div>
            <h3 className="font-bold text-lg mb-2">1. Get a Wallet</h3>
            <p className="text-xs text-smoke">
              Install a Web3 wallet like MetaMask or Rabby in your browser to get started.
            </p>
          </div>

          {/* Step 2 */}
          <div className="card text-center hover:scale-[1.02] transition-transform duration-300">
            <div className="h-12 w-12 rounded-full bg-white border border-ash flex items-center justify-center mx-auto mb-4 text-xl">
              💧
            </div>
            <h3 className="font-bold text-lg mb-2">2. Get Testnet MON</h3>
            <p className="text-xs text-smoke">
              Visit the <a href="https://faucet.monad.xyz" target="_blank" rel="noreferrer" className="text-lake underline hover:opacity-80">Monad Faucet</a> to fund your wallet with test tokens.
            </p>
          </div>

          {/* Step 3 */}
          <div className="card-elevated text-center transform scale-[1.05] relative z-10 border-2 border-lake-blue/20">
            <div className="h-12 w-12 rounded-full bg-gradient-to-tr from-lake-blue to-[#4A90E2] flex items-center justify-center mx-auto mb-4 text-white text-xl shadow-lg">
              🔗
            </div>
            <h3 className="font-bold text-lg mb-2">3. Connect</h3>
            <p className="text-xs text-smoke mb-6">
              Sign in securely using your wallet. No passwords required.
            </p>
            <button 
              className="btn-primary w-full shadow-md"
              onClick={connect}
              disabled={connecting}
            >
              {connecting ? "connecting..." : "connect wallet →"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
