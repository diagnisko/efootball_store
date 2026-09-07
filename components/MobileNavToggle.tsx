"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { IconMenu, IconClose } from "@/components/Icons";

interface NavLink {
  href: string;
  label: string;
}

/**
 * En dessous de 980px, la nav publique masque .nav-links entièrement (voir globals.css)
 * sans jamais fournir de remplacement — les liens "Accueil"/"Offres" et surtout
 * "Manager"/"Admin" devenaient injoignables depuis un téléphone. Ce composant comble ça
 * avec un bouton hamburger visible uniquement sous 980px (voir .mobile-nav-toggle en CSS).
 */
export function MobileNavToggle({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="mobile-nav-toggle">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={open}
        className="mobile-nav-btn"
      >
        {open ? <IconClose /> : <IconMenu />}
      </button>
      {open && (
        <div className="mobile-nav-panel">
          {links.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
