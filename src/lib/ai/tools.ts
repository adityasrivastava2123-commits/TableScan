import { prisma } from "../prisma";
import { OrderStatus, Role } from "@prisma/client";
import { predictReorderNeeds } from "../inventory-prediction";
import { subDays, startOfDay, format } from "date-fns";

// Tool Response Wrapper
export interface ToolResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  auditDetails?: string;
}

// ==========================================
// RESTAURANT TOOLS
// ==========================================

export async function createRestaurant(
  ownerClerkId: string,
  name: string,
  slug: string,
  description?: string,
  phone?: string,
  email?: string
): Promise<ToolResult> {
  try {
    const owner = await prisma.user.findUnique({ where: { clerkId: ownerClerkId } });
    if (!owner) {
      return { success: false, message: `Owner user with ID ${ownerClerkId} not found.` };
    }

    const existing = await prisma.restaurant.findUnique({ where: { slug } });
    if (existing) {
      return { success: false, message: `Restaurant slug '${slug}' is already taken.` };
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        slug,
        description,
        phone,
        email,
        ownerId: owner.id
      }
    });

    // Create a default location for this restaurant
    const location = await prisma.location.create({
      data: {
        name: "Main Hall",
        restaurantId: restaurant.id
      }
    });

    return {
      success: true,
      message: `Successfully created restaurant '${name}' and configured default location.`,
      data: { restaurant, location },
      auditDetails: `Created restaurant ${name} (ID: ${restaurant.id}) with slug ${slug}.`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to create restaurant: ${error.message}` };
  }
}

export async function updateRestaurant(
  restaurantId: string,
  data: {
    name?: string;
    description?: string;
    phone?: string;
    email?: string;
    taxPercent?: number;
  }
): Promise<ToolResult> {
  try {
    const updated = await prisma.restaurant.update({
      where: { id: restaurantId },
      data
    });
    return {
      success: true,
      message: `Successfully updated settings for restaurant '${updated.name}'.`,
      data: updated,
      auditDetails: `Updated restaurant attributes: ${JSON.stringify(data)}.`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to update restaurant: ${error.message}` };
  }
}

export async function deleteRestaurant(restaurantId: string): Promise<ToolResult> {
  try {
    const deleted = await prisma.restaurant.delete({
      where: { id: restaurantId }
    });
    return {
      success: true,
      message: `Successfully deleted restaurant '${deleted.name}'.`,
      auditDetails: `Deleted restaurant ${deleted.name} (ID: ${restaurantId}).`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to delete restaurant: ${error.message}` };
  }
}

// ==========================================
// TABLE TOOLS
// ==========================================

export async function createTable(
  restaurantId: string,
  name: string,
  capacity: number = 4
): Promise<ToolResult> {
  try {
    let location = await prisma.location.findFirst({ where: { restaurantId, isActive: true } });
    if (!location) {
      location = await prisma.location.create({
        data: { name: "Main Dining Area", restaurantId }
      });
    }

    const table = await prisma.table.create({
      data: {
        name,
        capacity,
        locationId: location.id
      }
    });

    await prisma.tableService.create({
      data: {
        tableId: table.id,
        status: "AVAILABLE",
        restaurantId
      }
    });

    return {
      success: true,
      message: `Dining table '${name}' successfully registered under location '${location.name}'.`,
      data: table,
      auditDetails: `Created table ${name} (capacity: ${capacity}) in location ${location.name}.`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to create table: ${error.message}` };
  }
}

