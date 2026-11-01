import { z } from "zod";
import { sameOrigin } from "@/lib/request-security";
import { localMode } from "@/lib/config";
import { workerDatabase } from "@/lib/supabase";
import { apiFailure, ApiError, cloudIdentity } from "@/lib/cloud-reports";
import { authorities } from "@/lib/routing";
const input = z
  .object({
    email: z.email().max(254),
    password: z.string().min(10).max(200),
    role: z.enum(["admin", "officer"]),
    authority: z.enum(Object.values(authorities) as [string, ...string[]]).optional(),
  })
  .refine((v) => v.role === "admin" || !!v.authority);
async function requireAdmin() {
  if (localMode()) throw new ApiError("Staff accounts are only available on the hosted site.", 403);
  const { role } = await cloudIdentity();
  if (role !== "admin") throw new ApiError("Administrator access required.", 403);
}
export async function GET() {
  try {
    await requireAdmin();
    const worker = workerDatabase();
    const [staff, users] = await Promise.all([
      worker.from("civic_operators").select("user_id,role,authority,created_at").order("created_at"),
      worker.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    if (staff.error || users.error) throw new ApiError("Could not load staff accounts.");
    const emails = new Map(users.data.users.map((user) => [user.id, user.email]));
    return Response.json(
      { staff: staff.data.map((s) => ({ email: emails.get(s.user_id) ?? "Unknown", role: s.role, authority: s.authority })) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Same-origin request required" }, { status: 403 });
  try {
    await requireAdmin();
    const parsed = input.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new ApiError("Enter an email, a password of at least 10 characters, and an authority for officers.", 400);
    const { email, password, role, authority } = parsed.data;
    const worker = workerDatabase();
    const created = await worker.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw new ApiError("Could not create this account. The email may already be in use.", 409);
    const granted = await worker.from("civic_operators").insert({
      user_id: created.data.user.id,
      role,
      authority: role === "officer" ? authority : null,
    });
    if (granted.error) {
      await worker.auth.admin.deleteUser(created.data.user.id);
      throw new ApiError("Could not assign the role, so the account was not created.");
    }
    return Response.json({ email, role, authority: role === "officer" ? authority : null }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiFailure(error);
  }
}
