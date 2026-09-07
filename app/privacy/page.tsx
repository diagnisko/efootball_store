import { IconAlertTriangle } from "@/components/Icons";

export const metadata = { title: "Politique de confidentialité — VANTA" };

export default function PrivacyPage() {
  return (
    <div className="dash" style={{ maxWidth: 760 }}>
      <div className="dash-head">
        <div>
          <h2>Politique de confidentialité</h2>
          <p>Document provisoire — à faire valider par un professionnel du droit avant mise en production.</p>
        </div>
      </div>
      <div className="panel card" style={{ borderColor: "var(--warn)", marginBottom: 22 }}>
        <p style={{ fontSize: 13, color: "var(--muted)", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <IconAlertTriangle style={{ flexShrink: 0, marginTop: 3, color: "var(--warn)" }} />
          Brouillon générique destiné uniquement à éviter un lien mort. VANTA collecte des
          documents d&apos;identité et des preuves de paiement — cela impose des obligations
          légales réelles (RGPD ou équivalent local selon votre juridiction). Faites rédiger une
          vraie politique de confidentialité avant tout lancement réel.
        </p>
      </div>
      <div className="panel card" style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
        <h3>1. Données collectées</h3>
        <p>Identité (nom, email, téléphone, pays), documents d&apos;identité, preuves de paiement, historique d&apos;achats et de messages.</p>
        <h3>2. Finalité</h3>
        <p>Vérification d&apos;identité, traitement des paiements, prévention de la fraude, support client.</p>
        <h3>3. Conservation</h3>
        <p>Les documents sensibles sont stockés dans un espace de stockage privé, non accessible publiquement, et consultés uniquement par le personnel autorisé (journalisé, voir le journal d&apos;audit admin).</p>
        <h3>4. Droits</h3>
        <p>Vous pouvez demander l&apos;accès, la correction ou la suppression de vos données en contactant le support.</p>
      </div>
    </div>
  );
}
