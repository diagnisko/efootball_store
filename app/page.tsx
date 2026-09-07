import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPlatformStatsCached, formatMemberCount } from "@/lib/stats";
import { getPublicCatalogCached } from "@/lib/catalog";
import Link from "next/link";
import { IconArrowRight } from "@/components/Icons";

// IMPORTANT : pas de `export const revalidate` ici. Une page qui dépend de la session
// (via le layout) doit rester dynamique, sinon Next.js met en cache la page ENTIÈRE —
// navbar de connexion comprise — et sert la même version figée à tout le monde (c'était
// la cause du bug "je suis déconnecté quand je clique sur Accueil"). La performance est
// gérée séparément : voir lib/stats.ts et lib/catalog.ts, dont les requêtes coûteuses
// sont mises en cache indépendamment du rendu de cette page.

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  AVAILABLE: { label: "Disponible", className: "badge-ok" },
  IN_PROGRESS: { label: "En cours de paiement", className: "badge-warn" },
  SOLD: { label: "Vendu", className: "badge-muted" },
  HIDDEN: { label: "Masqué", className: "badge-muted" },
};

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session?.user;

  const [stats, products] = await Promise.all([
    getPlatformStatsCached(),
    getPublicCatalogCached(),
  ]);

  // Utilisateur connecté : plus de pitch marketing ni de CTA d'inscription — il est déjà
  // client, on va droit à ce qui l'intéresse concrètement : les offres. Le pitch complet
  // (hero, stats de la plateforme, "Créer un compte") n'a de sens que pour un visiteur.
  if (isLoggedIn) {
    return (
      <main>
        <section id="catalogue" style={{ paddingTop: 60 }}>
          <div className="section-head">
            <div className="eyebrow">Catalogue</div>
            <h2>Les offres du moment</h2>
            <p>Chaque compte est vérifié avant publication. Le statut est toujours visible.</p>
          </div>
          <div className="catalogue-grid">
            {products.length === 0 && (
              <p className="u-muted">Aucune offre publiée pour le moment. Revenez bientôt.</p>
            )}
            {products.map((p) => {
              const status = STATUS_LABEL[p.status] ?? STATUS_LABEL.AVAILABLE;
              const features = (p.features as { ovr?: number; platform?: string }) ?? {};
              return (
                <div key={p.id} className="panel offer-card">
                  <div className="thumb">
                    {p.media[0]?.url && <img src={p.media[0].url} alt={p.title} />}
                  </div>
                  <div className="top-row">
                    <h4>{p.title}</h4>
                    <span className={`badge ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="desc">
                    {features.platform ?? "Mobile"}
                    {features.ovr ? ` · OVR ${features.ovr}` : ""} — {p.description}
                  </p>
                  <div className="bottom-row">
                    <div className="price">
                      {Number(p.priceTotal).toLocaleString("fr-FR")} FCFA
                      <span>
                        {p.status === "AVAILABLE"
                          ? `Apport dès ${Number(p.initialDepositAmount).toLocaleString("fr-FR")} FCFA`
                          : p.status === "SOLD"
                            ? "Processus terminé"
                            : "Réservé — indisponible"}
                      </span>
                    </div>
                    <Link href={`/products/${p.slug}`} className="link-arrow">
                      Voir l&apos;offre <IconArrowRight />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <div>
          <div className="eyebrow">Accès premium — comptes vérifiés</div>
          <h1>
            STEP INTO
            <br />
            THE VOID.
          </h1>
          <p className="lead">
            VANTA donne accès aux comptes eFootball Mobile les plus recherchés, réservés aux
            membres vérifiés. Un apport initial, huit mensualités, zéro mauvaise surprise.
          </p>

          <div className="hero-actions">
            <Link href="#catalogue" className="btn btn-primary">
              Découvrir les offres
            </Link>
            <Link href="/register" className="btn btn-ghost">
              Créer un compte
            </Link>
          </div>

          {/* Les deux chiffres ci-dessous viennent de getPlatformStats() (lib/stats.ts),
              calculés depuis PostgreSQL — jamais codés en dur. */}
          <div className="hero-stats">
            <div>
              <b>{formatMemberCount(stats.verifiedMembersCount)}</b>
              <span>Membres vérifiés</span>
            </div>
            <div>
              <b>{stats.onTimePaymentRate !== null ? `${stats.onTimePaymentRate}%` : "—"}</b>
              <span>Paiements confirmés à temps</span>
            </div>
            <div>
              <b>{stats.installmentsDurationMonths} mois</b>
              <span>Durée du plan</span>
            </div>
          </div>
        </div>
      </section>

      <section id="catalogue">
        <div className="section-head">
          <div className="eyebrow">Catalogue</div>
          <h2>Des offres pensées pour durer</h2>
          <p>
            Chaque compte est vérifié avant publication. Le statut est toujours visible — vous
            savez exactement où vous en êtes avant d&apos;engager un centime.
          </p>
        </div>

        <div className="catalogue-grid">
          {products.length === 0 && (
            <p style={{ color: "var(--muted)" }}>
              Aucune offre publiée pour le moment. Revenez bientôt.
            </p>
          )}
          {products.map((p) => {
            const status = STATUS_LABEL[p.status] ?? STATUS_LABEL.AVAILABLE;
            const features = (p.features as { ovr?: number; platform?: string }) ?? {};
            return (
              <div key={p.id} className="panel offer-card">
                <div className="thumb">
                  {p.media[0]?.url && <img src={p.media[0].url} alt={p.title} />}
                </div>
                <div className="top-row">
                  <h4>{p.title}</h4>
                  <span className={`badge ${status.className}`}>{status.label}</span>
                </div>
                <p className="desc">
                  {features.platform ?? "Mobile"}
                  {features.ovr ? ` · OVR ${features.ovr}` : ""} — {p.description}
                </p>
                <div className="bottom-row">
                  <div className="price">
                    {Number(p.priceTotal).toLocaleString("fr-FR")} FCFA
                    <span>
                      {p.status === "AVAILABLE"
                        ? `Apport dès ${Number(p.initialDepositAmount).toLocaleString("fr-FR")} FCFA`
                        : p.status === "SOLD"
                          ? "Processus terminé"
                          : "Réservé — indisponible"}
                    </span>
                  </div>
                  <Link href={`/products/${p.slug}`} className="link-arrow">
                    Voir l&apos;offre <IconArrowRight />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
