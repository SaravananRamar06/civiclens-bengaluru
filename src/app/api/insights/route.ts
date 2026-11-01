import { insights } from "@/lib/insights";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await insights(), {
      headers: { "Cache-Control": "public, s-maxage=300" },
    });
  } catch {
    return Response.json(
      { error: "Insights are temporarily unavailable." },
      { status: 503 },
    );
  }
}
