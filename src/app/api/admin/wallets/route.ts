import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/admin/wallets
 * Get all wallets with their private keys (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin key
    const adminKey = request.headers.get("x-admin-key");
    if (adminKey !== process.env.ADMIN_DEV_KEY) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const wallets = await db.wallet.findMany({
      include: {
        agent: {
          select: {
            name: true,
            role: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedWallets = wallets.map((w) => ({
      agentName: w.agent?.name || "Unknown",
      role: w.agent?.role || "Unknown",
      status: w.agent?.status || "Unknown",
      solanaAddress: w.solanaAddress || "",
      privateKey: w.privateKey || "",
      balance: w.balance.toString(),
    }));

    return NextResponse.json({
      success: true,
      data: formattedWallets,
    });
  } catch (error) {
    console.error("Fetch wallets error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
