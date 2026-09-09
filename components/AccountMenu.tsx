"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

interface Props {
  name: string;
  email: string;
  avatarUrl?: string | null;
}

export function AccountMenu({ name, email, avatarUrl }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 40, height: 40, borderRadius: "50%", border: "1px solid var(--glass-border)",
          background: avatarUrl ? `url("${avatarUrl}") center/cover` : "linear-gradient(135deg,var(--volt),var(--cyan))",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer",
        }}
        aria-label="Menu de mon compte"
      >
        {!avatarUrl && initial}
      </button>

      {open && (
        <div
          className="panel"
          style={{
            position: "absolute", top: 50, right: 0, width: 240, padding: 8, zIndex: 60,
          }}
        >
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--glass-border-soft)", marginBottom: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{name}</div>
            <div style={{ fontSize: 12, color: "var(--muted-2)" }}>{email}</div>
          </div>
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            style={{ display: "block", padding: "10px 12px", fontSize: 13, color: "var(--ivory)", textDecoration: "none" }}
          >
            Mon espace
          </Link>
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            style={{ display: "block", padding: "10px 12px", fontSize: 13, color: "var(--ivory)", textDecoration: "none" }}
          >
            Mon profil
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{
              display: "block", width: "100%", textAlign: "left", padding: "10px 12px",
              fontSize: 13, color: "var(--neon)", background: "none", border: "none", cursor: "pointer",
            }}
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
