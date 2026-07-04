// Monad Testnet configuration and contract address.
// Replace NEXT_PUBLIC_CONTRACT_ADDRESS with your deployed BountyEscrow address.

export const MONAD_TESTNET = {
    chainId: "0x279f", // 10143 in hex
    chainName: "Monad Testnet",
    nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
    rpcUrls: ["https://testnet-rpc.monad.xyz/"],
    blockExplorerUrls: ["https://testnet.monadscan.com/"],
} as const;

export const CONTRACT_ADDRESS =
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
    "0x0000000000000000000000000000000000000000";

export const RPC_URL = "https://testnet-rpc.monad.xyz/";