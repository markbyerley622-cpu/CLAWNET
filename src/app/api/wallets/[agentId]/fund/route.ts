import { NextRequest, NextResponse } from "next/server";
import { WalletService } from "@/lib/services/wallet";
import { z } from "zod";

const fundWalletSchema = z.object({
  amount: z.string().transform((val) => BigInt(val)),
  description: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const body = await request.json();
    const validated = fundWalletSchema.parse(body);

    const transaction = await WalletService.fund(
      params.agentId,
      validated.amount,
      validated.description
    );

    // Serialize BigInt
    const serializedTx = {
      ...transaction,
      amount: transaction.amount.toString(),
    };

    return NextResponse.json({ data: serializedTx }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Failed to fund wallet";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
