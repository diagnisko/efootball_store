"use client";

import { useState } from "react";

interface MediaItem {
  id: string;
  url: string;
  mediaType: "IMAGE" | "VIDEO" | "THUMBNAIL";
}

export function ProductGallery({ media }: { media: MediaItem[] }) {
  const displayable = media;
  const [activeId, setActiveId] = useState(displayable[0]?.id ?? null);
  const active = displayable.find((m) => m.id === activeId) ?? displayable[0];

  if (displayable.length === 0) {
    return <div className="product-gallery-empty" />;
  }

  return (
    <div className="product-gallery">
      <div className="product-gallery-main">
        {active.mediaType === "VIDEO" ? (
          <video className="product-gallery-media" src={active.url} controls playsInline />
        ) : (
          <img className="product-gallery-media" src={active.url} alt="" />
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
    </div>
  );
}
