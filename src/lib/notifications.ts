import { prisma } from "@/lib/prisma";

interface LowStockAlert {
  ingredientId: string;
  ingredientName: string;
  currentStock: number;
  minStock: number;
  unit: string;
  supplierName?: string;
}

export async function checkLowStockAlerts(restaurantId: string): Promise<LowStockAlert[]> {
  const lowStockItems = await prisma.ingredient.findMany({
    where: {
      restaurantId,
      currentStock: {
        lte: prisma.ingredient.fields.minStock,
      },
    },
    include: {
      supplier: true,
    },
  });

  return lowStockItems.map((item) => ({
    ingredientId: item.id,
    ingredientName: item.name,
    currentStock: item.currentStock,
    minStock: item.minStock,
    unit: item.unit,
    supplierName: item.supplier?.name,
  }));
}

export async function createStockMovement(
  ingredientId: string,
  type: "IN" | "OUT" | "ADJUSTMENT",
  quantity: number,
  reason?: string,
  notes?: string
) {
  const movement = await prisma.stockMovement.create({
    data: {
      type,
      quantity,
      reason,
      notes,
      ingredientId,
    },
  });

  // Update ingredient stock
  const ingredient = await prisma.ingredient.findUnique({
    where: { id: ingredientId },
  });

  if (ingredient) {
    const stockChange = type === "IN" ? quantity : type === "OUT" ? -quantity : 0;
    const newStock = ingredient.currentStock + stockChange;
    
    await prisma.ingredient.update({
      where: { id: ingredientId },
      data: { currentStock: newStock },
    });

    // Check if this movement caused a low stock situation
    if (newStock <= ingredient.minStock && ingredient.currentStock > ingredient.minStock) {
      // Trigger low stock alert
      await triggerLowStockAlert(ingredient.id, newStock, ingredient.minStock);
    }
  }

  return movement;
}

async function triggerLowStockAlert(ingredientId: string, currentStock: number, minStock: number) {
  const ingredient = await prisma.ingredient.findUnique({
    where: { id: ingredientId },
    include: { supplier: true, restaurant: true },
  });

  if (!ingredient) return;

  // Here you would integrate with your notification service
  // For example: email, SMS, push notification, etc.
  console.log(`LOW STOCK ALERT: ${ingredient.name} is at ${currentStock} ${ingredient.unit} (min: ${minStock} ${ingredient.unit})`);
  
  // You could also store this in a notifications table
  // await prisma.notification.create({
  //   data: {
  //     type: "LOW_STOCK",
  //     message: `${ingredient.name} is running low`,
  //     restaurantId: ingredient.restaurantId,
  //     metadata: {
  //       ingredientId,
  //       currentStock,
  //       minStock,
  //     },
  //   },
  // });
}

export async function getReorderSuggestions(restaurantId: string) {
  const lowStockItems = await prisma.ingredient.findMany({
    where: {
      restaurantId,
      currentStock: {
        lte: prisma.ingredient.fields.minStock,
      },
    },
    include: {
      supplier: true,
    },
    orderBy: {
      currentStock: "asc",
    },
  });

  return lowStockItems.map((item) => ({
    ingredient: item.name,
    currentStock: item.currentStock,
    minStock: item.minStock,
    reorderQuantity: item.minStock * 2 - item.currentStock, // Suggest ordering enough to reach 2x min stock
    unit: item.unit,
    estimatedCost: (item.minStock * 2 - item.currentStock) * item.costPerUnit,
    supplier: item.supplier?.name,
    supplierLeadTime: item.supplier?.leadTime,
  }));
}
