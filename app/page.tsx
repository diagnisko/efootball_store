import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPlatformStatsCached, formatMemberCount } from "@/lib/stats";
import { getPublicCatalogCached } from "@/lib/catalog";
import Link from "next/link";
import { IconArrowRight } from "@/components/Icons";
import { getHomepageHeroImageCached } from "@/lib/site-settings";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  AVAILABLE: { label: "Disponible", className: "badge-ok" },
  IN_PROGRESS: { label: "En cours", className: "badge-warn" },
  SOLD: { label: "Vendu", className: "badge-muted" },
  HIDDEN: { label: "Masqué", className: "badge-muted" },
};

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;

  const [stats, products, heroImageUrl] = await Promise.all([
    getPlatformStatsCached(),
    getPublicCatalogCached(),
    getHomepageHeroImageCached(),
  ]);

  if (isLoggedIn) {
    return (
      <main className="landing-shell landing-shell-compact">
        <section id="catalogue" className="catalogue-shell catalogue-shell-compact">
          <div className="catalogue-header">
            <div className="eyebrow">Catalogue</div>
            <h2>Les offres du moment</h2>
            <p>Chaque compte est vérifié avant publication.</p>
          </div>
          <div className="catalogue-grid landing-grid">
            {products.length === 0 && (
              <p className="u-muted">Aucune offre publiée pour le moment. Revenez bientôt.</p>
            )}
            {products.map((p) => {
              const status = STATUS_LABEL[p.status] ?? STATUS_LABEL.AVAILABLE;
              const features = (p.features as { ovr?: number; platform?: string }) ?? {};
              return (
                <article key={p.id} className="landing-product-card">
                  <div className="landing-card-thumb">
                    {p.media[0]?.url && <img src={`/api/products/media/${p.media[0].id}`} alt={p.title} />}
                    <span className={`badge ${status.className}`}>{status.label}</span>
                  </div>

                  <div className="landing-card-meta">
                    <div className="landing-card-badges">
                      <span>{features.platform ?? "Mobile"}</span>
                      {features.ovr ? <span>Puissance {features.ovr}</span> : null}
                    </div>
                    <h3>{p.title.replace(/\bOVR\b/gi, "Puissance")}</h3>
                  </div>

                  <div className="landing-card-price-row">
                    <div>
                      <span className="landing-label">À partir de</span>
                      <strong>{Number(p.priceTotal).toLocaleString("fr-FR")} FCFA</strong>
                    </div>
                  </div>

                  <Link href={`/products/${p.slug}`} className="landing-buy-btn">
                    Consulter l&apos;offre <IconArrowRight />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="landing-shell">
      <section className="hero-shell">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">Marketplace eFootball vérifié</div>
            <h1>
              Le compte qu&apos;il
              <br />
              vous faut.
              <span>Le sérieux en plus.</span>
            </h1>
            <p>
              Tu choisis ton compte, tu connais son prix et tu avances à ton rythme. Chaque dossier
              est vérifié avant l&apos;achat et notre équipe reste disponible jusqu&apos;à la remise des accès.
            </p>
            <div className="hero-actions-human">
              <Link href="#catalogue" className="hero-pill hero-pill-primary">
                Voir les comptes <span aria-hidden="true">→</span>
              </Link>
              <Link href="/register" className="hero-pill hero-pill-ghost">
                Créer mon compte
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <div
              className={`hero-visual-image${heroImageUrl ? " has-product-image" : ""}`}
              style={heroImageUrl ? { backgroundImage: `linear-gradient(180deg, rgba(10,12,12,.08), rgba(10,12,12,.48)), url("${heroImageUrl}")` } : undefined}
            >
              <div className="visual-badge">VANTA · accompagnement vérifié</div>
              <div className="visual-card-info">
                <span>Une expérience claire</span>
                <strong>Choisis ton compte en confiance.</strong>
                <small>Des informations visibles avant de commencer.</small>
              </div>
            </div>
          </div>
        </div>

        <div className="hero-trust-bar" id="comment-ca-marche">
          <div className="trust-item">
            <span className="trust-icon">✓</span>
            <span>Comptes contrôlés avant publication</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">◈</span>
            <span>Apport initial et mensualités claires</span>
          </div>
          <div className="trust-item">
            <span className="trust-icon">◌</span>
            <span>Une équipe disponible si besoin</span>
          </div>
        </div>
      </section>

      <section className="stats-band">
        <div className="stat-item">
          <span>Membres vérifiés</span>
          <strong>{formatMemberCount(stats.verifiedMembersCount)}</strong>
        </div>
        <div className="stat-item">
          <span>Paiements confirmés</span>
          <strong>{stats.onTimePaymentRate !== null ? `${stats.onTimePaymentRate}%` : "—"}</strong>
        </div>
        <div className="stat-item">
          <span>Durée du paiement</span>
          <strong>{stats.installmentsDurationMonths} mois</strong>
        </div>
        <div className="stat-item">
          <span>Offres disponibles</span>
          <strong>{products.filter((product) => product.status === "AVAILABLE").length}</strong>
        </div>
      </section>

      <section id="catalogue" className="catalogue-shell">
        <div className="catalogue-header">
          <div className="eyebrow">Le catalogue</div>
          <h2>
            Trouvez votre
            <span> prochaine équipe.</span>
          </h2>
          <p>Les offres actuellement disponibles, avec leur prix, leur statut et leurs conditions de paiement.</p>
        </div>

        <div className="catalogue-note">
          <span>{products.length} offre{products.length > 1 ? "s" : ""} publiée{products.length > 1 ? "s" : ""}</span>
          <span>Les prix sont affichés en FCFA</span>
        </div>

        <div className="catalogue-grid landing-grid">
          {products.map((p) => {
            const status = STATUS_LABEL[p.status] ?? STATUS_LABEL.AVAILABLE;
            const features = (p.features as { ovr?: number; platform?: string }) ?? {};
            const priceTotal = Number(p.priceTotal);
            const initial = Number(p.initialDepositAmount);

            return (
              <article key={p.id} className="landing-product-card">
                <div className="landing-card-thumb">
                  {p.media[0]?.url && <img src={`/api/products/media/${p.media[0].id}`} alt={p.title} />}
                  <span className={`badge ${status.className}`}>{status.label}</span>
                </div>

                <div className="landing-card-meta">
                  <div className="landing-card-badges">
                    <span>{features.platform ?? "Mobile"}</span>
                    {features.ovr ? <span>Puissance {features.ovr}</span> : null}
                  </div>
                  <h3>{p.title.replace(/\bOVR\b/gi, "Puissance")}</h3>
                </div>

                <div className="landing-card-price-row">
                  <div>
                    <span className="landing-label">À partir de</span>
                    <strong>{initial.toLocaleString("fr-FR")} FCFA d&apos;apport</strong>
                  </div>
                    <div className="landing-total">{priceTotal.toLocaleString("fr-FR")} FCFA total</div>
                </div>

                <Link href={`/products/${p.slug}`} className="landing-buy-btn">
                  Consulter l&apos;offre <IconArrowRight />
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
