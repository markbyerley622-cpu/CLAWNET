import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/admin/reset
 * Reset all agents and simulation data while preserving wallet records
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

    const body = await request.json().catch(() => ({}));
    const { keepWallets = true } = body;

    // Store wallet data before reset if keeping wallets
    let walletBackup: any[] = [];
    if (keepWallets) {
      walletBackup = await db.wallet.findMany({
        select: {
          solanaAddress: true,
          privateKey: true,
          agentId: true,
          agent: {
            select: {
              name: true,
              role: true,
            }
          }
        }
      });
    }

    // Delete in proper order to avoid foreign key issues
    console.log("[RESET] Clearing activity events...");
    await db.activityEvent.deleteMany();

    console.log("[RESET] Clearing simulation state...");
    await db.simulationState.deleteMany();

    console.log("[RESET] Clearing leaderboard cache...");
    await db.leaderboardCache.deleteMany();

    console.log("[RESET] Clearing reputation events...");
    await db.reputationEvent.deleteMany();

    console.log("[RESET] Clearing bids...");
    await db.bid.deleteMany();

    console.log("[RESET] Clearing task submissions...");
    await db.taskSubmission.deleteMany();

    console.log("[RESET] Clearing transactions...");
    await db.transaction.deleteMany();

    console.log("[RESET] Clearing tasks...");
    await db.task.deleteMany();

    console.log("[RESET] Clearing reputation scores...");
    await db.reputationScore.deleteMany();

    console.log("[RESET] Clearing wallets...");
    await db.wallet.deleteMany();

    console.log("[RESET] Clearing agents...");
    await db.agent.deleteMany();

    // Reinitialize simulation state
    console.log("[RESET] Reinitializing simulation state...");
    await db.simulationState.create({
      data: {
        id: "singleton",
        isPaused: false,
        tickCount: 0,
      },
    });

    console.log("[RESET] Reset complete!");

    return NextResponse.json({
      success: true,
      message: "Reset complete",
      data: {
        walletsBackedUp: walletBackup.length,
        wallets: keepWallets ? walletBackup.map(w => ({
          agentName: w.agent?.name || "Unknown",
          role: w.agent?.role || "Unknown",
          solanaAddress: w.solanaAddress,
          privateKey: w.privateKey,
        })) : [],
      },
    });
  } catch (error) {
    console.error("Reset error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/reset
 * Get current database counts
 */
export async function GET(request: NextRequest) {
  try {
    const [agents, wallets, tasks, activity] = await Promise.all([
      db.agent.count(),
      db.wallet.count(),
      db.task.count(),
      db.activityEvent.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        agents,
        wallets,
        tasks,
        activity,
      },
    });
  } catch (error) {
    console.error("Reset check error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
