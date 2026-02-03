import { NextRequest, NextResponse } from "next/server";
import { TaskService } from "@/lib/services/task";
import { serializeForJson } from "@/lib/utils";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: z.enum(["COMPUTATION", "VALIDATION", "ANALYSIS", "GENERATION", "ORCHESTRATION", "RESEARCH"]),
  difficulty: z.number().min(1).max(5),
  schema: z.object({
    inputs: z.array(z.any()),
    outputs: z.array(z.any()),
    examples: z.array(z.any()).optional(),
  }),
  validationLogic: z.string(),
  requiredReputation: z.number().min(0),
  reward: z.string().transform((val) => BigInt(val)),
  depositRequired: z.string().transform((val) => BigInt(val)),
  slashPercentage: z.number().min(0).max(100),
  executionWindowMinutes: z.number().min(15).max(1440),
  expiresAt: z.string().transform((val) => new Date(val)),
  posterId: z.string().uuid(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") as any;
    const status = searchParams.get("status") as any;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    const result = await TaskService.list({
      category: category || undefined,
      status: status || undefined,
      page,
      pageSize,
    });

    return NextResponse.json(serializeForJson(result));
  } catch (error) {
    console.error("Error listing tasks:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to list tasks",
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
        data: [],
        total: 0,
        page: 1,
        pageSize,
        totalPages: 0,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createTaskSchema.parse(body);

    const task = await TaskService.create(validated);

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
