import { NextResponse } from "next/server";
import { getBroadcast } from "@/lib/superadmin-store";

// Public read-only endpoint — no superadmin auth needed.
// Any authenticated restaurant dashboard can poll this to show banners.
export async function GET() {
  const broadcast = getBroadcast();
  return NextResponse.json(broadcast);
}
