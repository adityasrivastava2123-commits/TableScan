import { prisma } from "../prisma";
import { z } from "zod";

// Cache for menu searches per restaurant & query
const menuQueryCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export interface CustomerAgentInput {
  message: string;
  restaurantId: string;
  tableId: string;
  sessionId?: string;
  customerPhone?: string;
  currentCartItems?: Array<{ id: string; name: string; price: number; quantity: number; isVeg: boolean }>;
  history?: Array<{ role: string; content: string }>;
}

export interface CustomerAgentOutput {
  response: string;
  toolActions: Array<{
    tool: string;
    payload: any;
  }>;
  cached?: boolean;
}

/**
  * Helper to resolve target item for affirmative confirmations (e.g. "yes", "sure", "ok")
  */
async function getTargetItemForConfirmation(
  restaurantId: string,
  history: Array<{ role: string; content: string }>
) {
  const allItems = await searchMenuCore(restaurantId, {});
  if (!allItems || allItems.length === 0) return null;

  if (history && history.length > 0) {
    const lastAssistantMsg = [...history].reverse().find((m) => m.role === "assistant" && m.content);
    if (lastAssistantMsg) {
      const contentLower = lastAssistantMsg.content.toLowerCase();
      const mentionedItems = allItems.filter((item: any) =>
        contentLower.includes(item.name.toLowerCase())
      );
      if (mentionedItems.length > 0) {
        return mentionedItems[0];
      }
    }
  }

  return allItems[0];
}

/**
 * 1. searchMenu Tool
 * Searches current restaurant's live menu by text query, category, isVeg, maxPrice.
 */
export async function searchMenuCore(
  restaurantId: string,
  params: { query?: string; category?: string; isVeg?: boolean; maxPrice?: number }
) {
  try {
    const cacheKey = `${restaurantId}:${params.query || ""}:${params.category || ""}:${params.isVeg ?? "all"}:${params.maxPrice || "any"}`;
    const cached = menuQueryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const whereClause: any = {
      restaurantId, // Strict tenant isolation
      isAvailable: true,
    };

    if (typeof params.isVeg === "boolean") {
      whereClause.isVeg = params.isVeg;
    }

    if (params.maxPrice && params.maxPrice > 0) {
      whereClause.price = { lte: params.maxPrice };
    }

    if (params.category) {
      whereClause.category = {
        name: { contains: params.category, mode: "insensitive" },
      };
    }

    let items = await prisma.menuItem.findMany({
      where: whereClause,
      include: {
        category: { select: { name: true } },
        variants: { select: { id: true, name: true, price: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    // Client-side text query matching on name, description, and tags
    if (params.query && params.query.trim()) {
      const q = params.query.toLowerCase().trim();
      items = items.filter(
        (item: any) =>
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          item.tags.some((tag: string) => tag.toLowerCase().includes(q)) ||
          item.category.name.toLowerCase().includes(q)
      );
    }

    const formatted = items.map((i: any) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      price: i.price,
      isVeg: i.isVeg,
      category: i.category.name,
      tags: i.tags,
      variants: i.variants,
    }));

    menuQueryCache.set(cacheKey, { data: formatted, timestamp: Date.now() });
    return formatted;
  } catch (dbErr) {
    console.warn("searchMenuCore DB Connection Error:", dbErr);
    return [];
  }
}

/**
 * 2. getOrderHistory Core
 */
export async function getOrderHistoryCore(restaurantId: string, customerPhone?: string) {
  if (!customerPhone) return [];
  try {
    const pastOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        customerPhone,
        status: "DONE",
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: { menuItem: { select: { name: true, price: true, isVeg: true } } },
        },
      },
    });

    return pastOrders.map((o: any) => ({
      orderNumber: o.orderNumber,
      date: o.createdAt,
      total: o.totalAmount,
      items: o.items.map((item: any) => ({
        name: item.menuItem?.name || "Item",
        quantity: item.quantity,
        price: item.price,
      })),
    }));
  } catch (dbErr) {
    console.warn("getOrderHistoryCore DB Connection Error:", dbErr);
    return [];
  }
}

