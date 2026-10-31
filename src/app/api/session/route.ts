import { sameOrigin } from "@/lib/request-security";
import { authenticatedDatabase } from "@/lib/supabase";
import {
  localMode,
  localOwner,
  startLocalSession,
} from "@/lib/local-workspace";
export const dynamic = "force-dynamic";
export async function GET() {
  if (localMode())
    return Response.json(
      { signedIn: !!(await localOwner()), mode: "local-receipt" },
      { headers: { "Cache-Control": "no-store" } },
    );
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL)
    return Response.json({ signedIn: false });
  const client = await authenticatedDatabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  return Response.json(
    { signedIn: !!user },
    { headers: { "Cache-Control": "no-store" } },
  );
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
