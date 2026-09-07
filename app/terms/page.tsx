import { IconAlertTriangle } from "@/components/Icons";

export const metadata = { title: "Conditions d'utilisation — VANTA" };

export default function TermsPage() {
  return (
    <div className="dash" style={{ maxWidth: 760 }}>
      <div className="dash-head">
        <div>
          <h2>Conditions d&apos;utilisation</h2>
          <p>Document provisoire — à faire valider par un professionnel du droit avant mise en production.</p>
        </div>
      </div>
      <div className="panel card" style={{ borderColor: "var(--warn)", marginBottom: 22 }}>
        <p style={{ fontSize: 13, color: "var(--muted)", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <IconAlertTriangle style={{ flexShrink: 0, marginTop: 3, color: "var(--warn)" }} />
          Cette page existe uniquement pour que le lien affiché lors de l&apos;inscription ne
          renvoie plus vers une erreur 404. Le contenu ci-dessous est un brouillon générique,
          <strong> pas un document juridique valide</strong>. VANTA traite des paiements et des
          données d&apos;identité : faites rédiger de vraies CGU par un juriste avant tout
          lancement réel.
        </p>
      </div>
      <div className="panel card" style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7 }}>
        <h3>1. Objet</h3>
        <p>VANTA met en relation des vendeurs et des acheteurs de comptes de jeu vérifiés, avec un paiement échelonné.</p>
        <h3>2. Compte utilisateur</h3>
        <p>L&apos;utilisateur est responsable de la confidentialité de ses identifiants et des actions effectuées depuis son compte.</p>
        <h3>3. Vérification d&apos;identité</h3>
        <p>L&apos;achat d&apos;un compte est conditionné à une vérification d&apos;identité, nécessaire pour la sécurité des transactions.</p>
        <h3>4. Paiement échelonné</h3>
        <p>Les modalités (apport initial, mensualités, pénalités de retard) sont précisées avant chaque achat et rappelées dans l&apos;espace client.</p>
        <h3>5. Résiliation</h3>
        <p>VANTA se réserve le droit de suspendre un compte en cas de retard de paiement prolongé ou de fraude avérée.</p>
      </div>
    </div>
  );
}
