import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { canAccessBackofficeSection } from "@/lib/permissions";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as string | undefined;
    const userId = req.nextauth.token?.sub as string | undefined;
    const permissions = (req.nextauth.token?.permissions as Record<string, boolean> | undefined) ?? {};

    if (pathname.startsWith("/admin") || pathname.startsWith("/manager")) {
      if (role === "SUPER_ADMIN") {
        return NextResponse.next();
      }
      if (role !== "MANAGER") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      const allowed = canAccessBackofficeSection(role, userId, pathname, permissions);
      if (!allowed) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

// L'utilisateur ne doit jamais accéder à une zone supérieure en modifiant l'URL :
// ce middleware s'exécute côté serveur à chaque requête sur ces chemins.
export const config = {
  matcher: ["/dashboard/:path*", "/manager/:path*", "/admin/:path*"],
};
