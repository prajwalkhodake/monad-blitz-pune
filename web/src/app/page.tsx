"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useWeb3, formatEther } from "@/lib/web3";
import { MONAD_TESTNET, CONTRACT_ADDRESS } from "@/lib/config";

// ─── Types ───
interface Bounty {
  issueId: string;
  creator: string;
  amount: string;
  deadline: number;
  funded: boolean;
  paid: boolean;
}

interface ReviewResult {
  status: "idle" | "loading" | "pass" | "fail" | "error";
  issueResolved?: string;
  securityClean?: string;
  reasoning?: string;
  txHash?: string;
  error?: string;
}

interface Toast {
  type: "success" | "error" | "info";
  message: string;
  txHash?: string;
}

export default function Home() {
  const {
    account, chainId, connecting, connect, switchToMonad,
    createBounty, linkWallet, approveBounty, refundBounty,
    getBountyInfo, getReputation, getStats, getLinkedWallet
  } = useWeb3();

  // State variables
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [loadingBounties, setLoadingBounties] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Profile / Reputation state
  const [myReputation, setMyReputation] = useState<string>("0");
  const [githubInput, setGithubInput] = useState("");

  // Create Bounty Form state
  const [issueId, setIssueId] = useState("bounty-demo/sample-repo#1");
  const [amount, setAmount] = useState("0.1");
  const [days, setDays] = useState("7");

  // AI Agent Console state
  const [reviewRepo, setReviewRepo] = useState("bounty-demo");
  const [reviewIssue, setReviewIssue] = useState("sample-repo");
  const [reviewPR, setReviewPR] = useState("1");
  const [reviewGhPR, setReviewGhPR] = useState("1");
  const [reviewIssueId, setReviewIssueId] = useState("bounty-demo/sample-repo#1");
  const [reviewGhUser, setReviewGhUser] = useState("contributor123");
  const [review, setReview] = useState<ReviewResult>({ status: "idle" });

  // Lookup state
  const [lookupId, setLookupId] = useState("");
  const [bountyResult, setBountyResult] = useState<any>(null);
  const [repAddr, setRepAddr] = useState("");

  const onMonad = chainId === MONAD_TESTNET.chainId;

  // Load on-chain stats
  const loadStats = useCallback(async () => {
    try {
      const s = await getStats();
      setStats(s);
    } catch {}
  }, [getStats]);

  // Fetch all bounties
  const fetchBounties = useCallback(async () => {
    setLoadingBounties(true);
    try {
      const res = await fetch("/api/bounties");
      const data = await res.json();
      if (data.bounties) {
        setBounties(data.bounties);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBounties(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    if (!account) return;
    try {
      const rep = await getReputation(account);
      setMyReputation(rep.toString());
    } catch {}
  }, [account, getReputation]);

  const showToast = (type: Toast["type"], message: string, txHash?: string) => {
    setToast({ type, message, txHash });
    setTimeout(() => setToast(null), 6000);
  };

  useEffect(() => {
    loadStats();
    fetchBounties();
  }, [loadStats, fetchBounties]);

  useEffect(() => {
    if (account) loadProfile();
  }, [account, loadProfile]);

  // Auto-refresh stats and list
  useEffect(() => {
    const i = setInterval(() => {
      loadStats();
    }, 4000);
    return () => clearInterval(i);
  }, [loadStats]);

  const handleTx = async (key: string, fn: () => Promise<string>, msg: string) => {
    setBusy(key);
    try {
      const hash = await fn();
      showToast("success", msg, hash);
      await loadStats();
      await fetchBounties();
      if (account) loadProfile();
    } catch (e: any) {
      showToast("error", e?.reason || e?.message || "Transaction failed");
    } finally {
      setBusy(null);
    }
  };

  const handleRunReview = async () => {
    setReview({ status: "loading" });
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoOwner: reviewRepo,
          repoName: reviewIssue,
          issueNumber: Number(reviewPR),
          prNumber: Number(reviewGhPR),
          issueId: reviewIssueId,
          githubUsername: reviewGhUser,
        }),
      });
      const data = await res.json();
      if (data.approved) {
        setReview({ status: "pass", ...data });
        showToast("success", "AI approved PR and released bounty payment!", data.txHash);
        await loadStats();
        await fetchBounties();
      } else {
        setReview({ status: "fail", ...data });
        showToast("info", "PR did not pass AI criteria.");
      }
    } catch (e: any) {
      setReview({ status: "error", error: e?.message });
      showToast("error", "AI Review Agent invocation failed.");
    }
  };

  return (
    <div className="min-h-screen pb-24" style={{ background: "#f6f3f1" }}>
      {/* ── Announcement / Info Bar ── */}
      <div className="bg-black text-white px-8 py-3 text-xs flex justify-between items-center font-mono">
        <span>⚡ MONAD BLITZ PUNE HACKATHON LIVE DEMO</span>
        <div className="flex gap-4">
          <span>RPC: testnet-rpc.monad.xyz</span>
          <span>Chain ID: 10143</span>
        </div>
      </div>

      {/* ── Navigation Bar ── */}
      <nav className="mx-auto flex max-w-page items-center justify-between px-8 py-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-lake-blue" />
          <span className="font-serif text-2xl tracking-tight">
            BountyVerifier
          </span>
        </div>

        <div className="flex items-center gap-4">
          {account && (
            <span className="tag">
              {onMonad ? "⚡ monad testnet" : "⚠ wrong network"}
            </span>
          )}
          {account && (
            <Link href="/profile" className="btn-ghost text-xs" style={{ padding: "10px 20px" }}>
              profile 👤
            </Link>
          )}
          {account ? (
            <button
              className="btn-ghost text-xs"
              style={{ padding: "10px 20px" }}
              onClick={() => navigator.clipboard.writeText(account)}
            >
              {account.slice(0, 6)}…{account.slice(-4)}
            </button>
          ) : (
            <button className="btn-primary" onClick={connect} disabled={connecting}>
              {connecting ? "connecting…" : "connect wallet →"}
            </button>
          )}
          {account && !onMonad && (
            <button className="btn-primary text-xs" onClick={switchToMonad}>
              switch to monad →
            </button>
          )}
        </div>
      </nav>

      <main className="mx-auto max-w-page px-8">
        
        {/* ── Hero ── */}
        <section className="py-12 text-center animate-fade-in">
          <h1 className="font-serif mx-auto max-w-3xl text-5xl md:text-6xl tracking-tight leading-tight">
            Autonomous Bounty Verification
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-graphite text-base md:text-lg">
            AI reviews GitHub pull requests, runs security audits, and auto-releases escrow payments to contributors on Monad Testnet.
          </p>
        </section>

        {/* ── Stats ── */}
        <section className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-3 animate-slide-up delay-1">
          <StatCard label="Total Bounties" value={stats ? stats.totalBounties.toString() : "—"} />
          <StatCard label="Paid Out" value={stats ? `${formatEther(stats.totalPaidOut)} MON` : "—"} />
          <StatCard label="In Escrow" value={stats ? `${formatEther(stats.contractBalance)} MON` : "—"} />
        </section>

        <div className="text-center mb-12">
          <span className="tag tag-info">
            contract: {CONTRACT_ADDRESS.slice(0, 10)}…{CONTRACT_ADDRESS.slice(-6)}
          </span>
        </div>

        <hr className="divider" />

        {/* ── Main Layout Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ════ LEFT COLUMN: FEED & PROFILE (2/3 width) ════ */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* active bounties feed */}
            <div className="card">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <p className="section-label">live opportunities</p>
                  <h3 className="font-serif text-3xl">Active Bounties</h3>
                </div>
                <button 
                  onClick={fetchBounties} 
                  className="btn-ghost text-xs py-1.5 px-4" 
                  disabled={loadingBounties}
                >
                  {loadingBounties ? "updating..." : "refresh feed ⟳"}
                </button>
              </div>

              {bounties.length === 0 ? (
                <div className="text-center py-8 text-smoke text-sm">
                  No active bounties on-chain yet. Fund one using the panel on the right!
                </div>
              ) : (
                <div className="space-y-4">
                  {bounties.map(b => (
                    <div key={b.issueId} className="p-5 rounded-[24px] bg-white/40 border border-ash flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="tag">{b.issueId}</span>
                          <span className={b.paid ? "tag tag-success text-[10px]" : "tag tag-info text-[10px]"}>
                            {b.paid ? "paid" : "active"}
                          </span>
                        </div>
                        <p className="text-xs text-smoke">
                          Creator: {b.creator.slice(0, 8)}…{b.creator.slice(-6)} | Expiry: {new Date(b.deadline * 1000).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-serif text-xl font-semibold text-lake-blue">{b.amount} MON</span>
                        {!b.paid && (
                          <button 
                            onClick={() => {
                              const [ownerRepo, issueNum] = b.issueId.split('#');
                              setReviewRepo(ownerRepo.split('/')[0]);
                              setReviewIssue(ownerRepo.split('/')[1]);
                              setReviewPR(issueNum);
                              setReviewGhPR("1"); // default demo pr
                              setReviewIssueId(b.issueId);
                            }}
                            className="btn-primary text-xs py-2 px-4"
                          >
                            solve →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* user profile */}
            <div className="card grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <p className="section-label">developer stats</p>
                <h3 className="font-serif text-3xl mb-4">My Account</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-1 border-b border-ash text-sm">
                    <span className="text-smoke">Wallet reputation</span>
                    <span className="font-semibold">{myReputation} Bounties</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-ash text-sm">
                    <span className="text-smoke">Status</span>
                    <span>{account ? "Connected" : "Not connected"}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="section-label">link github account</p>
                <p className="text-smoke text-xs mb-3">
                  Link your GitHub username to authorize payments directly to this wallet address.
                </p>
                <div className="flex gap-2">
                  <input 
                    className="input" 
                    placeholder="GitHub Username" 
                    value={githubInput} 
                    onChange={e => setGithubInput(e.target.value)} 
                  />
                  <button 
                    className="btn-primary whitespace-nowrap text-xs px-4"
                    disabled={!account || busy === "link"}
                    onClick={() => handleTx("link", () => linkWallet(githubInput), "Linked GitHub wallet successfully!")}
                  >
                    {busy === "link" ? "linking..." : "link"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ════ RIGHT COLUMN: SPONSOR / CONTROLS (1/3 width) ════ */}
          <div className="space-y-8">
            
            {/* Fund Bounty */}
            <div className="card">
              <p className="section-label">escrow fund</p>
              <h3 className="font-serif text-2xl mb-4">Fund Bounty</h3>
              <div className="space-y-3">
                <InputGroup label="Issue ID" placeholder="owner/repo#1" value={issueId} onChange={setIssueId} />
                <div className="grid grid-cols-2 gap-2">
                  <InputGroup label="Amount (MON)" placeholder="0.1" value={amount} onChange={setAmount} />
                  <InputGroup label="Days" placeholder="7" value={days} onChange={setDays} />
                </div>
                <button
                  className="btn-primary w-full text-xs mt-2"
                  disabled={!account || busy === "create"}
                  onClick={() => handleTx("create", () => createBounty(issueId, amount, Number(days)), "Bounty funded successfully!")}
                >
                  {busy === "create" ? "funding..." : "create & fund →"}
                </button>
              </div>
            </div>

            {/* Run AI review agent */}
            <div className="card-elevated">
              <p className="section-label" style={{ color: "var(--color-lake-blue)" }}>AI agent console</p>
              <h3 className="font-serif text-2xl mb-4">AI PR Audit</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <InputGroup label="GitHub Owner" placeholder="owner" value={reviewRepo} onChange={setReviewRepo} />
                  <InputGroup label="GitHub Repo" placeholder="repo" value={reviewIssue} onChange={setReviewIssue} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <InputGroup label="Issue #" placeholder="1" value={reviewPR} onChange={setReviewPR} />
                  <InputGroup label="PR #" placeholder="1" value={reviewGhPR} onChange={setReviewGhPR} />
                </div>
                <InputGroup label="Bounty ID" placeholder="owner/repo#1" value={reviewIssueId} onChange={setReviewIssueId} />
                <InputGroup label="Contributor GitHub" placeholder="github-username" value={reviewGhUser} onChange={setReviewGhUser} />
                
                <button
                  className="btn-secondary w-full text-xs mt-2"
                  onClick={handleRunReview}
                  disabled={review.status === "loading"}
                >
                  {review.status === "loading" ? "Reviewing with Claude..." : "run agent review →"}
                </button>
              </div>

              {/* Agent review result card */}
              {review.status !== "idle" && review.status !== "loading" && (
                <div className="mt-4 rounded-xl p-4 bg-white/60 text-xs border border-ash space-y-2">
                  <p className="font-semibold text-sm">
                    {review.status === "pass" ? "✅ Payout Approved" : review.status === "fail" ? "❌ Payout Rejected" : "⚠ Error"}
                  </p>
                  {review.txHash && (
                    <a href={`https://testnet.monadscan.com/tx/${review.txHash}`} target="_blank" rel="noreferrer" className="text-lake underline block">
                      view payout transaction ↗
                    </a>
                  )}
                  <p className="text-smoke"><strong>Result:</strong> {review.reasoning}</p>
                </div>
              )}
            </div>

            {/* Lookup & Tools */}
            <div className="card">
              <p className="section-label">queries & tools</p>
              <div className="space-y-4 text-xs">
                {/* Lookup */}
                <div>
                  <label className="section-label block mb-1">Check Bounty Status</label>
                  <div className="flex gap-2">
                    <input className="input" placeholder="issueId" value={lookupId} onChange={e => setLookupId(e.target.value)} />
                    <button
                      className="btn-ghost"
                      style={{ padding: "10px 16px" }}
                      onClick={async () => {
                        try { setBountyResult(await getBountyInfo(lookupId)); } catch { setBountyResult(null); }
                      }}
                    >
                      find
                    </button>
                  </div>
                  {bountyResult && (
                    <div className="mt-2 p-3 bg-white/40 rounded-xl space-y-1 font-mono text-[10px]">
                      <p>Amount: {formatEther(bountyResult.amount)} MON</p>
                      <p>Funded: {bountyResult.funded.toString()}</p>
                      <p>Paid: {bountyResult.paid.toString()}</p>
                    </div>
                  )}
                </div>

                {/* Refund */}
                <div>
                  <label className="section-label block mb-1">Reclaim Escrow (After Expire)</label>
                  <div className="flex gap-2">
                    <input className="input" placeholder="issueId" value={issueId} onChange={e => setIssueId(e.target.value)} />
                    <button
                      className="btn-ghost"
                      style={{ padding: "10px 16px" }}
                      disabled={!account || busy === "refund"}
                      onClick={() => handleTx("refund", () => refundBounty(issueId), "Bounty refunded successfully!")}
                    >
                      refund
                    </button>
                  </div>
                </div>

                {/* Reputation */}
                <div>
                  <label className="section-label block mb-1">Check Address Reputation</label>
                  <div className="flex gap-2">
                    <input className="input" placeholder="0x wallet address" value={repAddr} onChange={e => setRepAddr(e.target.value)} />
                    <button
                      className="btn-ghost"
                      style={{ padding: "10px 16px" }}
                      onClick={async () => {
                        if (!repAddr) return;
                        const score = await getReputation(repAddr);
                        showToast("info", `Reputation: ${score.toString()} completed bounties`);
                      }}
                    >
                      check
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* ── Toast Notification ── */}
      {toast && (
        <div
          className="toast"
          style={{
            background: toast.type === "success" ? "#f0faf4" : toast.type === "error" ? "#fef2f0" : "white",
            border: `1px solid ${toast.type === "success" ? "rgba(167,252,205,0.5)" : toast.type === "error" ? "rgba(255,148,115,0.4)" : "var(--color-ash)"}`,
            color: "var(--color-off-black)",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-lg">
              {toast.type === "success" ? "✓" : toast.type === "error" ? "✕" : "ℹ"}
            </span>
            <div className="flex-1">
              <p className="font-medium text-sm">{toast.message}</p>
              {toast.txHash && (
                <a
                  href={`https://testnet.monadscan.com/tx/${toast.txHash}`}
                  target="_blank" rel="noreferrer"
                  className="text-lake underline mt-1 inline-block text-xs"
                >
                  view transaction on explorer ↗
                </a>
              )}
            </div>
            <button onClick={() => setToast(null)} className="text-smoke hover:text-off-black transition">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

function InputGroup({ label, placeholder, value, onChange }: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="section-label" style={{ marginBottom: "4px" }}>{label}</label>
      <input
        className="input"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ padding: "10px 16px", borderRadius: "100px" }}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center" style={{ padding: "24px" }}>
      <p className="section-label" style={{ marginBottom: "4px" }}>{label}</p>
      <p className="font-serif" style={{ fontSize: "36px", letterSpacing: "-0.02em", fontWeight: 400 }}>
        {value}
      </p>
    </div>
  );
}