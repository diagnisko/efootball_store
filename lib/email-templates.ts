function layout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#07060d;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:36px 20px;">
    <div style="text-align:center;margin-bottom:28px;">
      <span style="font-size:20px;font-weight:700;letter-spacing:3px;color:#ffffff;">VANTA</span>
    </div>
    <div style="background:#100c1e;border:1px solid rgba(150,110,255,.28);border-radius:6px;padding:32px 28px;color:#f3f0ff;">
      <h1 style="font-size:18px;margin:0 0 16px;color:#ffffff;font-weight:600;">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="text-align:center;font-size:11px;color:#655e7d;margin-top:24px;">
      VANTA — Plateforme de vente de comptes eFootball Mobile
    </p>
  </div>
</body>
</html>`;
}

function p(text: string): string {
  return `<p style="font-size:14px;line-height:1.6;color:#c9c3dd;margin:0 0 14px;">${text}</p>`;
}

function button(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:8px;padding:12px 22px;background:#7c3aed;color:#ffffff;text-decoration:none;border-radius:4px;font-size:13px;font-weight:700;">${label}</a>`;
}

const APP_URL = process.env.NEXTAUTH_URL || "https://vanta.app";

export function welcomeEmail(firstName: string) {
  return {
    subject: "Bienvenue sur VANTA",
    html: layout(
      "Bienvenue dans l'univers VANTA",
      p(`Bonjour ${firstName},`) +
        p("Votre compte a été créé avec succès. Complétez votre profil et faites vérifier votre identité pour débloquer les achats.") +
        button("Compléter mon profil", `${APP_URL}/verification`)
    ),
  };
}

export function verificationApprovedEmail(firstName: string) {
  return {
    subject: "Votre identité a été vérifiée",
    html: layout(
      "Identité vérifiée",
      p(`Bonjour ${firstName},`) +
        p("Votre dossier de vérification a été validé. Vous pouvez désormais acheter sur VANTA.") +
        button("Voir le catalogue", `${APP_URL}/#catalogue`)
    ),
  };
}

export function verificationRejectedEmail(firstName: string, reason?: string | null) {
  return {
    subject: "Votre dossier de vérification a été refusé",
    html: layout(
      "Dossier refusé",
      p(`Bonjour ${firstName},`) +
        p("Votre dossier de vérification n'a pas pu être validé." + (reason ? ` Motif : ${reason}` : "")) +
        p("Vous pouvez soumettre un nouveau dossier corrigé à tout moment.") +
        button("Corriger mon dossier", `${APP_URL}/verification`)
    ),
  };
}

export function depositConfirmedEmail(firstName: string, productTitle: string) {
  return {
    subject: "Apport initial validé",
    html: layout(
      "Apport initial validé",
      p(`Bonjour ${firstName},`) +
        p(`Votre apport initial pour "${productTitle}" a été confirmé. Votre plan de paiement sur 8 mois est maintenant actif.`) +
        button("Voir mon échéancier", `${APP_URL}/dashboard`)
    ),
  };
}

export function depositRejectedEmail(firstName: string, reason?: string | null) {
  return {
    subject: "Apport initial refusé",
    html: layout(
      "Apport initial refusé",
      p(`Bonjour ${firstName},`) +
        p("Votre apport initial n'a pas pu être validé." + (reason ? ` Motif : ${reason}` : "")) +
        button("Déclarer un nouveau paiement", `${APP_URL}/dashboard`)
    ),
  };
}

export function installmentConfirmedEmail(firstName: string, installmentNumber: number) {
  return {
    subject: `Échéance n°${installmentNumber} validée`,
    html: layout(
      "Paiement confirmé",
      p(`Bonjour ${firstName},`) +
        p(`Votre échéance n°${installmentNumber} a été validée. Merci pour votre paiement.`) +
        button("Voir mon suivi", `${APP_URL}/dashboard`)
    ),
  };
}

export function installmentRejectedEmail(firstName: string, installmentNumber: number, reason?: string | null) {
  return {
    subject: `Échéance n°${installmentNumber} refusée`,
    html: layout(
      "Paiement refusé",
      p(`Bonjour ${firstName},`) +
        p(`Votre échéance n°${installmentNumber} a été refusée.` + (reason ? ` Motif : ${reason}` : "")) +
        button("Déclarer un nouveau paiement", `${APP_URL}/dashboard`)
    ),
  };
}

