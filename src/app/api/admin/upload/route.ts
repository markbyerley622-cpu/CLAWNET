import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AgentService } from "@/lib/services/agent";
import { ActivityService } from "@/lib/services/activity";

/**
 * POST /api/admin/upload
 * Upload bulk JSON data for agents, tasks, or activity
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

    const body = await request.json();
    const { type, data } = body;

    if (!type || !data) {
      return NextResponse.json(
        { success: false, error: "Missing type or data" },
        { status: 400 }
      );
    }

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { success: false, error: "Data must be an array" },
        { status: 400 }
      );
    }

    let result: any = {};

    switch (type) {
      case "agents":
        result = await uploadAgents(data);
        break;
      case "tasks":
        result = await uploadTasks(data);
        break;
      case "activity":
        result = await uploadActivityEvents(data);
        break;
      default:
        return NextResponse.json(
          { success: false, error: "Invalid type. Use: agents, tasks, or activity" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Uploaded ${data.length} ${type}`,
      data: result,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

async function uploadAgents(data: any[]) {
  const created = [];
  const errors = [];

  for (const item of data) {
    try {
      const { name, role, config = {}, initialFunding = 5000 } = item;

      if (!name || !role) {
        errors.push({ item, error: "Missing name or role" });
        continue;
      }

      const agent = await AgentService.create({
        name,
        role,
        config: {
          allowedCategories: config.allowedCategories || ["COMPUTATION", "VALIDATION"],
          maxBidAmount: config.maxBidAmount || 1000,
          minReputationRequired: config.minReputationRequired || 0,
          ...config,
        },
        initialFunding: BigInt(initialFunding),
      });

      created.push({ id: agent.id, name: agent.name });
    } catch (err) {
      errors.push({ item, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return { created, errors };
}

async function uploadTasks(data: any[]) {
  const created = [];
  const errors = [];

  // Get a default poster if none specified
  const defaultPoster = await db.agent.findFirst({
    where: { status: "ACTIVE" },
  });

  for (const item of data) {
    try {
      const {
        title,
        description,
        category,
        difficulty = 3,
        reward,
        depositRequired,
        posterId,
        expiresInHours = 48,
      } = item;

      if (!title || !category || !reward) {
        errors.push({ item, error: "Missing title, category, or reward" });
        continue;
      }

      const poster = posterId || defaultPoster?.id;
      if (!poster) {
        errors.push({ item, error: "No poster available" });
        continue;
      }

      const slashPercentage = difficulty <= 2 ? 10 : difficulty <= 3 ? 20 : difficulty <= 4 ? 30 : 50;
      const riskRating =
        slashPercentage <= 10 ? "LOW" :
        slashPercentage <= 20 ? "MEDIUM" :
        slashPercentage <= 40 ? "HIGH" : "CRITICAL";

      const task = await db.task.create({
        data: {
          title,
          description: description || title,
          category,
          difficulty,
          schema: { inputs: [], outputs: [] },
          validationLogic: JSON.stringify({ type: "schema" }),
          requiredReputation: difficulty * 100,
          reward: BigInt(reward),
          depositRequired: BigInt(depositRequired || Math.floor(reward * 0.3)),
          slashPercentage,
          riskRating,
          executionWindowMinutes: 60 + difficulty * 30,
          expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
          status: "OPEN",
          posterId: poster,
        },
      });

      created.push({ id: task.id, title: task.title });
    } catch (err) {
      errors.push({ item, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return { created, errors };
}

async function uploadActivityEvents(data: any[]) {
  const created = [];
  const errors = [];

  for (const item of data) {
    try {
      const { type, data: eventData } = item;

      if (!type || !eventData) {
        errors.push({ item, error: "Missing type or data" });
        continue;
      }

      await ActivityService.log(type, eventData);
      created.push({ type });
    } catch (err) {
      errors.push({ item, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return { created, errors };
}
