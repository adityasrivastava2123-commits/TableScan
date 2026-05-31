import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH update order preparation status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { stage, priority, notes } = body;

    const updateData: any = {};
    if (stage) {
      updateData.stage = stage;
      
      // Update timestamps based on stage
      if (stage === "PREPARING" && !updateData.startedAt) {
        updateData.startedAt = new Date();
      } else if (stage === "READY" || stage === "SERVED") {
        updateData.completedAt = new Date();
        
        // Calculate actual prep time
        const preparation = await prisma.orderPreparation.findUnique({
          where: { id: params.id },
        });
        if (preparation && preparation.startedAt) {
          const prepTime = Math.floor((new Date().getTime() - preparation.startedAt.getTime()) / 60000); // minutes
          updateData.actualPrepTime = prepTime;
        }
      }
    }
    if (priority) updateData.priority = priority;
    if (notes) updateData.notes = notes;

    const preparation = await prisma.orderPreparation.update({
      where: { id: params.id },
      data: updateData,
      include: {
        order: {
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(preparation);
  } catch (error) {
    console.error("Error updating order preparation:", error);
    return NextResponse.json({ error: "Failed to update order preparation" }, { status: 500 });
  }
}

// DELETE order preparation
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.orderPreparation.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting order preparation:", error);
    return NextResponse.json({ error: "Failed to delete order preparation" }, { status: 500 });
  }
}
