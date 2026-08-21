import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchMenuCore,
  addToCartCore,
  runFallbackCustomerAgent,
} from "./customer-agent";
import { prisma } from "../prisma";

// Mock Prisma client methods for testing
vi.mock("../prisma", () => ({
  prisma: {
    menuItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
    },
  },
}));

describe("Customer Agent & Tool Call Flow", () => {
  const sampleRestaurantId = "rest-test-123";
  const sampleTableId = "table-test-[#5]";

  const mockMenuItems = [
    {
      id: "item-1",
      name: "Paneer Tikka",
      description: "Charcoal grilled cottage cheese marinated in spices",
      price: 220,
      isVeg: true,
      isAvailable: true,
      tags: ["bestseller", "spicy"],
      sortOrder: 1,
      category: { name: "Starters" },
      variants: [],
    },
    {
      id: "item-2",
      name: "Butter Chicken",
      description: "Rich creamy tomato curry with tender chicken",
      price: 350,
      isVeg: false,
      isAvailable: true,
      tags: ["bestseller", "curry"],
      sortOrder: 2,
      category: { name: "Main Course" },
      variants: [],
    },
    {
      id: "item-3",
      name: "Garlic Naan",
      description: "Clay oven baked bread with butter and garlic",
      price: 60,
      isVeg: true,
      isAvailable: true,
      tags: ["bread"],
      sortOrder: 3,
      category: { name: "Breads" },
      variants: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("searchMenuCore Tool", () => {
    it("should query Prisma with strict restaurantId tenant isolation", async () => {
      (prisma.menuItem.findMany as any).mockResolvedValue(mockMenuItems);

      const items = await searchMenuCore(sampleRestaurantId, { isVeg: true });

      expect(prisma.menuItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            restaurantId: sampleRestaurantId,
            isVeg: true,
          }),
        })
      );
      expect(items.length).toBe(2);
      expect(items[0].name).toBe("Paneer Tikka");
    });

    it("should filter items by maxPrice budget", async () => {
      (prisma.menuItem.findMany as any).mockResolvedValue([mockMenuItems[0], mockMenuItems[2]]);

      const items = await searchMenuCore(sampleRestaurantId, { maxPrice: 200 });

      expect(prisma.menuItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            price: { lte: 200 },
          }),
        })
      );
    });
  });

  describe("addToCartCore Tool", () => {
    it("should return success and structured item payload when item is found", async () => {
      (prisma.menuItem.findFirst as any).mockResolvedValue(mockMenuItems[0]);

      const result = await addToCartCore(sampleRestaurantId, "item-1", 2);

      expect(result.success).toBe(true);
      expect(result.item).toEqual({
        id: "item-1",
        name: "Paneer Tikka",
        price: 220,
        quantity: 2,
        isVeg: true,
        image: undefined,
      });
    });

    it("should return error message when item is missing or unavailable", async () => {
      (prisma.menuItem.findFirst as any).mockResolvedValue(null);

      const result = await addToCartCore(sampleRestaurantId, "invalid-id", 1);

      expect(result.success).toBe(false);
      expect(result.message).toContain("not found or unavailable");
    });
  });

  describe("runFallbackCustomerAgent End-to-End Flow", () => {
    it("should process user 'add Paneer Tikka to cart' request and output addToCart toolAction", async () => {
      (prisma.menuItem.findMany as any).mockResolvedValue([mockMenuItems[0]]);
      (prisma.menuItem.findFirst as any).mockResolvedValue(mockMenuItems[0]);

      const output = await runFallbackCustomerAgent({
        message: "add Paneer Tikka to cart",
        restaurantId: sampleRestaurantId,
        tableId: sampleTableId,
      });

      expect(output.toolActions).toHaveLength(1);
      expect(output.toolActions[0].tool).toBe("addToCart");
      expect(output.toolActions[0].payload.name).toBe("Paneer Tikka");
      expect(output.response).toContain("added Paneer Tikka");
    });

    it("should respond with cart summary when user asks for cart total", async () => {
      const output = await runFallbackCustomerAgent({
        message: "what is my cart total?",
        restaurantId: sampleRestaurantId,
        tableId: sampleTableId,
        currentCartItems: [
          { id: "item-1", name: "Paneer Tikka", price: 220, quantity: 2, isVeg: true },
        ],
      });

      expect(output.response).toContain("Total: ₹440");
    });
  });
});