export async function updateTable(
  tableIdOrName: string,
  restaurantId: string,
  data: { name?: string; capacity?: number; isActive?: boolean }
): Promise<ToolResult> {
  try {
    const table = await prisma.table.findFirst({
      where: {
        location: { restaurantId },
        OR: [
          { id: tableIdOrName },
          { name: { equals: tableIdOrName, mode: "insensitive" } }
        ]
      }
    });

    if (!table) return { success: false, message: `Table '${tableIdOrName}' not found.` };

    const updated = await prisma.table.update({
      where: { id: table.id },
      data
    });

    return {
      success: true,
      message: `Table '${updated.name}' updated successfully.`,
      data: updated,
      auditDetails: `Updated table ${updated.name}: ${JSON.stringify(data)}.`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to update table: ${error.message}` };
  }
}

export async function deleteTable(tableName: string, restaurantId: string): Promise<ToolResult> {
  try {
    const table = await prisma.table.findFirst({
      where: {
        location: { restaurantId },
        name: { equals: tableName, mode: "insensitive" }
      }
    });

    if (!table) return { success: false, message: `Table '${tableName}' not found.` };

    await prisma.table.update({
      where: { id: table.id },
      data: { isActive: false }
    });

    return {
      success: true,
      message: `Table '${tableName}' has been disabled and deactivated.`,
      auditDetails: `Deactivated table ${tableName} (ID: ${table.id}).`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to delete table: ${error.message}` };
  }
}

export async function generateQRCode(tableName: string, restaurantId: string): Promise<ToolResult> {
  try {
    const table = await prisma.table.findFirst({
      where: {
        location: { restaurantId },
        name: { equals: tableName, mode: "insensitive" }
      },
      include: { location: { include: { restaurant: true } } }
    });

    if (!table) return { success: false, message: `Table '${tableName}' not found.` };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const qrUrl = `${appUrl}/${table.location.restaurant.slug}?table=${table.qrToken}`;

    return {
      success: true,
      message: `QR code link generated for ${tableName}.`,
      data: { qrUrl, qrToken: table.qrToken },
      auditDetails: `Generated QR code URL for ${tableName}: ${qrUrl}`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to generate QR code: ${error.message}` };
  }
}

// ==========================================
// MENU TOOLS
// ==========================================

export async function createMenuItem(
  restaurantId: string,
  categoryName: string,
  name: string,
  price: number,
  description?: string,
  isVeg: boolean = true
): Promise<ToolResult> {
  try {
    let category = await prisma.category.findFirst({
      where: { restaurantId, name: { equals: categoryName, mode: "insensitive" } }
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: categoryName, restaurantId }
      });
    }

    const existing = await prisma.menuItem.findFirst({
      where: { restaurantId, name: { equals: name, mode: "insensitive" } }
    });

    if (existing) {
      return { success: false, message: `Menu item '${name}' already exists in your restaurant menu.` };
    }

    const item = await prisma.menuItem.create({
      data: {
        name,
        price,
        description,
        isVeg,
        categoryId: category.id,
        restaurantId
      }
    });

    return {
      success: true,
      message: `Successfully added menu item '${name}' under category '${category.name}' for ₹${price}.`,
      data: item,
      auditDetails: `Created menu item ${name} under category ${category.name} with price ₹${price}.`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to create menu item: ${error.message}` };
  }
}

