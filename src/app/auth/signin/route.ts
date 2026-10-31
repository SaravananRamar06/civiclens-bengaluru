import { authenticatedDatabase } from "@/lib/supabase";
import { appOrigin, localMode } from "@/lib/config";
import { apiFailure, ApiError } from "@/lib/cloud-reports";
export async function GET() {
  try {
    if (localMode()) throw new ApiError("Use the local workspace flow. Set CIVIC_LOCAL_MODE=false to use cloud sign-in.", 400);
    const client = await authenticatedDatabase();
    const { data, error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: appOrigin() + "/auth/callback" } });
    if (error || !data.url) throw new ApiError("Could not start Google sign-in. Check the provider and redirect configuration.", 502);
    return Response.redirect(data.url);
  } catch (error) { return apiFailure(error); }
}
