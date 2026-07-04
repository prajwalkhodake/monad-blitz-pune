/**
 * 🧪 TESTS — Make sure BountyEscrow works correctly before deploying
 * 
 * HOW TO RUN:
 *   cd contracts
 *   npx hardhat test
 * 
 * WHAT THESE TESTS DO:
 *   Think of tests like a checklist:
 *   ✅ Can we create a bounty? 
 *   ✅ Can we link a wallet?
 *   ✅ Can the agent approve and pay out?
 *   ✅ Can the creator refund after deadline?
 *   ✅ Can someone OTHER than the agent approve? (should fail!)
 *   ✅ Can someone double-claim a bounty? (should fail!)
 */

const { expect } = require("chai");
const { ethers } = require("hardhat");

// "describe" groups related tests together
describe("BountyEscrow", function () {

  // These variables are shared across tests
  let bountyEscrow;   // The deployed contract instance
  let owner;           // The wallet that deploys the contract
  let agent;           // The AI agent's wallet
  let contributor;     // A developer who fixes a bug
  let stranger;        // A random person (for testing access control)

  // "beforeEach" runs before EVERY test
  // It deploys a fresh contract so each test starts clean
  beforeEach(async function () {
    // Get 4 test wallets from Hardhat
    // Hardhat gives us 20 pre-funded wallets for testing
    [owner, agent, contributor, stranger] = await ethers.getSigners();

    // Deploy a fresh BountyEscrow contract
    // agent.address is passed to the constructor as the agent wallet
    const BountyEscrow = await ethers.getContractFactory("BountyEscrow");
    bountyEscrow = await BountyEscrow.deploy(agent.address);
    await bountyEscrow.waitForDeployment();
  });


  // ─────────────────────────────────────────────
  //  TEST: Deployment
  // ─────────────────────────────────────────────

  describe("Deployment", function () {
    it("should set the correct agent address", async function () {
      // Check that the agent address stored in the contract matches what we passed
      expect(await bountyEscrow.agent()).to.equal(agent.address);
    });

    it("should set the deployer as owner", async function () {
      expect(await bountyEscrow.owner()).to.equal(owner.address);
    });

    it("should start with zero bounties", async function () {
      expect(await bountyEscrow.totalBounties()).to.equal(0);
    });
  });


  // ─────────────────────────────────────────────
  //  TEST: Creating Bounties
  // ─────────────────────────────────────────────

  describe("Creating Bounties", function () {
    it("should create a bounty when MON is sent", async function () {
      // Set deadline to 1 hour from now
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      // Create a bounty worth 1 MON (ethers.parseEther converts "1.0" to wei)
      // "{ value: ... }" is how you send MON with a transaction
      await bountyEscrow.createBounty("repo#1", deadline, {
        value: ethers.parseEther("1.0"),
      });

      // Check that the bounty was stored correctly
      const info = await bountyEscrow.getBountyInfo("repo#1");
      expect(info.creator).to.equal(owner.address);
      expect(info.amount).to.equal(ethers.parseEther("1.0"));
      expect(info.funded).to.equal(true);
      expect(info.paid).to.equal(false);

      // Check the counter went up
      expect(await bountyEscrow.totalBounties()).to.equal(1);
    });

    it("should emit BountyCreated event", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      // "to.emit" checks that the transaction triggered an event
      await expect(
        bountyEscrow.createBounty("repo#1", deadline, {
          value: ethers.parseEther("0.5"),
        })
      ).to.emit(bountyEscrow, "BountyCreated");
    });

    it("should fail if no MON is sent", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      // "to.be.revertedWith" checks that the transaction FAILS with a specific message
      await expect(
        bountyEscrow.createBounty("repo#1", deadline, { value: 0 })
      ).to.be.revertedWith("You need to send some MON tokens");
    });

    it("should fail if bounty already exists", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      // Create first bounty (should work)
      await bountyEscrow.createBounty("repo#1", deadline, {
        value: ethers.parseEther("1.0"),
      });

      // Try to create same bounty again (should fail)
      await expect(
        bountyEscrow.createBounty("repo#1", deadline, {
          value: ethers.parseEther("1.0"),
        })
      ).to.be.revertedWith("A bounty already exists for this issue");
    });
  });


  // ─────────────────────────────────────────────
  //  TEST: Linking Wallets
  // ─────────────────────────────────────────────

  describe("Linking Wallets", function () {
    it("should link a GitHub username to a wallet", async function () {
      await bountyEscrow.linkWallet("alice123", contributor.address);
      
      // Check the link was stored
      expect(await bountyEscrow.getLinkedWallet("alice123")).to.equal(
        contributor.address
      );
    });

    it("should emit WalletLinked event", async function () {
      await expect(
        bountyEscrow.linkWallet("alice123", contributor.address)
      ).to.emit(bountyEscrow, "WalletLinked");
    });
  });


  // ─────────────────────────────────────────────
  //  TEST: Approving Bounties (the main feature!)
  // ─────────────────────────────────────────────

  describe("Approving Bounties", function () {
    // Set up a bounty and linked wallet before each approval test
    beforeEach(async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      // Owner creates a bounty worth 1 MON
      await bountyEscrow.createBounty("repo#1", deadline, {
        value: ethers.parseEther("1.0"),
      });

      // Contributor links their GitHub username to their wallet
      await bountyEscrow.linkWallet("alice123", contributor.address);
    });

    it("should pay the contributor when agent approves", async function () {
      // Record contributor's balance BEFORE approval
      const balanceBefore = await ethers.provider.getBalance(contributor.address);

      // Agent approves the bounty
      // .connect(agent) means "call this function AS the agent wallet"
      await bountyEscrow.connect(agent).approveBounty("repo#1", "alice123");

      // Check contributor's balance AFTER approval
      const balanceAfter = await ethers.provider.getBalance(contributor.address);
      
      // Balance should have increased by 1 MON
      expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("1.0"));

      // Check the bounty is marked as paid
      const info = await bountyEscrow.getBountyInfo("repo#1");
      expect(info.paid).to.equal(true);
    });

    it("should increase contributor's reputation", async function () {
      // Reputation should start at 0
      expect(await bountyEscrow.getReputation(contributor.address)).to.equal(0);

      // Agent approves
      await bountyEscrow.connect(agent).approveBounty("repo#1", "alice123");

      // Reputation should now be 1
      expect(await bountyEscrow.getReputation(contributor.address)).to.equal(1);
    });

    it("should fail if someone OTHER than agent tries to approve", async function () {
      // Stranger tries to approve (should fail)
      await expect(
        bountyEscrow.connect(stranger).approveBounty("repo#1", "alice123")
      ).to.be.revertedWith("Only the AI agent can do this");

      // Even the owner can't approve!
      await expect(
        bountyEscrow.connect(owner).approveBounty("repo#1", "alice123")
      ).to.be.revertedWith("Only the AI agent can do this");
    });

    it("should fail if bounty is paid twice", async function () {
      // First approval (should work)
      await bountyEscrow.connect(agent).approveBounty("repo#1", "alice123");

      // Second approval (should fail — prevent double-payment!)
      await expect(
        bountyEscrow.connect(agent).approveBounty("repo#1", "alice123")
      ).to.be.revertedWith("This bounty was already paid");
    });

    it("should fail if contributor wallet is not linked", async function () {
      // Try to approve for a username that hasn't linked their wallet
      await expect(
        bountyEscrow.connect(agent).approveBounty("repo#1", "unknown_user")
      ).to.be.revertedWith("Contributor has not linked their wallet");
    });

    it("should emit BountyApproved event", async function () {
      await expect(
        bountyEscrow.connect(agent).approveBounty("repo#1", "alice123")
      ).to.emit(bountyEscrow, "BountyApproved");
    });
  });


  // ─────────────────────────────────────────────
  //  TEST: Refunding Bounties
  // ─────────────────────────────────────────────

  describe("Refunding Bounties", function () {
    it("should refund the creator after deadline passes", async function () {
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 10;
      await bountyEscrow.createBounty("repo#1", deadline, {
        value: ethers.parseEther("1.0"),
      });

      // Fast-forward time past the deadline
      // This is a special Hardhat feature for testing time-dependent code
      await ethers.provider.send("evm_increaseTime", [20]);
      await ethers.provider.send("evm_mine");

      // Record balance before refund
      const balanceBefore = await ethers.provider.getBalance(owner.address);

      // Request refund
      const tx = await bountyEscrow.refundBounty("repo#1");
      const receipt = await tx.wait();
      
      // Calculate gas cost to get exact balance change
      const gasCost = receipt.gasUsed * receipt.gasPrice;

      // Check balance increased by 1 MON (minus gas)
      const balanceAfter = await ethers.provider.getBalance(owner.address);
      expect(balanceAfter + gasCost - balanceBefore).to.equal(
        ethers.parseEther("1.0")
      );
    });

    it("should fail if deadline has not passed", async function () {
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 3600; // 1 hour from now
      await bountyEscrow.createBounty("repo#1", deadline, {
        value: ethers.parseEther("1.0"),
      });

      // Try to refund immediately (should fail)
      await expect(
        bountyEscrow.refundBounty("repo#1")
      ).to.be.revertedWith("Deadline has not passed yet");
    });

    it("should fail if someone other than creator tries to refund", async function () {
      const block = await ethers.provider.getBlock("latest");
      const deadline = block.timestamp + 10;
      await bountyEscrow.createBounty("repo#1", deadline, {
        value: ethers.parseEther("1.0"),
      });

      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("evm_mine");

      // Stranger tries to refund (should fail)
      await expect(
        bountyEscrow.connect(stranger).refundBounty("repo#1")
      ).to.be.revertedWith("Only the bounty creator can request a refund");
    });
  });


  // ─────────────────────────────────────────────
  //  TEST: View Functions (getStats)
  // ─────────────────────────────────────────────

  describe("Stats", function () {
    it("should track contract stats correctly", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      // Create 2 bounties
      await bountyEscrow.createBounty("repo#1", deadline, {
        value: ethers.parseEther("1.0"),
      });
      await bountyEscrow.createBounty("repo#2", deadline, {
        value: ethers.parseEther("2.0"),
      });

      // Link wallet and approve one
      await bountyEscrow.linkWallet("alice123", contributor.address);
      await bountyEscrow.connect(agent).approveBounty("repo#1", "alice123");

      // Check stats
      const stats = await bountyEscrow.getStats();
      expect(stats._totalBounties).to.equal(2);
      expect(stats._totalPaidOut).to.equal(ethers.parseEther("1.0"));
      expect(stats._contractBalance).to.equal(ethers.parseEther("2.0"));
    });
  });
});
