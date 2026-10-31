import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export async function GET(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    return Response.json(
      {
        error:
          "Google sign-in is not configured. Configure Supabase Auth with the Google provider and callback URLs before submitting reports.",
      },
      { status: 503 },
    );
  const jar = await cookies();
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (values) =>
        values.forEach(({ name, value, options }) =>
          jar.set(name, value, options),
        ),
    },
  });
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: new URL("/auth/callback", request.url).toString() },
  });
  if (error || !data.url)
    return Response.json(
      { error: "Could not start Google sign-in." },
      { status: 502 },
    );
  return Response.redirect(data.url);
}
