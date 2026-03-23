import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const filter = searchParams.get("filter") || "all";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const perPage = 20;

  const where =
    filter === "new"
      ? { processed: false, archived: false }
      : filter === "processed"
        ? { processed: true, archived: false }
        : filter === "archived"
          ? { archived: true }
          : { archived: false };

  const [emails, total] = await Promise.all([
    prisma.incomingEmail.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.incomingEmail.count({ where }),
  ]);

  return NextResponse.json({
    emails,
    total,
    page,
    totalPages: Math.ceil(total / perPage),
  });
}
