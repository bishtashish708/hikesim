import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
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
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
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

        // Admin login bypass - check for special admin credentials
        const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
        const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

        if (ADMIN_EMAIL && ADMIN_PASSWORD && email === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
          // Check if admin user exists, create if not
          let adminUser = await prisma.user.findUnique({
            where: { email: ADMIN_EMAIL },
          });

          if (!adminUser) {
            const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 10);
            adminUser = await prisma.user.create({
              data: {
                email: ADMIN_EMAIL,
                name: "Admin",
                passwordHash: hashedPassword,
                isAdmin: true,
                emailVerified: new Date(),
              },
            });
          } else if (!adminUser.isAdmin) {
            // Ensure admin flag is set
            adminUser = await prisma.user.update({
              where: { id: adminUser.id },
              data: { isAdmin: true },
            });
          }

          return {
            id: adminUser.id,
            name: adminUser.name ?? undefined,
            email: adminUser.email ?? undefined,
          };
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
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle Google OAuth sign-in
      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          // Create new user for Google OAuth
          await prisma.user.create({
            data: {
              email,
              name: user.name || undefined,
              image: user.image || undefined,
              emailVerified: new Date(), // Google emails are pre-verified
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // Add user ID and admin status to token
      if (user) {
        token.id = user.id;
        // Fetch admin status from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { isAdmin: true },
        });
        token.isAdmin = dbUser?.isAdmin || false;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user ID and admin status to session
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
