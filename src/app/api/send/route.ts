import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/links";
import { createShortLink } from "@/lib/links";
import { sendEmail } from "@/lib/smtp";
import { buildEmailHtml } from "@/lib/email-template";
import type { EmailLanguage } from "@/lib/email-template";

const validLanguages: EmailLanguage[] = ["pl", "uk", "ru", "en"];

const subjectByLang: Record<EmailLanguage, (title: string) => string> = {
  pl: (title) => `Recenzja wideo dla Ciebie — ${title}`,
  uk: (title) => `Відеоогляд для вас — ${title}`,
  ru: (title) => `Видеообзор для вас — ${title}`,
  en: (title) => `Video review for you — ${title}`,
};

const titleByLang: Record<EmailLanguage, (title: string) => string> = {
  pl: (title) => `Recenzja wideo: ${title}`,
  uk: (title) => `Відеоогляд: ${title}`,
  ru: (title) => `Видеообзор: ${title}`,
  en: (title) => `Video review: ${title}`,
};

const fallbackName: Record<EmailLanguage, string> = {
  pl: "Kliencie",
  uk: "Клієнт",
  ru: "Клиент",
  en: "Customer",
};

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { emailId, videoId, personalNote, buyButtonText, language } = body;
  const lang: EmailLanguage = validLanguages.includes(language) ? language : "pl";

  if (!emailId || !videoId) {
    return NextResponse.json(
      { error: "emailId и videoId обязательны" },
      { status: 400 }
    );
  }

  // Fetch the incoming email
  const incomingEmail = await prisma.incomingEmail.findUnique({
    where: { id: emailId },
  });
  if (!incomingEmail || !incomingEmail.customerEmail) {
    return NextResponse.json(
      { error: "Заявка не найдена или нет email клиента" },
      { status: 400 }
    );
  }

  // Fetch video
  const video = await prisma.video.findUnique({
    where: { id: videoId },
  });
  if (!video || !video.active) {
    return NextResponse.json({ error: "Видео не найдено" }, { status: 400 });
  }

  const appUrl = process.env.APP_URL || "http://localhost:3000";

  try {
    // 1. Create landing page
    let slug = generateSlug();
    while (await prisma.landing.findUnique({ where: { slug } })) {
      slug = generateSlug();
    }

    const landing = await prisma.landing.create({
      data: {
        slug,
        title: titleByLang[lang](video.title),
        videoId: video.id,
        productUrl: incomingEmail.productUrl || "",
        buyButtonText: buyButtonText || "Kup teraz",
        personalNote: personalNote || null,
        customerName: incomingEmail.customerName || null,
        productName: incomingEmail.productName || null,
        language: lang,
        emailId: incomingEmail.id,
        userId: session.user.id,
      },
    });

    // 2. Create short link
    const shortCode = await createShortLink(landing.id);
    const shortUrl = `${appUrl}/r/${shortCode}`;
    const landingUrl = `${appUrl}/l/${slug}`;

    // 3. Build and send email
    const html = buildEmailHtml({
      customerName: incomingEmail.customerName || fallbackName[lang],
      videoTitle: video.title,
      thumbnail: video.thumbnail,
      landingUrl: shortUrl,
      personalNote: personalNote || undefined,
      language: lang,
    });

    const subject = subjectByLang[lang](video.title);

    let status = "sent";
    let errorMessage: string | null = null;

    try {
      await sendEmail({
        to: incomingEmail.customerEmail,
        subject,
        html,
      });
    } catch (err) {
      status = "failed";
      errorMessage = err instanceof Error ? err.message : "Send failed";
    }

    // 4. Record sent email
    const sentEmail = await prisma.sentEmail.create({
      data: {
        to: incomingEmail.customerEmail,
        subject,
        landingId: landing.id,
        userId: session.user.id,
        status,
        errorMessage,
      },
    });

    // 5. Mark incoming email as processed
    await prisma.incomingEmail.update({
      where: { id: emailId },
      data: { processed: true, processedById: session.user.id },
    });

    return NextResponse.json({
      landing: { id: landing.id, slug, url: landingUrl },
      shortLink: { code: shortCode, url: shortUrl },
      sentEmail: { id: sentEmail.id, status },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
