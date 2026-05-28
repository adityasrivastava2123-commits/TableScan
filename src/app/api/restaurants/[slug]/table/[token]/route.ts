import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string; token: string } }
) {
  try {
    const table = await prisma.table.findUnique({
      where: { qrToken: params.token },
      include: { location: { include: { restaurant: true } } },
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    return NextResponse.json(table);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch table" }, { status: 500 });
  }
}