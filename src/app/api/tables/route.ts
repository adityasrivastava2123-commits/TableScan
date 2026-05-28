import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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

    const table = await prisma.table.create({
      data: {
        name: parsed.name,
        capacity: parsed.capacity,
        locationId: parsed.locationId,
      },
    });

    return NextResponse.json(table);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create table" }, { status: 500 });
  }
}
