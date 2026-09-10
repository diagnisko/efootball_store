import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeclarePaymentButton } from "@/components/DeclarePaymentButton";
import { DeclareDepositButton } from "@/components/DeclareDepositButton";
import { DeclareMultiplePaymentsButton } from "@/components/DeclareMultiplePaymentsButton";
import { RequestVerificationCodeButton } from "@/components/RequestVerificationCodeButton";
import { IconArrowRight } from "@/components/Icons";

const SCHEDULE_LABEL: Record<string, { label: string; className: string }> = {
  UPCOMING: { label: "À venir", className: "badge-muted" },
  DUE: { label: "À payer", className: "badge-warn" },
  AWAITING_VALIDATION: { label: "En attente de validation", className: "badge-danger" },
  PAID: { label: "Payé", className: "badge-ok" },
  LATE: { label: "En retard", className: "badge-danger" },
  PENALIZED: { label: "Pénalité appliquée", className: "badge-danger" },
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;

  const [user, purchase, notifications, notificationsTotal, accessInfo, conversation, verificationCodeRequest] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.purchase.findFirst({
      where: { userId, status: { in: ["AWAITING_DEPOSIT", "ACTIVE", "COMPLETED"] } },
      include: {
        product: { include: { media: { where: { isMain: true }, take: 1 } } },
        paymentPlan: { include: { schedules: { orderBy: { installmentNumber: "asc" } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.notification.count({ where: { userId } }),
    prisma.accessInformation.findMany({
      where: { visibleToClient: true, purchase: { userId, status: { in: ["ACTIVE", "COMPLETED"] } } },
      include: { purchase: { include: { product: true } } },
      orderBy: { releasedAt: "desc" },
    }),
    prisma.conversation.findFirst({
      where: { clientId: userId },
      orderBy: { createdAt: "desc" },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 3, include: { sender: true } } },
    }),
    prisma.verificationCodeRequest.findFirst({
      where: { purchase: { userId, status: { in: ["ACTIVE", "COMPLETED"] } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!user) redirect("/login");

  const schedules = purchase?.paymentPlan?.schedules ?? [];
  const paidAmount =
    schedules
      .filter((s) => s.status === "PAID")
      .reduce((sum, s) => sum + Number(s.amount), 0) +
    (purchase?.paymentPlan?.initialDepositStatus === "PAID"
      ? Number(purchase.paymentPlan.initialDepositAmount)
      : 0);
  const totalPrice = purchase ? Number(purchase.totalPrice) : 0;
  const progressPct = totalPrice > 0 ? Math.round((paidAmount / totalPrice) * 100) : 0;
  const nextDue = schedules.find((s) => s.status === "DUE" || s.status === "LATE");
  const receiptReady = purchase?.status === "COMPLETED" && purchase.paymentPlan?.status === "COMPLETED";

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <h2>Bonjour, {user.firstName} 👋</h2>
          <p>Voici l&apos;état de votre dossier VANTA aujourd&apos;hui.</p>
        </div>
      </div>

      {user.verificationStatus !== "VERIFIED" && (
        <div className="panel card u-mb-5" style={{ borderColor: "var(--warn)" }}>
          <h3>Vérification requise</h3>
          <p className="u-muted">
            Votre statut actuel :{" "}
            <strong>
              {user.verificationStatus === "PENDING"
                ? "en attente de vérification"
                : user.verificationStatus === "REJECTED"
                  ? "refusé — merci de corriger votre dossier"
                  : "profil à compléter"}
            </strong>
            . Vous devez être vérifié pour pouvoir acheter.
          </p>
          {user.verificationStatus !== "PENDING" && (
            <Link href="/verification" className="btn btn-primary u-mt-3">
              Compléter ma vérification
            </Link>
          )}
        </div>
      )}

      {!purchase && (
        <div className="panel card">
          <h3>Aucun achat en cours</h3>
          <p className="u-muted">Parcourez le catalogue pour trouver votre prochain compte.</p>
          <Link href="/" className="btn btn-primary u-mt-3">Voir le catalogue</Link>
        </div>
      )}

      {purchase && purchase.status === "AWAITING_DEPOSIT" && (
        <div className="panel card">
          <h3>Mon achat</h3>
          <div className="purchase-row u-mb-4">
            <div className="thumb">
              {purchase.product.media[0]?.url && <img src={purchase.product.media[0].url} alt={purchase.product.title} />}
            </div>
            <div className="u-flex-1">
              <h4>{purchase.product.title}</h4>
              <span className="badge badge-warn u-mb-2">En attente d&apos;apport initial</span>
              <div className="price">{Number(purchase.totalPrice).toLocaleString("fr-FR")} FCFA</div>
            </div>
          </div>
          <p className="u-muted u-mb-4">
            Votre réservation est enregistrée. Déclarez votre {purchase.paymentPlan?.paymentMode === "ONE_TIME" ? "paiement comptant" : "apport initial"} de{" "}
            {purchase.paymentPlan ? Number(purchase.paymentPlan.initialDepositAmount).toLocaleString("fr-FR") : "—"}{" "}
            FCFA{purchase.paymentPlan?.paymentMode === "ONE_TIME" ? " pour finaliser votre achat." : ` pour activer votre plan de paiement sur ${purchase.paymentPlan?.installmentsCount ?? 8} mois.`}
          </p>
          {purchase.paymentPlan && (
            <DeclareDepositButton
              purchaseId={purchase.id}
              amount={Number(purchase.paymentPlan.initialDepositAmount)}
              depositStatus={purchase.paymentPlan.initialDepositStatus}
            />
          )}
        </div>
      )}

      {purchase && purchase.status !== "AWAITING_DEPOSIT" && (
        <>
          <div className="dash-grid">
            <div className="panel card">
              <h3>Mon achat</h3>
              <div className="purchase-row">
                <div className="thumb">
                  {purchase.product.media[0]?.url && <img src={purchase.product.media[0].url} alt={purchase.product.title} />}
                </div>
                <div className="u-flex-1">
                  <h4>{purchase.product.title}</h4>
                  <div className="price">
                    {totalPrice.toLocaleString("fr-FR")} FCFA
                  </div>
                  {receiptReady && (
                    <a className="btn btn-primary btn-mini u-mt-2" href={`/api/purchases/${purchase.id}/receipt`} download>
                      Télécharger mon reçu détaillé
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="panel card">
              <h3>Ma progression</h3>
              <div className="progress-numbers">
                <div>
                  <b>{paidAmount.toLocaleString("fr-FR")}</b>{" "}
                  <span className="of">/ {totalPrice.toLocaleString("fr-FR")} FCFA</span>
                </div>
                <div>{progressPct}%</div>
              </div>
              <div className="rail">
                {schedules.map((s) => (
                  <div
                    key={s.id}
                    className={`rail-seg ${s.status === "PAID" ? "filled" : ""} ${
                      s.status === "DUE" || s.status === "LATE" ? "current" : ""
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="panel card access-delivery-panel u-mb-5">
            <div className="card-head">
              <div>
                <h3>Accès du compte</h3>
                <p className="u-muted-sm">Vos identifiants et votre code de vérification sont regroupés ici.</p>
              </div>
              <span className={`badge ${accessInfo.length > 0 ? "badge-ok" : "badge-warn"}`}>
                {accessInfo.length > 0 ? "Disponible" : "En attente de remise"}
              </span>
            </div>
            {accessInfo.length > 0 ? (
              <div className="stack-sm">
                {accessInfo.map((info) => (
                  <div key={info.id} className="access-info-item">
                    <div className="card-head u-mb-2">
                      <h4 style={{ fontSize: 14 }}>{info.title}</h4>
                    </div>
                    <pre style={{ fontFamily: "'JetBrains Mono'", fontSize: 12, color: "var(--ivory)", whiteSpace: "pre-wrap" }}>
                      {info.content}
                    </pre>
                  </div>
                ))}
              </div>
            ) : (
              <p className="access-pending-note">
                Les identifiants seront visibles ici dès que l&apos;administrateur aura validé votre paiement et remis le compte.
              </p>
            )}

            <div className="verification-request-box">
              <div>
                <h4 style={{ fontSize: 13 }}>Code de vérification (2FA)</h4>
                <p className="u-muted-sm">Demandez le code reçu sur l&apos;email ou le téléphone associé au compte.</p>
              </div>
              {!verificationCodeRequest || verificationCodeRequest.status === "CANCELLED" ? (
                <RequestVerificationCodeButton purchaseId={purchase.id} />
              ) : verificationCodeRequest.status === "PENDING" ? (
                <span className="badge badge-warn">Demande en attente</span>
              ) : (
                <div className="access-info-item verification-code-value">
                  <span className="u-muted-sm">Code fourni</span>
                  <strong className="mono">{verificationCodeRequest.code}</strong>
                </div>
              )}
            </div>
          </div>

          {nextDue && (
            <div className="panel card u-mb-5">
              <h3>Prochaine échéance</h3>
              <div className="next-due">
                <div>
                  <div className="amount">
                    {Number(nextDue.amount).toLocaleString("fr-FR")} FCFA
                  </div>
                  <div className="meta">
                    Échéance n°{nextDue.installmentNumber} — due le{" "}
                    {new Intl.DateTimeFormat("fr-FR").format(nextDue.dueDate)}
                  </div>
                </div>
                <DeclarePaymentButton scheduleId={nextDue.id} amount={Number(nextDue.amount)} />
              </div>
            </div>
          )}

          <DeclareMultiplePaymentsButton
            schedules={schedules.map((schedule) => ({
              id: schedule.id,
              installmentNumber: schedule.installmentNumber,
              amount: Number(schedule.amount),
              status: schedule.status,
            }))}
          />

          <div className="panel card u-mb-5">
            <h3>Mes échéances</h3>
            <table>
              <thead>
                <tr>
                  <th>Mois</th>
                  <th>Montant</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => {
                  const status = SCHEDULE_LABEL[s.status] ?? SCHEDULE_LABEL.UPCOMING;
                  return (
                    <tr key={s.id}>
                      <td className="mono">{s.installmentNumber}</td>
                      <td className="mono">{Number(s.amount).toLocaleString("fr-FR")} FCFA</td>
                      <td className="mono">{new Intl.DateTimeFormat("fr-FR").format(s.dueDate)}</td>
                      <td>
                        <span className={`badge ${status.className}`}>{status.label}</span>
                      </td>
                      <td>
                        {(s.status === "DUE" || s.status === "LATE") && (
                          <DeclarePaymentButton scheduleId={s.id} amount={Number(s.amount)} mini />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {conversation && conversation.messages.length > 0 && (
        <div className="panel card u-mb-5">
          <div className="card-head">
            <h3>Mes messages</h3>
            <Link href="/messages" className="link-arrow">Voir tout <IconArrowRight /></Link>
          </div>
          {conversation.messages.slice().reverse().map((m) => (
            <div className="msg-item" key={m.id}>
              <div className="avatar">{m.sender.firstName[0]}</div>
              <div className="u-flex-1">
                <h5>{m.senderId === userId ? "Vous" : `${m.sender.firstName} ${m.sender.lastName}`}</h5>
                <p>{m.content.length > 80 ? m.content.slice(0, 80) + "…" : m.content}</p>
              </div>
              <div className="time">
                {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(m.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="panel card">
        <div className="card-head">
          <h3>Notifications</h3>
          {notificationsTotal > notifications.length && (
            <span className="u-muted-sm">
              {notifications.length} plus récentes sur {notificationsTotal}
            </span>
          )}
        </div>
        {notifications.length === 0 && <p className="u-muted">Rien de nouveau pour l&apos;instant.</p>}
        {notifications.map((n) => (
          <div className="notif-item" key={n.id}>
            <div className={`notif-dot ${n.isRead ? "is-read" : "is-unread"}`} />
            <div>
              <p>{n.body}</p>
              <div className="time">
                {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(
                  n.createdAt
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
