import type { NextAuthConfig } from "next-auth";
import { ROUTE_PERMISSIONS, hasPermission } from "@shorterlink/shared";
import type { Permission } from "@shorterlink/shared";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/emails",
  "/videos",
  "/send",
  "/sent",
  "/links",
  "/quicklinks",
  "/analytics",
  "/admin",
];

export const authConfig: NextAuthConfig = {
  providers: [], // Configured in auth.ts with Credentials
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

      if (!isProtected) return true;
      if (!isLoggedIn) return false;

      // Dashboard is always accessible (shows empty state without data permission)
      if (pathname.startsWith("/dashboard")) return true;

      // Check route-level permissions
      const matchedRoute = Object.keys(ROUTE_PERMISSIONS).find((route) =>
        pathname.startsWith(route),
      );

      if (matchedRoute) {
        const user = auth?.user;
        const role = (user as unknown as Record<string, unknown> | undefined)?.role as string | undefined;
        const permissions = (user as unknown as Record<string, unknown> | undefined)?.permissions as string[] | undefined;
        if (!hasPermission(role, permissions, ROUTE_PERMISSIONS[matchedRoute] as Permission)) {
          return Response.redirect(new URL("/dashboard?forbidden=1", request.nextUrl));
        }
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as unknown as Record<string, unknown>).role as string ?? 'USER';
        token.permissions = (user as unknown as Record<string, unknown>).permissions as string[] ?? [];
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.permissions = token.permissions as string[];
      }
      return session;
    },
  },
};