/**
 * 3. addToCart Core
 */
export async function addToCartCore(restaurantId: string, itemId: string, quantity: number = 1) {
  try {
    // Extract base item id if variant appended
    const baseId = itemId.split("-")[0];
    const menuItem = await prisma.menuItem.findFirst({
      where: { id: baseId, restaurantId, isAvailable: true },
      include: { variants: true },
    });

    if (!menuItem) {
      return { success: false, message: `Menu item with ID '${itemId}' not found or unavailable in this restaurant.` };
    }

    return {
      success: true,
      message: `Added ${quantity}x ${menuItem.name} (₹${menuItem.price}) to cart.`,
      item: {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity,
        isVeg: menuItem.isVeg,
        image: menuItem.image,
      },
    };
  } catch (dbErr) {
    console.warn("addToCartCore DB Connection Error:", dbErr);
    return { success: false, message: "Database temporarily unreachable. Please select item directly from the menu." };
  }
}

/**
 * Main Customer Agent Runner with LangChain + Groq and Fallback
 */
export async function runCustomerAgent(input: CustomerAgentInput): Promise<CustomerAgentOutput> {
  const { message, restaurantId, currentCartItems = [], customerPhone, history = [] } = input;
  const toolActionsTaken: Array<{ tool: string; payload: any }> = [];

  const apiKey = process.env.GROQ_API_KEY;

  if (apiKey) {
    try {
      // Dynamic import of LangChain modules with fallback if packages aren't present
      const toolsPkg = "@langchain/core/tools";
      const groqPkg = "@langchain/groq";
      const msgsPkg = "@langchain/core/messages";

      const toolsModule: any = await import(toolsPkg).catch(() => null);
      const groqModule: any = await import(groqPkg).catch(() => null);
      const messagesModule: any = await import(msgsPkg).catch(() => null);

      if (toolsModule && groqModule && messagesModule) {
        const { tool } = toolsModule;
        const { ChatGroq } = groqModule;
        const { SystemMessage, HumanMessage, AIMessage, ToolMessage } = messagesModule;

        const searchMenuTool = tool(
          async (args: any) => {
            const res = await searchMenuCore(restaurantId, args);
            return JSON.stringify(res);
          },
          {
            name: "searchMenu",
            description: "Search current restaurant menu by query, category, isVeg, or maxPrice.",
            schema: z.object({
              query: z.string().optional().describe("Search term like 'paneer', 'spicy', 'dessert'"),
              category: z.string().optional().describe("Category name"),
              isVeg: z.boolean().optional().describe("Filter for vegetarian items (true) or non-veg (false)"),
              maxPrice: z.number().optional().describe("Maximum price budget in INR"),
            }),
          }
        );

        const getOrderHistoryTool = tool(
          async () => {
            const res = await getOrderHistoryCore(restaurantId, customerPhone);
            return JSON.stringify(res);
          },
          {
            name: "getOrderHistory",
            description: "Get past completed orders for repeat customer personalization.",
            schema: z.object({}),
          }
        );

        const addToCartTool = tool(
          async (args: any) => {
            const res = await addToCartCore(restaurantId, args.itemId, args.quantity);
            if (res.success) {
              toolActionsTaken.push({ tool: "addToCart", payload: res.item });
            }
            return JSON.stringify(res);
          },
          {
            name: "addToCart",
            description: "Directly add a recommended menu item to the customer's shopping cart.",
            schema: z.object({
              itemId: z.string().describe("The exact menuItem ID to add"),
              quantity: z.number().default(1).describe("Number of portions to add"),
            }),
          }
        );

        const getCartSummaryTool = tool(
          async () => {
            const total = currentCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            return JSON.stringify({
              itemsCount: currentCartItems.length,
              total,
              items: currentCartItems,
            });
          },
          {
            name: "getCartSummary",
            description: "Returns the current cart items and total amount before payment.",
            schema: z.object({}),
          }
        );

        const tools = [searchMenuTool, getOrderHistoryTool, addToCartTool, getCartSummaryTool];
        const model = new ChatGroq({
          apiKey,
          model: "llama-3.3-70b-versatile",
          temperature: 0.3,
        }).bindTools(tools);

        const systemPrompt = `You are Sorial, the warm and fast AI Order Assistant for TableScan restaurant app.
Your goals:
1. Recommend delicious food ONLY from the current restaurant's live menu using 'searchMenu'.
2. Help customers find items matching dietary preferences (veg, non-veg, spicy, gluten-free, budget limit in ₹).
3. Directly add items to cart when user requests (e.g., 'add paneer tikka to cart', 'give me 2 of those') by calling 'addToCart'.
4. Keep answers short, friendly, concise (max 2-3 sentences), with natural Hinglish/English tone.
5. If the user asks for cart status or summary, call 'getCartSummary'.
6. If the user responds affirmatively (e.g., 'yes', 'yeah', 'sure', 'ok', 'add it') after you recommended or offered items, call 'addToCart' for the recommended item(s).`;

        const messages: any[] = [
          new SystemMessage(systemPrompt),
        ];

        // Append recent chat history for context
        if (history && history.length > 0) {
          const recent = history.slice(-10);
          for (const h of recent) {
            if (h.role === "user" && h.content) {
              messages.push(new HumanMessage(h.content));
            } else if (h.role === "assistant" && h.content) {
              messages.push(new AIMessage(h.content));
            }
          }
        }

        messages.push(new HumanMessage(message));

        const initialResponse = await model.invoke(messages);
        messages.push(initialResponse);

        if (initialResponse.tool_calls && initialResponse.tool_calls.length > 0) {
          for (const call of initialResponse.tool_calls) {
            const targetTool = tools.find((t: any) => t.name === call.name);
            if (targetTool) {
              const toolResultStr = await (targetTool as any).invoke(call.args);
              messages.push(
                new ToolMessage({
                  tool_call_id: call.id || "call_1",
                  content: toolResultStr,
                })
              );
            }
          }

          const finalResponse = await model.invoke(messages);
          return {
            response: typeof finalResponse.content === "string" ? finalResponse.content : JSON.stringify(finalResponse.content),
            toolActions: toolActionsTaken,
          };
        }

        return {
          response: typeof initialResponse.content === "string" ? initialResponse.content : JSON.stringify(initialResponse.content),
          toolActions: toolActionsTaken,
        };
      }
    } catch (err) {
      console.warn("Groq LangChain agent execution error, dropping to fallback engine:", err);
      return runFallbackCustomerAgent(input);
    }
  }

  // Fallback engine if GROQ_API_KEY is missing or dynamic imports failed
  return runFallbackCustomerAgent(input);
}

