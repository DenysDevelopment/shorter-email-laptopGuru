import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@laptopguru-crm/shared";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await authorize(PERMISSIONS.MESSAGING_TEMPLATES_WRITE);
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.msgQuickReply.findUnique({ where: { id } });
  if (!existing || existing.companyId !== (session.user.companyId ?? "")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.shortcut) data.shortcut = body.shortcut.trim();
  if (body.title) data.title = body.title.trim();
  if (body.body) data.body = body.body.trim();

  const quickReply = await prisma.msgQuickReply.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    id: quickReply.id,
    shortcut: quickReply.shortcut,
    title: quickReply.title,
    body: quickReply.body,
    createdAt: quickReply.createdAt,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await authorize(PERMISSIONS.MESSAGING_TEMPLATES_WRITE);
  if (error) return error;

  const { id } = await params;

  const existing = await prisma.msgQuickReply.findUnique({ where: { id } });
  if (!existing || existing.companyId !== (session.user.companyId ?? "")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.msgQuickReply.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