export async function updateMenuItem(
  restaurantId: string,
  itemName: string,
  data: { price?: number; isAvailable?: boolean; description?: string; isVeg?: boolean }
): Promise<ToolResult> {
  try {
    const item = await prisma.menuItem.findFirst({
      where: { restaurantId, name: { equals: itemName, mode: "insensitive" } }
    });

    if (!item) return { success: false, message: `Menu item '${itemName}' not found.` };

    const updated = await prisma.menuItem.update({
      where: { id: item.id },
      data
    });

    return {
      success: true,
      message: `Successfully updated attributes for menu item '${updated.name}'.`,
      data: updated,
      auditDetails: `Updated menu item ${updated.name}: ${JSON.stringify(data)}.`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to update menu item: ${error.message}` };
  }
}

export async function deleteMenuItem(restaurantId: string, itemName: string): Promise<ToolResult> {
  try {
    const item = await prisma.menuItem.findFirst({
      where: { restaurantId, name: { equals: itemName, mode: "insensitive" } }
    });

    if (!item) return { success: false, message: `Menu item '${itemName}' not found.` };

    // Try hard delete, fallback to soft deactivation if orders exist (FK constraint)
    try {
      await prisma.menuItem.delete({ where: { id: item.id } });
      return {
        success: true,
        message: `Menu item '${itemName}' successfully deleted.`,
        auditDetails: `Hard-deleted menu item ${itemName}.`
      };
    } catch {
      await prisma.menuItem.update({
        where: { id: item.id },
        data: { isAvailable: false }
      });
      return {
        success: true,
        message: `Menu item '${itemName}' is linked to active orders, so it was marked as unavailable instead.`,
        auditDetails: `Soft-deleted/disabled menu item ${itemName}.`
      };
    }
  } catch (error: any) {
    return { success: false, message: `Failed to delete menu item: ${error.message}` };
  }
}

export async function updatePrices(
  restaurantId: string,
  categoryNameOrAll: string,
  percentageChange: number // e.g. 10 for +10%, -5 for -5%
): Promise<ToolResult> {
  try {
    const multiplier = 1 + (percentageChange / 100);
    let itemsCount = 0;

    if (categoryNameOrAll.toLowerCase() === "all") {
      const items = await prisma.menuItem.findMany({ where: { restaurantId } });
      for (const item of items) {
        await prisma.menuItem.update({
          where: { id: item.id },
          data: { price: Math.round(item.price * multiplier) }
        });
      }
      itemsCount = items.length;
    } else {
      const category = await prisma.category.findFirst({
        where: { restaurantId, name: { equals: categoryNameOrAll, mode: "insensitive" } }
      });

      if (!category) {
        return { success: false, message: `Menu category '${categoryNameOrAll}' not found.` };
      }

      const items = await prisma.menuItem.findMany({
        where: { restaurantId, categoryId: category.id }
      });

      for (const item of items) {
        await prisma.menuItem.update({
          where: { id: item.id },
          data: { price: Math.round(item.price * multiplier) }
        });
      }
      itemsCount = items.length;
    }

    const direction = percentageChange >= 0 ? "increased" : "decreased";
    return {
      success: true,
      message: `Successfully ${direction} prices of ${itemsCount} items in '${categoryNameOrAll}' by ${Math.abs(percentageChange)}%.`,
      auditDetails: `Bulk price adjustment: ${categoryNameOrAll} adjusted by ${percentageChange}%. Modified ${itemsCount} items.`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to bulk update prices: ${error.message}` };
  }
}

// ==========================================
// ORDER TOOLS
// ==========================================

export async function viewOrders(
  restaurantId: string,
  status?: string,
  limit: number = 10
): Promise<ToolResult> {
  try {
    const filter: any = { restaurantId };
    if (status && status !== "ALL") {
      filter.status = status as OrderStatus;
    }

    const orders = await prisma.order.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        table: { select: { name: true } },
        items: { include: { menuItem: { select: { name: true } } } }
      }
    });

    return {
      success: true,
      message: `Retrieved ${orders.length} orders.`,
      data: orders
    };
  } catch (error: any) {
    return { success: false, message: `Failed to load orders: ${error.message}` };
  }
}

