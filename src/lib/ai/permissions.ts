import { prisma } from "../prisma";
import { Role } from "@prisma/client";

export type AgentAction =
  // Restaurant Settings
  | "createRestaurant" | "updateRestaurant" | "deleteRestaurant"
  // Tables
  | "createTable" | "updateTable" | "deleteTable" | "generateQRCode"
  // Menu
  | "createMenuItem" | "updateMenuItem" | "deleteMenuItem" | "updatePrices" | "createCategory"
  // Orders
  | "viewOrders" | "updateOrderStatus" | "cancelOrder"
  // Inventory
  | "getInventory" | "updateInventory" | "forecastInventory" | "createIngredient"
  // Analytics
  | "getRevenue" | "getSalesReport" | "getPopularItems" | "generateInsights"
  // Marketing
  | "createCoupon" | "generateCampaign" | "schedulePromotion"
  // Customers
  | "getCustomers" | "getCustomerInsights" | "addReview";

// Role hierarchy/permission definition
const ROLE_PERMISSIONS: Record<Role, AgentAction[]> = {
  ADMIN: [
    "createTable", "updateTable", "deleteTable", "generateQRCode",
    "createMenuItem", "updateMenuItem", "deleteMenuItem", "updatePrices", "createCategory",
    "viewOrders", "updateOrderStatus", "cancelOrder",
    "getInventory", "updateInventory", "forecastInventory", "createIngredient",
    "getRevenue", "getSalesReport", "getPopularItems", "generateInsights",
    "createCoupon", "generateCampaign", "schedulePromotion",
    "getCustomers", "getCustomerInsights"
  ],
  MANAGER: [
    "createTable", "updateTable", "generateQRCode",
    "createMenuItem", "updateMenuItem", "updatePrices", "createCategory",
    "viewOrders", "updateOrderStatus", "cancelOrder",
    "getInventory", "updateInventory", "forecastInventory", "createIngredient",
    "getRevenue", "getSalesReport", "getPopularItems", "generateInsights",
    "createCoupon", "generateCampaign", "schedulePromotion",
    "getCustomers", "getCustomerInsights"
  ],
  WAITER: [
    "viewOrders", "updateOrderStatus",
    "getInventory",
    "getCustomers"
  ],
  KITCHEN: [
    "viewOrders", "updateOrderStatus",
    "getInventory", "updateInventory" // Kitchen can adjust stock of ingredients
  ]
};

export interface PermissionResult {
  allowed: boolean;
  reason?: string;
  userRole?: string;
  isOwner?: boolean;
}

/**
 * Validates if the user has the permissions to execute an action.
 * A restaurant OWNER bypasses all checks and has full access.
 * Staff members are checked against the role permissions map.
 */
export async function validatePermission(
  userId: string, // Clerk User ID
  restaurantId: string,
  action: AgentAction
): Promise<PermissionResult> {
  try {
    // 1. Resolve database user details
    const dbUser = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!dbUser) {
      return { allowed: false, reason: "User registration not found in Serveaura database." };
    }

    // 2. Check if user is the Owner of the Restaurant
    const restaurant = await prisma.restaurant.findFirst({
      where: { id: restaurantId, ownerId: dbUser.id },
    });

    if (restaurant) {
      return { allowed: true, isOwner: true, userRole: "OWNER" };
    }

    // 3. Check if user is a Staff member of the Restaurant
    const staff = await prisma.staff.findFirst({
      where: {
        restaurantId,
        email: { equals: dbUser.email, mode: "insensitive" },
        isActive: true,
      },
    });

    if (!staff) {
      // Superadmin fallback - check env variables
      const isSuperAdmin = process.env.SUPERADMIN_ID === dbUser.clerkId || dbUser.email === "superadmin@serveaura.com";
      if (isSuperAdmin) {
        return { allowed: true, isOwner: true, userRole: "SUPERADMIN" };
      }
      return { allowed: false, reason: "You are not registered as staff or owner for this restaurant." };
    }

    // 4. Validate action against Staff Role
    const role = staff.role;
    const allowedActions = ROLE_PERMISSIONS[role] || [];
    
    if (allowedActions.includes(action)) {
      return { allowed: true, isOwner: false, userRole: role };
    }

    return { 
      allowed: false, 
      reason: `Access Denied: Role '${role}' does not have permission to execute action '${action}'.`,
      userRole: role
    };
  } catch (error: any) {
    console.error("Permission check error:", error);
    return { allowed: false, reason: `Permission verification failed: ${error.message}` };
  }
}
