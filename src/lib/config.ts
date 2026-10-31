export const localMode = () => process.env.CIVIC_LOCAL_MODE === "true" && !process.env.VERCEL;
export function supabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw Error("Supabase is not configured");
  return { url, key };
}
export function appOrigin() {
  const raw = process.env.APP_ORIGIN || (localMode() ? "http://127.0.0.1:3000" : "");
  if (!raw) throw Error("APP_ORIGIN is required for cloud authentication");
  const url = new URL(raw);
  if (!["https:", "http:"].includes(url.protocol) || url.origin !== raw || url.username || url.password)
    throw Error("APP_ORIGIN must contain only the public origin, without a trailing slash");
  if (url.protocol !== "https:" && !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname))
    throw Error("Public cloud authentication requires HTTPS");
  return url.origin;
}
