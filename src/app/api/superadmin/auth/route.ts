import { NextResponse } from "next/server";

const SUPERADMIN_ID = process.env.SUPERADMIN_ID!;
const SUPERADMIN_PASS = process.env.SUPERADMIN_PASS!;

export async function POST(req: Request) {
  try {
    const { id, password } = await req.json();

    if (!id || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }

    if (id !== SUPERADMIN_ID || password !== SUPERADMIN_PASS) {
      // Small delay to slow brute-force
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Set a signed session cookie valid for 8 hours
    const token = Buffer.from(`${id}:${Date.now()}`).toString("base64");

    const response = NextResponse.json({ success: true });
    response.cookies.set("sa_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/", // Must be "/" so cookie is sent to /api/* routes too
    });

    return response;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("sa_token", "", { maxAge: 0, path: "/" });
  return response;
}
