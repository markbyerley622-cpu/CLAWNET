import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AgentService } from "@/lib/services/agent";
import { ActivityService } from "@/lib/services/activity";
import { generateUniqueAgentName } from "@/lib/simulation/names";
import { generateWeightedTaskBatch } from "@/lib/simulation/tasks";
import { serializeForJson } from "@/lib/utils";
import type { AgentRole } from "@/types";

/**
 * POST /api/init
 * Initialize the system with at least one agent if none exist.
 * This ensures the simulation can start running.
 */
export async function POST(request: NextRequest) {
  try {
    // First, verify database connection
    try {
      await db.$queryRaw`SELECT 1`;
    } catch (dbError) {
      console.error("[INIT] Database connection failed:", dbError);
      return NextResponse.json({
        success: false,
        error: "Database not available. Please ensure the database is running and migrations are applied.",
        details: dbError instanceof Error ? dbError.message : "Unknown database error",
      }, { status: 503 });
    }

    // Check if we have any active agents
    let agentCount: number;
    try {
      agentCount = await db.agent.count({
        where: { status: "ACTIVE" },
      });
    } catch (countError) {
      // Table might not exist - try to handle gracefully
      console.error("[INIT] Failed to count agents:", countError);
      return NextResponse.json({
        success: false,
        error: "Database schema not ready. Please run: npx prisma migrate dev",
        details: countError instanceof Error ? countError.message : "Unknown error",
      }, { status: 503 });
    }

    // If we already have agents, just return the count
    if (agentCount > 0) {
      return NextResponse.json({
        success: true,
        initialized: false,
        message: "System already has agents",
        agentCount,
      });
    }

    // Ensure simulation state exists first
    await db.simulationState.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        isPaused: false,
        tickCount: 0,
      },
      update: {},
    });

    // Create the first agent (Genesis Agent)
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
    try {
      await ActivityService.logAgentDeployed(
        genesisAgent.id,
        genesisName,
        genesisRole,
        genesisFunding
      );
    } catch (activityError) {
      console.warn("[INIT] Failed to log genesis activity:", activityError);
    }

    // Create initial tasks for the genesis agent
    let tasksCreated = 0;
    try {
      const taskTemplates = generateWeightedTaskBatch(5); // Create 5 initial tasks
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
    } catch (taskError) {
      console.warn("[INIT] Failed to create initial tasks:", taskError);
    }

    // Create leaderboard entry
    try {
      await db.leaderboardCache.upsert({
        where: { agentId: genesisAgent.id },
        create: {
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
        update: {},
      });
    } catch (lbError) {
      console.warn("[INIT] Failed to create leaderboard entry:", lbError);
    }

    console.log(`[INIT] Created genesis agent: ${genesisName} with ${tasksCreated} tasks`);

    return NextResponse.json({
      success: true,
      initialized: true,
      message: `System initialized with genesis agent and ${tasksCreated} tasks`,
      agentCount: 1,
      tasksCreated,
      genesisAgent: serializeForJson({
        id: genesisAgent.id,
        name: genesisAgent.name,
        role: genesisAgent.role,
      }),
    });
  } catch (error) {
    console.error("[INIT] Initialization error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to initialize system",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/init
 * Check initialization status and database counts
 */
export async function GET() {
  try {
    const [agentCount, taskCount, openTaskCount] = await Promise.all([
      db.agent.count({ where: { status: "ACTIVE" } }),
      db.task.count(),
      db.task.count({ where: { status: "OPEN" } }),
    ]);

    return NextResponse.json({
      success: true,
      initialized: agentCount > 0,
      agentCount,
      taskCount,
      openTaskCount,
    });
  } catch (error) {
    console.error("Error checking init status:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to check initialization status",
      },
      { status: 500 }
    );
  }
}
