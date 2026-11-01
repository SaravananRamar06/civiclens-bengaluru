import { z } from "zod";
import { sameOrigin } from "@/lib/request-security";
import { localMode } from "@/lib/config";
import { authenticatedDatabase } from "@/lib/supabase";
import { apiFailure, ApiError } from "@/lib/cloud-reports";
const input = z.object({ email: z.email().max(254), password: z.string().min(1).max(200) });
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Same-origin request required" }, { status: 403 });
  if (localMode())
    return Response.json({ error: "Staff sign-in is only available on the hosted site." }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return Response.json({ error: "Enter your email and password." }, { status: 400 });
  try {
    const client = await authenticatedDatabase();
    const { data, error } = await client.auth.signInWithPassword(parsed.data);
    if (error?.code === "email_not_confirmed") throw new ApiError("Confirm your email first, using the link we sent you.", 403);
    if (error || !data.user) throw new ApiError("Email or password is incorrect.", 401);
    const staff = await client.from("civic_operators").select("role,authority").eq("user_id", data.user.id).maybeSingle();
    if (staff.error) throw new ApiError("Could not check your staff role. Try again.");
    if (!staff.data) {
      await client.auth.signOut({ scope: "local" });
      throw new ApiError("Your access hasn’t been approved yet. An administrator needs to review it.", 403);
    }
    return Response.json(
      { role: staff.data.role, authority: staff.data.authority },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
