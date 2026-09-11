const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM?.trim() || "Misterdou <no-reply@misterdou.com>";

interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
}

/**
 * Envoie un email transactionnel via l'API Resend. Ne lève JAMAIS d'exception : un échec
 * d'envoi d'email ne doit jamais faire échouer l'action métier qui l'a déclenché (confirmer un
 * paiement, valider une identité...). Les notifications in-app restent la source de vérité ;
 * l'email est un canal supplémentaire, pas une dépendance dure.
 *
 * Si RESEND_API_KEY n'est pas configuré, la fonction ne fait rien (silencieusement côté
 * utilisateur, avec un simple avertissement en log serveur) plutôt que de planter — utile pour
 * développer/tester sans avoir de compte Resend.
 */
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<{ ok: boolean; skipped: boolean }> {
  if (!RESEND_API_KEY) {
    const recipients = Array.isArray(to) ? to.join(", ") : to;
    console.warn(`[email] RESEND_API_KEY non configuré — email "${subject}" à ${recipients} non envoyé (notification in-app conservée).`);
    return { ok: false, skipped: true };
  }

  const recipients = (Array.isArray(to) ? to : [to]).map((value) => value.trim()).filter(Boolean);
  if (recipients.length === 0) {
    console.warn(`[email] Aucun destinataire valide pour "${subject}".`);
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: recipients, subject, html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      console.error(`[email] Échec d'envoi à ${recipients.join(", ")} ("${subject}") :`, body);
      return { ok: false, skipped: false };
    }
    return { ok: true, skipped: false };
  } catch (e) {
    console.error(`[email] Erreur réseau lors de l'envoi à ${recipients.join(", ")} :`, e);
    return { ok: false, skipped: false };
  }
}
