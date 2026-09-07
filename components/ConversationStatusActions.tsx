"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toast";

export function ConversationStatusActions({ conversationId, currentStatus }: { conversationId: string; currentStatus: string }) {
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();
  const toast = useToast();

  async function setStatus(status: "OPEN" | "ARCHIVED" | "RESOLVED") {
    setLoading(status);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast.error("Une erreur est survenue.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      {currentStatus !== "RESOLVED" && (
        <button className="bo-btn bo-btn-sm" disabled={!!loading} onClick={() => setStatus("RESOLVED")}>
          {loading === "RESOLVED" ? "..." : "Marquer comme traité"}
        </button>
      )}
      {currentStatus !== "ARCHIVED" && (
        <button className="bo-btn bo-btn-sm" disabled={!!loading} onClick={() => setStatus("ARCHIVED")}>
          {loading === "ARCHIVED" ? "..." : "Archiver"}
        </button>
      )}
    </div>
  );
}
