import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json(
        { error: "restaurantId required" },
        { status: 400 }
      );
    }

    // Verify restaurant ownership
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const restaurant = await prisma.restaurant.findFirst({
      where: {
        id: restaurantId,
        ownerId: user.id,
      },
    });

    if (!restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found or unauthorized" },
        { status: 403 }
      );
    }

    // Fetch all orders, reservations, queue entries, and waitlists for CRM aggregation
    const [orders, reservations, waitlist, queue] = await Promise.all([
      prisma.order.findMany({
        where: { restaurantId },
        include: {
          items: {
            include: {
              menuItem: {
                select: { name: true },
              },
            },
          },
          table: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.reservation.findMany({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.waitlist.findMany({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.queueEntry.findMany({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Grouping by a key: prioritizing phone number, then falling back to customerName
    const customerMap = new Map<string, {
      name: string;
      phone: string;
      email: string;
      orders: any[];
      reservations: any[];
      waitlistEntries: any[];
      queueEntries: any[];
      totalSpend: number;
      lastVisit: Date;
    }>();

    const getCleanPhone = (phone?: string | null) => {
      if (!phone) return "";
      return phone.trim().replace(/[\s\-\+\(\)]/g, "");
    };

    const getCustomerKey = (name?: string | null, phone?: string | null) => {
      const cleanPhone = getCleanPhone(phone);
      if (cleanPhone) return `phone-${cleanPhone}`;
      if (name) return `name-${name.trim().toLowerCase()}`;
      return null;
    };

    const getOrCreateProfile = (name: string, phone: string, email: string) => {
      const key = getCustomerKey(name, phone);
      if (!key) return null;

      if (!customerMap.has(key)) {
        customerMap.set(key, {
          name: name.trim(),
          phone: phone?.trim() || "",
          email: email?.trim() || "",
          orders: [],
          reservations: [],
          waitlistEntries: [],
          queueEntries: [],
          totalSpend: 0,
          lastVisit: new Date(0),
        });
      }

      const profile = customerMap.get(key)!;
      if (!profile.name && name) {
        profile.name = name.trim();
      }
      if (!profile.phone && phone) {
        profile.phone = phone.trim();
      }
      if (!profile.email && email) {
        profile.email = email.trim();
      }
      return profile;
    };

    // 1. Process Orders
    for (const order of orders) {
      if (!order.customerName && !order.customerPhone) continue;
      const profile = getOrCreateProfile(
        order.customerName || "Walk-in Customer",
        order.customerPhone || "",
        ""
      );

      if (profile) {
        profile.orders.push({
          id: order.id,
          orderNumber: order.orderNumber,
          totalAmount: order.totalAmount,
          status: order.status,
          createdAt: order.createdAt,
          itemsCount: order.items.length,
          items: order.items.map(item => ({
            name: item.menuItem?.name || "Unknown item",
            quantity: item.quantity,
            price: item.price,
          })),
        });
        if (order.status !== "CANCELLED") {
          profile.totalSpend += order.totalAmount;
        }
        const orderDate = new Date(order.createdAt);
        if (orderDate > profile.lastVisit) {
          profile.lastVisit = orderDate;
        }
      }
    }

    // 2. Process Reservations
    for (const res of reservations) {
      const profile = getOrCreateProfile(
        res.customerName,
        res.customerPhone,
        res.customerEmail || ""
      );

      if (profile) {
        profile.reservations.push({
          id: res.id,
          date: res.date,
          partySize: res.partySize,
          status: res.status,
          createdAt: res.createdAt,
        });
        const resDate = new Date(res.date);
        if (resDate > profile.lastVisit) {
          profile.lastVisit = resDate;
        }
      }
    }

    // 3. Process Waitlist
    for (const entry of waitlist) {
      const profile = getOrCreateProfile(
        entry.customerName,
        entry.customerPhone,
        ""
      );

      if (profile) {
        profile.waitlistEntries.push({
          id: entry.id,
          partySize: entry.partySize,
          status: entry.status,
          createdAt: entry.createdAt,
        });
        const entryDate = new Date(entry.createdAt);
        if (entryDate > profile.lastVisit) {
          profile.lastVisit = entryDate;
        }
      }
    }

    // 4. Process Queue
    for (const entry of queue) {
      const profile = getOrCreateProfile(
        entry.customerName,
        entry.customerPhone,
        ""
      );

      if (profile) {
        profile.queueEntries.push({
          id: entry.id,
          partySize: entry.partySize,
          status: entry.status,
          createdAt: entry.createdAt,
        });
        const entryDate = new Date(entry.createdAt);
        if (entryDate > profile.lastVisit) {
          profile.lastVisit = entryDate;
        }
      }
    }

    // Convert aggregated map to array and assign Loyalty Tiers
    const customersList = Array.from(customerMap.values()).map(profile => {
      let loyaltyTier: "VIP" | "Regular" | "New" = "New";
      if (profile.totalSpend >= 5000) {
        loyaltyTier = "VIP";
      } else if (profile.totalSpend >= 1000) {
        loyaltyTier = "Regular";
      }

      const totalVisits = profile.orders.length + profile.reservations.length;

      return {
        name: profile.name || "Unnamed Customer",
        phone: profile.phone || "N/A",
        email: profile.email || "N/A",
        totalSpend: profile.totalSpend,
        totalVisits,
        loyaltyTier,
        lastVisit: profile.lastVisit.getTime() > 0 ? profile.lastVisit : null,
        orders: profile.orders,
        reservations: profile.reservations,
        waitlist: profile.waitlistEntries,
        queue: profile.queueEntries,
      };
    });

    // Sort list by total spend descending by default
    customersList.sort((a, b) => b.totalSpend - a.totalSpend);

    return NextResponse.json(customersList);
  } catch (error) {
    console.error("Customers API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers list" },
      { status: 500 }
    );
  }
}
