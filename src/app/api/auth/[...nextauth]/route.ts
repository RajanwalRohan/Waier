import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * NextAuth catch-all route.
 * Handles /api/auth/signin, /api/auth/signout, /api/auth/session, etc.
 * Rate limiting for login is handled inside the credentials provider
 * authorize function and by the signup route separately.
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
