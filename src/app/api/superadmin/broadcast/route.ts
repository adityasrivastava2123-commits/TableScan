import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getBroadcast, setBroadcast } from "@/lib/superadmin-store";

async function checkAuth() {
  const cookieStore = await cookies();
  return !!cookieStore.get("sa_token")?.value;
}

export async function GET() {
  if (!(await checkAuth())) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json(getBroadcast());
}

export async function POST(req: Request) {
  if (!(await checkAuth())) return new NextResponse("Unauthorized", { status: 401 });
  const body = await req.json();
  setBroadcast(body);
  return NextResponse.json(getBroadcast());
}