export async function updateOrderStatus(
  restaurantId: string,
  orderNumber: string,
  status: OrderStatus
): Promise<ToolResult> {
  try {
    const order = await prisma.order.findFirst({
      where: { restaurantId, orderNumber: { equals: orderNumber, mode: "insensitive" } }
    });

    if (!order) return { success: false, message: `Order #${orderNumber} not found.` };

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status }
    });

    // Sync with KDS OrderPreparation
    const prep = await prisma.orderPreparation.findFirst({ where: { orderId: order.id } });
    if (prep) {
      let stage = "RECEIVED";
      if (status === "PREPARING") stage = "PREPARING";
      else if (status === "READY") stage = "READY";
      else if (status === "DONE") stage = "SERVED";

      await prisma.orderPreparation.update({
        where: { id: prep.id },
        data: {
          stage,
          startedAt: status === "PREPARING" ? new Date() : undefined,
          completedAt: (status === "READY" || status === "DONE") ? new Date() : undefined
        }
      });
    }

    return {
      success: true,
      message: `Order #${orderNumber} status updated to '${status.toLowerCase()}'.`,
      data: updated,
      auditDetails: `Updated order #${orderNumber} status to ${status}.`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to update order status: ${error.message}` };
  }
}

export async function cancelOrder(restaurantId: string, orderNumber: string): Promise<ToolResult> {
  return updateOrderStatus(restaurantId, orderNumber, "CANCELLED");
}

// ==========================================
// INVENTORY TOOLS
// ==========================================

export async function getInventory(restaurantId: string): Promise<ToolResult> {
  try {
    const ingredients = await prisma.ingredient.findMany({
      where: { restaurantId },
      orderBy: { name: "asc" }
    });
    return { success: true, message: "Inventory fetched successfully.", data: ingredients };
  } catch (error: any) {
    return { success: false, message: `Failed to load inventory: ${error.message}` };
  }
}

export async function updateInventory(
  restaurantId: string,
  ingredientName: string,
  quantityChange: number, // positive to add stock, negative to deduct
  movementType: "IN" | "OUT" | "ADJUSTMENT",
  reason?: string
): Promise<ToolResult> {
  try {
    let ingredient = await prisma.ingredient.findFirst({
      where: { restaurantId, name: { equals: ingredientName, mode: "insensitive" } }
    });

    if (!ingredient) {
      // Auto-create ingredient if it does not exist
      ingredient = await prisma.ingredient.create({
        data: {
          name: ingredientName,
          unit: "units",
          currentStock: 0,
          restaurantId
        }
      });
    }

    await prisma.stockMovement.create({
      data: {
        type: movementType,
        quantity: quantityChange,
        reason: reason || "Adjusted via AI agent",
        ingredientId: ingredient.id
      }
    });

    const updated = await prisma.ingredient.update({
      where: { id: ingredient.id },
      data: {
        currentStock: { increment: quantityChange }
      }
    });

    // Auto-disable menu items if ingredient reaches 0 and there are recipes
    if (updated.currentStock <= 0) {
      const recipes = await prisma.recipeIngredient.findMany({
        where: { ingredientId: updated.id }
      });
      for (const recipe of recipes) {
        await prisma.menuItem.update({
          where: { id: recipe.menuItemId },
          data: { isAvailable: false }
        });
      }
    }

    return {
      success: true,
      message: `Successfully adjusted stock of '${updated.name}' by ${quantityChange > 0 ? "+" : ""}${quantityChange} ${updated.unit}. Current stock is ${updated.currentStock}.`,
      data: updated,
      auditDetails: `Adjusted inventory of ${updated.name} (change: ${quantityChange}, type: ${movementType}).`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to update inventory: ${error.message}` };
  }
}