export function paymentReminderEmail(firstName: string, installmentNumber: number, amount: number, daysUntilDue: number) {
  return {
    subject: `Échéance n°${installmentNumber} dans ${daysUntilDue} jour${daysUntilDue > 1 ? "s" : ""}`,
    html: layout(
      "Échéance à venir",
      p(`Bonjour ${firstName},`) +
        p(`Votre échéance n°${installmentNumber} de ${amount.toLocaleString("fr-FR")} FCFA est due dans ${daysUntilDue} jour${daysUntilDue > 1 ? "s" : ""}.`) +
        button("Voir mon échéancier", `${APP_URL}/dashboard`)
    ),
  };
}

export function latePaymentEmail(firstName: string, installmentNumber: number, daysLate: number, penaltyAmount: number) {
  return {
    subject: `Échéance n°${installmentNumber} en retard`,
    html: layout(
      "Paiement en retard",
      p(`Bonjour ${firstName},`) +
        p(`Votre échéance n°${installmentNumber} est en retard de ${daysLate} jour${daysLate > 1 ? "s" : ""}. Une pénalité de ${penaltyAmount.toLocaleString("fr-FR")} FCFA a été appliquée.`) +
        button("Régulariser mon paiement", `${APP_URL}/dashboard`)
    ),
  };
}

export function accountSuspendedEmail(firstName: string, reason: string) {
  return {
    subject: "Votre compte a été suspendu",
    html: layout(
      "Compte suspendu",
      p(`Bonjour ${firstName},`) +
        p(`Votre compte a été suspendu (${reason}). Contactez le support pour plus d'informations.`) +
        button("Contacter le support", `${APP_URL}/messages`)
    ),
  };
}

export function accountReactivatedEmail(firstName: string) {
  return {
    subject: "Votre compte a été réactivé",
    html: layout(
      "Compte réactivé",
      p(`Bonjour ${firstName},`) + p("Votre compte a été réactivé. Vous pouvez à nouveau vous connecter normalement.") + button("Me connecter", `${APP_URL}/login`)
    ),
  };
}

export function contractCancelledEmail(firstName: string, productTitle: string) {
  return {
    subject: "Votre contrat a été annulé",
    html: layout(
      "Contrat annulé",
      p(`Bonjour ${firstName},`) +
        p(`Votre achat "${productTitle}" a été annulé suite à un retard de paiement prolongé.`) +
        button("Contacter le support", `${APP_URL}/messages`)
    ),
  };
}

export function accessInfoReleasedEmail(firstName: string, productTitle: string) {
  return {
    subject: "Une information d'accès est disponible",
    html: layout(
      "Nouvelle information disponible",
      p(`Bonjour ${firstName},`) +
        p(`Une information concernant "${productTitle}" est disponible dans votre dashboard.`) +
        button("Consulter", `${APP_URL}/dashboard`)
    ),
  };
}

export function verificationCodeProvidedEmail(firstName: string, productTitle: string) {
  return {
    subject: "Votre code de vérification est disponible",
    html: layout(
      "Code de vérification disponible",
      p(`Bonjour ${firstName},`) +
        p(`Le code de vérification demandé pour "${productTitle}" est maintenant disponible dans votre dashboard.`) +
        button("Consulter", `${APP_URL}/dashboard`)
    ),
  };
}

export function passwordResetEmail(firstName: string, resetUrl: string) {
  return {
    subject: "Réinitialisation de votre mot de passe",
    html: layout(
      "Réinitialiser votre mot de passe",
      p(`Bonjour ${firstName},`) +
        p("Vous avez demandé la réinitialisation de votre mot de passe. Ce lien est valable 1 heure.") +
        button("Réinitialiser mon mot de passe", resetUrl) +
        p("Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email — votre mot de passe restera inchangé.")
    ),
  };
}

export function newMessageEmail(firstName: string) {
  return {
    subject: "Nouveau message de l'équipe VANTA",
    html: layout(
      "Nouveau message",
      p(`Bonjour ${firstName},`) + p("Vous avez reçu une réponse à votre message.") + button("Voir la conversation", `${APP_URL}/messages`)
    ),
  };
}
