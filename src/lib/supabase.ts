import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig, appOrigin } from "./config";
export function publicDatabase() {
  const { url, key } = supabaseConfig();
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function authenticatedDatabase() {
  const jar = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient(
    url,
    key,
    {
      cookieOptions: { httpOnly: true, sameSite: "lax", secure: appOrigin().startsWith("https:") },
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) =>
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          ),
      },
    },
  );
}
export function workerDatabase() {
  const { url } = supabaseConfig();
  if (!process.env.SUPABASE_SECRET_KEY) throw Error("Server worker credential is not configured");
  return createClient(url, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
