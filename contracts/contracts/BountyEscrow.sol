// SPDX-License-Identifier: MIT
// ☝️ This line tells everyone this code is open-source (MIT license)

pragma solidity ^0.8.24;
// ☝️ This tells the compiler which version of Solidity to use
// Think of it like saying "use Node.js version 18+"

/**
 * 🏆 BountyEscrow — Autonomous Bounty Verifier
 * 
 * WHAT DOES THIS CONTRACT DO? (in plain English)
 * ================================================
 * Imagine a piggy bank that only opens when an AI says "yes":
 * 
 * 1. A repo owner says "I'll pay 1 MON to whoever fixes bug #42"
 *    → They send 1 MON to this contract. The contract holds it safely.
 * 
 * 2. A developer fixes the bug and makes a Pull Request
 *    → They register their GitHub username + wallet address here
 * 
 * 3. Our AI agent reviews the PR and says "yes, this fixes the bug"
 *    → The AI calls this contract, and the 1 MON goes to the developer's wallet
 * 
 * That's it! The contract is just a secure middleman that holds money
 * and only releases it when the AI agent approves.
 */
contract BountyEscrow {

    // =============================================================
    //  📦 VARIABLES — These store data on the blockchain forever
    // =============================================================

    // The AI agent's wallet address
    // Only THIS address can approve bounties and release payments
    // "immutable" means it's set once during deployment and can NEVER change
    address public immutable agent;

    // The person who deployed this contract
    address public owner;

    // A counter — how many bounties have been created so far
    uint256 public totalBounties;

    // Total MON tokens paid out through this contract
    uint256 public totalPaidOut;


    // =============================================================
    //  📋 STRUCT — A custom data type (like an object in JavaScript)
    // =============================================================

    // This is like a JavaScript object:
    // { creator: "0x...", amount: 100, funded: true, ... }
    struct Bounty {
        address creator;      // Who created and funded this bounty
        uint256 amount;       // How much MON is locked up
        uint256 deadline;     // When does this bounty expire (Unix timestamp)
        bool funded;          // Has money been deposited? (true/false)
        bool paid;            // Has the bounty been paid out already?
    }


    // =============================================================
    //  🗂️ MAPPINGS — Like JavaScript objects/dictionaries
    //  mapping(key => value) is like:  const myMap = { key: value }
    // =============================================================

    // issueId → Bounty details
    // Example: bounties["myrepo#42"] = { creator: 0x..., amount: 1 MON, ... }
    mapping(string => Bounty) public bounties;

    // GitHub username → wallet address
    // Example: walletLinks["alice123"] = 0xAliceWalletAddress
    mapping(string => address) public walletLinks;

    // wallet address → reputation score (how many bounties they've completed)
    // Example: reputation[0xAlice] = 5 (Alice has completed 5 bounties)
    mapping(address => uint256) public reputation;


    // =============================================================
    //  📣 EVENTS — Notifications that the frontend can listen to
    //  Think of these like console.log() but for the blockchain
    // =============================================================

    event BountyCreated(
        string issueId,        // Which issue this bounty is for
        address creator,       // Who funded it
        uint256 amount,        // How much MON
        uint256 deadline       // When it expires
    );

    event WalletLinked(
        string githubUsername,  // The GitHub username
        address wallet          // Their wallet address
    );

    event BountyApproved(
        string issueId,          // Which bounty was approved
        string githubUsername,    // Who fixed it
        address wallet,          // Where the money went
        uint256 amount           // How much was paid
    );

    event BountyRefunded(
        string issueId,        // Which bounty was refunded
        address creator,       // Who got their money back
        uint256 amount         // How much was refunded
    );


    // =============================================================
    //  🔒 MODIFIER — A reusable access check
    //  Like middleware in Express.js: runs BEFORE the function
    // =============================================================

    // This is like: if (req.user !== agent) return res.status(403).send("Not allowed")
    modifier onlyAgent() {
        require(msg.sender == agent, "Only the AI agent can do this");
        _;  // ← This means "now run the actual function"
    }


    // =============================================================
    //  🏗️ CONSTRUCTOR — Runs ONCE when the contract is deployed
    //  Like the constructor in a JavaScript class
    // =============================================================

    /**
     * @param _agent The wallet address of our AI agent
     * 
     * When you deploy this contract, you pass in the agent's address:
     *   npx hardhat run scripts/deploy.js --network monadTestnet
     * 
     * The deploy script reads the agent address from your .env file.
     */
    constructor(address _agent) {
        // Make sure the agent address isn't empty (0x000...000)
        require(_agent != address(0), "Agent address cannot be zero");
        
        agent = _agent;           // Set the AI agent's address (permanent)
        owner = msg.sender;       // msg.sender = whoever deployed this contract
    }


    // =============================================================
    //  💰 CREATE BOUNTY — Lock up MON tokens for a GitHub issue
    // =============================================================

    /**
     * HOW TO USE:
     *   1. Call this function and send MON with the transaction
     *   2. The MON gets locked in this contract
     *   3. Pass an issueId like "owner/repo#42" to identify which issue
     *   4. Set a deadline (Unix timestamp) — after this, you can get a refund
     * 
     * The "payable" keyword means this function can receive MON tokens.
     * msg.value = how much MON the caller sent with the transaction.
     */
    function createBounty(string memory issueId, uint256 deadline) external payable {
        // --- CHECKS (validate inputs) ---
        
        // msg.value is the amount of MON sent with this transaction
        require(msg.value > 0, "You need to send some MON tokens");
        
        // Can't create two bounties with the same issue ID
        require(!bounties[issueId].funded, "A bounty already exists for this issue");
        
        // Deadline must be in the future
        // block.timestamp = current time on the blockchain
        require(deadline > block.timestamp, "Deadline must be in the future");

        // --- EFFECTS (update storage) ---
        
        // Store the bounty details
        bounties[issueId] = Bounty({
            creator: msg.sender,     // The person calling this function
            amount: msg.value,       // How much MON they sent
            deadline: deadline,      // When the bounty expires
            funded: true,            // Yes, it's funded now
            paid: false              // Not paid yet
        });

        // Increment the counter
        totalBounties = totalBounties + 1;

        // --- EVENT (notify the frontend) ---
        emit BountyCreated(issueId, msg.sender, msg.value, deadline);
    }


    // =============================================================
    //  🔗 LINK WALLET — Connect a GitHub username to a wallet
    // =============================================================

    /**
     * HOW TO USE:
     *   A developer calls this to say:
     *   "My GitHub username is 'alice123', send my bounties to wallet 0xABC..."
     * 
     *   They only need to do this ONCE. After that, any bounty approved
     *   for their GitHub username will automatically go to this wallet.
     * 
     * NOTE: Anyone can call this. In a production app, you'd verify
     *       GitHub identity with OAuth. For the hackathon demo, this is fine.
     */
    function linkWallet(string memory githubUsername, address wallet) external {
        // Make sure the wallet address isn't empty
        require(wallet != address(0), "Wallet address cannot be zero");
        
        // Make sure the username isn't empty
        require(bytes(githubUsername).length > 0, "Username cannot be empty");

        // Store the link: githubUsername → wallet address
        walletLinks[githubUsername] = wallet;

        // Notify the frontend
        emit WalletLinked(githubUsername, wallet);
    }


    // =============================================================
    //  ✅ APPROVE BOUNTY — AI agent releases payment to contributor
    // =============================================================

    /**
     * HOW TO USE:
     *   The AI agent calls this after reviewing a PR:
     *   1. Agent checks: Does the PR fix the issue? ✅
     *   2. Agent checks: Any security vulnerabilities? ❌ (none found)
     *   3. Agent calls: approveBounty("owner/repo#42", "alice123")
     *   4. Contract sends the MON to alice123's linked wallet
     * 
     * The "onlyAgent" modifier means ONLY the agent wallet can call this.
     * Nobody else — not even the contract owner — can release the funds.
     */
    function approveBounty(
        string memory issueId,
        string memory githubUsername
    ) external onlyAgent {
        // --- CHECKS ---
        
        // Get the bounty from storage
        Bounty storage bounty = bounties[issueId];
        
        // Make sure the bounty exists and has money in it
        require(bounty.funded, "This bounty does not exist");
        
        // Make sure it hasn't already been paid (prevent double-payment)
        require(!bounty.paid, "This bounty was already paid");

        // Look up the contributor's wallet address
        address payable contributorWallet = payable(walletLinks[githubUsername]);
        
        // Make sure the contributor has linked their wallet
        require(contributorWallet != address(0), "Contributor has not linked their wallet");

        // How much to pay
        uint256 payoutAmount = bounty.amount;

        // --- EFFECTS (update storage BEFORE sending money) ---
        // We update storage first to prevent "reentrancy attacks"
        // (a common smart contract hack where someone calls the function again
        //  before the first call finishes, draining the contract)
        
        bounty.paid = true;                          // Mark as paid
        totalPaidOut = totalPaidOut + payoutAmount;   // Update total stats
        reputation[contributorWallet] = reputation[contributorWallet] + 1;  // +1 reputation

        // --- INTERACTIONS (send the money!) ---
        
        // This is how you send MON (or ETH on Ethereum) in Solidity
        // .call{value: amount}("") sends `amount` of native tokens to the address
        (bool success, ) = contributorWallet.call{value: payoutAmount}("");
        require(success, "Payment failed! MON transfer unsuccessful");

        // --- EVENT ---
        emit BountyApproved(issueId, githubUsername, contributorWallet, payoutAmount);
    }


    // =============================================================
    //  ↩️ REFUND BOUNTY — Creator gets money back after deadline
    // =============================================================

    /**
     * HOW TO USE:
     *   If nobody fixes the issue before the deadline:
     *   1. Wait for the deadline to pass
     *   2. The bounty creator calls refundBounty("owner/repo#42")
     *   3. They get their MON tokens back
     * 
     * Only the ORIGINAL CREATOR can call this (not anyone else).
     */
    function refundBounty(string memory issueId) external {
        // Get the bounty
        Bounty storage bounty = bounties[issueId];
        
        // Check it exists
        require(bounty.funded, "This bounty does not exist");
        
        // Check the caller is the creator
        // msg.sender = whoever is calling this function right now
        require(msg.sender == bounty.creator, "Only the bounty creator can request a refund");
        
        // Check the deadline has passed
        require(block.timestamp > bounty.deadline, "Deadline has not passed yet");
        
        // Check it hasn't been paid already
        require(!bounty.paid, "This bounty was already paid out");

        // How much to refund
        uint256 refundAmount = bounty.amount;

        // Mark as paid (so it can't be refunded again)
        bounty.paid = true;

        // Send the money back to the creator
        (bool success, ) = payable(bounty.creator).call{value: refundAmount}("");
        require(success, "Refund failed! MON transfer unsuccessful");

        // Notify
        emit BountyRefunded(issueId, bounty.creator, refundAmount);
    }


    // =============================================================
    //  👀 VIEW FUNCTIONS — Read data without paying gas
    //  "view" means these don't modify anything, just read data
    //  They're free to call (no gas cost for reading)
    // =============================================================

    /**
     * Get all info about a bounty
     * Returns multiple values (Solidity can return multiple things at once)
     */
    function getBountyInfo(string memory issueId)
        external
        view
        returns (
            address creator,
            uint256 amount,
            uint256 deadline,
            bool funded,
            bool paid
        )
    {
        Bounty storage b = bounties[issueId];
        return (b.creator, b.amount, b.deadline, b.funded, b.paid);
    }

    /**
     * Get the wallet address linked to a GitHub username
     * Returns address(0) if not linked yet
     */
    function getLinkedWallet(string memory githubUsername) 
        external 
        view 
        returns (address) 
    {
        return walletLinks[githubUsername];
    }

    /**
     * Get a contributor's reputation score
     * (how many bounties they've successfully completed)
     */
    function getReputation(address wallet) external view returns (uint256) {
        return reputation[wallet];
    }

    /**
     * Get overall contract stats
     * Useful for the dashboard to show totals
     */
    function getStats()
        external
        view
        returns (
            uint256 _totalBounties,     // How many bounties created
            uint256 _totalPaidOut,      // Total MON paid to contributors
            uint256 _contractBalance    // MON currently held in escrow
        )
    {
        return (totalBounties, totalPaidOut, address(this).balance);
    }


    // =============================================================
    //  📥 RECEIVE — Lets the contract accept plain MON transfers
    // =============================================================

    // If someone accidentally sends MON directly to this contract
    // (without calling a function), this catches it instead of reverting
    receive() external payable {}
}
