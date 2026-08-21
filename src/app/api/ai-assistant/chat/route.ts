import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runCustomerAgent } from "@/lib/ai/customer-agent";
import { rateLimit } from "@/lib/rate-limit";
import { getPusherServer } from "@/lib/pusher";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      message,
      tableToken,
      slug,
      sessionId: requestedSessionId,
      currentCartItems = [],
      customerPhone,
    } = body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    if (!tableToken || !slug) {
      return NextResponse.json(
        { error: "tableToken and slug parameters are required for security context validation." },
        { status: 400 }
      );
    }

    // 1. Security Context Validation: Verify table & restaurant match database records
    const table = await prisma.table.findUnique({
      where: { qrToken: tableToken },
      include: {
        location: {
          include: {
            restaurant: true,
          },
        },
      },
    });

    if (!table || !table.location || table.location.restaurant.slug !== slug) {
      return NextResponse.json(
        { error: "Unauthorized access: invalid table token or restaurant context." },
        { status: 403 }
      );
    }

    const restaurant = table.location.restaurant;

    // 2. Rate Limiting per session / table
    const rateLimitIdentifier = `ai-chat-${table.id}-${requestedSessionId || "default"}`;
    const rateCheck = rateLimit(rateLimitIdentifier, { windowMs: 60000, maxRequests: 20 });

    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait a few seconds before sending another message.",
          remaining: 0,
        },
        { status: 429 }
      );
    }

    // 3. Retrieve or Create ChatSession in database
    const chatSessionModel = (prisma as any).chatSession;
    let session = null;
    if (requestedSessionId && chatSessionModel) {
      session = await chatSessionModel.findUnique({
        where: { id: requestedSessionId },
      });
    }

    if (!session && chatSessionModel) {
      session = await chatSessionModel.create({
        data: {
          tableId: table.id,
          restaurantId: restaurant.id,
          messages: [],
        },
      });
    }

    const sessionId = session?.id || requestedSessionId || `session-${Date.now()}`;

    // Existing messages array
    const existingMessages: any[] = session && Array.isArray(session.messages) ? (session.messages as any[]) : [];
    const clientHistory: any[] = Array.isArray(body.history) ? body.history : [];
    const historyToUse = existingMessages.length > 0 ? existingMessages : clientHistory;

    // Append new user message
    const userMessageObj = {
      role: "user",
      content: message.trim(),
      timestamp: new Date().toISOString(),
    };

    // 4. Execute Agent Workflow
    let agentResult;
    try {
      agentResult = await runCustomerAgent({
        message: message.trim(),
        restaurantId: restaurant.id,
        tableId: table.id,
        sessionId: sessionId,
        customerPhone,
        currentCartItems,
        history: historyToUse,
      });
    } catch (agentErr) {
      console.error("AI Customer Agent Execution Error:", agentErr);
      agentResult = {
        response: "Sorial couldn't fetch a suggestion, please browse the menu manually.",
        toolActions: [],
      };
    }

    // Append assistant response message
    const assistantMessageObj = {
      role: "assistant",
      content: agentResult.response,
      timestamp: new Date().toISOString(),
      toolActions: agentResult.toolActions,
    };

    const updatedMessages = [...existingMessages, userMessageObj, assistantMessageObj];

    // 5. Persist Session History
    if (session && chatSessionModel) {
      await chatSessionModel.update({
        where: { id: session.id },
        data: {
          messages: updatedMessages,
        },
      });
    }

    // 6. Real-Time Sync via Pusher for Tool Actions
    if (agentResult.toolActions && agentResult.toolActions.length > 0) {
      try {
        const pusher = getPusherServer();
        for (const action of agentResult.toolActions) {
          if (action.tool === "addToCart") {
            await pusher.trigger(`table-${table.id}`, "cart-updated", {
              action: "addToCart",
              item: action.payload,
              source: "ai-assistant",
            });
          }
        }
      } catch (pusherErr) {
        console.warn("Pusher event dispatch warning (non-fatal):", pusherErr);
      }
    }

    return NextResponse.json({
      sessionId: sessionId,
      response: agentResult.response,
      toolActions: agentResult.toolActions,
      messages: updatedMessages,
    });
  } catch (error: any) {
    console.error("API /api/ai-assistant/chat Error:", error);
    return NextResponse.json(
      {
        response: "Sorial couldn't fetch a suggestion, please browse the menu manually.",
        toolActions: [],
        error: error.message,
      },
      { status: 500 }
    );
  }
}
