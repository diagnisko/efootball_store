import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import { PurchaseButton } from "@/components/PurchaseButton";
import { ProductGallery } from "@/components/ProductGallery";

export const dynamic = "force-dynamic"; // le statut d'une offre change souvent, jamais de cache

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  AVAILABLE: { label: "Disponible", className: "badge-ok" },
  IN_PROGRESS: { label: "En cours de paiement", className: "badge-warn" },
  SOLD: { label: "Vendu", className: "badge-muted" },
  HIDDEN: { label: "Masqué", className: "badge-muted" },
};

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: { media: { orderBy: { position: "asc" } } },
  });
  if (!product || product.status === "HIDDEN") notFound();

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const role = (session?.user as { role?: string } | undefined)?.role;
  const verificationStatus = (session?.user as { verificationStatus?: string } | undefined)?.verificationStatus;

  const myPurchase = userId
    ? await prisma.purchase.findFirst({
        where: { userId, productId: product.id, status: { in: ["AWAITING_DEPOSIT", "ACTIVE", "COMPLETED"] } },
        include: { paymentPlan: true },
        orderBy: { createdAt: "desc" },
      })
    : null;

  const status = STATUS_LABEL[product.status] ?? STATUS_LABEL.AVAILABLE;
  const features = (product.features as { ovr?: number; platform?: string; coins?: number; division?: number }) ?? {};
  const remaining = Number(product.priceTotal) - Number(product.initialDepositAmount);
  const monthly = Math.round(remaining / product.installmentsCount);

  return (
    <main className="product-page">
      <div className="product-page-grid">
        <div>
          <div style={{ marginBottom: 24 }}>
            <ProductGallery
              media={product.media.map((m) => ({ id: m.id, url: `/api/products/media/${m.id}`, mediaType: m.mediaType }))}
            />
          </div>
          <div className="product-title-row">
            <h1>{product.title.replace(/\bOVR\b/gi, "Puissance")}</h1>
            <span className={`badge ${status.className}`}>{status.label}</span>
          </div>
          <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 24 }}>{product.description}</p>

          <div className="panel card" style={{ marginBottom: 20 }}>
            <h3>Caractéristiques</h3>
            <div className="grid-2" style={{ fontSize: 14 }}>
              <div><span style={{ color: "var(--muted-2)" }}>Plateforme</span><br />{features.platform ?? "Mobile"}</div>
              {features.ovr && <div><span style={{ color: "var(--muted-2)" }}>Puissance</span><br />{features.ovr}</div>}
              {features.coins && <div><span style={{ color: "var(--muted-2)" }}>Pièces</span><br />{features.coins.toLocaleString("fr-FR")}</div>}
              {features.division && <div><span style={{ color: "var(--muted-2)" }}>Division</span><br />{features.division}</div>}
            </div>
          </div>

          {product.importantInfo && (
            <div className="panel card">
              <h3>Informations importantes</h3>
              <p style={{ fontSize: 13, color: "var(--muted)" }}>{product.importantInfo}</p>
            </div>
          )}
        </div>

        <div className="panel card product-purchase-panel">
          <h3>Conditions de paiement</h3>
          <div style={{ fontFamily: "'Chakra Petch'", fontSize: 30, color: "#fff", marginBottom: 4 }}>
            {Number(product.priceTotal).toLocaleString("fr-FR")} FCFA
          </div>
          <div style={{ fontSize: 12, color: "var(--muted-2)", marginBottom: 20 }}>Mensuel par défaut, paiement comptant disponible</div>

          <div className="wave-payment-card">
            <img className="wave-payment-logo" src="/wave-logo.svg" alt="Wave" />
            <div>
              <strong>Paiement par Wave</strong>
              <span>Envoyez l&apos;apport au <b>+221 78 308 70 95</b></span>
            </div>
          </div>

          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 2, marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Apport initial</span>
              <span className="mono" style={{ color: "#fff" }}>{Number(product.initialDepositAmount).toLocaleString("fr-FR")} FCFA</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Montant restant</span>
              <span className="mono" style={{ color: "#fff" }}>{remaining.toLocaleString("fr-FR")} FCFA</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Durée</span>
              <span className="mono" style={{ color: "#fff" }}>{product.installmentsCount} mois</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Mensualité estimée</span>
              <span className="mono" style={{ color: "#fff" }}>{monthly.toLocaleString("fr-FR")} FCFA</span>
            </div>
          </div>

          <PurchaseButton
            productSlug={product.slug}
            productStatus={product.status}
            priceTotal={Number(product.priceTotal)}
            initialDepositAmount={Number(product.initialDepositAmount)}
            installmentsCount={product.installmentsCount}
            isAuthenticated={!!session?.user}
            isStaff={role === "SUPER_ADMIN" || role === "MANAGER"}
            verificationStatus={verificationStatus}
            myPurchase={
              myPurchase
                ? {
                    id: myPurchase.id,
                    status: myPurchase.status,
                    depositStatus: myPurchase.paymentPlan?.initialDepositStatus,
                    paymentMode: myPurchase.paymentPlan?.paymentMode,
                  }
                : null
            }
          />
        </div>
      </div>
    </main>
  );
}
