import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);
export default auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/emails/:path*",
    "/videos/:path*",
    "/send/:path*",
    "/sent/:path*",
    "/links/:path*",
    "/analytics/:path*",
    "/quicklinks/:path*",
  ],
};
