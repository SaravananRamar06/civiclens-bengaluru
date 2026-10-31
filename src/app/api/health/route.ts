import { db } from "@/lib/db";
import { publicDatabase } from "@/lib/supabase";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const cloud =
      !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.CIVIC_LOCAL_MODE !== "true";
    if (cloud) {
      const { error } = await publicDatabase()
        .from("civic_sources")
        .select("id")
        .limit(1);
      if (error) throw error;
    } else db().prepare("SELECT 1").get();
    return Response.json({
      status: "ok",
      city: "Bengaluru",
      database: cloud ? "supabase-postgresql" : "sqlite",
      authConfigured: cloud,
      aiConfigured: !!process.env.GEMINI_API_KEY,
    });
  } catch {
    return Response.json(
      { status: "error", error: "Database unavailable" },
      { status: 503 },
    );
  }
}
