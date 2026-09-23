export type ProductStatusPurchase = {
  status: string;
  paymentPlan?: { initialDepositStatus: string; status: string } | null;
};

export function getProductStatusLabel(productStatus: string, purchase?: ProductStatusPurchase | null) {
  if (productStatus === "IN_PROGRESS") {
    if (purchase?.status === "AWAITING_DEPOSIT") {
      if (purchase.paymentPlan?.initialDepositStatus === "AWAITING_VALIDATION") {
        return { label: "Apport en cours de validation", className: "badge-warn" };
      }
      if (purchase.paymentPlan?.initialDepositStatus !== "PAID") {
        return { label: "Réservation en attente d'apport", className: "badge-warn" };
      }
    }

    if (purchase?.status === "ACTIVE" || purchase?.paymentPlan?.status === "ACTIVE") {
      return { label: "En cours de paiement", className: "badge-warn" };
    }

    return { label: "Réservé", className: "badge-warn" };
  }

  if (productStatus === "AVAILABLE") return { label: "Disponible", className: "badge-ok" };
  if (productStatus === "SOLD") return { label: "Vendu", className: "badge-muted" };
  return { label: "Masqué", className: "badge-muted" };
}