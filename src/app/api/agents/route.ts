import { NextRequest, NextResponse } from "next/server";
import { AgentService } from "@/lib/services/agent";
import { ActivityService } from "@/lib/services/activity";
import { db } from "@/lib/db";
import { serializeForJson } from "@/lib/utils";
import { generateWeightedTaskBatch } from "@/lib/simulation/tasks";
import { z } from "zod";

const createAgentSchema = z.object({
  name: z.string().min(1).max(12),
  role: z.enum(["COMPUTE", "VALIDATOR", "ANALYST", "CREATIVE", "ORCHESTRATOR", "SPECIALIST"]),
  config: z.object({
    allowedCategories: z.array(z.enum([
      "COMPUTATION", "VALIDATION", "ANALYSIS", "GENERATION", "ORCHESTRATION", "RESEARCH"
    ])),
    maxBidAmount: z.number().positive(),
    minReputationRequired: z.number().min(0),
  }),
  initialFunding: z.string().transform((val) => BigInt(val)),
  ownerWalletAddress: z.string().optional(),
});

// Valid enum values for validation
const VALID_STATUSES = ["ACTIVE", "SUSPENDED", "ARCHIVED"] as const;
const VALID_ROLES = ["COMPUTE", "VALIDATOR", "ANALYST", "CREATIVE", "ORCHESTRATOR", "SPECIALIST"] as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const roleParam = searchParams.get("role");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    // Validate status if provided
    let status: typeof VALID_STATUSES[number] | undefined;
    if (statusParam) {
      if (!VALID_STATUSES.includes(statusParam as any)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      status = statusParam as typeof VALID_STATUSES[number];
    }

    // Validate role if provided
    let role: typeof VALID_ROLES[number] | undefined;
    if (roleParam) {
      if (!VALID_ROLES.includes(roleParam as any)) {
        return NextResponse.json(
          { error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` },
          { status: 400 }
        );
      }
      role = roleParam as typeof VALID_ROLES[number];
    }

    const result = await AgentService.list({
      status,
      role,
      page,
      pageSize,
    });

    return NextResponse.json(serializeForJson(result));
  } catch (error) {
    console.error("Error listing agents:", error);

    // Provide more specific error messages
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isDbError = errorMessage.includes("connect") ||
                      errorMessage.includes("ECONNREFUSED") ||
                      errorMessage.includes("does not exist");

    return NextResponse.json(
      {
        error: isDbError
          ? "Database connection failed. Ensure the database is running."
          : "Failed to list agents",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        data: [],
        total: 0,
        page: 1,
        pageSize: 20,
        totalPages: 0,
      },
      { status: isDbError ? 503 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createAgentSchema.parse(body);

    const agent = await AgentService.create({
      name: validated.name,
      role: validated.role,
      config: validated.config,
      initialFunding: validated.initialFunding,
      ownerWalletAddress: validated.ownerWalletAddress,
    });

    // Log agent deployment activity
    try {
      await ActivityService.logAgentDeployed(
        agent.id,
        agent.name,
        validated.role,
        validated.initialFunding
      );
    } catch (activityError) {
      console.warn("Failed to log activity:", activityError);
    }

    // Generate automated tasks for this agent to work on
    try {
      const taskTemplates = generateWeightedTaskBatch(3); // Generate 3 tasks
      for (const template of taskTemplates) {
        const task = await db.task.create({
          data: {
            ...template,
            posterId: agent.id,
            status: "OPEN",
          },
        });

        // Log task creation
        await ActivityService.logTaskCreated(
          agent.id,
          agent.name,
          task.id,
          task.title,
          task.category,
          task.reward
        );
      }
      console.log(`[AGENT] Created ${taskTemplates.length} tasks for new agent ${agent.name}`);
    } catch (taskError) {
      console.warn("Failed to generate tasks for agent:", taskError);
    }

    // Update leaderboard cache for new agent
    try {
      await db.leaderboardCache.upsert({
        where: { agentId: agent.id },
        create: {
          agentId: agent.id,
          rankByEarnings: 999,
          rankByReliability: 999,
          rankByLongevity: 999,
          rankBySuccessRate: 999,
          agentName: agent.name,
          agentRole: validated.role,
          agentStatus: "ACTIVE",
          totalEarnings: 0n,
          reliability: 500,
          activeDays: 0,
          successRate: 0,
          tier: "NEWCOMER",
          currentStreak: 0,
        },
        update: {
          agentName: agent.name,
          agentRole: validated.role,
          agentStatus: "ACTIVE",
        },
      });
    } catch (leaderboardError) {
      console.warn("Failed to update leaderboard:", leaderboardError);
    }

    return NextResponse.json({ data: serializeForJson(agent) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating agent:", error);
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    );
  }
}
