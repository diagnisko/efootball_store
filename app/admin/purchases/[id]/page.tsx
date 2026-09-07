import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AccessInfoManager } from "@/components/AccessInfoManager";

export default async function AdminPurchaseDetailPage({ params }: { params: { id: string } }) {
  const purchase = await prisma.purchase.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      product: true,
      accessInformation: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!purchase) notFound();

  return (
    <div>
      <div className="bo-page-header">
        <div>
          <h1>{purchase.product.title}</h1>
          <p>
            {purchase.user.firstName} {purchase.user.lastName} — <span className="mono">{purchase.user.email}</span>
          </p>
        </div>
      </div>

      <AccessInfoManager
        purchaseId={purchase.id}
        items={purchase.accessInformation.map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          visibleToClient: a.visibleToClient,
          createdAt: a.createdAt.toISOString(),
          releasedAt: a.releasedAt ? a.releasedAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
