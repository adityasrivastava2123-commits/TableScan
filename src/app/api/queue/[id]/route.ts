import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PATCH update queue entry
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { status, notes } = body;

    const updateData: any = {};
    if (status) {
      updateData.status = status;
      
      // Update timestamps based on status
      if (status === "CALLED") {
        updateData.calledAt = new Date();
      } else if (status === "SEATED") {
        updateData.seatedAt = new Date();
        
        // Calculate actual wait time
        const queueEntry = await prisma.queueEntry.findUnique({
          where: { id: params.id },
        });
        if (queueEntry && queueEntry.createdAt) {
          const waitTime = Math.floor((new Date().getTime() - queueEntry.createdAt.getTime()) / 60000); // minutes
          updateData.actualWaitTime = waitTime;
        }
      }
    }
    if (notes) updateData.notes = notes;

    const queueEntry = await prisma.queueEntry.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(queueEntry);
  } catch (error) {
    console.error("Error updating queue entry:", error);
    return NextResponse.json({ error: "Failed to update queue entry" }, { status: 500 });
  }
}

// DELETE queue entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.queueEntry.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting queue entry:", error);
    return NextResponse.json({ error: "Failed to delete queue entry" }, { status: 500 });
  }
}
