import { prisma } from "@/lib/prisma";

interface WaitTimeEstimation {
  estimatedMinutes: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  factors: {
    queueLength: number;
    averageServiceTime: number;
    partySize: number;
    timeOfDay: string;
  };
}

export async function estimateWaitTime(
  restaurantId: string,
  partySize: number,
  type: "DINE_IN" | "TAKEAWAY" | "DELIVERY"
): Promise<WaitTimeEstimation> {
  // Get current queue
  const currentQueue = await prisma.queueEntry.findMany({
    where: {
      restaurantId,
      status: "WAITING",
      type,
    },
    orderBy: { createdAt: "asc" },
  });

  // Get historical data for average service times
  const historicalEntries = await prisma.queueEntry.findMany({
    where: {
      restaurantId,
      type,
      actualWaitTime: { not: null },
      seatedAt: { not: null },
    },
    take: 100,
    orderBy: { createdAt: "desc" },
  });

  const averageServiceTime = historicalEntries.length > 0
    ? historicalEntries.reduce((sum, e) => sum + (e.actualWaitTime || 0), 0) / historicalEntries.length
    : 15; // Default 15 minutes if no data

  // Calculate base wait time based on queue length
  const queueLength = currentQueue.length;
  const baseWaitTime = queueLength * averageServiceTime;

  // Adjust for party size (larger parties take longer)
  const partySizeMultiplier = partySize > 4 ? 1.5 : partySize > 2 ? 1.2 : 1.0;
  const adjustedWaitTime = baseWaitTime * partySizeMultiplier;

  // Adjust for time of day (peak hours)
  const now = new Date();
  const hour = now.getHours();
  const timeOfDayMultiplier = getTimeOfDayMultiplier(hour);
  const finalWaitTime = adjustedWaitTime * timeOfDayMultiplier;

  // Determine confidence based on data availability
  let confidence: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  if (historicalEntries.length >= 50) {
    confidence = "HIGH";
  } else if (historicalEntries.length >= 20) {
    confidence = "MEDIUM";
  }

  return {
    estimatedMinutes: Math.round(finalWaitTime),
    confidence,
    factors: {
      queueLength,
      averageServiceTime: Math.round(averageServiceTime),
      partySize,
      timeOfDay: getTimeOfDayLabel(hour),
    },
  };
}

function getTimeOfDayMultiplier(hour: number): number {
  // Peak hours: 12-2pm (lunch), 7-9pm (dinner)
  if ((hour >= 12 && hour <= 14) || (hour >= 19 && hour <= 21)) {
    return 1.3; // 30% longer during peak
  }
  if ((hour >= 11 && hour <= 15) || (hour >= 18 && hour <= 22)) {
    return 1.1; // 10% longer during semi-peak
  }
  return 1.0; // Normal
}

function getTimeOfDayLabel(hour: number): string {
  if (hour >= 5 && hour < 11) return "Morning";
  if (hour >= 11 && hour < 15) return "Lunch";
  if (hour >= 15 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 22) return "Dinner";
  return "Night";
}

export async function updateQueueEstimations(restaurantId: string) {
  // Update estimated wait times for all waiting entries
  const waitingEntries = await prisma.queueEntry.findMany({
    where: {
      restaurantId,
      status: "WAITING",
    },
  });

  for (const entry of waitingEntries) {
    const estimation = await estimateWaitTime(restaurantId, entry.partySize, entry.type as any);
    
    await prisma.queueEntry.update({
      where: { id: entry.id },
      data: {
        estimatedWaitTime: estimation.estimatedMinutes,
      },
    });
  }

  return waitingEntries.length;
}

export async function getQueueAnalytics(restaurantId: string, days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const entries = await prisma.queueEntry.findMany({
    where: {
      restaurantId,
      createdAt: {
        gte: startDate,
      },
    },
  });

  const totalEntries = entries.length;
  const seatedEntries = entries.filter((e) => e.status === "SEATED");
  const cancelledEntries = entries.filter((e) => e.status === "CANCELLED");

  const averageWaitTime = seatedEntries.length > 0
    ? seatedEntries.reduce((sum, e) => sum + (e.actualWaitTime || 0), 0) / seatedEntries.length
    : 0;

  const averageAccuracy = seatedEntries.length > 0
    ? seatedEntries.filter((e) => {
        if (!e.estimatedWaitTime || !e.actualWaitTime) return false;
        const diff = Math.abs(e.estimatedWaitTime - e.actualWaitTime);
        return diff <= 5; // Within 5 minutes is accurate
      }).length / seatedEntries.length * 100
    : 0;

  const byType = {
    DINE_IN: entries.filter((e) => e.type === "DINE_IN").length,
    TAKEAWAY: entries.filter((e) => e.type === "TAKEAWAY").length,
    DELIVERY: entries.filter((e) => e.type === "DELIVERY").length,
  };

  const byHour = new Array(24).fill(0);
  entries.forEach((e) => {
    const hour = new Date(e.createdAt).getHours();
    byHour[hour]++;
  });

  return {
    totalEntries,
    seatedCount: seatedEntries.length,
    cancelledCount: cancelledEntries.length,
    seatingRate: totalEntries > 0 ? (seatedEntries.length / totalEntries) * 100 : 0,
    averageWaitTime: Math.round(averageWaitTime),
    averageAccuracy: Math.round(averageAccuracy),
    byType,
    byHour,
  };
}
