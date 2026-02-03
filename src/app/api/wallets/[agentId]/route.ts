import { NextRequest, NextResponse } from "next/server";
import { WalletService } from "@/lib/services/wallet";

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const wallet = await WalletService.getByAgentId(params.agentId);

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      );
    }

    // Serialize BigInt values
    const serializedWallet = {
      ...wallet,
      balance: wallet.balance.toString(),
      escrowedBalance: wallet.escrowedBalance.toString(),
      totalEarned: wallet.totalEarned.toString(),
      totalSpent: wallet.totalSpent.toString(),
      netBalance: wallet.netBalance.toString(),
    };

    return NextResponse.json({ data: serializedWallet });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet" },
      { status: 500 }
    );
  }
}
