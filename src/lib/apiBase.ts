export function getApiBase() {
  const base = process.env.NEXT_PUBLIC_API_BASE?.trim();
  if (!base) return "";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}