export async function createIngredient(
  restaurantId: string,
  name: string,
  unit: string,
  category?: string,
  minStock: number = 0
): Promise<ToolResult> {
  try {
    const existing = await prisma.ingredient.findFirst({
      where: { restaurantId, name: { equals: name, mode: "insensitive" } }
    });

    if (existing) return { success: false, message: `Ingredient '${name}' already exists.` };

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        unit,
        category,
        minStock,
        restaurantId
      }
    });

    return {
      success: true,
      message: `Ingredient '${name}' added to inventory database.`,
      data: ingredient,
      auditDetails: `Added ingredient ${name} (${unit}, minStock: ${minStock}).`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to register ingredient: ${error.message}` };
  }
}

export async function forecastInventory(restaurantId: string): Promise<ToolResult> {
  try {
    const predictions = await predictReorderNeeds(restaurantId);
    return {
      success: true,
      message: `Analyzed ingredient stock levels. Identified ${predictions.filter(p => p.reorderUrgency === "CRITICAL").length} critical shortages.`,
      data: predictions
    };
  } catch (error: any) {
    return { success: false, message: `Failed to run inventory forecasting: ${error.message}` };
  }
}

// ==========================================
// ANALYTICS & INSIGHTS TOOLS
// ==========================================

export async function getRevenue(restaurantId: string, days: number = 30): Promise<ToolResult> {
  try {
    const startDate = startOfDay(subDays(new Date(), days));
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: startDate },
        status: { not: "CANCELLED" }
      },
      select: { totalAmount: true }
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      success: true,
      message: `Total revenue over the last ${days} days is ₹${totalRevenue.toLocaleString("en-IN")}.`,
      data: { totalRevenue, orderCount: orders.length, avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0 }
    };
  } catch (error: any) {
    return { success: false, message: `Failed to fetch revenue analytics: ${error.message}` };
  }
}

export async function getSalesReport(restaurantId: string, days: number = 7): Promise<ToolResult> {
  try {
    const startDate = startOfDay(subDays(new Date(), days));
    const orders = await prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: startDate } },
      orderBy: { createdAt: "asc" }
    });

    const report: Record<string, { revenue: number; orders: number }> = {};
    for (let i = days - 1; i >= 0; i--) {
      const dateStr = format(subDays(new Date(), i), "yyyy-MM-dd");
      report[dateStr] = { revenue: 0, orders: 0 };
    }

    for (const order of orders) {
      const dateStr = format(order.createdAt, "yyyy-MM-dd");
      if (report[dateStr]) {
        report[dateStr].orders += 1;
        if (order.status !== "CANCELLED") {
          report[dateStr].revenue += order.totalAmount;
        }
      }
    }

    return {
      success: true,
      message: `Generated daily sales report for the last ${days} days.`,
      data: Object.entries(report).map(([date, val]) => ({ date, ...val }))
    };
  } catch (error: any) {
    return { success: false, message: `Failed to compile sales report: ${error.message}` };
  }
}

export async function getPopularItems(restaurantId: string, limit: number = 5): Promise<ToolResult> {
  try {
    const orderItems = await prisma.orderItem.findMany({
      where: { order: { restaurantId, status: { not: "CANCELLED" } } },
      include: { menuItem: { select: { name: true } } }
    });

    const itemsMap: Record<string, { quantity: number; revenue: number }> = {};
    for (const item of orderItems) {
      const name = item.menuItem?.name || "Unknown Item";
      if (!itemsMap[name]) {
        itemsMap[name] = { quantity: 0, revenue: 0 };
      }
      itemsMap[name].quantity += item.quantity;
      itemsMap[name].revenue += item.price * item.quantity;
    }

    const popular = Object.entries(itemsMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);

    return {
      success: true,
      message: `Retrieved top ${limit} best-selling dishes.`,
      data: popular
    };
  } catch (error: any) {
    return { success: false, message: `Failed to list popular items: ${error.message}` };
  }
}

export async function generateInsights(restaurantId: string): Promise<ToolResult> {
  try {
    const popular = await getPopularItems(restaurantId, 3);
    const revenue = await getRevenue(restaurantId, 30);
    const lowStock = await forecastInventory(restaurantId);

    const stockRiskList = (lowStock.data || [])
      .filter((p: any) => p.reorderUrgency === "CRITICAL")
      .map((p: any) => p.ingredientName);

    const insights = [
      `Monthly revenue is ₹${(revenue.data?.totalRevenue || 0).toLocaleString("en-IN")} with an average order value of ₹${Math.round(revenue.data?.avgOrderValue || 0)}.`,
      popular.data && popular.data.length > 0 
        ? `Your best-selling dish is '${popular.data[0].name}' (${popular.data[0].quantity} portions sold).`
        : "Not enough sales data to determine popular items.",
      stockRiskList.length > 0
        ? `Critical stock shortage warning: ${stockRiskList.join(", ")} may run out soon.`
        : "All inventory ingredients are currently above minimum stock levels."
    ];

    return {
      success: true,
      message: "Restaurant performance insights generated.",
      data: {
        summary: insights.join(" "),
        popularItems: popular.data,
        revenueSummary: revenue.data,
        criticalStock: stockRiskList
      }
    };
  } catch (error: any) {
    return { success: false, message: `Failed to generate insights: ${error.message}` };
  }
}

// ==========================================
// MARKETING & RETENTION TOOLS
// ==========================================

export async function createCoupon(
  restaurantId: string,
  code: string,
  discountType: "PERCENTAGE" | "FIXED",
  discountValue: number,
  maxUsage?: number,
  startDate?: string,
  endDate?: string
): Promise<ToolResult> {
  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType,
        discountValue,
        maxUsage,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        restaurantId
      }
    });

    return {
      success: true,
      message: `Coupon campaign '${coupon.code}' created. Customers get a ${discountValue}${discountType === "PERCENTAGE" ? "%" : " INR"} discount.`,
      data: coupon,
      auditDetails: `Created promo coupon: ${coupon.code} (Value: ${discountValue}, Type: ${discountType})`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to create coupon: ${error.message}` };
  }
}

