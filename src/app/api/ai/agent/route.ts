import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { executeAgentQuery } from "@/lib/ai/agent-system";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. Authenticate user via Clerk
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized access. Please log in." }, { status: 401 });
    }

    // 2. Read query parameters
    const body = await req.json().catch(() => ({}));
    const { query, restaurantId } = body;

    if (!query) {
      return NextResponse.json({ error: "Missing required parameter 'query'." }, { status: 400 });
    }

    if (!restaurantId) {
      return NextResponse.json({ error: "Missing required parameter 'restaurantId'." }, { status: 400 });
    }

    // 3. Resolve user details from database
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User registration not found in Serveaura." }, { status: 404 });
    }

    // Extract client IP address for the audit logger
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    // 4. Execute Multi-Agent Pipeline
    const response = await executeAgentQuery({
      query,
      userId,
      restaurantId,
      userName: dbUser.name || dbUser.email.split("@")[0],
      ipAddress
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("AI Agent Endpoint Exception:", error);
    return NextResponse.json(
      { error: "Internal AI execution failure.", details: error.message },
      { status: 500 }
    );
  }
}
