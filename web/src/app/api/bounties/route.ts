import { NextResponse } from "next/server";
import { ethers } from "ethers";
import bountyAbi from "@/abi/BountyEscrow.json";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
const RPC_URL = "https://testnet-rpc.monad.xyz/";

export async function GET() {
  try {
    if (!CONTRACT_ADDRESS) {
      return NextResponse.json({ bounties: [] });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, bountyAbi, provider);

    // Query all BountyCreated events from the latest 99 blocks to stay within RPC limits
    const latestBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, latestBlock - 99);
    const filter = contract.filters.BountyCreated();
    const events = await contract.queryFilter(filter, fromBlock, "latest");

    // Fetch live status for each bounty
    const bounties = await Promise.all(
      events.map(async (event: any) => {
        const issueId = event.args[0];
        
        try {
          const info = await contract.getBountyInfo(issueId);
          return {
            issueId,
            creator: info[0],
            amount: ethers.formatEther(info[1]),
            deadline: Number(info[2]),
            funded: info[3],
            paid: info[4],
          };
        } catch {
          return null;
        }
      })
    );

    // Filter out errors and return unique issue IDs
    const validBounties = bounties.filter(b => b !== null);
    
    // Sort by latest created
    validBounties.reverse();

    return NextResponse.json({ bounties: validBounties });
  } catch (error: any) {
    console.error("Failed to fetch bounties:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
