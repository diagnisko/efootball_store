import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role as string | undefined;

    if (pathname.startsWith("/admin") || pathname.startsWith("/manager")) {
      if (role === "SUPER_ADMIN") {
        return NextResponse.next();
      }
      if (role !== "MANAGER") {
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
