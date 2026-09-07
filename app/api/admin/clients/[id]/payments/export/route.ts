import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireCapability } from "@/lib/permissions";

function csvCell(value: string | number | Date | null | undefined) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const actorId = (session.user as { id: string }).id;
  try {
    await requireCapability(actorId, "view_clients");
  } catch {
    return NextResponse.json({ error: "Permission refusée." }, { status: 403 });
  }

  const client = await prisma.user.findUnique({ where: { id: params.id }, include: { role: true } });
  if (!client || client.role.name !== "CLIENT") return NextResponse.json({ error: "Client introuvable." }, { status: 404 });

  const url = new URL(req.url);
  const fromText = url.searchParams.get("from");
  const toText = url.searchParams.get("to");
  const from = fromText ? new Date(`${fromText}T00:00:00.000Z`) : null;
  const to = toText ? new Date(`${toText}T23:59:59.999Z`) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || (from && to && from > to)) {
    return NextResponse.json({ error: "Période invalide." }, { status: 400 });
  }

  const plans = await prisma.paymentPlan.findMany({
    where: { purchase: { userId: client.id } },
    include: {
      purchase: { include: { product: true } },
      schedules: { where: { status: "PAID" }, orderBy: { paidAt: "asc" } },
      submissions: { where: { status: "CONFIRMED" }, include: { confirmation: true }, orderBy: { submittedAt: "asc" } },
    },
  });

  const rows: Array<[string, string, string, string, string, string, string]> = [];
  for (const plan of plans) {
    const product = plan.purchase.product.title;
    for (const submission of plan.submissions) {
      const date = submission.confirmation?.reviewedAt ?? submission.submittedAt;
      if ((!from || date >= from) && (!to || date <= to)) {
        rows.push([date.toISOString(), client.firstName + " " + client.lastName, client.email, product, "Apport initial", "Confirmé", Number(plan.initialDepositAmount).toFixed(2)]);
      }
    }
    for (const schedule of plan.schedules) {
      const date = schedule.paidAt ?? schedule.dueDate;
      if ((!from || date >= from) && (!to || date <= to)) {
        rows.push([date.toISOString(), client.firstName + " " + client.lastName, client.email, product, `Échéance ${schedule.installmentNumber}`, "Payé", Number(schedule.amount).toFixed(2)]);
      }
    }
  }

  const header = ["Date", "Client", "Email", "Produit", "Type", "Statut", "Montant (FCFA)"];
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const filename = `historique-paiements-${client.email.replace(/[^a-z0-9]+/gi, "-")}.csv`;
  return new NextResponse(`\ufeff${csv}\r\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}