import { prisma } from "@/lib/prisma";
import { LateRulesForm } from "@/components/LateRulesForm";
import { RunLateJobButton } from "@/components/RunLateJobButton";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const rule = await prisma.latePaymentRule.findFirst();

  return (
    <div>
      <div className="bo-page-header">
        <div>
          <h1>Règles de retard &amp; pénalités</h1>
          <p>
            Ces règles sont appliquées par le job quotidien (section 21 du cahier des charges) :
            délai de grâce, pénalité, seuils de suspension et d&apos;annulation.
          </p>
        </div>
      </div>

      <div className="bo-section" style={{ marginBottom: 20 }}>
        <LateRulesForm
          initial={{
            gracePeriodDays: rule?.gracePeriodDays ?? 3,
            penaltyType: (rule?.penaltyType ?? "PERCENTAGE") as "FIXED" | "PERCENTAGE",
            penaltyValue: rule ? Number(rule.penaltyValue) : 5,
            maxLateDaysBeforeSuspension: rule?.maxLateDaysBeforeSuspension ?? 15,
            maxLateDaysBeforeCancellation: rule?.maxLateDaysBeforeCancellation ?? 45,
          }}
        />
      </div>

      <div className="bo-section">
        <div className="bo-section-head"><h3>Exécution du job</h3></div>
        <p style={{ fontSize: 13, color: "var(--bo-muted)", marginBottom: 16 }}>
          En production, ce job tourne automatiquement chaque jour (cron Vercel ou équivalent,
          voir <code className="bo-code">README.md</code>). Ce bouton
          permet de le déclencher manuellement pour vérifier son comportement.
        </p>
        <RunLateJobButton />
      </div>
    </div>
  );
}
