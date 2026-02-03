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
    // Simulation ticks are allowed from any source
    // This just processes game logic, no sensitive data

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
