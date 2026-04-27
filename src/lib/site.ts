export function getSiteUrl(): string {
  const raw = import.meta.env.VITE_SITE_URL ?? "";
  return raw.replace(/\/$/, "");
}
