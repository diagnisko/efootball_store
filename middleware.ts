import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as string | undefined;

    if (pathname.startsWith("/admin") && role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (pathname.startsWith("/manager") && !["SUPER_ADMIN", "MANAGER"].includes(role ?? "")) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
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
