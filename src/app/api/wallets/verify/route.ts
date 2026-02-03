import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/wallets/verify
 * Verify a wallet address is authorized to deploy agents
 *
 * For now, all Solana wallet addresses are allowed.
 * In production, you can add an AssignedWallet table to restrict access.
 */
export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json();

    if (!walletAddress || typeof walletAddress !== "string") {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Validate it looks like a Solana address (base58, 32-44 chars)
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!solanaAddressRegex.test(walletAddress)) {
      return NextResponse.json(
        { error: "Invalid Solana wallet address format" },
        { status: 400 }
      );
    }

    // Check if this wallet is already linked to an agent
    const existingWallet = await db.wallet.findFirst({
      where: {
        solanaAddress: walletAddress,
      },
      include: { agent: true },
    });

    // Allow the wallet - in the future you can add an AssignedWallet table
    // to restrict which addresses can deploy
    return NextResponse.json({
      success: true,
      verified: true,
      walletAddress,
      existingAgentCount: existingWallet ? 1 : 0,
    });
  } catch (error) {
    console.error("Wallet verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify wallet" },
      { status: 500 }
    );
  }
}
