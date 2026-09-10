import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const purchase = await prisma.purchase.findFirst({
    where: { id: params.id, userId },
    include: {
      user: true,
      product: true,
      paymentPlan: { include: { schedules: { orderBy: { installmentNumber: "asc" } } } },
    },
  });
  if (!purchase) return NextResponse.json({ error: "Achat introuvable." }, { status: 404 });

  const plan = purchase.paymentPlan;
  const isPaid = purchase.status === "COMPLETED" && plan?.status === "COMPLETED";
  if (!isPaid) {
    return NextResponse.json({ error: "Le reçu sera disponible après le paiement complet." }, { status: 403 });
  }

  const paidSchedules = plan.schedules.filter((schedule) => schedule.status === "PAID");
  const initialAmount = Number(plan.initialDepositAmount);
  const total = Number(purchase.totalPrice);
  const rows = [
    `<tr><td>${plan.paymentMode === "ONE_TIME" ? "Paiement comptant" : "Apport initial"}</td><td>${initialAmount.toLocaleString("fr-FR")} FCFA</td><td>Validé</td></tr>`,
    ...paidSchedules.map((schedule) => `<tr><td>Mois ${schedule.installmentNumber}</td><td>${Number(schedule.amount).toLocaleString("fr-FR")} FCFA</td><td>Payé le ${new Intl.DateTimeFormat("fr-FR").format(schedule.paidAt ?? schedule.dueDate)}</td></tr>`),
  ].join("");
  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Reçu VANTA - ${escapeHtml(purchase.product.title)}</title><style>
    body{font-family:Arial,sans-serif;color:#14231d;max-width:760px;margin:40px auto;padding:0 24px}header{border-bottom:3px solid #c9f269;padding-bottom:18px;margin-bottom:28px}h1{margin:0 0 6px}h2{margin-top:30px;font-size:18px}p{line-height:1.5}.meta{color:#52665c}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{text-align:left;padding:12px 8px;border-bottom:1px solid #d7e5dc}th{background:#e7efe9}.total{font-size:20px;font-weight:700;text-align:right;margin-top:24px}.success{padding:14px;background:#eff9d5;border-left:4px solid #8cb83e}@media print{body{margin:0}}
  </style></head><body><header><h1>VANTA</h1><div class="meta">Reçu de paiement définitif</div></header>
    <p><strong>Client :</strong> ${escapeHtml(`${purchase.user.firstName} ${purchase.user.lastName}`)}<br><strong>E-mail :</strong> ${escapeHtml(purchase.user.email)}<br><strong>Date d'émission :</strong> ${date}</p>
    <h2>Achat</h2><p><strong>${escapeHtml(purchase.product.title)}</strong><br>Mode : ${plan.paymentMode === "ONE_TIME" ? "Paiement comptant" : `Paiement en ${plan.installmentsCount} mois`}</p>
    <h2>Détail des paiements</h2><table><thead><tr><th>Élément</th><th>Montant</th><th>État</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="total">Total payé : ${total.toLocaleString("fr-FR")} FCFA</div><p class="success">Paiement intégral confirmé. Ce reçu est associé à l'achat de ${escapeHtml(purchase.product.title)}.</p>
  </body></html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="recu-vanta-${purchase.id}.html"`,
    },
  });
}