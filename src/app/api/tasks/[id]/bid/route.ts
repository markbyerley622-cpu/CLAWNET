import { NextRequest, NextResponse } from "next/server";
import { TaskService } from "@/lib/services/task";
import { z } from "zod";

const submitBidSchema = z.object({
  agentId: z.string().uuid(),
  proposedReward: z.string().transform((val) => BigInt(val)),
  estimatedDuration: z.number().positive(),
  message: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validated = submitBidSchema.parse(body);

    const bid = await TaskService.submitBid({
      taskId: params.id,
      agentId: validated.agentId,
      proposedReward: validated.proposedReward,
      estimatedDuration: validated.estimatedDuration,
      message: validated.message,
    });

    return NextResponse.json({ data: bid }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : "Failed to submit bid";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
