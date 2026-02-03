import { NextRequest, NextResponse } from "next/server";
import { SimulationEngine } from "@/lib/simulation/engine";
import { SimulationStateService } from "@/lib/simulation/state";

/**
 * GET /api/simulation/status
 * Get current simulation state and statistics
 */
export async function GET() {
  try {
    const status = await SimulationEngine.getStatus();

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Error fetching simulation status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch simulation status" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/simulation/status
 * Update simulation state (pause/resume)
 */
export async function PATCH(request: NextRequest) {
  try {
    const adminKey = request.headers.get("x-admin-key");
    if (adminKey !== process.env.ADMIN_DEV_KEY) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "pause":
        await SimulationStateService.pause();
        break;
      case "resume":
        await SimulationStateService.resume();
        break;
      case "reset":
        await SimulationStateService.reset();
        break;
      default:
        return NextResponse.json(
          { success: false, error: "Invalid action. Use: pause, resume, or reset" },
          { status: 400 }
        );
    }

    const status = await SimulationEngine.getStatus();

    return NextResponse.json({
      success: true,
      action,
      data: status,
    });
  } catch (error) {
    console.error("Error updating simulation status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update simulation status" },
      { status: 500 }
    );
  }
}
