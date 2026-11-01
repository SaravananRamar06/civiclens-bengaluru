import { z } from "zod";
import { sameOrigin } from "@/lib/request-security";
import { appOrigin, localMode } from "@/lib/config";
import { publicDatabase } from "@/lib/supabase";
import { authorities } from "@/lib/routing";
import { isWorkEmail } from "@/lib/staff";
const input = z.object({
  email: z.email().max(254),
  password: z.string().min(10).max(200),
  authority: z.enum(Object.values(authorities) as [string, ...string[]]),
});
/** Creates an account that has no access until an administrator grants a role. */
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Same-origin request required" }, { status: 403 });
  if (localMode())
    return Response.json({ error: "Staff access requests are only available on the hosted site." }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Enter your work email, a password of at least 10 characters, and your authority." },
      { status: 400 },
    );
  const { email, password, authority } = parsed.data;
  if (!isWorkEmail(email))
    return Response.json({ error: "Use your work email, not a personal address." }, { status: 400 });
  try {
    const { error } = await publicDatabase().auth.signUp({
      email,
      password,
      options: {
        data: { requested_authority: authority },
        emailRedirectTo: appOrigin(),
      },
    });
    if (error?.status === 429)
      return Response.json({ error: "Too many requests right now. Try again later." }, { status: 429 });
    if (error) throw error;
    return Response.json({ requested: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Could not send your request. Try again." }, { status: 503 });
  }
}
