import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeAgentQuery } from "./agent-system";
import { MemoryManager } from "./memory";
import { validatePermission } from "./permissions";
import * as tools from "./tools";

// Mock the dependencies
vi.mock("../prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    restaurant: {
      findFirst: vi.fn(),
    },
    staff: {
      findFirst: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    }
  }
}));

// Mock tools
vi.mock("./tools", () => ({
  createTable: vi.fn().mockResolvedValue({ success: true, message: "Table VIP-1 created", auditDetails: "Table created" }),
  deleteTable: vi.fn().mockResolvedValue({ success: true, message: "Table VIP-1 deleted", auditDetails: "Table deleted" }),
  getRevenue: vi.fn().mockResolvedValue({ success: true, message: "Revenue ₹50,000", data: { totalRevenue: 50000 } }),
}));

// Mock permissions validation
vi.mock("./permissions", () => ({
  validatePermission: vi.fn(),
}));

// Setup fetch mock globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("AI Agent System Coordinator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-gemini-key";
    
    // Clear in-memory context memory
    const store = (MemoryManager as any).globalSessionStore;
    if (store) store.clear();
  });

  function mockLLMResponse(data: any) {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                { text: JSON.stringify(data) }
              ]
            }
          }
        ]
      })
    });
  }

  it("should successfully execute a regular operational action with permissions", async () => {
    // 1. Mock classification outcome from Gemini via mock fetch
    mockLLMResponse({
      routingAgent: "operations",
      action: {
        type: "createTable",
        payload: { name: "VIP-1", capacity: 4 }
      },
      responseText: "Creating a new VIP table..."
    });

    // 2. Mock owner permissions allowed
    (validatePermission as any).mockResolvedValue({
      allowed: true,
      isOwner: true,
      userRole: "OWNER"
    });

    const response = await executeAgentQuery({
      query: "Create a table named VIP-1",
      userId: "user_owner_id",
      restaurantId: "restaurant_id",
      userName: "Aditya",
      ipAddress: "127.0.0.1"
    });

    expect(response.routingAgent).toBe("operations");
    expect(response.action?.type).toBe("REFRESH_DATA");
    expect(response.text).toContain("Table VIP-1 created");
    expect(tools.createTable).toHaveBeenCalledWith("restaurant_id", "VIP-1", 4);
  });

  it("should block and request safety confirmation on a critical action", async () => {
    // 1. Mock classification outcome for deleteTable via mock fetch
    mockLLMResponse({
      routingAgent: "operations",
      action: {
        type: "deleteTable",
        payload: { tableName: "VIP-1" }
      },
      responseText: "Preparing to delete table..."
    });

    // 2. Mock owner permissions allowed
    (validatePermission as any).mockResolvedValue({
      allowed: true,
      isOwner: true,
      userRole: "OWNER"
    });

    const response = await executeAgentQuery({
      query: "Delete table VIP-1",
      userId: "user_owner_id",
      restaurantId: "restaurant_id"
    });

    expect(response.needsConfirmation).toBe(true);
    expect(response.action?.type).toBe("CONFIRMATION_REQUIRED");
    expect(response.text).toContain("confirmation");

    // Check that memory has stored the pending action
    const pending = await MemoryManager.popPendingAction("user_owner_id", "restaurant_id");
    expect(pending).not.toBeNull();
    expect(pending.type).toBe("deleteTable");
    expect(pending.payload.tableName).toBe("VIP-1");
  });

  it("should execute the pending critical action when customer confirms with YES", async () => {
    // 1. Setup pending action in memory
    await MemoryManager.setPendingAction("user_owner_id", "restaurant_id", "deleteTable", { tableName: "VIP-1" });

    const response = await executeAgentQuery({
      query: "YES",
      userId: "user_owner_id",
      restaurantId: "restaurant_id"
    });

    expect(response.text).toContain("Confirmation received. Table VIP-1 deleted");
    expect(tools.deleteTable).toHaveBeenCalledWith("VIP-1", "restaurant_id");

    // Pending action should now be cleared
    const pending = await MemoryManager.popPendingAction("user_owner_id", "restaurant_id");
    expect(pending).toBeNull();
  });

  it("should deny action execution if permission validation fails", async () => {
    // 1. Mock classification outcome via mock fetch
    mockLLMResponse({
      routingAgent: "operations",
      action: {
        type: "createTable",
        payload: { name: "VIP-1" }
      },
      responseText: "Creating..."
    });

    // 2. Mock permissions failure (e.g. Waiter trying to add tables)
    (validatePermission as any).mockResolvedValue({
      allowed: false,
      reason: "Access Denied: Role 'WAITER' does not have permission to execute action 'createTable'."
    });

    const response = await executeAgentQuery({
      query: "Add table VIP-1",
      userId: "waiter_user_id",
      restaurantId: "restaurant_id"
    });

    expect(response.action?.type).toBe("SHOW_TOAST");
    expect(response.action?.payload?.message).toBe("Permission Denied");
    expect(response.text).toContain("Access Denied");
    expect(tools.createTable).not.toHaveBeenCalled();
  });
});
