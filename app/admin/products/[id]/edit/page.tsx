import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/ProductForm";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: { media: { orderBy: { position: "asc" } } },
  });
  if (!product) notFound();

  const features = (product.features as { ovr?: number; platform?: string; coins?: number; division?: number }) ?? {};

  return (
    <div>
      <div className="bo-page-header">
        <div><h1>Modifier : {product.title}</h1></div>
      </div>
      <ProductForm
        initial={{
          id: product.id,
          title: product.title,
          description: product.description,
          priceTotal: Number(product.priceTotal),
          initialDepositAmount: Number(product.initialDepositAmount),
          installmentsCount: product.installmentsCount,
          status: product.status,
          featured: product.featured,
          importantInfo: product.importantInfo ?? "",
          platform: features.platform ?? "Mobile",
          ovr: features.ovr,
          coins: features.coins,
          division: features.division,
          media: product.media.map((m) => ({ mediaType: m.mediaType, url: m.url, isMain: m.isMain })),
        }}
      />
    </div>
  );
}
