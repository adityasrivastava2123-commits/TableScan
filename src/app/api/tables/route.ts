import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const tableSchema = z.object({
  name: z.string().min(1),
  capacity: z.number().optional(),
  locationId: z.string(),
});

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get("locationId");

    if (!locationId) return NextResponse.json({ error: "locationId required" }, { status: 400 });

    const tables = await prisma.table.findMany({
      where: { locationId },
      orderBy: { createdAt: "asc" },
      take: 50,
    });

    return NextResponse.json(tables);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const parsed = tableSchema.parse(body);

    // Get the location to find the restaurantId
    const location = await prisma.location.findUnique({
      where: { id: parsed.locationId },
      select: { restaurantId: true },
    });

    if (!location) {
      return NextResponse.json({ error: "Location not found" }, { status: 404 });
    }

    // Create the table
    const table = await prisma.table.create({
      data: {
        name: parsed.name,
        capacity: parsed.capacity,
        locationId: parsed.locationId,
      },
    });

    // Automatically create a table service entry
    await prisma.tableService.create({
      data: {
        tableId: table.id,
        status: "AVAILABLE",
        restaurantId: location.restaurantId,
      },
    });

    return NextResponse.json(table);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create table" }, { status: 500 });
  }
}
