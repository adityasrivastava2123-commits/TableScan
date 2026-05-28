import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ message: "Restaurants API placeholder" });
}

export async function POST() {
  return NextResponse.json(
    { message: "Create restaurant placeholder" },
    { status: 201 },
  );
}
