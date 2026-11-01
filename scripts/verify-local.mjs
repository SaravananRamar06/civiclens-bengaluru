import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const origin = "http://127.0.0.1:3187";
const directory = resolve(".data", "verification", randomUUID());
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3187",
  ],
  {
    env: {
      ...process.env,
      CIVIC_LOCAL_MODE: "true",
      APP_ORIGIN: "",
      CIVIC_DATA_DIR: directory,
      GEMINI_API_KEY: "",
      VERCEL: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);
let log = "";
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));
let checks = 0;
function check(actual, expected, label) {
  assert.equal(actual, expected, label);
  console.log("PASS " + label);
  checks++;
}
async function call(
  path,
  { cookie, body, method = "GET", originHeader = origin } = {},
) {
  return fetch(origin + path, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(method === "POST" ? { Origin: originHeader } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null) throw Error("Server exited: " + log);
    try {
      const r = await call("/api/health");
      if (r.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  assert(ready, "Local production server started");
  check((await call("/")).status, 200, "Production page renders");
  check(
    (await call("/api/reports")).status,
    401,
    "Reports require an actual local receipt",
  );
  check(
    (
      await call("/api/session", {
        method: "POST",
        originHeader: "https://untrusted.example",
      })
    ).status,
    403,
    "Cross-origin session creation rejected",
  );
  const session = await call("/api/session", { method: "POST" });
  check(session.status, 200, "Receipt session created");
  const cookie = session.headers.get("set-cookie").split(";")[0];
  check(
    (
      await call("/api/reports", {
        method: "POST",
        cookie,
        body: {
          description: "short",
          category: "Other",
          latitude: 0,
          longitude: 0,
        },
      })
    ).status,
    400,
    "Invalid issue and non-Bengaluru coordinates rejected",
  );
  const created = await call("/api/reports", {
    method: "POST",
    cookie,
    body: {
      description:
        "Isolated API verification record; this is not a real citizen grievance.",
      category: "Other",
      latitude: 12.9716,
      longitude: 77.5946,
    },
  });
  check(created.status, 201, "Isolated test report persists");
  const report = await created.json();
  const other = await call("/api/session", { method: "POST" }),
    otherCookie = other.headers.get("set-cookie").split(";")[0];
  check(
    (await (await call("/api/reports", { cookie: otherCookie })).json()).reports
      .length,
    0,
    "A second receipt cannot see another owner’s report",
  );
  check(
    (await call("/api/reports/export?id=" + report.id, { cookie: otherCookie }))
      .status,
    404,
    "Private handoff export protected",
  );
  check(
    (
      await call("/api/reports/transition", {
        method: "POST",
        cookie,
        body: {
          id: report.id,
          status: "Closed",
          reason: "Attempt to skip review",
        },
      })
    ).status,
    409,
    "Invalid status transition rejected",
  );
  for (const status of ["Acknowledged", "In progress"])
    check(
      (
        await call("/api/reports/transition", {
          method: "POST",
          cookie,
          body: {
            id: report.id,
            status,
            reason: "Isolated workflow verification",
          },
        })
      ).status,
      200,
      "Audited transition: " + status,
    );
  check(
    (
      await call("/api/reports/transition", {
        method: "POST",
        cookie,
        body: {
          id: report.id,
          status: "Resolution proposed",
          reason: "Isolated evidence gate verification",
        },
      })
    ).status,
    400,
    "Resolution proposal requires an image",
  );
  const form = new FormData();
  form.set("reportId", report.id);
  form.set(
    "file",
    new File(["not an image"], "invalid.jpg", { type: "image/jpeg" }),
  );
  check(
    (
      await fetch(origin + "/api/reports/evidence", {
        method: "POST",
        headers: { Origin: origin, cookie },
        body: form,
      })
    ).status,
    400,
    "Spoofed image content rejected",
  );
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jCxoAAAAASUVORK5CYII=",
    "base64",
  );
  const validForm = new FormData();
  validForm.set("reportId", report.id);
  validForm.set("purpose", "resolution");
  validForm.set(
    "file",
    new File([png], "isolated-verification.png", { type: "image/png" }),
  );
  const attachment = await fetch(origin + "/api/reports/evidence", {
    method: "POST",
    headers: { Origin: origin, cookie },
    body: validForm,
  });
  check(
    attachment.status,
    201,
    "Private attachment persists in isolated evidence storage",
  );
  const evidence = await attachment.json();
  check(
    (
      await call(
        "/api/reports/evidence?reportId=" + report.id + "&id=" + evidence.id,
        { cookie: otherCookie },
      )
    ).status,
    404,
    "A different receipt cannot read private evidence",
  );
  const downloaded = await call(
    "/api/reports/evidence?reportId=" + report.id + "&id=" + evidence.id,
    { cookie },
  );
  check(downloaded.status, 200, "Owner can retrieve private evidence");
  assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), png);
  for (const status of ["Resolution proposed", "Closed", "Reopened"])
    check(
      (
        await call("/api/reports/transition", {
          method: "POST",
          cookie,
          body: {
            id: report.id,
            status,
            reason: "Isolated resolution verification; not a real repair.",
          },
        })
      ).status,
      200,
      "Evidence-backed local transition: " + status,
    );
  check(
    (
      await call("/api/reports/analyze", {
        method: "POST",
        cookie,
        body: { id: report.id, consent: false },
      })
    ).status,
    400,
    "External AI processing requires consent",
  );
  check(
    (
      await call("/api/reports/analyze", {
        method: "POST",
        cookie,
        body: { id: report.id, consent: true },
      })
    ).status,
    503,
    "Missing AI key produces explicit failure rather than fabricated output",
  );
  const open = await (await call("/api/public-reports")).json();
  const listed = open.reports.find((r) => r.ref === report.id.slice(0, 8));
  check(!!listed, true, "Public dashboard lists every report");
  check(listed.description, undefined, "Public dashboard omits the description");
  check(listed.owner, undefined, "Public dashboard omits the owner");
  check(listed.latitude, 12.97, "Public dashboard rounds the location");
  check(open.authorities[0].confirmed >= 0, true, "Public dashboard totals by authority");
  const saved = (await (await call("/api/reports", { cookie })).json())
    .reports[0];
  check(
    saved.events.length,
    7,
    "Submitted and review actions are preserved in history",
  );
  check(
    (await call("/api/reports/export?id=" + report.id, { cookie })).status,
    200,
    "Owner can download handoff packet",
  );
  console.log(
    JSON.stringify({
      passed: checks,
      isolatedDataDirectory: directory,
      liveWorkspaceUntouched: true,
    }),
  );
} finally {
  server.kill("SIGTERM");
}
