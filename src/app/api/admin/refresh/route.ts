import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SimulationEngine } from "@/lib/simulation/engine";

/**
 * POST /api/admin/refresh
 * Force refresh signal for all connected clients
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

    // Update a refresh timestamp that clients can poll
    // For now, we'll just trigger a leaderboard update and return success
    // In production, this could use WebSocket or Server-Sent Events

    // Trigger leaderboard update
    const status = await SimulationEngine.getStatus();

    // Log an activity event to notify connected clients
    await db.activityEvent.create({
      data: {
        type: "system_refresh",
        data: {
          message: "Force refresh triggered by admin",
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Refresh signal broadcasted",
      data: {
        simulationStatus: status.state,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/refresh
 * Check if there's a pending refresh (for polling)
 */
export async function GET(request: NextRequest) {
  try {
    // Get the most recent system_refresh event
    const latestRefresh = await db.activityEvent.findFirst({
      where: { type: "system_refresh" },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        lastRefresh: latestRefresh?.createdAt || null,
      },
    });
  } catch (error) {
    console.error("Refresh check error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
