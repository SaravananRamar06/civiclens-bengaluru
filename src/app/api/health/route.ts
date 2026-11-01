import { db } from "@/lib/db";
import { publicDatabase } from "@/lib/supabase";
import { localMode, appOrigin } from "@/lib/config";
export const dynamic = "force-dynamic";
export async function GET() {
  const cloud = !localMode();
  let stage = "configuration";
  try {
    if (cloud) {
      appOrigin();
      stage = "schema";
      const version = await publicDatabase().rpc("civic_schema_version");
      if (version.error || version.data !== 6) throw Error("Apply cloud migrations");
      stage = "archive";
      const { error, count } = await publicDatabase()
        .from("civic_sources")
        .select("id", { head: true, count: "exact" });
      if (error) throw error;
      return Response.json({
        status: "ok",
        city: "Bengaluru",
        database: "supabase-postgresql",
        archiveRecords: count,
        authConfigured: true,
        aiConfigured: !!process.env.GEMINI_API_KEY,
      });
    }
    db().prepare("SELECT 1").get();
    return Response.json({
      status: "ok",
      city: "Bengaluru",
      database: "sqlite",
      authConfigured: false,
      aiConfigured: !!process.env.GEMINI_API_KEY,
    });
  } catch {
    return Response.json(
      { status: "error", error: "Database unavailable", failedAt: stage },
      { status: 503 },
    );
  }
}
