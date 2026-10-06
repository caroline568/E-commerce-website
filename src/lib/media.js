export function safePublicUrl(value) {
  if (typeof value !== "string" || value.length === 0) return null;
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
  ) {
    return value;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export function mediaPreviewUrl(media) {
  return safePublicUrl(
    media.mediaType === "video" ? media.posterUrl : media.url,
  );
}
