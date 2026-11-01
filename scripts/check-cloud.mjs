import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
const origin = process.env.APP_ORIGIN;
if (!url || !key || !origin || process.env.CIVIC_LOCAL_MODE !== "false") throw Error("Set CIVIC_LOCAL_MODE=false, APP_ORIGIN, SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY first.");
const parsed = new URL(origin);
if(parsed.origin !== origin || (parsed.protocol !== "https:" && !["127.0.0.1","localhost"].includes(parsed.hostname))) throw Error("APP_ORIGIN must be the public HTTPS origin, with no path or trailing slash.");
const client = createClient(url,key,{auth:{persistSession:false}});
const version = await client.rpc("civic_schema_version");
if(version.error || version.data !== 5) throw Error("Cloud schema is incomplete. Apply all committed migrations.");
const source = await client.from("civic_sources").select("id",{head:true,count:"exact"});
if(source.error) throw Error("Public archive access failed; check grants and RLS.");
const settings = await fetch(url + "/auth/v1/settings", { headers: {apikey:key} });
if(!settings.ok) throw Error("Could not read Auth configuration.");
const auth = await settings.json();
let storage = "server key absent; could not inspect bucket";
if(secret) {
  const worker = createClient(url,secret,{auth:{persistSession:false}});
  const {data,error} = await worker.storage.getBucket("civic-evidence");
  if(error || !data || data.public || Number(data.file_size_limit)!==5242880) throw Error("Evidence bucket is absent or misconfigured; it must be private and limited to 5 MB.");
  storage = "private bucket verified";
}
let model = "optional Gemini key absent";
if(process.env.GEMINI_API_KEY) {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(process.env.GEMINI_MODEL || "gemini-3.8-flash"), {headers:{"x-goog-api-key":process.env.GEMINI_API_KEY}});
  if(!response.ok) throw Error("Configured Gemini model/key is unavailable (HTTP " + response.status + "). No inference was attempted.");
  model = "model metadata verified; inference quota must be checked separately";
}
console.log(JSON.stringify({schema:version.data,archiveRecords:source.count,googleEnabled:!!auth.external?.google,storage,model},null,2));
if(!auth.external?.google) { console.error("Enable Google in Supabase Auth before hosting. See docs/HOSTING.md."); process.exitCode=1; }
