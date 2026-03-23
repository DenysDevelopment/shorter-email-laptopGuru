import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sentEmails = await prisma.sentEmail.findMany({
    orderBy: { sentAt: "desc" },
    include: {
      landing: {
        select: {
          slug: true,
          title: true,
          video: { select: { title: true } },
        },
      },
      sentBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json(sentEmails);
}
