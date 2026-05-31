import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET all ingredients for a restaurant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get("restaurantId");

    if (!restaurantId) {
      return NextResponse.json({ error: "Restaurant ID is required" }, { status: 400 });
    }

    const ingredients = await prisma.ingredient.findMany({
      where: { restaurantId },
      include: { supplier: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(ingredients);
  } catch (error) {
    console.error("Error fetching ingredients:", error);
    return NextResponse.json({ error: "Failed to fetch ingredients" }, { status: 500 });
  }
}

// POST create new ingredient
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, unit, category, minStock, currentStock, costPerUnit, supplierId, restaurantId } = body;

    if (!name || !unit || !restaurantId) {
      return NextResponse.json({ error: "Name, unit, and restaurantId are required" }, { status: 400 });
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        description,
        unit,
        category,
        minStock: minStock || 0,
        currentStock: currentStock || 0,
        costPerUnit: costPerUnit || 0,
        supplierId,
        restaurantId,
      },
      include: { supplier: true },
    });

    return NextResponse.json(ingredient, { status: 201 });
  } catch (error) {
    console.error("Error creating ingredient:", error);
    return NextResponse.json({ error: "Failed to create ingredient" }, { status: 500 });
  }
}
