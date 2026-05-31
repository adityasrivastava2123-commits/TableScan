import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET single ingredient
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ingredient = await prisma.ingredient.findUnique({
      where: { id: params.id },
      include: { supplier: true, stockMovements: true },
    });

    if (!ingredient) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
    }

    return NextResponse.json(ingredient);
  } catch (error) {
    console.error("Error fetching ingredient:", error);
    return NextResponse.json({ error: "Failed to fetch ingredient" }, { status: 500 });
  }
}

// PUT update ingredient
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, unit, category, minStock, currentStock, costPerUnit, supplierId } = body;

    const ingredient = await prisma.ingredient.update({
      where: { id: params.id },
      data: {
        name,
        description,
        unit,
        category,
        minStock,
        currentStock,
        costPerUnit,
        supplierId,
      },
      include: { supplier: true },
    });

    return NextResponse.json(ingredient);
  } catch (error) {
    console.error("Error updating ingredient:", error);
    return NextResponse.json({ error: "Failed to update ingredient" }, { status: 500 });
  }
}

// DELETE ingredient
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.ingredient.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting ingredient:", error);
    return NextResponse.json({ error: "Failed to delete ingredient" }, { status: 500 });
  }
}
