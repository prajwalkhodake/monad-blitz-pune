"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, formatEther, parseEther } from "ethers";
import bountyAbi from "@/abi/BountyEscrow.json";
import { CONTRACT_ADDRESS, MONAD_TESTNET, RPC_URL } from "./config";

interface BountyInfo {
    creator: string;
    amount: bigint;
    deadline: bigint;
    funded: boolean;
    paid: boolean;
}

interface Stats {
    totalBounties: bigint;
    totalPaidOut: bigint;
    contractBalance: bigint;
}

interface Web3ContextValue {
    provider: BrowserProvider | null;
    signer: Awaited<ReturnType<BrowserProvider["getSigner"]>> | null;
    account: string | null;
    chainId: string | null;
    connecting: boolean;
    connect: () => Promise<void>;
    switchToMonad: () => Promise<void>;
    // contract actions
    createBounty: (issueId: string, amountMon: string, deadlineDays: number) => Promise<string>;
    linkWallet: (githubUsername: string) => Promise<string>;
    approveBounty: (issueId: string, githubUsername: string) => Promise<string>;
    refundBounty: (issueId: string) => Promise<string>;
    // reads
    getBountyInfo: (issueId: string) => Promise<BountyInfo | null>;
    getLinkedWallet: (githubUsername: string) => Promise<string>;
    getReputation: (wallet: string) => Promise<bigint>;
    getStats: () => Promise<Stats>;
}

const Web3Context = createContext<Web3ContextValue | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
    const [provider, setProvider] = useState<BrowserProvider | null>(null);
    const [signer, setSigner] = useState<Web3ContextValue["signer"]>(null);
    const [account, setAccount] = useState<string | null>(null);
    const [chainId, setChainId] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);

    const initProvider = useCallback(() => {
        if (typeof window !== "undefined" && (window as any).ethereum) {
            const p = new BrowserProvider((window as any).ethereum);
            setProvider(p);
            return p;
        }
        return null;
    }, []);

    useEffect(() => {
        const p = initProvider();
        if (!p) return;

        const handleAccounts = (accounts: string[]) => {
            if (accounts.length > 0) {
                setAccount(accounts[0]);
                p.getSigner().then((s) => setSigner(s));
            } else {
                setAccount(null);
                setSigner(null);
            }
        };
        const handleChain = (chain: string) => setChainId(chain);

        (window as any).ethereum.on?.("accountsChanged", handleAccounts);
        (window as any).ethereum.on?.("chainChanged", handleChain);

        // try silent connect
        p.send("eth_accounts", []).then((accounts: string[]) => {
            if (accounts.length > 0) {
                setAccount(accounts[0]);
                p.getSigner().then((s) => setSigner(s));
                p.getNetwork().then((n) => setChainId("0x" + n.chainId.toString(16)));
            }
        });

        return () => {
            (window as any).ethereum.removeListener?.("accountsChanged", handleAccounts);
            (window as any).ethereum.removeListener?.("chainChanged", handleChain);
        };
    }, [initProvider]);

    const connect = useCallback(async () => {
        const p = provider ?? initProvider();
        if (!p) {
            alert("No Ethereum wallet found. Please install MetaMask or a compatible wallet.");
            return;
        }
        setConnecting(true);
        try {
            const accounts: string[] = await p.send("eth_requestAccounts", []);
            setAccount(accounts[0]);
            const s = await p.getSigner();
            setSigner(s);
            const n = await p.getNetwork();
            setChainId("0x" + n.chainId.toString(16));
        } catch (e) {
            console.error(e);
        } finally {
            setConnecting(false);
        }
    }, [provider, initProvider]);

    const switchToMonad = useCallback(async () => {
        if (!(window as any).ethereum) return;
        try {
            await (window as any).ethereum.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: MONAD_TESTNET.chainId }],
            });
        } catch (err: any) {
            if (err.code === 4902) {
                await (window as any).ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [MONAD_TESTNET],
                });
            }
        }
    }, []);

    const getContract = useCallback(
        (withSigner: boolean) => {
            if (!provider) return null;
            if (withSigner && !signer) return null;
            return new Contract(
                CONTRACT_ADDRESS,
                bountyAbi,
                withSigner ? signer : provider
            );
        },
        [provider, signer]
    );

    const createBounty = useCallback(
        async (issueId: string, amountMon: string, deadlineDays: number): Promise<string> => {
            const c = getContract(true);
            if (!c) throw new Error("Wallet not connected");
            const deadline = Math.floor(Date.now() / 1000) + deadlineDays * 86400;
            const tx = await c.createBounty(issueId, deadline, {
                value: parseEther(amountMon),
            });
            await tx.wait();
            return tx.hash;
        },
        [getContract]
    );

    const linkWallet = useCallback(
        async (githubUsername: string): Promise<string> => {
            const c = getContract(true);
            if (!c || !account) throw new Error("Wallet not connected");
            const tx = await c.linkWallet(githubUsername, account);
            await tx.wait();
            return tx.hash;
        },
        [getContract, account]
    );

    const approveBounty = useCallback(
        async (issueId: string, githubUsername: string): Promise<string> => {
            const c = getContract(true);
            if (!c) throw new Error("Wallet not connected");
            const tx = await c.approveBounty(issueId, githubUsername);
            await tx.wait();
            return tx.hash;
        },
        [getContract]
    );

    const refundBounty = useCallback(
        async (issueId: string): Promise<string> => {
            const c = getContract(true);
            if (!c) throw new Error("Wallet not connected");
            const tx = await c.refundBounty(issueId);
            await tx.wait();
            return tx.hash;
        },
        [getContract]
    );

    const getBountyInfo = useCallback(
        async (issueId: string): Promise<BountyInfo | null> => {
            const c = getContract(false);
            if (!c) return null;
            try {
                const res = await c.getBountyInfo(issueId);
                return {
                    creator: res[0],
                    amount: res[1],
                    deadline: res[2],
                    funded: res[3],
                    paid: res[4],
                };
            } catch {
                return null;
            }
        },
        [getContract]
    );

    const getLinkedWallet = useCallback(
        async (githubUsername: string): Promise<string> => {
            const c = getContract(false);
            if (!c) return "";
            return await c.getLinkedWallet(githubUsername);
        },
        [getContract]
    );

    const getReputation = useCallback(
        async (wallet: string): Promise<bigint> => {
            const c = getContract(false);
            if (!c) return 0n;
            return await c.getReputation(wallet);
        },
        [getContract]
    );

    const getStats = useCallback(async (): Promise<Stats> => {
        // Use a plain RPC provider so stats load even without a wallet
        const rpc = new JsonRpcProvider(RPC_URL);
        const c = new Contract(CONTRACT_ADDRESS, bountyAbi, rpc);
        const res = await c.getStats();
        return {
            totalBounties: res[0],
            totalPaidOut: res[1],
            contractBalance: res[2],
        };
    }, []);

    const value: Web3ContextValue = {
        provider,
        signer,
        account,
        chainId,
        connecting,
        connect,
        switchToMonad,
        createBounty,
        linkWallet,
        approveBounty,
        refundBounty,
        getBountyInfo,
        getLinkedWallet,
        getReputation,
        getStats,
    };

    return <Web3Context.Provider value={value}>{children}</Web3Context.Provider>;
}

export function useWeb3() {
    const ctx = useContext(Web3Context);
    if (!ctx) throw new Error("useWeb3 must be used within Web3Provider");
    return ctx;
}

export { formatEther };