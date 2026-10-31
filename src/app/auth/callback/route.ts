import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function GET(request: Request) {
  const url = new URL(request.url),
    code = url.searchParams.get("code");
  const host = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!code || !host || !key)
    return Response.json(
      { error: "Missing OAuth code or configuration." },
      { status: 400 },
    );
  const jar = await cookies();
  const client = createServerClient(host, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) =>
        values.forEach(({ name, value, options }) =>
          jar.set(name, value, options),
        ),
    },
  });
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error)
    return Response.json(
      { error: "Sign-in failed. Please restart Google sign-in." },
      { status: 401 },
    );
  return Response.redirect(new URL("/", request.url));
}
