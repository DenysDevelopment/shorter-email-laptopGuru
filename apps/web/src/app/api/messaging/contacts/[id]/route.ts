import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@laptopguru-crm/shared";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await authorize(PERMISSIONS.MESSAGING_CONTACTS_READ);
  if (error) return error;

  const { id } = await params;

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: {
      channels: {
        select: { channelType: true, identifier: true },
      },
      customFields: {
        select: { fieldName: true, fieldValue: true },
      },
      conversations: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          channel: { select: { type: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { body: true, createdAt: true },
          },
        },
      },
    },
  });

  if (!contact) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (contact.companyId !== (session.user.companyId ?? "")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const emailCh = contact.channels.find((ch) => ch.channelType === "EMAIL");
  const phoneCh = contact.channels.find(
    (ch) => ch.channelType === "SMS" || ch.channelType === "WHATSAPP",
  );

  const customFields: Record<string, string> = {};
  for (const cf of contact.customFields) {
    customFields[cf.fieldName] = cf.fieldValue;
  }

  return NextResponse.json({
    id: contact.id,
    name: contact.displayName,
    email: emailCh?.identifier || null,
    phone: phoneCh?.identifier || null,
    avatarUrl: contact.avatarUrl,
    company: contact.company,
    channels: contact.channels.map((ch) => ({
      type: ch.channelType,
      externalId: ch.identifier,
    })),
    customFields,
    conversations: contact.conversations.map((conv) => ({
      id: conv.id,
      status: conv.status,
      channelType: conv.channel.type,
      lastMessageAt: conv.lastMessageAt,
      lastMessagePreview: conv.messages[0]?.body?.slice(0, 120) || null,
      createdAt: conv.createdAt,
    })),
    createdAt: contact.createdAt,
  });
}
