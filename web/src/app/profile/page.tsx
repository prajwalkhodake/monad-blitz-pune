"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useWeb3, formatEther } from "@/lib/web3";

interface SolvedBounty {
  issueId: string;
  amount: string;
  txHash?: string;
  timestamp: string;
}

export default function ProfilePage() {
  const {
    account,
    provider,
    getReputation,
    getLinkedWallet,
    linkWallet
  } = useWeb3();

  const [reputationScore, setReputationScore] = useState<number>(0);
  const [linkedGithub, setLinkedGithub] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<string>("0.0");
  const [githubInput, setGithubInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [solvedBounties, setSolvedBounties] = useState<SolvedBounty[]>([]);
  const [loading, setLoading] = useState(true);

  // Load account balance, reputation, and linked GitHub username
  const loadData = useCallback(async () => {
    if (!account) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Fetch balance
      if (provider) {
        const bal = await provider.getBalance(account);
        setWalletBalance(formatEther(bal));
      }

      // Fetch reputation score
      const rep = await getReputation(account);
      setReputationScore(Number(rep));

      // Attempt to find linked username
      // Since our contract maps username -> wallet, we can fetch all events
      // or try to match it for the demo.
      // For the demo profile, we'll check if the username is stored in localStorage
      // or if they link it here.
      const storedUser = localStorage.getItem(`gh_user_${account.toLowerCase()}`);
      if (storedUser) {
        setLinkedGithub(storedUser);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [account, provider, getReputation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLink = async () => {
    if (!githubInput.trim() || !account) return;
    setBusy(true);
    try {
      const tx = await linkWallet(githubInput.trim());
      localStorage.setItem(`gh_user_${account.toLowerCase()}`, githubInput.trim());
      setLinkedGithub(githubInput.trim());
      setGithubInput("");
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen pb-24 font-mono" style={{ background: "#f6f3f1" }}>
      {/* Navbar */}
      <nav className="mx-auto flex max-w-page items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-lake-blue" />
          <Link href="/" className="font-serif text-2xl tracking-tight hover:opacity-85 transition">
            BountyVerifier
          </Link>
        </div>
        <Link href="/" className="btn-ghost text-xs py-2 px-4">
          ← Back to Dashboard
        </Link>
      </nav>

      <main className="mx-auto max-w-4xl px-8 mt-8">
        {loading ? (
          <div className="text-center py-20 text-smoke">loading profile...</div>
        ) : !account ? (
          <div className="card text-center py-20">
            <h2 className="font-serif text-3xl mb-4">No Wallet Connected</h2>
            <p className="text-smoke mb-6">Connect your wallet on the dashboard to view your profile.</p>
            <Link href="/" className="btn-primary">
              go to dashboard →
            </Link>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Header / Banner card */}
            <div className="card-elevated flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-coral to-gold flex items-center justify-center text-2xl shadow-sm">
                  👤
                </div>
                <div>
                  <h1 className="font-serif text-3xl tracking-tight">
                    {linkedGithub ? `@${linkedGithub}` : "Anonymous Contributor"}
                  </h1>
                  <p className="text-xs text-smoke font-mono mt-1">
                    {account}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-white/50 border border-ash px-4 py-2 rounded-xl text-center">
                  <p className="text-[10px] text-smoke uppercase">Reputation</p>
                  <p className="text-lg font-bold text-lake-blue">{reputationScore}</p>
                </div>
                <div className="bg-white/50 border border-ash px-4 py-2 rounded-xl text-center">
                  <p className="text-[10px] text-smoke uppercase">MON Balance</p>
                  <p className="text-lg font-bold">{parseFloat(walletBalance).toFixed(3)}</p>
                </div>
              </div>
            </div>

            {/* Profile Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left Column: Link Panel */}
              <div className="card space-y-6">
                <div>
                  <p className="section-label">GitHub Association</p>
                  {linkedGithub ? (
                    <div className="space-y-4">
                      <p className="text-xs text-graphite">
                        Your wallet is linked to the GitHub username below. All automatically verified payouts will be sent here.
                      </p>
                      <div className="bg-white/60 border border-ash p-3 rounded-xl font-bold text-lake-blue text-sm">
                        @{linkedGithub}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-graphite">
                        You haven&apos;t linked a GitHub account yet. Link one now to start receiving auto-payments.
                      </p>
                      <input
                        className="input text-xs"
                        placeholder="GitHub Username"
                        value={githubInput}
                        onChange={e => setGithubInput(e.target.value)}
                      />
                      <button
                        className="btn-primary w-full text-xs"
                        onClick={handleLink}
                        disabled={busy}
                      >
                        {busy ? "linking..." : "link github →"}
                      </button>
                    </div>
                  )}
                </div>

                <hr className="divider" style={{ margin: "16px 0" }} />

                <div>
                  <p className="section-label">Solver Level</p>
                  <div className="tag tag-success text-[10px] w-full text-center block">
                    {reputationScore >= 10 ? "🏆 Elite Solver" : reputationScore >= 3 ? "⭐ Active Contributor" : "🌱 Rookie Solver"}
                  </div>
                </div>
              </div>

              {/* Right Column: Bounties History (2/3 width) */}
              <div className="md:col-span-2 card">
                <p className="section-label">contribution history</p>
                <h3 className="font-serif text-2xl mb-6">Solved Bounties</h3>

                {solvedBounties.length === 0 ? (
                  <div className="text-center py-12 text-smoke text-sm">
                    No solved bounties recorded for this profile yet.
                    <div className="mt-4">
                      <Link href="/" className="btn-ghost text-xs">
                        browse open issues →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* List of solved items */}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}
      </main>
    </div>
  );
}
