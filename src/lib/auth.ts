import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import { getServerSession as _getServerSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter } from "next-auth/adapters";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { env } from "./env";

/**
 * NextAuth configuration.
 * SECURITY NOTES:
 *  - Credentials provider hashes passwords with bcrypt (cost 12).
 *  - JWT strategy keeps session data out of the database for speed;
 *    switch to "database" strategy if you need server-side revocation.
 *  - The session callback only exposes the user id, email, name, and image —
 *    no sensitive fields (passwordHash, tokens, etc.).
 *  - Google/Apple OAuth create accounts via PrismaAdapter.
 *  - OAuth users get an auto-created Profile with defaults on first sign-in.
 */

const loginSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  password: z.string().min(8).max(128),
});

// Build providers list dynamically based on configured env vars
const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = loginSchema.safeParse(credentials);
      if (!parsed.success) return null;

      const { email, password } = parsed.data;

      const user = await db.user.findUnique({
        where: { email },
        select: { id: true, email: true, name: true, image: true, passwordHash: true },
      });

      if (!user?.passwordHash) return null;

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return null;

      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  }),
];

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (env.APPLE_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY) {
  providers.push(
    AppleProvider({
      clientId: env.APPLE_ID,
      clientSecret: "", // Apple uses a generated JWT — handled by next-auth internally
      authorization: {
        params: { scope: "name email" },
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as Adapter,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 /* 30 days */ },
  pages: {
    signIn: "/login",
    newUser: "/dashboard",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      // For OAuth sign-ins, auto-create a Profile if one doesn't exist
      if (account?.provider && account.provider !== "credentials" && user.id) {
        const existing = await db.profile.findUnique({ where: { userId: user.id } });
        if (!existing) {
          await db.profile.create({
            data: { userId: user.id },
          });
        }
      }
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      if (trigger === "update") {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, email: true },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.email = dbUser.email;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string | null;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
};

/** Convenience wrapper — avoids passing authOptions everywhere. */
export function getServerSession() {
  return _getServerSession(authOptions);
}

export async function requireAuth() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new AuthError("Authentication required");
  }
  return session;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
