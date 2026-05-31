import { prisma } from "@/lib/prisma";

interface DeliveryPoint {
  id: string;
  address: string;
  lat?: number;
  lng?: number;
  priority: number; // 1-5, higher is more urgent
}

interface OptimizedRoute {
  deliveryIds: string[];
  totalDistance: number; // km
  estimatedTime: number; // minutes
  sequence: DeliveryPoint[];
}

export async function optimizeDeliveryRoute(
  restaurantId: string,
  driverId?: string
): Promise<OptimizedRoute> {
  // Get pending deliveries
  const deliveries = await prisma.delivery.findMany({
    where: {
      restaurantId,
      status: "PENDING",
      ...(driverId && { driverId }),
    },
    include: {
      order: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (deliveries.length === 0) {
    return {
      deliveryIds: [],
      totalDistance: 0,
      estimatedTime: 0,
      sequence: [],
    };
  }

  // Convert to delivery points
  const deliveryPoints: DeliveryPoint[] = deliveries.map((d) => ({
    id: d.id,
    address: d.deliveryAddress,
    priority: d.order.totalAmount > 1000 ? 5 : d.order.totalAmount > 500 ? 3 : 1,
  }));

  // Simple nearest neighbor algorithm for route optimization
  const optimizedSequence = nearestNeighborRoute(deliveryPoints);

  // Calculate total distance and time
  let totalDistance = 0;
  for (let i = 0; i < optimizedSequence.length - 1; i++) {
    const distance = await calculateDistance(
      optimizedSequence[i].address,
      optimizedSequence[i + 1].address
    );
    totalDistance += distance;
  }

  // Estimate time (assuming 30 km/h average speed in city)
  const estimatedTime = Math.round((totalDistance / 30) * 60);

  return {
    deliveryIds: optimizedSequence.map((p) => p.id),
    totalDistance: Math.round(totalDistance * 10) / 10,
    estimatedTime,
    sequence: optimizedSequence,
  };
}

function nearestNeighborRoute(points: DeliveryPoint[]): DeliveryPoint[] {
  if (points.length === 0) return [];
  if (points.length === 1) return points;

  const unvisited = [...points];
  const route: DeliveryPoint[] = [unvisited.shift()!];

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let minDistance = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const distance = calculateDistance(
        route[route.length - 1].address,
        unvisited[i].address
      );
      
      // Adjust distance by priority (higher priority = lower effective distance)
      const priority = Number(unvisited[i].priority) || 1;
      const adjustedDistance = distance / priority;

      if (adjustedDistance < minDistance) {
        minDistance = adjustedDistance;
        nearestIndex = i;
      }
    }

    route.push(unvisited[nearestIndex]);
    unvisited.splice(nearestIndex, 1);
  }

  return route;
}

async function calculateDistance(address1: string, address2: string): Promise<number> {
  // In production, use Google Maps API or similar for accurate distances
  // For now, use a simple heuristic based on address similarity
  
  // Extract postal codes or area codes if available
  const code1 = extractPostalCode(address1);
  const code2 = extractPostalCode(address2);

  if (code1 && code2 && code1 === code2) {
    return 1; // Same area, ~1 km
  }

  // Random distance between 1-5 km for demo
  return 1 + Math.random() * 4;
}

function extractPostalCode(address: string): string | null {
  // Simple regex to extract postal code (adjust based on your address format)
  const match = address.match(/\d{6}/);
  return match ? match[0] : null;
}

export async function assignOptimalDriver(deliveryId: string): Promise<string | null> {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      order: true,
    },
  });

  if (!delivery) return null;

  // Get available drivers
  const availableDrivers = await prisma.driver.findMany({
    where: {
      restaurantId: delivery.restaurantId,
      isAvailable: true,
    },
    include: {
      deliveries: {
        where: {
          status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] },
        },
      },
    },
  });

  if (availableDrivers.length === 0) return null;

  // Score drivers based on:
  // 1. Current load (fewer active deliveries = better)
  // 2. Rating (higher rating = better)
  // 3. Total deliveries (more experience = better)

  const scoredDrivers = availableDrivers.map((driver) => {
    const currentLoad = driver.deliveries.length;
    const loadScore = Math.max(0, 5 - currentLoad); // 0-5
    const ratingScore = driver.rating; // 0-5
    const experienceScore = Math.min(5, driver.totalDeliveries / 10); // 0-5

    const totalScore = loadScore * 0.4 + ratingScore * 0.3 + experienceScore * 0.3;

    return {
      driver,
      score: totalScore,
    };
  });

  // Sort by score and return best driver
  scoredDrivers.sort((a, b) => b.score - a.score);

  return scoredDrivers[0]?.driver.id || null;
}

export async function getDeliveryAnalytics(restaurantId: string, days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const deliveries = await prisma.delivery.findMany({
    where: {
      restaurantId,
      createdAt: {
        gte: startDate,
      },
    },
    include: {
      driver: true,
    },
  });

  const totalDeliveries = deliveries.length;
  const completedDeliveries = deliveries.filter((d) => d.status === "DELIVERED");
  const cancelledDeliveries = deliveries.filter((d) => d.status === "CANCELLED");

  const averageDeliveryTime = completedDeliveries.length > 0
    ? completedDeliveries.reduce((sum, d) => {
        if (d.pickupTime && d.deliveryTime) {
          return sum + (new Date(d.deliveryTime).getTime() - new Date(d.pickupTime).getTime()) / 60000;
        }
        return sum;
      }, 0) / completedDeliveries.length
    : 0;

  const averageDistance = completedDeliveries.length > 0
    ? completedDeliveries.reduce((sum, d) => sum + (d.distance || 0), 0) / completedDeliveries.length
    : 0;

  const byDriver = new Map<string, { count: number; rating: number }>();
  deliveries.forEach((d) => {
    if (d.driverId) {
      const current = byDriver.get(d.driverId) || { count: 0, rating: 0 };
      byDriver.set(d.driverId, {
        count: current.count + 1,
        rating: d.driver?.rating || 0,
      });
    }
  });

  const topDriver = Array.from(byDriver.entries())
    .sort((a, b) => b[1].count - a[1].count)[0];

  return {
    totalDeliveries,
    completedCount: completedDeliveries.length,
    cancelledCount: cancelledDeliveries.length,
    completionRate: totalDeliveries > 0 ? (completedDeliveries.length / totalDeliveries) * 100 : 0,
    averageDeliveryTime: Math.round(averageDeliveryTime),
    averageDistance: Math.round(averageDistance * 10) / 10,
    topDriver: topDriver ? { id: topDriver[0], ...topDriver[1] } : null,
  };
}
