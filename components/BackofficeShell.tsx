"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { IconMenu } from "@/components/Icons";

export interface BoNavItem {
  href: string;
  label: string;
}
export interface BoNavGroup {
  label: string;
  items: BoNavItem[];
}

interface Props {
  role: "SUPER_ADMIN" | "MANAGER";
  userName: string;
  groups: BoNavGroup[];
  children: React.ReactNode;
}

export function BackofficeShell({ role, userName, groups, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const currentLabel = groups.flatMap((g) => g.items).find((i) => isActive(i.href))?.label ?? "";

  return (
    <ConfirmProvider>
    <div className="bo-shell">
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 70 }}
        />
      )}
      <aside className={`bo-sidebar${open ? " is-open" : ""}`}>
        <div className="bo-sidebar-head">
          <Link href="/" className="bo-sidebar-brand">
            <div className="logo-mark" />
            <span>VANTA</span>
          </Link>
          <span className={`bo-role-pill${role === "SUPER_ADMIN" ? " is-admin" : ""}`}>
            {role === "SUPER_ADMIN" ? "Administration" : "Supervision"}
          </span>
        </div>
        <nav className="bo-nav">
          {groups.map((group) => (
            <div className="bo-nav-group" key={group.label}>
              <div className="bo-nav-label">{group.label}</div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={isActive(item.href) ? "active" : ""}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="bo-sidebar-foot">
          <Link href="/">← Retour au site</Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--bo-muted)", fontSize: 12.5 }}
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="bo-main">
        <div className="bo-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button className="bo-menu-btn" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><IconMenu /></button>
            <div>
              <div className="bo-topbar-crumb">{role === "SUPER_ADMIN" ? "ADMIN" : "MANAGER"}</div>
              <div className="bo-topbar-title">{currentLabel || "Console"}</div>
            </div>
          </div>
          <div className="bo-topbar-user">
            Connecté en tant que <b>{userName}</b>
          </div>
        </div>
        <div className="bo-content">{children}</div>
      </div>
    </div>
    </ConfirmProvider>
  );
}
