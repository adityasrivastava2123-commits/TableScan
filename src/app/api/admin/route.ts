import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { Plan, SubscriptionStatus } from "@prisma/client";

async function checkAuth() {
  try {
    const { userId } = await auth();
    if (userId) {
      const dbUser = await prisma.user.findUnique({
        where: { clerkId: userId },
      });
      const isSuperAdmin = 
        dbUser?.email === "superadmin@serveaura.com" || 
        (process.env.SUPERADMIN_ID && dbUser?.clerkId === process.env.SUPERADMIN_ID);
      if (isSuperAdmin) return true;
    }
  } catch (error) {
    // Ignore error if auth() is called outside dynamic/request scope
  }
  const cookieStore = await cookies();
  return !!cookieStore.get("sa_token")?.value;
}

export async function GET() {
  try {
    if (!(await checkAuth())) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Platform-wide counts
    const [userCount, restaurantCount, orderCount, menuItemCount] = await Promise.all([
      prisma.user.count(),
      prisma.restaurant.count(),
      prisma.order.count(),
      prisma.menuItem.count(),
    ]);

    // Sum of successful orders/payments
    const ordersAggregation = await prisma.order.aggregate({
      _sum: {
        totalAmount: true
      }
    });
    const totalVolume = ordersAggregation._sum.totalAmount || 0;

    // Fetch all registered restaurants with complete details
    const restaurantsList = await prisma.restaurant.findMany({
      include: {
        owner: {
          select: {
            name: true,
            email: true
          }
        },
        locations: {
          select: {
            id: true
          }
        },
        subscription: {
          select: {
            plan: true,
            status: true
          }
        },
        _count: {
          select: {
            menuItems: true,
            orders: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    const restaurants = restaurantsList.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      ownerName: r.owner?.name || "N/A",
      ownerEmail: r.owner?.email || "N/A",
      locationsCount: r.locations.length,
      menuItemsCount: r._count.menuItems,
      ordersCount: r._count.orders,
      plan: r.subscription?.plan || "STARTER",
      status: r.subscription?.status || "ACTIVE"
    }));

    return NextResponse.json({
      stats: {
        users: userCount,
        restaurants: restaurantCount,
        orders: orderCount,
        menuItems: menuItemCount,
        volume: totalVolume
      },
      restaurants
    });
  } catch (error) {
    console.error("Admin fetch failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await checkAuth())) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { restaurantId, plan } = body;

    if (!restaurantId || !plan) {
      return new NextResponse("Missing parameters", { status: 400 });
    }

    // Override or Upsert plan subscription tier
    const sub = await prisma.subscription.upsert({
      where: {
        restaurantId
      },
      update: {
        plan: plan as Plan,
        status: SubscriptionStatus.ACTIVE
      },
      create: {
        restaurantId,
        plan: plan as Plan,
        status: SubscriptionStatus.ACTIVE
      }
    });

    return NextResponse.json(sub);
  } catch (error) {
    console.error("Admin override failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
