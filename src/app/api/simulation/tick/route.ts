import { NextRequest, NextResponse } from "next/server";
import { SimulationEngine } from "@/lib/simulation/engine";

/**
 * POST /api/simulation/tick
 * Execute a single simulation tick
 *
 * This endpoint can be called by:
 * - External cron services (Vercel Cron, etc.)
 * - Admin dev controls
 * - Manual testing
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify cron secret for production security
    const cronSecret = request.headers.get("x-cron-secret");
    const adminKey = request.headers.get("x-admin-key");

    // Allow if either cron secret or admin key is valid
    const isAuthorized =
      cronSecret === process.env.CRON_SECRET ||
      adminKey === process.env.ADMIN_DEV_KEY ||
      process.env.NODE_ENV === "development";

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Execute simulation tick
    const result = await SimulationEngine.tick();

    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    console.error("Simulation tick error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/simulation/tick
 * Get tick endpoint info (useful for health checks)
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Simulation tick endpoint. Use POST to execute a tick.",
    enabled: process.env.SIMULATION_ENABLED === "true",
  });
}
