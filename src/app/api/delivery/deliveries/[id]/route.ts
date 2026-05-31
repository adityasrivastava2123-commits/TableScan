import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH update delivery
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, driverId, notes } = body;

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      
      // Update timestamps based on status
      if (status === "ASSIGNED" || status === "PICKED_UP") {
        updateData.pickupTime = new Date();
      } else if (status === "DELIVERED") {
        updateData.deliveryTime = new Date();
      }
    }
    if (driverId !== undefined) updateData.driverId = driverId;
    if (notes) updateData.notes = notes;

    const delivery = await prisma.delivery.update({
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
        driver: true,
      },
    });

    return NextResponse.json(delivery);
  } catch (error) {
    console.error("Error updating delivery:", error);
    return NextResponse.json({ error: "Failed to update delivery" }, { status: 500 });
  }
}

// DELETE delivery
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.delivery.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting delivery:", error);
    return NextResponse.json({ error: "Failed to delete delivery" }, { status: 500 });
  }
}
