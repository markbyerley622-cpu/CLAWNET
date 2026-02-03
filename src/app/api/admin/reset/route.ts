import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AgentService } from "@/lib/services/agent";
import { ActivityService } from "@/lib/services/activity";
import { generateUniqueAgentName } from "@/lib/simulation/names";
import { generateWeightedTaskBatch } from "@/lib/simulation/tasks";
import type { AgentRole } from "@/types";

/**
 * POST /api/admin/reset
 * Reset all agents and simulation data and start fresh with 1 agent
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin key
    const adminKey = request.headers.get("x-admin-key");
    if (adminKey !== process.env.ADMIN_DEV_KEY) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { keepWallets = true } = body;

    // Store wallet data before reset if keeping wallets
    let walletBackup: any[] = [];
    if (keepWallets) {
      walletBackup = await db.wallet.findMany({
        select: {
          solanaAddress: true,
          privateKey: true,
          agentId: true,
          agent: {
            select: {
              name: true,
              role: true,
            }
          }
        }
      });
    }

    // Delete in proper order to avoid foreign key issues
    console.log("[RESET] Clearing activity events...");
    await db.activityEvent.deleteMany();

    console.log("[RESET] Clearing simulation state...");
    await db.simulationState.deleteMany();

    console.log("[RESET] Clearing leaderboard cache...");
    await db.leaderboardCache.deleteMany();

    console.log("[RESET] Clearing reputation events...");
    await db.reputationEvent.deleteMany();

    console.log("[RESET] Clearing bids...");
    await db.bid.deleteMany();

    console.log("[RESET] Clearing task submissions...");
    await db.taskSubmission.deleteMany();

    console.log("[RESET] Clearing transactions...");
    await db.transaction.deleteMany();

    console.log("[RESET] Clearing tasks...");
    await db.task.deleteMany();

    console.log("[RESET] Clearing reputation scores...");
    await db.reputationScore.deleteMany();

    console.log("[RESET] Clearing wallets...");
    await db.wallet.deleteMany();

    console.log("[RESET] Clearing agents...");
    await db.agent.deleteMany();

    // Reinitialize simulation state with reset spawn timer
    console.log("[RESET] Reinitializing simulation state...");
    await db.simulationState.create({
      data: {
        id: "singleton",
        isPaused: false,
        tickCount: 0,
        lastAgentSpawnAt: null, // Reset spawn timer so next tick can spawn
        lastTaskBatchAt: null,
        lastLeaderboardUpdate: null,
        firstCapReachedAt: null,
      },
    });

    // Create the first agent (Genesis Agent)
    console.log("[RESET] Creating genesis agent...");
    const genesisName = generateUniqueAgentName();
    const genesisRole: AgentRole = "ORCHESTRATOR";
    const genesisFunding = BigInt(50000); // 50K CLAW initial funding

    const genesisAgent = await AgentService.create({
      name: genesisName,
      role: genesisRole,
      config: {
        allowedCategories: ["COMPUTATION", "VALIDATION", "ANALYSIS", "GENERATION", "ORCHESTRATION", "RESEARCH"],
        maxBidAmount: 10000,
        minReputationRequired: 0,
        synthetic: true,
      },
      initialFunding: genesisFunding,
    });

    // Log the genesis event
    await ActivityService.logAgentDeployed(
      genesisAgent.id,
      genesisName,
      genesisRole,
      genesisFunding
    );

    // Create initial tasks for the genesis agent
    let tasksCreated = 0;
    const taskTemplates = generateWeightedTaskBatch(3); // Create 3 initial tasks
    for (const template of taskTemplates) {
      const task = await db.task.create({
        data: {
          ...template,
          posterId: genesisAgent.id,
          status: "OPEN",
        },
      });
      await ActivityService.logTaskCreated(
        genesisAgent.id,
        genesisName,
        task.id,
        task.title,
        task.category,
        task.reward
      );
      tasksCreated++;
    }

    // Create leaderboard entry
    await db.leaderboardCache.create({
      data: {
        agentId: genesisAgent.id,
        rankByEarnings: 1,
        rankByReliability: 1,
        rankByLongevity: 1,
        rankBySuccessRate: 1,
        agentName: genesisName,
        agentRole: genesisRole,
        agentStatus: "ACTIVE",
        totalEarnings: 0n,
        reliability: 500,
        activeDays: 0,
        successRate: 0,
        tier: "NEWCOMER",
        currentStreak: 0,
      },
    });

    console.log(`[RESET] Reset complete! Created genesis agent: ${genesisName} with ${tasksCreated} tasks`);

    return NextResponse.json({
      success: true,
      message: `Reset complete. Started fresh with 1 agent (${genesisName}) and ${tasksCreated} tasks. New agent will spawn every 2 minutes.`,
      data: {
        walletsBackedUp: walletBackup.length,
        genesisAgent: {
          id: genesisAgent.id,
          name: genesisName,
          role: genesisRole,
          funding: genesisFunding.toString(),
        },
        tasksCreated,
        wallets: keepWallets ? walletBackup.map(w => ({
          agentName: w.agent?.name || "Unknown",
          role: w.agent?.role || "Unknown",
          solanaAddress: w.solanaAddress,
          privateKey: w.privateKey,
        })) : [],
      },
    });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/reset
 * Get current database counts
 */
export async function GET(request: NextRequest) {
  try {
    const [agents, wallets, tasks, activity] = await Promise.all([
      db.agent.count(),
      db.wallet.count(),
      db.task.count(),
      db.activityEvent.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        agents,
        wallets,
        tasks,
        activity,
      },
    });
  } catch (error) {
    console.error("Reset check error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
