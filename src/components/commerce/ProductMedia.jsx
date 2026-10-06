import { useState } from "react";
import { mediaPreviewUrl, safePublicUrl } from "../../lib/media";

function MediaView({ media, eager = false }) {
  if (media.mediaType === "video") {
    const videoUrl = safePublicUrl(media.url);
    if (!videoUrl) {
      return <p role="alert">This video is currently unavailable.</p>;
    }
    const captionsUrl = safePublicUrl(media.captionsUrl);
    const transcriptUrl = safePublicUrl(media.transcriptUrl);

    return (
      <div className="product-media-video">
        <video
          controls
          preload="metadata"
          poster={safePublicUrl(media.posterUrl) || undefined}
          aria-label={media.alt}
        >
          <source src={videoUrl} />
          {captionsUrl && (
            <track
              kind="captions"
              src={captionsUrl}
              srcLang={media.captionsLanguage || "en"}
              label="Captions"
              default
            />
          )}
        </video>
        {transcriptUrl && (
          <a className="text-link" href={transcriptUrl}>
            Read the video transcript
          </a>
        )}
      </div>
    );
  }

  const imageUrl = mediaPreviewUrl(media);
  if (!imageUrl) {
    return <p role="alert">This image is currently unavailable.</p>;
  }

  return (
    <img
      src={imageUrl}
      alt={media.alt}
      width={media.width || undefined}
      height={media.height || undefined}
      loading={eager ? "eager" : "lazy"}
    />
  );
}

export function ProductGallery({ media, productTitle }) {
  const galleryMedia = media.filter((item) =>
    ["main", "gallery"].includes(item.role) &&
    (mediaPreviewUrl(item) || (item.mediaType === "video" && safePublicUrl(item.url))),
  );
  const initialMedia =
    galleryMedia.find((item) => item.role === "main") ||
    galleryMedia.find((item) => item.mediaType === "image") ||
    galleryMedia[0];
  const [selectedId, setSelectedId] = useState(initialMedia?.id);
  const selected =
    galleryMedia.find((item) => item.id === selectedId) || initialMedia;

  if (!selected) {
    return (
      <div className="image-placeholder image-placeholder-large">
        {productTitle}
      </div>
    );
  }

  return (
    <div className="product-gallery" role="group" aria-label="Product media">
      <figure className="product-gallery-feature">
        <MediaView media={selected} eager />
        {selected.caption && <figcaption>{selected.caption}</figcaption>}
      </figure>
      {galleryMedia.length > 1 && (
        <div className="product-gallery-thumbnails" aria-label="More views">
          {galleryMedia.map((item, index) => (
            <button
              className="product-gallery-thumbnail"
              key={item.id}
              type="button"
              aria-label={`View ${item.alt || `product view ${index + 1}`}`}
              aria-pressed={selected.id === item.id}
              onClick={() => setSelectedId(item.id)}
            >
              {item.mediaType === "video" ? (
                <span className="video-thumbnail">
                  {mediaPreviewUrl(item) ? (
                    <img src={mediaPreviewUrl(item)} alt="" loading="lazy" />
                  ) : (
                    "Play video"
                  )}
                  <span aria-hidden="true">▶</span>
                </span>
              ) : (
                <img src={mediaPreviewUrl(item)} alt="" loading="lazy" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const mediaSections = [
  {
    role: "lifestyle",
    eyebrow: "In real life",
    title: "The piece in daily life",
  },
  { role: "process", eyebrow: "Made by hand", title: "The process" },
  { role: "detail", eyebrow: "Look closer", title: "The details" },
  {
    role: "workshop",
    eyebrow: "Where it is made",
    title: "Inside the workshop",
  },
  { role: "maker", eyebrow: "The people behind it", title: "Meet the maker" },
  {
    role: "customer",
    eyebrow: "Shared by the community",
    title: "In their own spaces",
  },
];

export function ProductMediaSections({ media }) {
  return mediaSections.map(({ role, eyebrow, title }) => {
    const items = media.filter(
      (item) =>
        item.role === role &&
        (mediaPreviewUrl(item) ||
          (item.mediaType === "video" && safePublicUrl(item.url))),
    );
    if (items.length === 0) return null;

    return (
      <section className={`product-media-section media-${role}`} key={role}>
        <div className="product-media-section-heading">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        <div className="product-media-grid">
          {items.map((item) => (
            <figure key={item.id}>
              <MediaView media={item} />
              {item.caption && <figcaption>{item.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </section>
    );
  });
}
