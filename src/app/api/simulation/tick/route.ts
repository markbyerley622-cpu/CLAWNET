import { NextRequest, NextResponse } from "next/server";
import { SimulationEngine } from "@/lib/simulation/engine";
import { SimulationStateService } from "@/lib/simulation/state";
import { isShuttingDown } from "@/lib/db";

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
  // Check if system is shutting down
  if (isShuttingDown()) {
    return NextResponse.json(
      { success: false, error: "System is shutting down" },
      { status: 503 }
    );
  }

  // Try to acquire tick lock to prevent concurrent ticks
  if (!SimulationStateService.acquireTickLock()) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "Tick already in progress or rate limited",
    });
  }

  try {
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
  } finally {
    // Always release the lock
    SimulationStateService.releaseTickLock();
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
    tickInProgress: SimulationStateService.isTickInProgress(),
  });
}
