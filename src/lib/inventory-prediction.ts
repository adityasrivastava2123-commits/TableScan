import { prisma } from "@/lib/prisma";

interface UsagePattern {
  ingredientId: string;
  ingredientName: string;
  averageDailyUsage: number;
  currentStock: number;
  estimatedDaysRemaining: number;
  recommendedReorderQuantity: number;
  reorderUrgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export async function predictReorderNeeds(restaurantId: string): Promise<UsagePattern[]> {
  // Get all ingredients for the restaurant
  const ingredients = await prisma.ingredient.findMany({
    where: { restaurantId },
    include: {
      stockMovements: {
        orderBy: { createdAt: "desc" },
        take: 100, // Last 100 movements
      },
    },
  });

  const predictions: UsagePattern[] = [];

  for (const ingredient of ingredients) {
    // Calculate average daily usage based on stock movements
    const outMovements = ingredient.stockMovements.filter((m) => m.type === "OUT");
    
    if (outMovements.length === 0) {
      // No usage data, skip prediction
      continue;
    }

    // Calculate date range of movements
    const oldestMovement = outMovements[outMovements.length - 1];
    const newestMovement = outMovements[0];
    const daysInRange = Math.max(1, Math.ceil((newestMovement.createdAt.getTime() - oldestMovement.createdAt.getTime()) / (1000 * 60 * 60 * 24)));

    // Calculate total quantity used
    const totalUsed = outMovements.reduce((sum, m) => sum + m.quantity, 0);
    
    // Calculate average daily usage
    const averageDailyUsage = totalUsed / daysInRange;

    // Estimate days remaining
    const estimatedDaysRemaining = ingredient.currentStock / averageDailyUsage;

    // Calculate recommended reorder quantity (enough for 30 days)
    const recommendedReorderQuantity = Math.max(0, (30 * averageDailyUsage) - ingredient.currentStock);

    // Determine urgency
    let urgency: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "LOW";
    if (estimatedDaysRemaining <= 3) {
      urgency = "CRITICAL";
    } else if (estimatedDaysRemaining <= 7) {
      urgency = "HIGH";
    } else if (estimatedDaysRemaining <= 14) {
      urgency = "MEDIUM";
    }

    predictions.push({
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
      averageDailyUsage,
      currentStock: ingredient.currentStock,
      estimatedDaysRemaining,
      recommendedReorderQuantity,
      reorderUrgency: urgency,
    });
  }

  // Sort by urgency and days remaining
  predictions.sort((a, b) => {
    const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    if (urgencyOrder[a.reorderUrgency] !== urgencyOrder[b.reorderUrgency]) {
      return urgencyOrder[a.reorderUrgency] - urgencyOrder[b.reorderUrgency];
    }
    return a.estimatedDaysRemaining - b.estimatedDaysRemaining;
  });

  return predictions;
}

export async function getIngredientUsageReport(ingredientId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const movements = await prisma.stockMovement.findMany({
    where: {
      ingredientId,
      createdAt: {
        gte: startDate,
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const outMovements = movements.filter((m) => m.type === "OUT");
  const inMovements = movements.filter((m) => m.type === "IN");

  const totalUsed = outMovements.reduce((sum, m) => sum + m.quantity, 0);
  const totalAdded = inMovements.reduce((sum, m) => sum + m.quantity, 0);
  const averageDailyUsage = totalUsed / days;

  // Group by day for trend analysis
  const dailyUsage: { date: string; quantity: number }[] = [];
  const usageByDate = new Map<string, number>();

  outMovements.forEach((movement) => {
    const dateKey = movement.createdAt.toISOString().split("T")[0];
    usageByDate.set(dateKey, (usageByDate.get(dateKey) || 0) + movement.quantity);
  });

  // Fill in missing days with 0
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const dateKey = date.toISOString().split("T")[0];
    dailyUsage.push({
      date: dateKey,
      quantity: usageByDate.get(dateKey) || 0,
    });
  }

  return {
    totalUsed,
    totalAdded,
    averageDailyUsage,
    dailyUsage,
    movements,
  };
}

export async function getCostOptimizationSuggestions(restaurantId: string) {
  const ingredients = await prisma.ingredient.findMany({
    where: { restaurantId },
    include: {
      supplier: true,
      stockMovements: {
        where: {
          type: "OUT",
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      },
    },
  });

  const suggestions: {
    ingredient: string;
    currentCost: number;
    suggestedAction: string;
    potentialSavings: number;
  }[] = [];

  for (const ingredient of ingredients) {
    const totalUsed = ingredient.stockMovements.reduce((sum, m) => sum + m.quantity, 0);
    
    if (totalUsed === 0) continue;

    const monthlyCost = totalUsed * ingredient.costPerUnit;
    
    // Suggest bulk ordering if usage is high
    if (totalUsed > 100 && ingredient.costPerUnit > 0) {
      const bulkDiscount = 0.1; // Assume 10% discount for bulk
      const potentialSavings = monthlyCost * bulkDiscount;
      
      suggestions.push({
        ingredient: ingredient.name,
        currentCost: monthlyCost,
        suggestedAction: "Consider bulk ordering for volume discount",
        potentialSavings,
      });
    }

    // Suggest alternative suppliers if cost is high
    if (monthlyCost > 1000) {
      suggestions.push({
        ingredient: ingredient.name,
        currentCost: monthlyCost,
        suggestedAction: "Review supplier pricing and negotiate better rates",
        potentialSavings: monthlyCost * 0.05, // Assume 5% savings
      });
    }
  }

  return suggestions.sort((a, b) => b.potentialSavings - a.potentialSavings);
}
