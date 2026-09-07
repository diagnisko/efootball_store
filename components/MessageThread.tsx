"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { uploadFileViaPresignedPost } from "@/lib/uploadFile";
import { useToast } from "@/components/Toast";

interface MessageItem {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  isMine: boolean;
  hasAttachment: boolean;
}

export function MessageThread({
  conversationId,
  initialMessages,
  currentUserId,
  mode,
}: {
  conversationId: string | null;
  initialMessages: MessageItem[];
  currentUserId: string;
  mode: "client" | "staff";
}) {
  const [content, setContent] = useState("");
  const [attachmentKey, setAttachmentKey] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversationId) {
      fetch(`/api/conversations/${conversationId}/read`, { method: "POST" }).catch(() => {});
    }
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [initialMessages.length]);

  async function handleAttachmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAttachment(true);
    try {
      const result = await uploadFileViaPresignedPost("/api/uploads/message-attachment", file);
      setAttachmentKey(result.key);
      setAttachmentName(file.name);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'upload.");
    } finally {
      setUploadingAttachment(false);
      e.target.value = "";
    }
  }

  async function send() {
    if (!content.trim() && !attachmentKey) return;
    setLoading(true);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          conversationId: conversationId ?? undefined,
          attachmentKey: attachmentKey ?? undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setContent("");
      setAttachmentKey(null);
      setAttachmentName(null);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="panel card msg-thread">
      <div className="msg-list">
        {initialMessages.length === 0 && (
          <p className="u-muted">
            {mode === "client"
              ? "Aucun message pour l'instant. Écrivez-nous ci-dessous."
              : "Aucun message dans cette conversation."}
          </p>
        )}
        {initialMessages.map((m) => (
          <div key={m.id} className={`msg-bubble ${m.isMine ? "is-mine" : "is-theirs"}`}>
            <div className="msg-meta">
              {m.isMine ? "Vous" : m.senderName} ·{" "}
              {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(m.createdAt))}
            </div>
            <div className="msg-body">{m.content}</div>
            {m.hasAttachment && (
              <a
                href={`/api/attachments/message/${m.id}`}
                target="_blank"
                rel="noreferrer"
                className="msg-attachment-link"
              >
                📎 Pièce jointe
              </a>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {attachmentName && (
        <div className="u-muted-sm u-mb-2" style={{ color: "var(--cyan)", display: "flex", alignItems: "center", gap: 8 }}>
          📎 {attachmentName}
          <button
            onClick={() => { setAttachmentKey(null); setAttachmentName(null); }}
            style={{ background: "none", border: "none", color: "var(--muted-2)", cursor: "pointer", fontSize: 11 }}
          >
            retirer
          </button>
        </div>
      )}

      <div className="msg-composer">
        <label
          className="btn btn-ghost btn-mini"
          style={{ cursor: uploadingAttachment ? "wait" : "pointer", padding: "9px 10px" }}
          title="Joindre un fichier"
        >
          {uploadingAttachment ? "..." : "📎"}
          <input type="file" accept="image/*,.pdf" style={{ display: "none" }} disabled={uploadingAttachment} onChange={handleAttachmentChange} />
        </label>
        <textarea
          rows={1}
          placeholder="Écrire un message..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          className="msg-input"
        />
        <button className="btn btn-primary btn-mini" onClick={send} disabled={loading || (!content.trim() && !attachmentKey)}>
          {loading ? "..." : "Envoyer"}
        </button>
      </div>
    </div>
  );
}
