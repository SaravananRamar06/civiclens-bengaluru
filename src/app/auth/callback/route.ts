import { authenticatedDatabase } from "@/lib/supabase";
import { appOrigin, localMode } from "@/lib/config";
import { apiFailure, ApiError } from "@/lib/cloud-reports";
export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get("code");
    if (localMode() || !code) throw new ApiError("Missing OAuth code or cloud configuration.", 400);
    const client = await authenticatedDatabase();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) return Response.redirect(new URL("/?auth=failed", appOrigin()));
    return Response.redirect(new URL("/", appOrigin()));
  } catch (error) { return apiFailure(error); }
}
