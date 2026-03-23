import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const allowedFields = [
    "customerName",
    "customerEmail",
    "customerPhone",
    "productUrl",
    "productName",
    "archived",
    "processed",
  ] as const;

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      data[field] = body[field];
    }
  }

  if (data.processed === true && !data.processedById) {
    data.processedById = session.user.id;
  }

  const email = await prisma.incomingEmail.update({
    where: { id },
    data,
  });

  return NextResponse.json(email);
}
