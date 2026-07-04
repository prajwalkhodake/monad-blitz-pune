/**
 * 🚀 DEPLOYMENT SCRIPT — Deploys BountyEscrow to Monad Testnet
 * 
 * HOW TO USE:
 *   1. Make sure your .env file has DEPLOYER_PRIVATE_KEY and AGENT_WALLET_ADDRESS
 *   2. Make sure the deployer wallet has testnet MON (from https://faucet.monad.xyz)
 *   3. Run: npx hardhat run scripts/deploy.js --network monadTestnet
 * 
 * WHAT THIS SCRIPT DOES:
 *   1. Reads the agent wallet address from your .env file
 *   2. Compiles the BountyEscrow contract
 *   3. Deploys it to Monad testnet
 *   4. Prints the contract address (you'll need this for the dashboard and agent)
 */

// "require" loads the Hardhat tools we need
const hre = require("hardhat");

async function main() {
  // ── Step 1: Read the agent wallet address from .env ──
  const agentAddress = process.env.AGENT_WALLET_ADDRESS;

  // If the agent address isn't set, stop and tell the user
  if (!agentAddress) {
    console.error("❌ ERROR: Set AGENT_WALLET_ADDRESS in your .env file first!");
    console.error("   This is the wallet address of the AI agent.");
    console.error("   Generate one by running: node ../agent/generate-wallet.js");
    process.exit(1); // Exit with error
  }

  console.log("🚀 Deploying BountyEscrow to Monad Testnet...\n");
  console.log("   Agent wallet address:", agentAddress);

  // ── Step 2: Get the deployer's wallet info ──
  // hre.ethers.getSigners() returns the wallets from hardhat.config.js
  const [deployer] = await hre.ethers.getSigners();
  console.log("   Deployer address:    ", deployer.address);

  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("   Deployer balance:    ", hre.ethers.formatEther(balance), "MON\n");

  if (balance === 0n) {
    console.error("❌ ERROR: Deployer wallet has 0 MON!");
    console.error("   Get testnet MON from: https://faucet.monad.xyz");
    process.exit(1);
  }

  // ── Step 3: Deploy the contract ──
  // getContractFactory("BountyEscrow") loads the compiled contract
  const BountyEscrow = await hre.ethers.getContractFactory("BountyEscrow");

  // .deploy(agentAddress) creates a new transaction that deploys the contract
  // and passes agentAddress to the constructor
  console.log("   Sending deployment transaction...");
  const contract = await BountyEscrow.deploy(agentAddress);

  // Wait for the transaction to be confirmed on the blockchain
  await contract.waitForDeployment();

  // Get the deployed contract's address
  const contractAddress = await contract.getAddress();

  // ── Step 4: Print the results ──
  console.log("\n✅ BountyEscrow deployed successfully!\n");
  console.log("   ┌─────────────────────────────────────────────────────┐");
  console.log("   │  Contract Address: ", contractAddress, " │");
  console.log("   └─────────────────────────────────────────────────────┘\n");
  console.log("   📋 NEXT STEPS:");
  console.log("   1. Copy the contract address above");
  console.log("   2. Paste it into your .env file as CONTRACT_ADDRESS");
  console.log("   3. View it on explorer: https://testnet.monadscan.com/address/" + contractAddress);
  console.log("   4. Fund the agent wallet with testnet MON from https://faucet.monad.xyz\n");
}

// Run the deploy function
// This is standard boilerplate for Hardhat scripts
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
