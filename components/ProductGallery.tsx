"use client";

import { useEffect, useState } from "react";

interface MediaItem {
  id: string;
  url: string;
  mediaType: "IMAGE" | "VIDEO" | "THUMBNAIL";
}

export function ProductGallery({ media }: { media: MediaItem[] }) {
  const displayable = media;
  const [activeId, setActiveId] = useState(displayable[0]?.id ?? null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const active = displayable.find((m) => m.id === activeId) ?? displayable[0];

  useEffect(() => {
    if (!isLightboxOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsLightboxOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isLightboxOpen]);

  if (displayable.length === 0) {
    return <div className="product-gallery-empty" />;
  }

  return (
    <div className="product-gallery">
      <div className="product-gallery-main">
        {active.mediaType === "VIDEO" ? (
          <video className="product-gallery-media" src={active.url} controls playsInline onClick={() => setIsLightboxOpen(true)} />
        ) : (
          <button type="button" className="product-gallery-expand" onClick={() => setIsLightboxOpen(true)} aria-label="Agrandir l'image">
            <img className="product-gallery-media" src={active.url} alt="" />
          </button>
        )}
      </div>

      {displayable.length > 1 && (
        <div className="product-gallery-thumbnails">
          {displayable.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-label={`Afficher le média ${displayable.indexOf(m) + 1}`}
              onClick={() => setActiveId(m.id)}
              className={`product-gallery-thumbnail ${m.id === active.id ? "is-active" : ""}`}
            >
              {m.mediaType === "VIDEO" ? (
                <div className="product-gallery-video-thumb">
                  ▶
                </div>
              ) : (
                <img src={m.url} alt="" />
              )}
            </button>
          ))}
        </div>
      )}

      {isLightboxOpen && (
        <div className="product-gallery-lightbox" role="dialog" aria-modal="true" aria-label="Média agrandi" onClick={() => setIsLightboxOpen(false)}>
          <button type="button" className="product-gallery-lightbox-close" onClick={() => setIsLightboxOpen(false)} aria-label="Fermer">×</button>
          <div className="product-gallery-lightbox-content" onClick={(event) => event.stopPropagation()}>
            {active.mediaType === "VIDEO" ? (
              <video className="product-gallery-lightbox-media" src={active.url} controls autoPlay playsInline />
            ) : (
              <img className="product-gallery-lightbox-media" src={active.url} alt="" />
            )}
            {displayable.length > 1 && (
              <div className="product-gallery-lightbox-thumbnails">
                {displayable.map((m) => (
                  <button key={m.id} type="button" className={`product-gallery-thumbnail ${m.id === active.id ? "is-active" : ""}`} onClick={() => setActiveId(m.id)} aria-label={`Afficher le média ${displayable.indexOf(m) + 1}`}>
                    {m.mediaType === "VIDEO" ? <div className="product-gallery-video-thumb">▶</div> : <img src={m.url} alt="" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
