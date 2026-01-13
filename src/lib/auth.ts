import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    ...(process.env.ENABLE_CREDENTIALS_AUTH === "true"
      ? [
          Credentials({
            name: "Email & Password",
            credentials: {
              email: { label: "Email", type: "email" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              const email = credentials?.email?.toLowerCase();
              const password = credentials?.password ?? "";
              if (!email || !password) return null;
              const user = await prisma.user.findUnique({ where: { email } });
              if (!user?.passwordHash) return null;
              if (!user.emailVerified) {
                throw new Error("EMAIL_NOT_VERIFIED");
              }
              const isValid = await bcrypt.compare(password, user.passwordHash);
              if (!isValid) return null;
              return { id: user.id, email: user.email, name: user.name };
            },
          }),
        ]
      : []),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user && user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};
