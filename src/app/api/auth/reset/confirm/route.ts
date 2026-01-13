import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const { token, password } = (await request.json()) as { token?: string; password?: string };
  if (!token || !password || password.length < 8) {
    return NextResponse.json({ error: "Invalid token or password." }, { status: 400 });
  }
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.expires < new Date()) {
    return NextResponse.json({ error: "Token is invalid or expired." }, { status: 400 });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash },
  });
  await prisma.passwordResetToken.delete({ where: { token } });
  return NextResponse.json({ ok: true });
}
