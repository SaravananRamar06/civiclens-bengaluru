// Real Auth + Postgres + Storage tests, restricted to an ephemeral LOOPBACK stack.
// These fixtures are never inserted into the citizen workspace or a hosted project.
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
const config = JSON.parse(await readFile(process.env.CIVIC_TEST_STACK_FILE || ".data/ci/supabase.json", "utf8").then(s => s.replace(/^\uFEFF/, "")));
const url = config.API_URL || config.api_url;
assert(["localhost", "127.0.0.1"].includes(new URL(url).hostname), "Cloud tests may target only a disposable local Supabase stack");
const key = config.PUBLISHABLE_KEY || config.ANON_KEY;
const secret = config.SECRET_KEY || config.SERVICE_ROLE_KEY;
assert(key && secret, "Supabase local status must include client and server keys");
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const origin = "http://127.0.0.1:3188";
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3188"], {
  env: { ...process.env, CIVIC_LOCAL_MODE: "false", APP_ORIGIN: origin, SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key, SUPABASE_SECRET_KEY: secret, GEMINI_API_KEY: "", VERCEL: "", WORKFLOW_TARGET_WORLD: "local", WORKFLOW_LOCAL_DATA_DIR: ".data/ci/workflow", WORKFLOW_LOCAL_BASE_URL: origin },
  stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
});
let logs = "", checks = 0;
server.stdout.on("data", d => logs += d);
server.stderr.on("data", d => logs += d);
function check(value, expected, label) { assert.deepEqual(value, expected, label); console.log("PASS " + label); checks++; }
async function identity() {
  const password = randomUUID() + "aA!9", email = "isolated-" + randomUUID() + "@example.test";
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  assert.ifError(created.error);
  const jar = new Map();
  const client = createServerClient(url, key, { cookies: { getAll: () => [...jar].map(([name,value]) => ({name,value})), setAll: values => values.forEach(v => jar.set(v.name,v.value)) } });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  assert.ifError(signedIn.error);
  return { id: created.data.user.id, client, cookie: () => [...jar].map(([k,v]) => `${k}=${v}`).join("; ") };
}
async function call(path, actor, method="GET", body) {
  return fetch(origin + path, { method, headers: { Origin: origin, ...(actor ? { Cookie: actor.cookie() } : {}), ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined });
}
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0H8AAAAASUVORK5CYII=", "base64");
async function attach(reportId, actor, purpose="report") {
  const form = new FormData(); form.set("reportId", reportId); form.set("purpose", purpose); form.set("file", new File([png], "isolated-test.png", {type:"image/png"}));
  return call("/api/reports/evidence", actor, "POST", form);
}
async function transition(id, actor, status) { return call("/api/reports/transition", actor, "POST", { id, status, reason: "Isolated integration verification; no actual civic repair claimed." }); }
try {
  let ready = false;
  for(let attempt=0; attempt<80; attempt++) {
    if(server.exitCode !== null) throw Error("Server exited: " + logs);
    try { if ((await call("/api/health")).ok) { ready=true; break; } } catch {}
    await new Promise(r => setTimeout(r,500));
  }
  assert(ready, "Production cloud server became healthy: " + logs);
  const [owner, stranger, operator] = await Promise.all([identity(),identity(),identity()]);
  assert.ifError((await admin.from("civic_operators").insert({user_id:operator.id})).error);
  check((await call("/api/reports")).status,401,"Anonymous reports rejected");
  check((await call("/api/session", owner,"POST")).status,403,"Local receipt disabled in cloud mode");
  check((await (await call("/api/session",operator)).json()).isOperator,true,"Database-backed operator membership recognized");
  const saved = await call("/api/reports",owner,"POST", {description:"ISOLATED TEST FIXTURE: pothole for automated cloud verification, not a real grievance.",category:"Road damage",latitude:12.9716,longitude:77.5946});
  check(saved.status,201,"Cloud report persists in PostgreSQL");
  const report = await saved.json();
  check(report.priority,"Medium","Database computes conservative triage priority");
  check(report.events[0].action,"Submitted","Submission audit event created atomically");
  check(report.allowedTransitions,[],"Citizen cannot impersonate a reviewing operator");
  check((await owner.client.from("civic_reports").update({status:"Closed"}).eq("id",report.id)).error !== null,true,"Direct status mutation denied");
  check((await (await call("/api/reports",stranger)).json()).reports.length,0,"Different citizen cannot list private reports");
  check((await stranger.client.from("civic_reports").select("id").eq("id",report.id)).data,[],"Direct Data API read obeys ownership RLS");
  check((await call("/api/reports?scope=review",stranger)).status,403,"Operator queue rejects citizen access");
  check((await (await call("/api/reports?scope=review",operator)).json()).reports.some(r=>r.id===report.id),true,"Operator sees the cloud review queue");
  check((await transition(report.id,owner,"Acknowledged")).status,403,"Citizen cannot acknowledge own report in cloud mode");
  check((await transition(report.id,operator,"Acknowledged")).status,200,"Operator acknowledges report");
  check((await transition(report.id,operator,"In progress")).status,200,"Operator starts review work");
  check((await transition(report.id,operator,"Resolution proposed")).status,400,"Database requires resolution photo evidence");
  check((await attach(report.id,stranger)).status,409,"Different citizen cannot attach evidence");
  const attached = await attach(report.id,owner,"resolution");
  check(attached.status,201,"Actual private Storage upload finalizes");
  const evidence = await attached.json();
  const path = `/api/reports/evidence?reportId=${report.id}&id=${evidence.id}`;
  const downloaded = await call(path,owner);
  check(downloaded.status,200,"Owner can download private evidence through authenticated route");
  check(Buffer.from(await downloaded.arrayBuffer()),png,"Downloaded bytes match the uploaded test image");
  check((await call(path,stranger)).status,404,"Evidence endpoint rejects different citizen");
  check((await call(path,operator)).status,200,"Operator can inspect evidence for review");
  const meta = await owner.client.from("civic_evidence").select("object_path").eq("id",evidence.id).single();
  assert.ifError(meta.error);
  const anonymous = createClient(url,key,{auth:{persistSession:false}});
  check((await anonymous.storage.from("civic-evidence").download(meta.data.object_path)).error !== null,true,"Private bucket rejects unauthenticated direct download");
  check((await stranger.client.storage.from("civic-evidence").download(meta.data.object_path)).error !== null,true,"Storage RLS rejects another citizen's direct download");
  check((await owner.client.storage.from("civic-evidence").upload(meta.data.object_path,png,{contentType:"image/png",upsert:true})).error !== null,true,"Ready evidence cannot be overwritten");
  await owner.client.storage.from("civic-evidence").remove([meta.data.object_path]);
  check((await call(path,owner)).status,200,"Ready evidence cannot be deleted through direct Storage API");
  check((await transition(report.id,operator,"Resolution proposed")).status,200,"Operator proposes evidence-backed resolution");
  check((await transition(report.id,operator,"Closed")).status,403,"Operator cannot confirm closure on behalf of citizen");
  check((await transition(report.id,owner,"Closed")).status,200,"Reporting citizen confirms closure");
  check((await transition(report.id,owner,"Reopened")).status,200,"Reporting citizen can reopen");
  await transition(report.id,operator,"Acknowledged"); await transition(report.id,operator,"In progress");
  check((await transition(report.id,operator,"Resolution proposed")).status,400,"Old-cycle resolution evidence cannot close a reopened issue");
  check((await attach(report.id,operator,"resolution")).status,201,"Operator can upload a new resolution photograph");
  check((await transition(report.id,operator,"Resolution proposed")).status,200,"New review-cycle evidence permits proposal");
  const packet = await call("/api/reports/export?id="+report.id,owner);
  check(packet.status,200,"Cloud handoff export works");
  check((await packet.text()).includes("12.9716"),false,"Handoff export excludes precise coordinates");
  check((await call("/api/reports/export?id="+report.id,stranger)).status,404,"Cloud export respects ownership");
  check((await call("/api/reports/analyze",owner,"POST",{id:report.id,consent:false})).status,400,"AI consent enforced");
  check((await call("/api/reports/analyze",owner,"POST",{id:report.id,consent:true})).status,503,"Unconfigured live AI fails without fabricated results");
  check((await owner.client.rpc("civic_complete_report_analysis",{target:randomUUID(),assessment:{summary:"forged"}})).error !== null,true,"Citizen cannot forge server-generated AI provenance");
  // Simultaneous uploads must compete for the remaining two slots under a DB row lock.
  const outcomes = await Promise.all([attach(report.id,owner),attach(report.id,owner),attach(report.id,owner)]);
  check(outcomes.map(r=>r.status).sort(),[201,201,409],"Concurrent uploads enforce four-attachment limit");
  const final = (await (await call("/api/reports",owner)).json()).reports.find(r=>r.id===report.id);
  check(final.evidence.length,4,"Cloud list includes all ready evidence");
  check(final.events.some(e=>e.action==="Reopened"),true,"Cloud list preserves review history");
  check((await call("/api/session",owner,"DELETE")).status,200,"Cloud sign-out endpoint completes");
  console.log(JSON.stringify({ passed:checks, isolatedSupabase:true, hostedProjectsUntouched:true }));
} finally { server.kill("SIGTERM"); }
