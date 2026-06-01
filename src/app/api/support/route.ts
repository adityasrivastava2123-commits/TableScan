import { NextRequest, NextResponse } from "next/server";

interface Message {
  id: string;
  tableName: string;
  text: string;
  sender: "user" | "staff";
  timestamp: string;
}

interface SupportRequest {
  id: string;
  tableName: string;
  restaurantId: string;
  messages: Message[];
  status: "OPEN" | "RESOLVED";
  updatedAt: string;
}

// Global in-memory support requests store
const globalSupportStore: Map<string, SupportRequest> = new Map();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");
  const tableName = searchParams.get("tableName");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId is required" }, { status: 400 });
  }

  // Get active sessions
  const sessions = Array.from(globalSupportStore.values()).filter(
    (req) => req.restaurantId === restaurantId
  );

  if (tableName) {
    const session = globalSupportStore.get(`${restaurantId}-${tableName}`);
    return NextResponse.json(session || null);
  }

  return NextResponse.json(sessions);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, tableName, text, sender } = body;

    if (!restaurantId || !tableName || !text || !sender) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sessionId = `${restaurantId}-${tableName}`;
    let session = globalSupportStore.get(sessionId);

    if (!session) {
      session = {
        id: sessionId,
        tableName,
        restaurantId,
        messages: [],
        status: "OPEN",
        updatedAt: new Date().toISOString(),
      };
    }

    const newMessage: Message = {
      id: Math.random().toString(36).substring(7),
      tableName,
      text,
      sender,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    session.messages.push(newMessage);
    session.status = "OPEN";
    session.updatedAt = new Date().toISOString();

    globalSupportStore.set(sessionId, session);

    // If customer sent it, trigger simulated automatic reply if needed
    if (sender === "user") {
      const lower = text.toLowerCase();
      let autoReply = "";
      if (lower.includes("water") || lower.includes("cutlery") || lower.includes("spoon") || lower.includes("glass")) {
        autoReply = "Certainly! I've sent a priority request to the pantry for water/cutlery. A waiter will bring it to your table immediately. 🥛🍽️";
      } else if (lower.includes("change") || lower.includes("add") || lower.includes("cancel") || lower.includes("order")) {
        autoReply = "Understood. I have flagged your request to the kitchen manager. If your items are already cooking, we will do our best to modify them! 👨‍🍳";
      } else if (lower.includes("payment") || lower.includes("failed") || lower.includes("razorpay") || lower.includes("money")) {
        autoReply = "I'm sorry for the inconvenience. I've notified our billing manager. Please have your transaction reference ready; they will resolve it at your table in a moment. 💳";
      } else if (lower.includes("manager") || lower.includes("supervisor") || lower.includes("call")) {
        autoReply = "Got it. I have summoned the floor manager to your table. They will be with you shortly. Thank you for your patience! 🤵";
      }

      if (autoReply) {
        session.messages.push({
          id: Math.random().toString(36).substring(7),
          tableName,
          text: autoReply,
          sender: "staff",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
        session.updatedAt = new Date().toISOString();
        globalSupportStore.set(sessionId, session);
      }
    }

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error("Error saving support request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { restaurantId, tableName, status } = body;

    if (!restaurantId || !tableName || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const sessionId = `${restaurantId}-${tableName}`;
    const session = globalSupportStore.get(sessionId);

    if (session) {
      session.status = status;
      session.updatedAt = new Date().toISOString();
      globalSupportStore.set(sessionId, session);
      return NextResponse.json(session);
    }

    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
