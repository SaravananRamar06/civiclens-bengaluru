import { sameOrigin } from "@/lib/request-security";
import { authenticatedDatabase } from "@/lib/supabase";
import { cloudIdentity, ApiError, apiFailure } from "@/lib/cloud-reports";
import {
  localMode,
  localOwner,
  startLocalSession,
  endLocalSession,
} from "@/lib/local-workspace";
export const dynamic = "force-dynamic";
export async function GET() {
  if (localMode())
    return Response.json(
      { signedIn: !!(await localOwner()), mode: "local-receipt" },
      { headers: { "Cache-Control": "no-store" } },
    );
  try {
    const { isOperator } = await cloudIdentity();
    return Response.json({ signedIn: true, mode: "cloud", isOperator }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return Response.json({ signedIn: false, mode: "cloud", isOperator: false });
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  const url = new URL(request.url);
  if (
    !localMode() ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    !sameOrigin(request)
  )
    return Response.json(
      { error: "Local workspace is only available on this computer." },
      { status: 403 },
    );
  await startLocalSession();
  return Response.json({ signedIn: true, mode: "local-receipt" });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return Response.json({ error: "Same-origin request required" }, { status: 403 });
  try {
    if (localMode()) await endLocalSession();
    else {
      const client = await authenticatedDatabase();
      const { error } = await client.auth.signOut({ scope: "local" });
      if (error) throw new ApiError("Could not sign out. Please retry.");
    }
    return Response.json({ signedIn: false }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiFailure(error); }
}
