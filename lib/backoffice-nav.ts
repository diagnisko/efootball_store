import type { BoNavGroup } from "@/components/BackofficeShell";

// Groupes de navigation partagés entre le layout admin et le layout manager,
// pour éviter toute dépendance croisée entre les deux fichiers app/*/layout.tsx.
export const ADMIN_NAV_GROUPS: BoNavGroup[] = [
  {
    label: "Pilotage",
    items: [{ href: "/admin/dashboard", label: "Statistiques" }],
  },
  {
    label: "Commerce",
    items: [
      { href: "/admin/clients", label: "Clients" },
      { href: "/admin/products", label: "Offres" },
      { href: "/admin/purchases", label: "Infos d'accès" },
    ],
  },
  {
    label: "Supervision",
    items: [
      { href: "/manager/verifications", label: "Vérifications" },
      { href: "/manager/payments", label: "Paiements" },
      { href: "/manager/verification-codes", label: "Codes de vérification" },
      { href: "/manager/messages", label: "Messages" },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/managers", label: "Managers" },
      { href: "/admin/settings", label: "Réglages" },
      { href: "/admin/logs", label: "Journal" },
    ],
  },
];

export const MANAGER_NAV_GROUPS: BoNavGroup[] = [
  {
    label: "File d'attente",
    items: [
      { href: "/manager/verifications", label: "Vérifications" },
      { href: "/manager/payments", label: "Paiements" },
      { href: "/manager/verification-codes", label: "Codes de vérification" },
      { href: "/manager/messages", label: "Messages" },
    ],
  },
];
