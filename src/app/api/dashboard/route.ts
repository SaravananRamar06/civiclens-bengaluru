import { dashboard } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await dashboard(), {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return Response.json(
      { error: "Civic data is temporarily unavailable. Please retry." },
      { status: 503 },
    );
  }
}