export async function generateCampaign(
  restaurantId: string,
  name: string,
  type: "EMAIL" | "SMS" | "WHATSAPP" | "PUSH",
  content: string,
  subject?: string
): Promise<ToolResult> {
  try {
    const campaign = await prisma.campaign.create({
      data: {
        name,
        type,
        content,
        subject,
        status: "DRAFT",
        restaurantId
      }
    });

    return {
      success: true,
      message: `Drafted ${type} marketing campaign '${name}'. Campaign contents: "${content.substring(0, 50)}..."`,
      data: campaign,
      auditDetails: `Created marketing campaign: ${name} (Channel: ${type})`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to compile marketing campaign: ${error.message}` };
  }
}

export async function schedulePromotion(
  restaurantId: string,
  campaignId: string,
  scheduleTime: string
): Promise<ToolResult> {
  try {
    const updated = await prisma.campaign.update({
      where: { id: campaignId, restaurantId },
      data: {
        status: "SCHEDULED",
        scheduleTime: new Date(scheduleTime)
      }
    });

    return {
      success: true,
      message: `Campaign '${updated.name}' scheduled for transmission on ${new Date(scheduleTime).toLocaleString()}.`,
      data: updated,
      auditDetails: `Scheduled campaign ${updated.name} for ${scheduleTime}`
    };
  } catch (error: any) {
    return { success: false, message: `Failed to schedule campaign: ${error.message}` };
  }
}

// ==========================================
// CUSTOMER TOOLS
// ==========================================

export async function getCustomers(restaurantId: string): Promise<ToolResult> {
  try {
    // Get unique customers based on names and phones from past completed orders
    const orders = await prisma.order.findMany({
      where: { restaurantId, customerPhone: { not: null } },
      select: { customerName: true, customerPhone: true, totalAmount: true }
    });

    const customersMap = new Map<string, { name: string; phone: string; visits: number; ltv: number }>();
    
    for (const order of orders) {
      const phone = order.customerPhone!;
      const existing = customersMap.get(phone);
      if (existing) {
        existing.visits += 1;
        existing.ltv += order.totalAmount;
      } else {
        customersMap.set(phone, {
          name: order.customerName || "Walk-in Guest",
          phone,
          visits: 1,
          ltv: order.totalAmount
        });
      }
    }

    const customersList = Array.from(customersMap.values());
    return {
      success: true,
      message: `Found ${customersList.length} unique customer records.`,
      data: customersList
    };
  } catch (error: any) {
    return { success: false, message: `Failed to compile customer profiles: ${error.message}` };
  }
}

export async function getCustomerInsights(restaurantId: string): Promise<ToolResult> {
  try {
    const customers = await getCustomers(restaurantId);
    const list = customers.data || [];

    const highValue = list.filter((c: any) => c.ltv > 1500);
    const repeat = list.filter((c: any) => c.visits >= 3);

    return {
      success: true,
      message: "Customer insight analytics compiled.",
      data: {
        totalRegistered: list.length,
        highValueCount: highValue.length,
        repeatCount: repeat.length,
        averageCLV: list.length > 0 ? list.reduce((sum: number, c: any) => sum + c.ltv, 0) / list.length : 0
      }
    };
  } catch (error: any) {
    return { success: false, message: `Failed to compile customer insights: ${error.message}` };
  }
}
