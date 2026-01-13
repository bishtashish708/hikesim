import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const { email } = (await request.json()) as { email?: string };
  const normalized = email?.toLowerCase();
  if (!normalized) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }
  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) {
    return NextResponse.json({ ok: true });
  }
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 1000 * 60 * 60);
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expires },
  });

  console.info(`[auth] password reset token for ${normalized}: ${token}`);

  return NextResponse.json({ ok: true });
}
