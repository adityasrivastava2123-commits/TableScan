import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getErrors, resolveError } from "@/lib/superadmin-store";

async function checkAuth() {
  const cookieStore = await cookies();
  return !!cookieStore.get("sa_token")?.value;
}

export async function GET() {
  if (!(await checkAuth())) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json({ errors: getErrors() });
}

export async function POST(req: Request) {
  if (!(await checkAuth())) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await req.json();
  resolveError(id);
  return NextResponse.json({ errors: getErrors() });
}