/**
 * Robust Fallback Customer Agent Engine (when Groq API is not set or times out)
 */
export async function runFallbackCustomerAgent(input: CustomerAgentInput): Promise<CustomerAgentOutput> {
  const { message, restaurantId, currentCartItems = [], history = [] } = input;
  const lower = message.toLowerCase().trim();
  const toolActionsTaken: Array<{ tool: string; payload: any }> = [];

  // Check for cart summary request
  if (lower.includes("cart") || lower.includes("total") || lower.includes("bill") || lower.includes("summary")) {
    const total = currentCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    if (currentCartItems.length === 0) {
      return {
        response: "Your cart is currently empty! Would you like me to recommend some popular dishes?",
        toolActions: [],
      };
    }
    const itemNames = currentCartItems.map((i) => `${i.name} x${i.quantity} (₹${i.price * i.quantity})`).join(", ");
    return {
      response: `You have ${currentCartItems.length} item(s) in your cart: ${itemNames}. Total: ₹${total}. Ready to checkout?`,
      toolActions: [],
    };
  }

  // Check for affirmative response (e.g., "yes", "sure", "ok", "haan", "add it")
  const isAffirmative =
    /^(yes|yeah|yep|sure|ok|okay|haan|ha|add it|yes please|do it|add them|please add|ha add kar do|ha kardo|add 1st|add first)$/i.test(lower) ||
    ((lower.includes("yes") || lower.includes("sure") || lower.includes("ok") || lower.includes("haan") || lower.includes("kardo")) &&
      !lower.includes("no") &&
      !lower.includes("not"));

  // Check for "add to cart" intent
  const isAddToCart =
    isAffirmative ||
    lower.includes("add") ||
    lower.includes("order") ||
    lower.includes("le lo") ||
    lower.includes("mangwa") ||
    lower.includes("chahiye");

  // Parse budget / max price
  const priceMatch = lower.match(/(?:under|below|less than|budget|within)\s*(?:₹|rs\.?|rupees)?\s*(\d+)/i) ||
                     lower.match(/(\d+)\s*(?:rupees|rs|inr)/i);
  const maxPrice = priceMatch ? parseInt(priceMatch[1], 10) : undefined;

  // Parse requested quantity
  const qtyMatch = lower.match(/(?:x|\b)(\d+)\s*(?:of|x|portions?|plates?|orders?|x)?/i);
  const quantity = qtyMatch ? Math.max(1, parseInt(qtyMatch[1], 10)) : 1;

  // Parse dietary preferences
  const isVeg = lower.includes("veg") && !lower.includes("non-veg") && !lower.includes("non veg")
    ? true
    : lower.includes("non-veg") || lower.includes("non veg") || lower.includes("chicken") || lower.includes("mutton") || lower.includes("fish")
    ? false
    : undefined;

  // Clean search query
  const cleanedQuery = lower
    .replace(/(?:add|to|cart|please|kuch|chahiye|give|me|show|menu|items|under|below|rs|inr|yes|yeah|sure|ok|okay|haan|ha|kardo|do|it|them|1st|first|\d+)/gi, "")
    .trim();

  let menuItems: any[] = [];
  if (cleanedQuery.length > 0) {
    menuItems = await searchMenuCore(restaurantId, {
      query: cleanedQuery,
      isVeg,
      maxPrice,
    });
  }

  // Handle Add to Cart logic
  if (isAddToCart) {
    let targetItem = menuItems.length > 0 ? menuItems[0] : null;

    if (!targetItem) {
      targetItem = await getTargetItemForConfirmation(restaurantId, history);
    }

    if (targetItem) {
      const addResult = await addToCartCore(restaurantId, targetItem.id, quantity);
      if (addResult.success) {
        toolActionsTaken.push({ tool: "addToCart", payload: addResult.item });
        return {
          response: `Great choice! I have added ${quantity > 1 ? `${quantity}x ` : ""}${targetItem.name} (₹${targetItem.price}) directly to your cart. 🛒`,
          toolActions: toolActionsTaken,
        };
      }
    }
  }

  // If search yielded no matches and not adding to cart
  if (menuItems.length === 0) {
    const topItems = await searchMenuCore(restaurantId, { isVeg });
    if (topItems.length > 0) {
      const recs = topItems.slice(0, 3).map((i: any) => `• ${i.name} (₹${i.price})`).join("\n");
      return {
        response: `Sorial couldn't find exact matches, but here are popular recommendations from the menu:\n\n${recs}\n\nWould you like me to add one of these to your cart?`,
        toolActions: [],
      };
    }

    return {
      response: "Sorial couldn't fetch a suggestion right now, please browse the full menu manually.",
      toolActions: [],
    };
  }

  const topMatches = menuItems.slice(0, 3);
  const recList = topMatches
    .map((i: any) => `• **${i.name}** (₹${i.price}) ${i.isVeg ? "🟢" : "🔴"}${i.description ? ` - ${i.description}` : ""}`)
    .join("\n");

  return {
    response: `Here are the top options from our menu:\n\n${recList}\n\nJust tell me "add ${topMatches[0].name}" if you'd like to put it in your cart!`,
    toolActions: [],
  };
}
