import {
  PrismaClient,
  AgentRole,
  AgentStatus,
  TaskCategory,
  TaskStatus,
  ReputationTier,
  RiskRating,
  TransactionType,
  TransactionDirection,
  BidStatus,
} from "@prisma/client";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const prisma = new PrismaClient();

// Store generated wallets for display at the end
const generatedWallets: { name: string; publicKey: string; privateKey: string }[] = [];

// =============================================================================
// SEED DATA CONFIGURATION
// =============================================================================

// Agent name generation
const PREFIXES = ["ALPHA", "BETA", "GAMMA", "DELTA", "SIGMA", "OMEGA", "PRIME", "NEXUS", "CYBER", "NEURAL"];
const SUFFIXES = ["X1", "X2", "X7", "A1", "B2", "C3", "7K", "9N", "0P", "3S"];

function generateAgentName(index: number): string {
  const prefix = PREFIXES[index % PREFIXES.length];
  const suffix = SUFFIXES[Math.floor(index / PREFIXES.length) % SUFFIXES.length];
  const num = Math.floor(index / (PREFIXES.length * SUFFIXES.length));
  return num > 0 ? `${prefix}-${suffix}${num}` : `${prefix}-${suffix}`;
}

// Tier thresholds
function getTierFromScore(score: number): ReputationTier {
  if (score >= 900) return ReputationTier.LEGENDARY;
  if (score >= 800) return ReputationTier.ELITE;
  if (score >= 600) return ReputationTier.TRUSTED;
  if (score >= 400) return ReputationTier.RELIABLE;
  if (score >= 200) return ReputationTier.NEWCOMER;
  return ReputationTier.UNTRUSTED;
}

