import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

async function checkAuth() {
  const cookieStore = await cookies();
  return !!cookieStore.get("sa_token")?.value;
}

export async function POST(req: Request) {
  if (!(await checkAuth())) return new NextResponse("Unauthorized", { status: 401 });

  const { query } = await req.json();

  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const trimmed = query.trim().toUpperCase();
  if (!trimmed.startsWith("SELECT")) {
    return NextResponse.json({ error: "Only SELECT queries are permitted in this console." }, { status: 400 });
  }

  // Block dangerous keywords even within SELECT
  const dangerous = ["DROP ", "DELETE ", "UPDATE ", "INSERT ", "TRUNCATE ", "ALTER ", "CREATE "];
  if (dangerous.some((kw) => trimmed.includes(kw))) {
    return NextResponse.json({ error: "Destructive keywords are not allowed." }, { status: 400 });
  }

  try {
    const result = await prisma.$queryRawUnsafe(query + " LIMIT 50") as Record<string, unknown>[];
    const rows = result.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([k, v]) => [
          k,
          v instanceof Date ? v.toISOString() : typeof v === "bigint" ? v.toString() : v,
        ])
      )
    );
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
    return NextResponse.json({ rows, columns, count: rows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Query failed" }, { status: 400 });
  }
}
