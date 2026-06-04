import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH update table service
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, serverId, notes, resolveServiceCall, orderId } = body;

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      
      // Update timestamps based on status
      if (status === "OCCUPIED") {
        updateData.seatedAt = new Date();
      } else if (status === "AVAILABLE" || status === "DIRTY") {
        updateData.clearedAt = new Date();
        if (status === "AVAILABLE") {
          updateData.orderId = null;
          updateData.serverId = null;
        }
      }
    }
    if (serverId !== undefined) updateData.serverId = serverId;
    if (orderId !== undefined) updateData.orderId = orderId;
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

    // Sync status to the linked Order if it exists
    if (tableService.orderId && status) {
      let orderStatus: any = null;
      if (status === "PREPARING") orderStatus = "PREPARING";
      if (status === "EATING") orderStatus = "READY";
      if (status === "AVAILABLE" || status === "DIRTY") orderStatus = "DONE";
      
      if (orderStatus) {
        try {
          await prisma.order.update({
            where: { id: tableService.orderId },
            data: { 
              status: orderStatus,
              payment: orderStatus === "DONE" ? {
                update: {
                  status: "SUCCESS"
                }
              } : undefined
            }
          });
        } catch (e) {
          console.error("Failed to sync order status:", e);
        }
      }
    }

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
