import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@shorterlink/shared";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await authorize(PERMISSIONS.VIDEOS_WRITE);
  if (error) return error;

  const { id } = await params;

  // Soft delete
  try {
    await prisma.video.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Ошибка удаления" }, { status: 500 });
  }
}
