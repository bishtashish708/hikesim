import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip: string) {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now - entry.lastAttempt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
    return false;
  }

  if (entry.count >= MAX_ATTEMPTS) {
    entry.lastAttempt = now;
    loginAttempts.set(ip, entry);
    return true;
  }

  entry.count += 1;
  entry.lastAttempt = now;
  loginAttempts.set(ip, entry);
  return false;
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  debug: false,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password ?? "";

        if (!email || !password) {
          return null;
        }

        let ip = "unknown";
        try {
          const headers = req?.headers as
            | Headers
            | Record<string, string | string[] | undefined>
            | undefined;
          const forwarded =
            typeof (headers as Headers | undefined)?.get === "function"
              ? (headers as Headers).get("x-forwarded-for")
              : (headers as Record<string, string | string[] | undefined> | undefined)?.[
                  "x-forwarded-for"
                ];
          const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
          ip = value?.split(",")[0]?.trim() ?? "unknown";
        } catch (error) {
          console.error("[auth] Failed to read forwarded headers", error);
        }

        if (isRateLimited(ip)) {
          console.warn("[auth] Rate limit triggered for", ip);
          throw new Error("Too many login attempts. Please try again later.");
        }

        let user;
        try {
          user = await prisma.user.findUnique({
            where: { email },
          });
        } catch (error) {
          throw error;
        }

        if (!user?.passwordHash) {
          return null;
        }

        const isValid = bcrypt.compareSync(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name ?? undefined,
          email: user.email ?? undefined,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
