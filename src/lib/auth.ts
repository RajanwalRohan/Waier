import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession as _getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";

/**
 * NextAuth configuration.
 * SECURITY NOTES:
 *  - Credentials provider hashes passwords with bcrypt (cost 12).
 *  - JWT strategy keeps session data out of the database for speed;
 *    switch to "database" strategy if you need server-side revocation.
 *  - The session callback only exposes the user id, email, name, and image —
 *    no sensitive fields (passwordHash, tokens, etc.).
 */

const loginSchema = z.object({
  email: z.string().email().max(255).trim().toLowerCase(),
  password: z.string().min(8).max(128),
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 /* 30 days */ },
  pages: {
    signIn: "/login",
    newUser: "/dashboard",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Validate shape before touching the database
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

        // Return only safe fields — never the hash
        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};

/** Convenience wrapper — avoids passing authOptions everywhere. */
export function getServerSession() {
  return _getServerSession(authOptions);
}

/**
 * Require authentication or throw. Use in API route handlers:
 *   const session = await requireAuth();
 * If the caller is not authenticated this throws an error that
 * the route handler should catch and return a 401.
 */
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
