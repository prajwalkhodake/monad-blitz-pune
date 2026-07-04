# BountyEscrow Web (Next.js + TypeScript)

Frontend dashboard for the `BountyEscrow` smart contract on Monad testnet.

## Features

- Connect wallet (MetaMask / EVM-compatible) and switch to Monad testnet
- Live contract stats (total bounties, paid out, in escrow)
- Create & fund a bounty for a GitHub issue
- Link a GitHub username to your wallet
- Approve & pay a bounty (AI agent wallet only)
- Refund a bounty after the deadline
- Lookup any bounty by issue ID
- Check a contributor's reputation

## Setup

1. Deploy the contract from `../contracts`:
   ```bash
   cd ../contracts
   npm install
   npm run deploy
   ```
2. Copy the deployed address into `web/.env.local`:
   ```bash
   cp .env.local.example .env.local
   # edit NEXT_PUBLIC_CONTRACT_ADDRESS
   ```
3. Install & run:
   ```bash
   npm install
   npm run dev
   ```
4. Open http://localhost:3000

## Tech

- Next.js 14 (App Router) + TypeScript
- ethers v6
- Tailwind CSS