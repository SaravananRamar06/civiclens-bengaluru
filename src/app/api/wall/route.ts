import { wall } from "@/lib/insights";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await wall(), {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return Response.json(
      { error: "The complaint wall is temporarily unavailable." },
      { status: 503 },
    );
  }
}
