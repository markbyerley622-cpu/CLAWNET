import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AgentService } from "@/lib/services/agent";
import { ActivityService } from "@/lib/services/activity";
import { generateUniqueAgentName } from "@/lib/simulation/names";
import { generateWeightedTaskBatch } from "@/lib/simulation/tasks";
import type { AgentRole } from "@/types";

/**
 * POST /api/admin/inject
 * Inject synthetic activity for development/testing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, count = 1 } = body;

    let result: any = {};

    switch (type) {
      case "agent":
        result = await injectAgents(count);
        break;
      case "task":
        result = await injectTasks(count);
        break;
      case "activity":
        result = await injectActivityEvents(count);
        break;
      default:
        return NextResponse.json(
          { success: false, error: "Invalid type. Use: agent, task, or activity" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Injected ${count} ${type}(s)`,
      data: result,
    });
  } catch (error) {
    console.error("Inject error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function injectAgents(count: number) {
  const roles: AgentRole[] = ["COMPUTE", "VALIDATOR", "ANALYST", "CREATIVE", "ORCHESTRATOR", "SPECIALIST"];
  const created = [];

  for (let i = 0; i < count; i++) {
    const role = roles[Math.floor(Math.random() * roles.length)];
    const name = generateUniqueAgentName();
    const funding = BigInt(5000 + Math.floor(Math.random() * 15000));

    try {
      const agent = await AgentService.create({
        name,
        role,
        config: {
          allowedCategories: ["COMPUTATION", "VALIDATION", "ANALYSIS"],
          maxBidAmount: Number(funding) / 5,
          minReputationRequired: 0,
          synthetic: true,
        },
        initialFunding: funding,
      });

      // Log activity
      await ActivityService.logAgentDeployed(agent.id, name, role, funding);

      // Generate tasks for this agent (same as regular deploy)
      try {
        const taskTemplates = generateWeightedTaskBatch(3);
        for (const template of taskTemplates) {
          const task = await db.task.create({
            data: {
              ...template,
              posterId: agent.id,
              status: "OPEN",
            },
          });
          await ActivityService.logTaskCreated(
            agent.id,
            name,
            task.id,
            task.title,
            task.category,
            task.reward
          );
        }
      } catch (taskErr) {
        console.warn("Failed to generate tasks:", taskErr);
      }

      // Update leaderboard cache
      try {
        await db.leaderboardCache.upsert({
          where: { agentId: agent.id },
          create: {
            agentId: agent.id,
            rankByEarnings: 999,
            rankByReliability: 999,
            rankByLongevity: 999,
            rankBySuccessRate: 999,
            agentName: name,
            agentRole: role,
            agentStatus: "ACTIVE",
            totalEarnings: 0n,
            reliability: 500,
            activeDays: 0,
            successRate: 0,
            tier: "NEWCOMER",
            currentStreak: 0,
          },
          update: {
            agentName: name,
            agentRole: role,
            agentStatus: "ACTIVE",
          },
        });
      } catch (lbErr) {
        console.warn("Failed to update leaderboard:", lbErr);
      }

      created.push({ id: agent.id, name, role });
    } catch (err) {
      console.error("Failed to create agent:", err);
    }
  }

  return { created };
}

async function injectTasks(count: number) {
  const created = [];

  // Get eligible posters
  const posters = await db.agent.findMany({
    where: { status: "ACTIVE" },
    take: 10,
  });

  if (posters.length === 0) {
    return { error: "No active agents to post tasks" };
  }

  const taskTemplates = generateWeightedTaskBatch(count);

  for (const template of taskTemplates) {
    const poster = posters[Math.floor(Math.random() * posters.length)];

    try {
      const task = await db.task.create({
        data: {
          ...template,
          posterId: poster.id,
          status: "OPEN",
        },
      });

      await ActivityService.logTaskCreated(
        poster.id,
        poster.name,
        task.id,
        task.title,
        task.category,
        task.reward
      );

      created.push({ id: task.id, title: task.title });
    } catch (err) {
      console.error("Failed to create task:", err);
    }
  }

  return { created };
}

async function injectActivityEvents(count: number) {
  const eventTypes = [
    "task_completed",
    "agent_deployed",
    "bid_placed",
    "tier_up",
    "streak_bonus",
  ];

  const agents = await db.agent.findMany({
    where: { status: "ACTIVE" },
    take: 20,
  });

  if (agents.length === 0) {
    return { error: "No active agents" };
  }

  const created = [];

  for (let i = 0; i < count; i++) {
    const agent = agents[Math.floor(Math.random() * agents.length)];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    let data: any = { agentName: agent.name, agentId: agent.id };

    switch (eventType) {
      case "task_completed":
        data.taskTitle = `Task #${Math.floor(Math.random() * 1000)}`;
        data.reward = `${100 + Math.floor(Math.random() * 400)} CLAW`;
        break;
      case "agent_deployed":
        data.role = agent.role;
        data.funding = `${5000 + Math.floor(Math.random() * 10000)} CLAW`;
        break;
      case "bid_placed":
        data.taskTitle = `Task #${Math.floor(Math.random() * 1000)}`;
        data.amount = `${50 + Math.floor(Math.random() * 200)} CLAW`;
        break;
      case "tier_up":
        data.from = "RELIABLE";
        data.to = "TRUSTED";
        break;
      case "streak_bonus":
        data.streak = 5 + Math.floor(Math.random() * 20);
        data.bonus = "+10 REP";
        break;
    }

    await ActivityService.log(eventType as any, data);
    created.push({ type: eventType });
  }

  return { created };
}
