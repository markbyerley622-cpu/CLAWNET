import { NextResponse } from "next/server";
import { checkHealth } from "@/lib/db";
import { SimulationStateService } from "@/lib/simulation/state";

/**
 * GET /api/health
 * Health check endpoint for monitoring and load balancers
 */
export async function GET() {
  const startTime = Date.now();

  try {
    // Check database connectivity
    const dbHealth = await checkHealth();

    // Check simulation state
    let simulationStatus = "unknown";
    let tickCount = 0;

    try {
      const state = await SimulationStateService.get();
      simulationStatus = state.isPaused ? "paused" : "running";
      tickCount = state.tickCount;
    } catch {
      simulationStatus = "error";
    }

    const isHealthy = dbHealth.healthy;
    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        status: isHealthy ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        responseTimeMs: responseTime,
        checks: {
          database: {
            status: dbHealth.healthy ? "up" : "down",
            latencyMs: dbHealth.latencyMs,
            error: dbHealth.error,
          },
          simulation: {
            status: simulationStatus,
            tickCount,
            enabled: process.env.SIMULATION_ENABLED === "true",
          },
        },
        version: process.env.npm_package_version || "1.0.0",
        environment: process.env.NODE_ENV,
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        responseTimeMs: Date.now() - startTime,
      },
      { status: 503 }
    );
  }
}
