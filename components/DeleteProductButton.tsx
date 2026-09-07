"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";

export function DeleteProductButton({ productId, title }: { productId: string; title: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const confirmDialog = useConfirm();

  async function handleDelete() {
    if (!(await confirmDialog(`Supprimer définitivement "${title}" ? Cette action est irréversible.`))) return;
    setLoading(true);
    const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Une erreur est survenue.");
      return;
    }
    router.refresh();
  }

  return (
    <button className="bo-btn bo-btn-sm" onClick={handleDelete} disabled={loading}>
      {loading ? "..." : "Supprimer"}
    </button>
  );
}
