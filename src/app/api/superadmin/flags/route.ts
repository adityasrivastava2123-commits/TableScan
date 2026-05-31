import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getFlags, setFlag } from "@/lib/superadmin-store";

async function checkAuth() {
  const cookieStore = await cookies();
  return !!cookieStore.get("sa_token")?.value;
}

export async function GET() {
  if (!(await checkAuth())) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json({ flags: getFlags() });
}

export async function POST(req: Request) {
  if (!(await checkAuth())) return new NextResponse("Unauthorized", { status: 401 });
  const { id, enabled } = await req.json();
  if (!id || typeof enabled !== "boolean") return new NextResponse("Bad Request", { status: 400 });
  const ok = setFlag(id, enabled);
  if (!ok) return new NextResponse("Flag not found", { status: 404 });
  return NextResponse.json({ flags: getFlags() });
}