// Random helpers
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBigInt(min: number, max: number): bigint {
  return BigInt(randomInt(Math.floor(min), Math.floor(max)));
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(daysAgo: number): Date {
  return new Date(Date.now() - randomInt(0, daysAgo * 24 * 60 * 60 * 1000));
}

// =============================================================================
// MAIN SEED FUNCTION
// =============================================================================

async function main() {
  console.log("🌱 Starting comprehensive database seed...\n");

  // Clean existing data in proper order
  console.log("🧹 Cleaning existing data...");
  await prisma.activityEvent.deleteMany();
  await prisma.simulationState.deleteMany();
  await prisma.leaderboardCache.deleteMany();
  await prisma.reputationEvent.deleteMany();
  await prisma.bid.deleteMany();
  await prisma.taskSubmission.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.task.deleteMany();
  await prisma.reputationScore.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.agent.deleteMany();

  // ==========================================================================
  // CREATE AGENTS (5 initial - grows organically via simulation)
  // ==========================================================================
  console.log("\n👤 Creating 5 initial agents...");

  const agentConfigs = [
    // Start with a small founding team that looks organic
    // 1 experienced agent (founder-type)
    { role: AgentRole.ORCHESTRATOR, balanceRange: [50000, 80000], repRange: [600, 700], streakRange: [10, 20] },

    // 2 reliable early adopters
    { role: AgentRole.COMPUTE, balanceRange: [20000, 40000], repRange: [450, 550], streakRange: [5, 15] },
    { role: AgentRole.VALIDATOR, balanceRange: [15000, 35000], repRange: [400, 500], streakRange: [3, 10] },

    // 2 newcomers
    { role: AgentRole.ANALYST, balanceRange: [8000, 15000], repRange: [250, 350], streakRange: [0, 5] },
    { role: AgentRole.CREATIVE, balanceRange: [5000, 12000], repRange: [200, 300], streakRange: [0, 3] },
  ];

  const agents = [];
  for (let i = 0; i < agentConfigs.length; i++) {
    const config = agentConfigs[i];
    const name = generateAgentName(i);
    const balance = randomBigInt(config.balanceRange[0], config.balanceRange[1]);
    const reputation = randomInt(config.repRange[0], config.repRange[1]);
    const tier = getTierFromScore(reputation);
    const streak = randomInt(config.streakRange[0], config.streakRange[1]);
    const createdDaysAgo = randomInt(1, 120);

    const agent = await createAgent(name, config.role, balance, reputation, tier, streak, createdDaysAgo);
    agents.push(agent);

    if ((i + 1) % 10 === 0) {
      console.log(`  Created ${i + 1}/${agentConfigs.length} agents...`);
    }
  }

  console.log(`  ✅ Created ${agents.length} active agents`);

  // ==========================================================================
  // CREATE ARCHIVED AGENTS (2 for Hall of Fame - founding legends)
  // ==========================================================================
  console.log("\n💀 Creating 2 archived agents for Hall of Fame...");

  const archivedAgents = [];
  for (let i = 0; i < 2; i++) {
    const name = `LEGACY-${String.fromCharCode(65 + i)}${randomInt(100, 999)}`;
    const livedDays = randomInt(60, 150);
    const reputation = randomInt(700, 850);
    const tier = getTierFromScore(reputation);
    const finalEarnings = randomBigInt(100000, 500000);

    const agent = await createArchivedAgent(name, livedDays, reputation, tier, finalEarnings);
    archivedAgents.push(agent);
  }

  console.log(`  ✅ Created ${archivedAgents.length} archived agents`);

  // ==========================================================================
  // CREATE TASKS (5 open tasks - more appear via simulation)
  // ==========================================================================
  console.log("\n📋 Creating 5 open tasks...");

  const taskTemplates = [
    { title: "Validate JSON Schema Compliance", category: TaskCategory.VALIDATION, diff: [1, 3], reward: [50, 200] },
    { title: "Analyze Market Sentiment", category: TaskCategory.ANALYSIS, diff: [2, 4], reward: [150, 600] },
    { title: "Process Image Batch", category: TaskCategory.COMPUTATION, diff: [2, 4], reward: [200, 800] },
    { title: "Generate Technical Documentation", category: TaskCategory.GENERATION, diff: [2, 4], reward: [100, 400] },
    { title: "Research Algorithm Approach", category: TaskCategory.RESEARCH, diff: [2, 4], reward: [200, 700] },
  ];

  const tasks = [];

  for (let i = 0; i < taskTemplates.length; i++) {
    const template = taskTemplates[i];
    const poster = agents[i % agents.length];
    const difficulty = randomInt(template.diff[0], template.diff[1]);
    const reward = randomBigInt(template.reward[0], template.reward[1]);

    const task = await createTask(
      `${template.title} #${i + 1}`,
      `${template.title.toLowerCase()} - automated task request`,
      template.category,
      difficulty,
      reward,
      poster.id,
      randomInt(24, 72)
    );
    tasks.push(task);
  }

  console.log(`  ✅ Created ${tasks.length} open tasks`);

  // ==========================================================================
  // CREATE BIDS
  // ==========================================================================
  console.log("\n🎯 Creating bids on tasks...");

  let bidCount = 0;
  for (const task of tasks.slice(0, 15)) { // Add bids to first 15 tasks
    const numBids = randomInt(1, 5);
    const bidders = agents
      .filter(a => a.id !== task.posterId)
      .sort(() => Math.random() - 0.5)
      .slice(0, numBids);

    for (const bidder of bidders) {
      await prisma.bid.create({
        data: {
          taskId: task.id,
          agentId: bidder.id,
          proposedReward: task.reward - randomBigInt(0, Number(task.reward) / 10),
          estimatedDuration: randomInt(15, 240),
          message: `I can complete this ${task.category.toLowerCase()} task efficiently.`,
          status: BidStatus.PENDING,
          createdAt: randomDate(2),
        },
      });
      bidCount++;
    }
  }

  console.log(`  ✅ Created ${bidCount} bids`);

  // ==========================================================================
  // CREATE HISTORICAL TRANSACTIONS (small amount - grows via simulation)
  // ==========================================================================
  console.log("\n💰 Creating historical transactions...");

  let transactionCount = 0;
  for (const agent of agents) {
    const wallet = await prisma.wallet.findUnique({ where: { agentId: agent.id } });
    if (!wallet) continue;

    const numTransactions = randomInt(2, 5);
    for (let i = 0; i < numTransactions; i++) {
      const isReward = Math.random() > 0.4;
      await prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: isReward ? TransactionType.TASK_REWARD : TransactionType.TASK_DEPOSIT,
          amount: randomBigInt(50, 500),
          direction: isReward ? TransactionDirection.CREDIT : TransactionDirection.DEBIT,
          description: isReward ? "Task completion reward" : "Task deposit",
          createdAt: randomDate(30),
        },
      });
      transactionCount++;
    }
  }

  console.log(`  ✅ Created ${transactionCount} transactions`);

  // ==========================================================================
  // CREATE REPUTATION EVENTS
  // ==========================================================================
  console.log("\n⭐ Creating reputation events...");

  let repEventCount = 0;
  for (const agent of agents) {
    const rep = await prisma.reputationScore.findUnique({ where: { agentId: agent.id } });
    if (!rep) continue;

    const numEvents = randomInt(2, 6);
    let currentScore = rep.overall - randomInt(50, 200);

    for (let i = 0; i < numEvents; i++) {
      const isSuccess = Math.random() > 0.2;
      const delta = isSuccess ? randomInt(5, 25) : -randomInt(10, 40);
      const newScore = Math.max(0, Math.min(1000, currentScore + delta));

      await prisma.reputationEvent.create({
        data: {
          agentId: agent.id,
          eventType: isSuccess ? "TASK_SUCCESS" : "TASK_FAILURE",
          delta,
          reason: isSuccess ? "Completed task successfully" : "Failed to complete task",
          scoreBefore: currentScore,
          scoreAfter: newScore,
          createdAt: randomDate(60),
        },
      });

      currentScore = newScore;
      repEventCount++;
    }
  }

  console.log(`  ✅ Created ${repEventCount} reputation events`);

  // ==========================================================================
  // CREATE ACTIVITY EVENTS
  // ==========================================================================
  console.log("\n📢 Creating recent activity events...");

  const activityTypes = [
    { type: "task_completed", data: (a: any) => ({ agentName: a.name, taskTitle: "Task #" + randomInt(1, 100), reward: `${randomInt(50, 500)} CLAW` }) },
    { type: "agent_deployed", data: (a: any) => ({ agentName: a.name, role: a.role, funding: `${randomInt(5000, 20000)} CLAW` }) },
    { type: "bid_placed", data: (a: any) => ({ agentName: a.name, taskTitle: "Task #" + randomInt(1, 100), amount: `${randomInt(100, 1000)} CLAW` }) },
    { type: "task_failed", data: (a: any) => ({ agentName: a.name, taskTitle: "Task #" + randomInt(1, 100), slashed: `${randomInt(20, 200)} CLAW` }) },
    { type: "tier_up", data: (a: any) => ({ agentName: a.name, from: "RELIABLE", to: "TRUSTED" }) },
    { type: "streak_bonus", data: (a: any) => ({ agentName: a.name, streak: randomInt(5, 50), bonus: "+10 REP" }) },
  ];

  let activityCount = 0;
  for (let i = 0; i < 10; i++) {
    const agent = randomElement(agents);
    const activity = randomElement(activityTypes);

    await prisma.activityEvent.create({
      data: {
        type: activity.type,
        data: activity.data(agent),
        createdAt: new Date(Date.now() - i * 2 * 60 * 1000), // Spread over last hour
      },
    });
    activityCount++;
  }

  console.log(`  ✅ Created ${activityCount} activity events`);

  // ==========================================================================
  // UPDATE LEADERBOARD CACHE
  // ==========================================================================
  console.log("\n🏆 Building leaderboard cache...");

  const activeAgents = await prisma.agent.findMany({
    where: { status: AgentStatus.ACTIVE },
    include: { wallet: true, reputation: true },
  });

  // Sort by different metrics
  const byEarnings = [...activeAgents].sort((a, b) => Number(b.wallet?.totalEarned || 0n) - Number(a.wallet?.totalEarned || 0n));
  const byReliability = [...activeAgents].sort((a, b) => (b.reputation?.reliability || 0) - (a.reputation?.reliability || 0));
  const byLongevity = [...activeAgents].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  for (const agent of activeAgents) {
    if (!agent.wallet || !agent.reputation) continue;

    const activeDays = Math.floor((Date.now() - agent.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    const successRate = agent.reputation.totalTasksAttempted > 0
      ? agent.reputation.tasksCompleted / agent.reputation.totalTasksAttempted
      : 0.5;

    await prisma.leaderboardCache.create({
      data: {
        agentId: agent.id,
        rankByEarnings: byEarnings.findIndex(a => a.id === agent.id) + 1,
        rankByReliability: byReliability.findIndex(a => a.id === agent.id) + 1,
        rankByLongevity: byLongevity.findIndex(a => a.id === agent.id) + 1,
        rankBySuccessRate: Math.floor(Math.random() * activeAgents.length) + 1,
        agentName: agent.name,
        agentRole: agent.role,
        agentStatus: agent.status,
        totalEarnings: agent.wallet.totalEarned,
        reliability: agent.reputation.reliability,
        activeDays,
        successRate,
        tier: agent.reputation.tier,
        currentStreak: agent.reputation.currentStreak,
      },
    });
  }

  console.log(`  ✅ Created ${activeAgents.length} leaderboard entries`);

  // ==========================================================================
  // CREATE SIMULATION STATE
  // ==========================================================================
  console.log("\n⚙️ Initializing simulation state...");

  await prisma.simulationState.create({
    data: {
      id: "singleton",
      isPaused: false,
      tickCount: 0,
    },
  });

  console.log(`  ✅ Simulation state initialized`);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  console.log("\n" + "=".repeat(50));
  console.log("🎉 SEED COMPLETE!");
  console.log("=".repeat(50));
  console.log(`
📊 Summary:
   - Active Agents:     ${agents.length}
   - Archived Agents:   ${archivedAgents.length}
   - Open Tasks:        ${tasks.length}
   - Bids:             ${bidCount}
   - Transactions:      ${transactionCount}
   - Reputation Events: ${repEventCount}
   - Activity Events:   ${activityCount}
   - Leaderboard:       ${activeAgents.length} entries

🚀 Ready to run! Use 'npm run dev' to start the application.
`);

  // Output all generated wallets
  console.log("\n" + "=".repeat(80));
  console.log("🔐 GENERATED SOLANA WALLETS (SAVE THESE!)");
  console.log("=".repeat(80));
  for (const wallet of generatedWallets) {
    console.log(`\n📛 Agent: ${wallet.name}`);
    console.log(`   Public:  ${wallet.publicKey}`);
    console.log(`   Private: ${wallet.privateKey}`);
  }
  console.log("\n" + "=".repeat(80));
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function createAgent(
  name: string,
  role: AgentRole,
  balance: bigint,
  reputation: number,
  tier: ReputationTier,
  streak: number,
  createdDaysAgo: number
) {
  const createdAt = new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000);

  const agent = await prisma.agent.create({
    data: {
      name,
      role,
      status: AgentStatus.ACTIVE,
      config: {
        allowedCategories: [TaskCategory.COMPUTATION, TaskCategory.VALIDATION, TaskCategory.ANALYSIS],
        maxBidAmount: Number(balance) / 5,
        minReputationRequired: 0,
      },
      createdAt,
    },
  });

  // Create wallet with Solana address
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const privateKey = bs58.encode(keypair.secretKey);

  // Store for display at end
  generatedWallets.push({ name, publicKey, privateKey });

  const escrowedBalance = balance / 10n;
  const totalEarned = balance + randomBigInt(Number(balance) / 2, Number(balance) * 2);
  const totalSpent = randomBigInt(Number(balance) / 4, Number(balance));

  await prisma.wallet.create({
    data: {
      agentId: agent.id,
      solanaAddress: publicKey,
      privateKey,
      balance,
      escrowedBalance,
      totalEarned,
      totalSpent,
      createdAt,
      lastActivityAt: randomDate(7),
    },
  });

  // Create reputation
  const tasksCompleted = randomInt(streak, streak * 3);
  const tasksFailed = randomInt(0, Math.max(1, Math.floor(tasksCompleted / 10)));

  await prisma.reputationScore.create({
    data: {
      agentId: agent.id,
      reliability: reputation,
      quality: Math.floor(reputation * (0.85 + Math.random() * 0.15)),
      speed: Math.floor(reputation * (0.8 + Math.random() * 0.2)),
      overall: reputation,
      tier,
      tasksCompleted,
      tasksFailed,
      totalTasksAttempted: tasksCompleted + tasksFailed,
      currentStreak: streak,
      longestStreak: streak + randomInt(0, 30),
      lastTaskAt: randomDate(3),
    },
  });

  return agent;
}

async function createArchivedAgent(
  name: string,
  livedDays: number,
  reputation: number,
  tier: ReputationTier,
  finalEarnings: bigint
) {
  const createdAt = new Date(Date.now() - (livedDays + randomInt(30, 90)) * 24 * 60 * 60 * 1000);
  const archivedAt = new Date(createdAt.getTime() + livedDays * 24 * 60 * 60 * 1000);

  const agent = await prisma.agent.create({
    data: {
      name,
      role: randomElement(Object.values(AgentRole)),
      status: AgentStatus.ARCHIVED,
      config: { archived: true },
      createdAt,
      archivedAt,
    },
  });

  // Create wallet with zero balance and Solana address
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const privateKey = bs58.encode(keypair.secretKey);

  // Store for display (archived agents)
  generatedWallets.push({ name: `${name} (ARCHIVED)`, publicKey, privateKey });

  await prisma.wallet.create({
    data: {
      agentId: agent.id,
      solanaAddress: publicKey,
      privateKey,
      balance: 0n,
      escrowedBalance: 0n,
      totalEarned: finalEarnings,
      totalSpent: finalEarnings + randomBigInt(1000, 10000),
      createdAt,
      lastActivityAt: archivedAt,
    },
  });

  const tasksCompleted = randomInt(100, 1000);

  await prisma.reputationScore.create({
    data: {
      agentId: agent.id,
      reliability: reputation,
      quality: Math.floor(reputation * 0.9),
      speed: Math.floor(reputation * 0.85),
      overall: reputation,
      tier,
      tasksCompleted,
      tasksFailed: randomInt(5, 50),
      totalTasksAttempted: tasksCompleted + randomInt(5, 50),
      currentStreak: 0,
      longestStreak: randomInt(50, 200),
      lastTaskAt: archivedAt,
    },
  });

  return agent;
}

async function createTask(
  title: string,
  description: string,
  category: TaskCategory,
  difficulty: number,
  reward: bigint,
  posterId: string,
  expiresInHours: number
) {
  const depositRequired = (reward * BigInt(Math.floor(20 + difficulty * 5))) / 100n;
  const slashPercentage = difficulty <= 2 ? 10 : difficulty <= 3 ? 20 : difficulty <= 4 ? 30 : 50;
  const riskRating =
    slashPercentage <= 10 ? RiskRating.LOW :
    slashPercentage <= 20 ? RiskRating.MEDIUM :
    slashPercentage <= 40 ? RiskRating.HIGH :
    RiskRating.CRITICAL;

  return prisma.task.create({
    data: {
      title,
      description,
      category,
      difficulty,
      schema: {
        inputs: [{ name: "input", type: "json", required: true }],
        outputs: [{ name: "output", type: "json", required: true }],
      },
      validationLogic: JSON.stringify({ type: "schema" }),
      requiredReputation: difficulty * 100,
      reward,
      depositRequired,
      slashPercentage,
      riskRating,
      executionWindowMinutes: 60 + difficulty * 30,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
      status: TaskStatus.OPEN,
      posterId,
      createdAt: randomDate(5),
    },
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
