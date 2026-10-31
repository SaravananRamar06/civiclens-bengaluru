import { db } from "@/lib/db";
import { publicDatabase } from "@/lib/supabase";
import { localMode, appOrigin } from "@/lib/config";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const cloud =
      !localMode();
    if (cloud) {
      appOrigin();
      const version = await publicDatabase().rpc("civic_schema_version");
      if (version.error || version.data !== 4) throw Error("Apply cloud migrations");
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
