# 🏆 Autonomous Bounty Verifier

**AI-powered bounty escrow on Monad Testnet** — Built at Monad Blitz Pune

An AI agent watches GitHub PRs submitted against bounty issues, reviews them with Claude, and automatically releases escrowed payments on-chain — no manual approval needed.

## How It Works

```
1. Repo owner creates bounty → Sends MON to smart contract (escrow)
2. Contributor fixes the issue → Opens a Pull Request
3. AI agent reviews the PR → Claude checks: fixes issue? + no security bugs?
4. If both pass → Contract auto-releases payment to contributor's wallet
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Smart Contract | Solidity 0.8.24, Hardhat |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| AI Agent | Claude API (via Next.js API route) |
| Blockchain | Monad Testnet (Chain ID 10143) |
| GitHub | Octokit / REST API |

## Project Structure

```
├── contracts/                # Solidity + Hardhat
│   ├── contracts/BountyEscrow.sol
│   ├── scripts/deploy.js
│   └── test/BountyEscrow.test.js
├── web/                      # Next.js + TypeScript
│   ├── src/app/page.tsx      # Dashboard
│   ├── src/app/api/review/   # AI agent endpoint
│   ├── src/lib/web3.tsx      # Contract interactions
│   └── src/lib/config.ts     # Monad config
└── .env.example              # All required keys
```

## Quick Start

### 1. Deploy the Smart Contract

```bash
cd contracts
npm install
cp .env.example .env          # Add your private key
npx hardhat test               # Run tests first
npx hardhat run scripts/deploy.js --network monadTestnet
```

### 2. Run the Dashboard

```bash
cd web
npm install
cp .env.local.example .env.local   # Add contract address + API keys
npm run dev                         # Opens at http://localhost:3000
```

### 3. API Keys Needed

| Key | Where to get it |
|-----|-----------------|
| `DEPLOYER_PRIVATE_KEY` | MetaMask → Account Details → Export Private Key |
| `AGENT_PRIVATE_KEY` | Generate a fresh wallet for the agent |
| `GITHUB_TOKEN` | https://github.com/settings/tokens (repo scope) |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com |
| Testnet MON | https://faucet.monad.xyz |

## Demo Flow

1. **Connect wallet** → Switch to Monad Testnet
2. **Create a bounty** → Fund it with testnet MON
3. **Link a wallet** → Register contributor's GitHub username
4. **Run AI Review** → Click "Run Agent Review Now" with a real PR
5. **Watch the payment** → MON auto-transfers to contributor

## Contract Address

Deployed on Monad Testnet: `[paste after deploy]`

---

Built with ❤️ at Monad Blitz Pune