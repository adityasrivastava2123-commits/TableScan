import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ message: "Menu API placeholder" });
}

export async function POST() {
  return NextResponse.json({ message: "Create menu item placeholder" }, { status: 201 });
}
