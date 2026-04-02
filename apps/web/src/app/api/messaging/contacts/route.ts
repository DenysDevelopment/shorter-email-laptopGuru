import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@laptopguru-crm/shared";
import type { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const { session, error } = await authorize(PERMISSIONS.MESSAGING_CONTACTS_READ);
  if (error) return error;

  const url = request.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit")) || 25));
  const search = url.searchParams.get("search");

  const where: Prisma.ContactWhereInput = { companyId: session.user.companyId ?? "" };

  if (search) {
    where.OR = [
      { displayName: { contains: search, mode: "insensitive" } },
      { company: { contains: search, mode: "insensitive" } },
      {
        channels: {
          some: { identifier: { contains: search, mode: "insensitive" } },
        },
      },
    ];
  }

  const contacts = await prisma.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
    include: {
      channels: {
        select: { channelType: true, identifier: true },
      },
      _count: {
        select: { conversations: true },
      },
    },
  });

  const emailType = "EMAIL";
  const phoneTypes = ["SMS", "WHATSAPP"];

  const items = contacts.map((c) => {
    const emailCh = c.channels.find((ch) => ch.channelType === emailType);
    const phoneCh = c.channels.find((ch) => phoneTypes.includes(ch.channelType));

    return {
      id: c.id,
      name: c.displayName,
      email: emailCh?.identifier || null,
      phone: phoneCh?.identifier || null,
      avatarUrl: c.avatarUrl,
      company: c.company,
      channels: c.channels.map((ch) => ({
        type: ch.channelType,
        externalId: ch.identifier,
      })),
      conversationCount: c._count.conversations,
      createdAt: c.createdAt,
    };
  });

  return NextResponse.json({ items });
}
