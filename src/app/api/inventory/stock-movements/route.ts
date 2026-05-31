import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET stock movements for an ingredient
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ingredientId = searchParams.get("ingredientId");

    if (!ingredientId) {
      return NextResponse.json({ error: "Ingredient ID is required" }, { status: 400 });
    }

    const movements = await prisma.stockMovement.findMany({
      where: { ingredientId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(movements);
  } catch (error) {
    console.error("Error fetching stock movements:", error);
    return NextResponse.json({ error: "Failed to fetch stock movements" }, { status: 500 });
  }
}

// POST create stock movement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, quantity, reason, notes, ingredientId } = body;

    if (!type || !quantity || !ingredientId) {
      return NextResponse.json({ error: "Type, quantity, and ingredientId are required" }, { status: 400 });
    }

    // Create stock movement
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
      await prisma.ingredient.update({
        where: { id: ingredientId },
        data: { currentStock: ingredient.currentStock + stockChange },
      });
    }

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    console.error("Error creating stock movement:", error);
    return NextResponse.json({ error: "Failed to create stock movement" }, { status: 500 });
  }
}
