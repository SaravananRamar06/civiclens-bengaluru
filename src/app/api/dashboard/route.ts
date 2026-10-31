import { dashboard } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await dashboard(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: "Civic data is temporarily unavailable. Please retry." },
      { status: 503 },
    );
  }
}
