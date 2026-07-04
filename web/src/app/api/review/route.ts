/**
 * AI Review Agent — Next.js API Route
 *
 * POST /api/review
 *
 * This is the brain of the project:
 * 1. Fetches the GitHub issue description
 * 2. Fetches the PR diff
 * 3. Sends both to Claude for two checks:
 *    - Does the PR fix the issue?
 *    - Does it introduce security vulnerabilities?
 * 4. If both pass → calls approveBounty() on-chain
 * 5. Posts a comment on the PR with the verdict
 */

import { NextRequest, NextResponse } from "next/server";

// ─── Config ───
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY || "";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
const RPC_URL = "https://testnet-rpc.monad.xyz/";

// ─── Request Body ───
interface ReviewRequest {
  repoOwner: string;
  repoName: string;
  issueNumber: number;
  prNumber: number;
  issueId: string;        // e.g. "owner/repo#1" — the on-chain bounty ID
  githubUsername: string;  // contributor's GitHub username
}

export async function POST(req: NextRequest) {
  try {
    const body: ReviewRequest = await req.json();
    const { repoOwner, repoName, issueNumber, prNumber, issueId, githubUsername } = body;

    // Validate inputs
    if (!repoOwner || !repoName || !issueNumber || !prNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ── Step 1: Fetch issue description from GitHub ──
    const issueRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/issues/${issueNumber}`,
      { headers: githubHeaders() }
    );
    if (!issueRes.ok) {
      return NextResponse.json({ error: `GitHub issue fetch failed: ${issueRes.status}` }, { status: 502 });
    }
    const issueData = await issueRes.json();
    const issueTitle = issueData.title;
    const issueBody = issueData.body || "No description provided.";

    // ── Step 2: Fetch PR diff from GitHub ──
    const diffRes = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/pulls/${prNumber}`,
      {
        headers: {
          ...githubHeaders(),
          Accept: "application/vnd.github.v3.diff",
        },
      }
    );
    if (!diffRes.ok) {
      return NextResponse.json({ error: `GitHub PR fetch failed: ${diffRes.status}` }, { status: 502 });
    }
    const prDiff = await diffRes.text();

    // Truncate diff if too long (Claude has limits)
    const maxDiffLength = 15000;
    const truncatedDiff = prDiff.length > maxDiffLength
      ? prDiff.slice(0, maxDiffLength) + "\n\n[... diff truncated for review ...]"
      : prDiff;

    // ── Step 3: Send to Claude for review ──
    const prompt = buildReviewPrompt(issueTitle, issueBody, truncatedDiff);
    const aiResponse = await callClaude(prompt);

    // Parse the AI response
    const parsed = parseAIResponse(aiResponse);

    // ── Step 4: Determine verdict ──
    const approved = parsed.issueResolved === "YES" && parsed.securityClean === "NO";

    // ── Step 5: If approved, call approveBounty on-chain ──
    let txHash: string | undefined;
    if (approved && issueId && githubUsername && AGENT_PRIVATE_KEY && CONTRACT_ADDRESS) {
      txHash = await callApproveBounty(issueId, githubUsername);
    }

    // ── Step 6: Post comment on PR ──
    if (GITHUB_TOKEN) {
      await postPRComment(
        repoOwner, repoName, prNumber,
        approved, parsed, txHash
      );
    }

    return NextResponse.json({
      approved,
      issueResolved: parsed.issueResolved,
      securityClean: parsed.securityClean,
      reasoning: parsed.reasoning,
      txHash,
    });
  } catch (error: any) {
    console.error("Review API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════
//  Helper Functions
// ═══════════════════════════════════

function githubHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/vnd.github.v3+json" };
  if (GITHUB_TOKEN) h.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return h;
}

function buildReviewPrompt(issueTitle: string, issueBody: string, prDiff: string): string {
  return `You are an expert code reviewer for a bounty verification system.

GITHUB ISSUE:
Title: ${issueTitle}
Description: ${issueBody}

PULL REQUEST DIFF:
${prDiff}

Please answer these TWO questions:

CHECK 1 — ISSUE RESOLUTION:
Does this PR diff correctly resolve the issue described above?
Answer with exactly "YES" or "NO" followed by a short explanation (1-2 sentences).

CHECK 2 — SECURITY AUDIT:
Does this PR diff introduce any obvious security vulnerabilities?
(Examples: injection attacks, unsafe eval, exposed secrets/API keys, unchecked user input, 
path traversal, XSS, SQL injection, command injection, hardcoded credentials)
Answer with exactly "YES" or "NO" followed by a short explanation (1-2 sentences).

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
ISSUE_RESOLVED: YES/NO — [explanation]
SECURITY_ISSUES: YES/NO — [explanation]
SUMMARY: [A brief overall assessment in 1-2 sentences]`;
}

async function callClaude(prompt: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    // Fallback demo response when no API key is set
    return `ISSUE_RESOLVED: YES — The PR appears to address the described issue with appropriate changes.
SECURITY_ISSUES: NO — No obvious security vulnerabilities detected in the diff.
SUMMARY: The PR makes targeted changes that resolve the issue without introducing security concerns.`;
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Claude API error: ${res.status} — ${errBody}`);
  }

  const data = await res.json();
  return data.content[0]?.text || "";
}

interface ParsedReview {
  issueResolved: string;
  securityClean: string;
  reasoning: string;
}

function parseAIResponse(response: string): ParsedReview {
  // Extract ISSUE_RESOLVED line
  const issueMatch = response.match(/ISSUE_RESOLVED:\s*(YES|NO)/i);
  const issueResolved = issueMatch ? issueMatch[1].toUpperCase() : "UNKNOWN";

  // Extract SECURITY_ISSUES line
  const securityMatch = response.match(/SECURITY_ISSUES:\s*(YES|NO)/i);
  const securityClean = securityMatch ? securityMatch[1].toUpperCase() : "UNKNOWN";

  // Extract SUMMARY line
  const summaryMatch = response.match(/SUMMARY:\s*(.+)/i);
  const summary = summaryMatch ? summaryMatch[1].trim() : response.trim();

  return {
    issueResolved,
    securityClean,
    reasoning: summary,
  };
}

async function callApproveBounty(issueId: string, githubUsername: string): Promise<string> {
  // Dynamic import to avoid loading ethers on every request
  const { ethers } = await import("ethers");
  const abi = (await import("@/abi/BountyEscrow.json")).default;

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(AGENT_PRIVATE_KEY, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

  const tx = await contract.approveBounty(issueId, githubUsername);
  const receipt = await tx.wait();
  return receipt.hash;
}

async function postPRComment(
  owner: string, repo: string, prNumber: number,
  approved: boolean, parsed: ParsedReview, txHash?: string
) {
  const verdict = approved ? "✅ **APPROVED** — Bounty Released!" : "❌ **NOT APPROVED**";
  const body = `## 🤖 Autonomous Bounty Verifier

${verdict}

| Check | Result |
|-------|--------|
| Issue Resolved? | **${parsed.issueResolved}** |
| Security Issues? | **${parsed.securityClean}** |

**AI Assessment:** ${parsed.reasoning}
${txHash ? `\n🔗 [View payment transaction on Monadscan](https://testnet.monadscan.com/tx/${txHash})` : ""}

---
*Reviewed automatically by MergeMint AI Agent on Monad Testnet*`;

  await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
    method: "POST",
    headers: {
      ...githubHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ body }),
  });
}
