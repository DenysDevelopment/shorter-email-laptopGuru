import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { timingSafeEqual } from "crypto";

/** Timing-safe comparison to prevent timing attacks on invite code */
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name, inviteCode } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email и пароль обязательны" },
        { status: 400 }
      );
    }

    // Validate email format
    if (typeof email !== "string" || !EMAIL_REGEX.test(email) || email.length > 255) {
      return NextResponse.json(
        { error: "Некорректный email" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Пароль должен быть минимум ${MIN_PASSWORD_LENGTH} символов` },
        { status: 400 }
      );
    }

    if (password.length > 128) {
      return NextResponse.json(
        { error: "Пароль слишком длинный" },
        { status: 400 }
      );
    }

    // Check invite code (timing-safe comparison)
    const requiredCode = process.env.INVITE_CODE;
    if (requiredCode) {
      if (!inviteCode || !safeCompare(String(inviteCode), requiredCode)) {
        return NextResponse.json(
          { error: "Неверный код приглашения" },
          { status: 403 }
        );
      }
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: typeof name === "string" ? name.trim().slice(0, 255) : null,
        passwordHash,
      },
    });

    return NextResponse.json(
      { id: user.id, email: user.email },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Ошибка сервера" },
      { status: 500 }
    );
  }
}
