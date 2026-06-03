import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH update table service
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, serverId, notes, resolveServiceCall } = body;

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      
      // Update timestamps based on status
      if (status === "OCCUPIED") {
        updateData.seatedAt = new Date();
      } else if (status === "AVAILABLE" || status === "DIRTY") {
        updateData.clearedAt = new Date();
      }
    }
    if (serverId !== undefined) updateData.serverId = serverId;
    if (notes !== undefined) updateData.notes = notes;
    if (resolveServiceCall) {
      updateData.notes = null;
    }

    const tableService = await prisma.tableService.update({
      where: { id: params.id },
      data: updateData,
      include: {
        table: true,
        server: true,
        order: true,
      },
    });

    return NextResponse.json(tableService);
  } catch (error) {
    console.error("Error updating table service:", error);
    return NextResponse.json({ error: "Failed to update table service" }, { status: 500 });
  }
}

// DELETE table service
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.tableService.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting table service:", error);
    return NextResponse.json({ error: "Failed to delete table service" }, { status: 500 });
  }
}
