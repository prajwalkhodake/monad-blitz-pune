/**
 * Hardhat Configuration for Autonomous Bounty Verifier
 * 
 * Networks:
 *   - hardhat:       Local in-memory chain for testing
 *   - monadTestnet:  Monad Testnet (chain ID 10143)
 * 
 * To deploy:  npx hardhat run scripts/deploy.js --network monadTestnet
 * To test:    npx hardhat test
 */

require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,     // Optimized for fewer deployments (hackathon)
      },
    },
  },
  networks: {
    // Monad Testnet — EVM-compatible, chain ID 10143
    // Faucet: https://faucet.monad.xyz
    // Explorer: https://testnet.monadscan.com
    monadTestnet: {
      url: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz/",
      chainId: 10143,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
  // Etherscan-style verification is not directly supported on Monad yet,
  // but we can use the monskills verification API (see scaffold skill).
};
