import { MemoryManager } from "./memory";
import { validatePermission, AgentAction } from "./permissions";
import * as tools from "./tools";
import { SPECIALIZED_AGENTS, AgentDefinition } from "./agents";
import { prisma } from "../prisma";

export interface AgentSystemRequest {
  query: string;
  userId: string; // Clerk User ID
  restaurantId: string;
  userRole?: string; // Optional role override if available
  userName?: string;
  ipAddress?: string;
}

export interface AgentSystemResponse {
  text: string;
  routingAgent: string;
  action: {
    type: string;
    payload?: any;
  } | null;
  needsConfirmation?: boolean;
}

// Actions that require explicit confirmation before execution
const CRITICAL_ACTIONS: AgentAction[] = [
  "deleteTable",
  "deleteRestaurant",
  "deleteMenuItem",
  "updatePrices",
  "cancelOrder"
];

/**
 * Direct REST API call to Google Gemini Model.
 */
async function callLLM(
  systemInstruction: string,
  userPrompt: string,
  history: Array<{ role: "user" | "model"; text: string }> = []
): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  // Build rolling history contents
  const contents = [];
  
  // Add history
  for (const turn of history) {
    contents.push({
      role: turn.role,
      parts: [{ text: turn.text }]
    });
  }

  // Add current prompt
  contents.push({
    role: "user",
    parts: [{ text: userPrompt }]
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      systemInstruction: {
        parts: [{ text: systemInstruction }]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini LLM Call failed: ${response.statusText} - ${errText}`);
  }

  const data = await response.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!rawText) {
    throw new Error("LLM did not return any content.");
  }

  // Try to parse as JSON, if that fails return the raw text in a fallback structure
  try {
    return JSON.parse(rawText.trim());
  } catch (e) {
    // If JSON parsing fails, return a fallback response
    return {
      routingAgent: "operations",
      action: null,
      responseText: rawText.trim()
    };
  }
}

/**
 * AI Agent System pipeline executor.
 */
export async function executeAgentQuery(req: AgentSystemRequest): Promise<AgentSystemResponse> {
  const { query, userId, restaurantId, userName, ipAddress } = req;
  const lowercaseQuery = query.toLowerCase().trim();

  // 1. Retrieve current memory session
  const session = await MemoryManager.getSession(userId, restaurantId);

  // 2. Handle Confirmation Commands (Yes/Cancel)
  if (["yes", "confirm", "proceed", "do it", "approve"].includes(lowercaseQuery)) {
    const pendingAction = await MemoryManager.popPendingAction(userId, restaurantId);
    
    if (pendingAction) {
      // Execute the pending action directly
      const result = await executeToolAction(
        pendingAction.type as AgentAction,
        pendingAction.payload,
        restaurantId,
        userId,
        userName,
        ipAddress
      );

      // Save action outcome to memory
      await MemoryManager.addMessage(userId, restaurantId, "user", query);
      await MemoryManager.addMessage(userId, restaurantId, "model", result.message);

      return {
        text: `Confirmation received. ${result.message}`,
        routingAgent: session.activeAgent,
        action: result.success ? { type: "REFRESH_DATA" } : { type: "SHOW_TOAST", payload: { message: "Action failed" } }
      };
    }
  }

  if (["no", "cancel", "stop", "abort"].includes(lowercaseQuery)) {
    const pending = await MemoryManager.popPendingAction(userId, restaurantId);
    if (pending) {
      await MemoryManager.addMessage(userId, restaurantId, "user", query);
      await MemoryManager.addMessage(userId, restaurantId, "model", "Operation cancelled.");
      return {
        text: "Understood. The action has been aborted safely.",
        routingAgent: session.activeAgent,
        action: null
      };
    }
  }

  // 3. Construct System Prompt for Routing and Intent Detection
  const routingInstruction = `
You are the central orchestrator for TableScan, a multi-agent restaurant operating system.
Your job is to:
1. Detect which agent should handle the user request. Available agents:
   - "operations": Handles tables, KDS, order status, qr codes, general settings.
   - "analytics": Handles sales, revenue queries, best dishes, margins, peak hours, forecasting.
   - "inventory": Handles ingredient stocks, alerts, stock updates, reorder lists.
   - "marketing": Handles creating coupons, drafting Campaigns (SMS, Email, WhatsApp), social posts.
   - "experience": Handles customer reviews, satisfaction complaints, feedback.
   - "waiter": Customer-facing menu adviser. Suggests combos, dishes, veg/spicy, pricing filter (under ₹X).

2. Map the request to a specific "action" name and "payload" arguments.
   Supported Actions and parameters:
   - createTable { name: string, capacity: number }
   - updateTable { tableIdOrName: string, name?: string, capacity?: number, isActive?: boolean }
   - deleteTable { tableName: string }
   - generateQRCode { tableName: string }
   
   - createMenuItem { categoryName: string, name: string, price: number, description?: string, isVeg?: boolean }
   - updateMenuItem { itemName: string, price?: number, isAvailable?: boolean, description?: string }
   - deleteMenuItem { itemName: string }
   - updatePrices { categoryNameOrAll: string, percentageChange: number }
   
   - viewOrders { status?: string, limit?: number }
   - updateOrderStatus { orderNumber: string, status: "NEW"|"PREPARING"|"READY"|"DONE"|"CANCELLED" }
   - cancelOrder { orderNumber: string }
   
   - getInventory {}
   - updateInventory { ingredientName: string, quantityChange: number, movementType: "IN"|"OUT"|"ADJUSTMENT", reason?: string }
   - createIngredient { name: string, unit: string, category?: string, minStock?: number }
   - forecastInventory {}
   
   - getRevenue { days?: number }
   - getSalesReport { days?: number }
   - getPopularItems { limit?: number }
   - generateInsights {}
   
   - createCoupon { code: string, discountType: "PERCENTAGE"|"FIXED", discountValue: number, maxUsage?: number }
   - generateCampaign { name: string, type: "EMAIL"|"SMS"|"WHATSAPP"|"PUSH", content: string, subject?: string }
   - schedulePromotion { campaignId: string, scheduleTime: string }
   
   - getCustomers {}
   - getCustomerInsights {}
   - addReview { rating: number, comment?: string, customerName?: string }

3. Generate a friendly, concise response text confirming the action or answering questions.
   If the active agent is "waiter", respond in the persona of a helpful restaurant waiter, supporting English and Hindi inputs, suggesting complementary dishes (e.g. naan with butter chicken).

Response MUST be a valid JSON matching this schema:
{
  "routingAgent": "operations" | "analytics" | "inventory" | "marketing" | "experience" | "waiter",
  "action": {
    "type": "actionName",
    "payload": { ... }
  } | null,
  "responseText": "Your natural language response text"
}
`;

  // 4. Call LLM to classify and map intent
  let classificationResult;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey) {
    try {
      classificationResult = await callLLM(routingInstruction, query, session.messages);
    } catch (err) {
      console.warn("Agent System LLM classification failure, using fallback parser:", err);
      classificationResult = runFallbackParser(query, session.activeAgent);
    }
  } else {
    classificationResult = runFallbackParser(query, session.activeAgent);
  }

  const detectedAgent = classificationResult.routingAgent || session.activeAgent;
  const action = classificationResult.action;
  const responseText = classificationResult.responseText;

  // Update session's active agent
  await MemoryManager.setActiveAgent(userId, restaurantId, detectedAgent);
  await MemoryManager.addMessage(userId, restaurantId, "user", query);

  // 5. Execute Action or Request Confirmation
  if (action && action.type) {
    // Intercept client-side UI actions and return them directly
    const UI_ACTIONS = ["NAVIGATE", "TOGGLE_THEME", "LOGOUT", "UPGRADE", "SHOW_TOAST", "REFRESH_DATA"];
    if (UI_ACTIONS.includes(action.type)) {
      await MemoryManager.addMessage(userId, restaurantId, "model", responseText);
      return {
        text: responseText,
        routingAgent: detectedAgent,
        action: action
      };
    }

    const actionName = action.type as AgentAction;

    // A. Check Permissions
    const perm = await validatePermission(userId, restaurantId, actionName);
    if (!perm.allowed) {
      const errorMsg = perm.reason || "You do not have permission to execute this command.";
      await MemoryManager.addMessage(userId, restaurantId, "model", errorMsg);
      return {
        text: errorMsg,
        routingAgent: detectedAgent,
        action: { type: "SHOW_TOAST", payload: { message: "Permission Denied" } }
      };
    }

    // B. Check Action Confirmation Requirements
    if (CRITICAL_ACTIONS.includes(actionName)) {
      // Store action details in pending queue
      await MemoryManager.setPendingAction(userId, restaurantId, actionName, action.payload);
      
      const confirmText = `⚠️ I require your confirmation before proceeding. Do you want to execute '${actionName}' with parameters: ${JSON.stringify(action.payload)}? Reply YES to confirm, or NO to abort.`;
      await MemoryManager.addMessage(userId, restaurantId, "model", confirmText);

      return {
        text: confirmText,
        routingAgent: detectedAgent,
        action: {
          type: "CONFIRMATION_REQUIRED",
          payload: { actionType: actionName, parameters: action.payload }
        },
        needsConfirmation: true
      };
    }

    // C. Execute regular tools directly
    const execResult = await executeToolAction(
      actionName,
      action.payload,
      restaurantId,
      userId,
      perm.userRole || "STAFF",
      userName,
      ipAddress
    );

    const finalResponse = execResult.success
      ? `${responseText}\n\n✅ ${execResult.message}`
      : `❌ Operational failure: ${execResult.message}`;

    await MemoryManager.addMessage(userId, restaurantId, "model", finalResponse);

    return {
      text: finalResponse,
      routingAgent: detectedAgent,
      action: execResult.success ? { type: "REFRESH_DATA" } : { type: "SHOW_TOAST", payload: { message: execResult.message } }
    };
  }

  // 6. Generic conversational response (no tool execution)
  await MemoryManager.addMessage(userId, restaurantId, "model", responseText);
  return {
    text: responseText,
    routingAgent: detectedAgent,
    action: null
  };
}

/**
 * Map action string to tools functions and execute.
 */
async function executeToolAction(
  action: AgentAction,
  payload: any,
  restaurantId: string,
  userId: string,
  userRole: string = "STAFF",
  userName?: string,
  ipAddress?: string
): Promise<tools.ToolResult> {
  let result: tools.ToolResult;

  try {
    switch (action) {
      case "createRestaurant":
        result = await tools.createRestaurant(userId, payload.name, payload.slug, payload.description, payload.phone, payload.email);
        break;
      case "updateRestaurant":
        result = await tools.updateRestaurant(restaurantId, payload);
        break;
      case "deleteRestaurant":
        result = await tools.deleteRestaurant(restaurantId);
        break;

      case "createTable":
        result = await tools.createTable(restaurantId, payload.name, payload.capacity);
        break;
      case "updateTable":
        result = await tools.updateTable(payload.tableIdOrName, restaurantId, payload);
        break;
      case "deleteTable":
        result = await tools.deleteTable(payload.tableName, restaurantId);
        break;
      case "generateQRCode":
        result = await tools.generateQRCode(payload.tableName, restaurantId);
        break;

      case "createMenuItem":
        result = await tools.createMenuItem(restaurantId, payload.categoryName, payload.name, payload.price, payload.description, payload.isVeg);
        break;
      case "updateMenuItem":
        result = await tools.updateMenuItem(restaurantId, payload.itemName, payload);
        break;
      case "deleteMenuItem":
        result = await tools.deleteMenuItem(restaurantId, payload.itemName);
        break;
      case "updatePrices":
        result = await tools.updatePrices(restaurantId, payload.categoryNameOrAll, payload.percentageChange);
        break;

      case "viewOrders":
        result = await tools.viewOrders(restaurantId, payload.status, payload.limit);
        break;
      case "updateOrderStatus":
        result = await tools.updateOrderStatus(restaurantId, payload.orderNumber, payload.status);
        break;
      case "cancelOrder":
        result = await tools.cancelOrder(restaurantId, payload.orderNumber);
        break;

      case "getInventory":
        result = await tools.getInventory(restaurantId);
        break;
      case "updateInventory":
        result = await tools.updateInventory(restaurantId, payload.ingredientName, payload.quantityChange, payload.movementType, payload.reason);
        break;
      case "createIngredient":
        result = await tools.createIngredient(restaurantId, payload.name, payload.unit, payload.category, payload.minStock);
        break;
      case "forecastInventory":
        result = await tools.forecastInventory(restaurantId);
        break;

      case "getRevenue":
        result = await tools.getRevenue(restaurantId, payload.days);
        break;
      case "getSalesReport":
        result = await tools.getSalesReport(restaurantId, payload.days);
        break;
      case "getPopularItems":
        result = await tools.getPopularItems(restaurantId, payload.limit);
        break;
      case "generateInsights":
        result = await tools.generateInsights(restaurantId);
        break;

      case "createCoupon":
        result = await tools.createCoupon(restaurantId, payload.code, payload.discountType, payload.discountValue, payload.maxUsage);
        break;
      case "generateCampaign":
        result = await tools.generateCampaign(restaurantId, payload.name, payload.type, payload.content, payload.subject);
        break;
      case "schedulePromotion":
        result = await tools.schedulePromotion(restaurantId, payload.campaignId, payload.scheduleTime);
        break;

      case "getCustomers":
        result = await tools.getCustomers(restaurantId);
        break;
      case "getCustomerInsights":
        result = await tools.getCustomerInsights(restaurantId);
        break;

      default:
        return { success: false, message: `Tool action '${action}' is not implemented.` };
    }

    // Write audit log entry if action succeeded and auditDetails are provided
    if (result.success && result.auditDetails) {
      try {
        await prisma.auditLog.create({
          data: {
            action: action,
            details: result.auditDetails,
            userId: userId,
            userRole: userRole,
            userName: userName || "Unknown User",
            ipAddress: ipAddress || "0.0.0.0",
            restaurantId: restaurantId
          }
        });
      } catch (logErr) {
        console.error("Audit log write failed:", logErr);
      }
    }

    return result;
  } catch (err: any) {
    console.error(`Tool execution error for action '${action}':`, err);
    return { success: false, message: `Tool call failed: ${err.message}` };
  }
}

/**
 * Regex-based offline command parser to handle operations when Gemini is not configured.
 */
function runFallbackParser(query: string, activeAgent: string): {
  routingAgent: string;
  action: { type: string; payload: any } | null;
  responseText: string;
} {
  const lowercase = query.toLowerCase().trim();

  // Greetings
  if (["hi", "hello", "hey", "yo", "greetings", "hello there", "namaste"].some(g => lowercase === g || lowercase.startsWith(g + " "))) {
    return {
      routingAgent: activeAgent,
      action: null,
      responseText: "Hello! I am your AI Restaurant OS Commander. How can I help you manage the floor or check performance today?"
    };
  }

  // Help
  if (lowercase === "help" || lowercase.includes("what can you do") || lowercase.includes("commands")) {
    return {
      routingAgent: activeAgent,
      action: null,
      responseText: "I can navigate to any dashboard screen (e.g. 'go to orders'), check table layouts, review pending kitchen items, view revenue analytics, or update order preparation status."
    };
  }

  // Theme Toggling
  if (lowercase.includes("theme") || lowercase.includes("dark mode") || lowercase.includes("light mode") || lowercase.includes("switch mode")) {
    return {
      routingAgent: activeAgent,
      action: { type: "TOGGLE_THEME", payload: {} },
      responseText: "Toggling theme mode..."
    };
  }

  // 1. NAVIGATION COMMANDS
  const navMap: Record<string, string> = {
    dashboard: "/dashboard",
    overview: "/dashboard",
    report: "/reports",
    analytic: "/reports",
    sale: "/reports",
    revenue: "/reports",
    forecast: "/forecasting",
    predict: "/forecasting",
    order: "/orders",
    customer: "/customers",
    kitchen: "/kds",
    kds: "/kds",
    menu: "/menu",
    dish: "/menu",
    table: "/tables",
    seating: "/tables",
    layout: "/tables",
    inventory: "/inventory",
    stock: "/inventory",
    ingredient: "/inventory",
    reservation: "/reservations",
    booking: "/reservations",
    service: "/table-service",
    waiter: "/table-service",
    queue: "/queue",
    waitlist: "/queue",
    staff: "/staff",
    employee: "/staff",
    shift: "/schedule",
    schedule: "/schedule",
    delivery: "/delivery",
    setting: "/settings",
    profile: "/settings",
    billing: "/billing",
    invoice: "/billing"
  };

  for (const [key, path] of Object.entries(navMap)) {
    if (
      (lowercase.includes("go to") || lowercase.includes("open") || lowercase.includes("show") || lowercase.includes("take me to") || lowercase.includes("navigate")) &&
      lowercase.includes(key)
    ) {
      const pageLabel = key.toUpperCase();
      return {
        routingAgent: "operations",
        action: { type: "NAVIGATE", payload: { path } },
        responseText: `Navigating to ${pageLabel} screen.`
      };
    }
  }

  // 2. OPERATIONS COMMANDS
  // Add/Create Table: "create a table called VIP-12", "add table Table 5"
  if (lowercase.includes("table") && (lowercase.includes("create") || lowercase.includes("add") || lowercase.includes("register") || lowercase.includes("new"))) {
    const nameMatch = query.match(/(?:table|called|named)\s+([a-zA-Z0-9_-]+)/i);
    const capacityMatch = query.match(/(?:capacity|seats|for)\s+(\d+)/i);
    const tableName = nameMatch ? nameMatch[1] : `Table-${Math.floor(Math.random() * 90) + 10}`;
    const capacity = capacityMatch ? parseInt(capacityMatch[1]) : 4;
    return {
      routingAgent: "operations",
      action: { type: "createTable", payload: { name: tableName, capacity } },
      responseText: `Registering new dining table '${tableName}'...`
    };
  }

  // Delete Table: "delete table VIP-12", "remove table Table 3"
  if (lowercase.includes("table") && (lowercase.includes("delete") || lowercase.includes("remove") || lowercase.includes("deactivate"))) {
    const nameMatch = query.match(/(?:table)\s+([a-zA-Z0-9_-]+)/i);
    if (nameMatch) {
      return {
        routingAgent: "operations",
        action: { type: "deleteTable", payload: { tableName: nameMatch[1] } },
        responseText: `Deactivating table '${nameMatch[1]}'...`
      };
    }
  }

  // Generate QR Codes: "generate qr codes", "generate qr code for Table 5"
  if (lowercase.includes("qr") || lowercase.includes("quick response")) {
    const nameMatch = query.match(/(?:table)\s+([a-zA-Z0-9_-]+)/i);
    const tableName = nameMatch ? nameMatch[1] : "Table 1";
    return {
      routingAgent: "operations",
      action: { type: "generateQRCode", payload: { tableName } },
      responseText: `Generating table QR token...`
    };
  }

  // Kitchen Pending Orders: "show pending kitchen orders", "show kitchen backlog"
  if (lowercase.includes("pending") || lowercase.includes("kitchen") || lowercase.includes("backlog")) {
    if (lowercase.includes("order") || lowercase.includes("prep") || lowercase.includes("backlog")) {
      return {
        routingAgent: "operations",
        action: { type: "viewOrders", payload: { status: "PREPARING", limit: 10 } },
        responseText: "Loading active preparations in the kitchen..."
      };
    }
  }

  // Update Order Status: "mark order TS-1002 as ready", "set order status to done"
  if (lowercase.includes("order") && (lowercase.includes("mark") || lowercase.includes("set") || lowercase.includes("update"))) {
    const orderMatch = query.match(/(?:order|#)?\s*([a-zA-Z0-9-]+)/i);
    const orderNumber = orderMatch ? orderMatch[1].toUpperCase() : "TS-1001";
    let status = "NEW";
    if (lowercase.includes("preparing")) status = "PREPARING";
    else if (lowercase.includes("ready")) status = "READY";
    else if (lowercase.includes("done") || lowercase.includes("served")) status = "DONE";
    else if (lowercase.includes("cancel")) status = "CANCELLED";

    return {
      routingAgent: "operations",
      action: { type: "updateOrderStatus", payload: { orderNumber, status } },
      responseText: `Updating order ${orderNumber} status...`
    };
  }

  // 3. ANALYTICS COMMANDS
  // "show today's revenue", "what is my revenue", "how is my restaurant performing"
  if (lowercase.includes("revenue") || lowercase.includes("perform") || lowercase.includes("sales") || lowercase.includes("analytics")) {
    return {
      routingAgent: "analytics",
      action: { type: "generateInsights", payload: {} },
      responseText: "Retrieving operational insights and revenue metrics..."
    };
  }

  // Best Selling Dishes: "what are my top selling dishes", "best selling items"
  if (lowercase.includes("best selling") || lowercase.includes("top selling") || lowercase.includes("popular")) {
    return {
      routingAgent: "analytics",
      action: { type: "getPopularItems", payload: { limit: 5 } },
      responseText: "Compiling list of best-selling menu items..."
    };
  }

  // 4. MARKETING COMMANDS
  // Create coupon: "create a coupon called SUMMER20"
  if (lowercase.includes("coupon") && (lowercase.includes("create") || lowercase.includes("add") || lowercase.includes("new"))) {
    const codeMatch = query.match(/(?:coupon|called|named|code)\s+([a-zA-Z0-9_-]+)/i);
    const code = codeMatch ? codeMatch[1].toUpperCase() : "PROMO10";
    return {
      routingAgent: "marketing",
      action: { type: "createCoupon", payload: { code, discountType: "PERCENTAGE", discountValue: 20 } },
      responseText: `Creating discount coupon campaign '${code}'...`
    };
  }

  // 5. INVENTORY COMMANDS
  // Adjust stock: "add 15 kg of chicken to stock"
  if (lowercase.includes("stock") || lowercase.includes("inventory") || lowercase.includes("ingredient")) {
    const qtyMatch = query.match(/(?:add|remove|deduct|adjust|set)?\s*(-?\d+)\s*(?:kg|units|liters|pieces|g)?\s*(?:of\s+)?([a-zA-Z]+)/i);
    if (qtyMatch) {
      const quantity = parseFloat(qtyMatch[1]);
      const ingredientName = qtyMatch[2];
      return {
        routingAgent: "inventory",
        action: { type: "updateInventory", payload: { ingredientName, quantityChange: quantity, movementType: quantity < 0 ? "OUT" : "IN", reason: "Adjusted via fallback parser" } },
        responseText: `Updating stock level for ingredient '${ingredientName}'...`
      };
    }
    return {
      routingAgent: "inventory",
      action: { type: "getInventory", payload: {} },
      responseText: "Fetching inventory stock ledger..."
    };
  }

  // Customer-facing AI waiter suggestions: "I'm vegetarian", "recommend spicy dishes"
  if (activeAgent === "waiter" || lowercase.includes("veg") || lowercase.includes("spicy") || lowercase.includes("recommend") || lowercase.includes("suggest")) {
    return {
      routingAgent: "waiter",
      action: { type: "getPopularItems", payload: { limit: 3 } },
      responseText: "Here are some of our popular recommendations. Feel free to let me know if you prefer vegetarian or spicy options!"
    };
  }

  // Default Fallback
  return {
    routingAgent: activeAgent,
    action: { type: "SHOW_TOAST", payload: { message: "Command mapped to fallback" } },
    responseText: `Command parsed: "${query}". (Configure GEMINI_API_KEY in your .env for full semantic reasoning).`
  };
}
