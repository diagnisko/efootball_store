import { ProductForm } from "@/components/ProductForm";

export default function NewProductPage() {
  return (
    <div>
      <div className="bo-page-header">
        <div><h1>Nouvelle offre</h1></div>
      </div>
      <ProductForm />
    </div>
  );
}
