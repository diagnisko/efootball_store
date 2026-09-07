import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runLatePaymentJob } from "@/lib/late-payment-job";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCron = !!cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    const session = await getServerSession(authOptions);
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }
  }

  const summary = await runLatePaymentJob();
  return NextResponse.json(summary);
}
