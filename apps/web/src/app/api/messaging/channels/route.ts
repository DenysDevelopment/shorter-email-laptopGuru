import { NextRequest, NextResponse } from "next/server";
import { authorize } from "@/lib/authorize";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@shorterlink/shared";

export async function GET() {
  const { error } = await authorize(PERMISSIONS.MESSAGING_CHANNELS_READ);
  if (error) return error;

  const channels = await prisma.channel.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      config: {
        select: { id: true, key: true, value: true, isSecret: true },
      },
    },
  });

  // Mask secret values
  const masked = channels.map((ch) => ({
    ...ch,
    config: ch.config.map((c) => ({
      ...c,
      value: c.isSecret ? "••••••••" : c.value,
    })),
  }));

  return NextResponse.json(masked);
}

export async function POST(request: NextRequest) {
  const { error } = await authorize(PERMISSIONS.MESSAGING_CHANNELS_WRITE);
  if (error) return error;

  const body = await request.json();
  const { name, type, isActive, config } = body;

  const ALLOWED_TYPES = ["EMAIL", "SMS", "WHATSAPP", "TELEGRAM", "FACEBOOK_MESSENGER", "INSTAGRAM_DIRECT"];

  if (!name || !type) {
    return NextResponse.json(
      { error: "name и type обязательны" },
      { status: 400 },
    );
  }

  if (typeof name !== "string" || name.length > 200) {
    return NextResponse.json({ error: "name: max 200 characters" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: `type must be one of: ${ALLOWED_TYPES.join(", ")}` }, { status: 400 });
  }

  if (config && Array.isArray(config)) {
    if (config.length > 20) {
      return NextResponse.json({ error: "config: max 20 entries" }, { status: 400 });
    }
    for (const c of config) {
      if (typeof c.key !== "string" || c.key.length > 100 || typeof c.value !== "string" || c.value.length > 2000) {
        return NextResponse.json({ error: "config: key max 100 chars, value max 2000 chars" }, { status: 400 });
      }
    }
  }

  const channel = await prisma.channel.create({
    data: {
      name,
      type,
      isActive: isActive ?? true,
      ...(config && config.length > 0
        ? {
            config: {
              create: config.map((c: { key: string; value: string; isSecret?: boolean }) => ({
                key: c.key,
                value: c.value,
                isSecret: c.isSecret ?? false,
              })),
            },
          }
        : {}),
    },
    include: {
      config: {
        select: { id: true, key: true, value: true, isSecret: true },
      },
    },
  });

  // Auto-register Telegram webhook
  if (type === "TELEGRAM") {
    const botToken = config?.find((c: { key: string }) => c.key === "bot_token")?.value;
    if (botToken) {
      const appUrl = process.env.APP_URL || "";
      const webhookUrl = `${appUrl}/api/messaging/webhooks/telegram`;
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${botToken}/setWebhook`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: webhookUrl }),
          },
        );
        const result = await res.json();
        if (!result.ok) console.error("[Telegram] setWebhook failed:", result.description);

        // Save webhook URL to config
        await prisma.channelConfig.create({
          data: {
            channelId: channel.id,
            key: "webhook_url",
            value: webhookUrl,
          },
        });
      } catch (err) {
        console.error("[Telegram] Failed to set webhook:", err);
      }
    }
  }

  return NextResponse.json(channel, { status: 201 });
}
