# Host CivicLens yourselves

The supplied setup runs one Node.js 24 container behind an HTTPS reverse proxy. Supabase persists Auth, PostgreSQL/PostGIS, private evidence, analysis results and audit history. The optional archive-analysis workflow uses a persistent container volume. A Vercel account is not required.

## Hosting on Vercel

Link the repository to a Vercel project and add the Supabase integration, which supplies the database variables. Vercel runs the app in cloud mode automatically, derives the public origin from `VERCEL_PROJECT_PRODUCTION_URL`, and uses Node 24 from `package.json`. Only `GEMINI_API_KEY` must be added by hand. Set `APP_ORIGIN` as well if you attach a custom domain.

After deploying, `/api/health` reports `status: ok`, or `failedAt` naming the failing stage: `configuration`, `schema` or `archive`.

For reporting without Google, enable anonymous sign-ins in Supabase Auth. People then get a private guest session with no account; Google remains available once its provider is configured.

## 1. Apply the schema

Use a Supabase project and apply all files in supabase/migrations in filename order. For a fresh project with the Supabase CLI:

    supabase login
    supabase link --project-ref YOUR_PROJECT_REF
    supabase db push

For an existing CivicLens database, check its migration history first. If the three original migrations are already present, apply only 20261031154739_cloud_reporting.sql through the SQL editor, or reconcile the CLI migration history before pushing. Do not rerun the initial table-creation migrations.

The new migration creates the private civic-evidence bucket, upload reservations, storage policies, operator transitions and native analysis storage. It seeds no example grievances. Keep the evidence bucket private.

## 2. Configure runtime variables

Copy .env.example to ignored .env.local and provide:

    CIVIC_LOCAL_MODE=false
    APP_ORIGIN=https://YOUR_DOMAIN
    SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
    SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
    SUPABASE_SECRET_KEY=YOUR_SERVER_ONLY_KEY
    GEMINI_API_KEY=YOUR_GEMINI_KEY
    GEMINI_MODEL=gemini-3.8-flash

APP_ORIGIN contains no path or trailing slash. The NEXT_PUBLIC_SUPABASE_* aliases remain supported, but the server runtime variables avoid rebuilding when changing projects. All Supabase calls run on the server. Docker excludes environment files from the build context; supply credentials at runtime.

Reporting and evidence storage work without Gemini. Cloud AI needs both a Gemini key and the server-only Supabase key. Verify model availability in your account. Missing credentials or quota never produce simulated results. Never prefix a server secret with NEXT_PUBLIC_.

## 3. Enable Google OAuth

Create a web OAuth client in Google Cloud. Its authorized redirect URI is the Supabase callback:

    https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback

Enable Google in Supabase Auth → Providers and enter the Google client ID and secret. In Supabase Auth → URL Configuration, set Site URL to your public origin and allow this exact application redirect:

    https://YOUR_DOMAIN/auth/callback

For development also allow http://127.0.0.1:3000/auth/callback. The app uses PKCE, exchanges the code on the server and stores HttpOnly session cookies. Authenticated route handlers verify the user and refresh cookies on requests. Their responses must not be cached.

## 4. Designate project operators

Each operator must sign in once. As the database administrator, insert the actual Auth user ID:

    insert into public.civic_operators(user_id)
    select id from auth.users where email = 'REPLACE_WITH_OPERATOR_EMAIL'
    on conflict do nothing;

This is a project role, not a government credential. Membership is never granted from user-editable metadata. Operators use My reports → Open operator review queue to acknowledge reports, advance work, prepare handoffs and propose resolution. Proposal requires a finalized resolution photograph from the current review cycle. Only the reporting citizen confirms closure or reopens. Reopened issues require new resolution evidence.

## 5. Import real records and check configuration

    npm ci
    npm run data:import:cloud
    npm run cloud:check

The importer upserts 5,000 real historical Sahaaya records, preserves provenance, omits staff/contact fields and never invents coordinates. Upstream ODbL terms apply.

The check verifies schema version, archive access, Google-provider configuration, private bucket settings when a server key is available, and model metadata when a Gemini key is supplied. The model lookup does not run inference.

## 6. Start the supplied container

    docker compose up --build -d
    docker compose logs -f web

Compose binds to loopback port 3000. Put an HTTPS reverse proxy in front, preserve cookies, allow upload bodies up to 6 MiB, and allow response timeouts of at least 90 seconds. Do not cache /api/reports*, /api/session, /api/analysis or /auth/*. APP_ORIGIN matches the public browser origin even if the upstream Host header is internal.

Health at /api/health must return HTTP 200 with database set to supabase-postgresql. Missing cloud migrations cause HTTP 503 instead of silently using SQLite. Restart once and confirm the same report and evidence are available.

For a managed Node host, use npm ci, npm run build, and then npm start for loopback. A host requiring all interfaces can run:

    node node_modules/next/dist/bin/next start --hostname 0.0.0.0

Keep HTTPS at the host proxy. For the optional archive workflow set WORKFLOW_TARGET_WORLD=local, WORKFLOW_LOCAL_DATA_DIR to a durable writable directory, and WORKFLOW_LOCAL_BASE_URL to this server's internal origin. The Docker files already set these and mount workflow-data.

Run one application instance with the filesystem workflow backend. Multiple replicas or serverless hosting require a supported shared Workflow backend first. Keep the workflow volume across upgrades; it is not a backup of Supabase data.

## 7. Maintenance

    npm run cloud:cleanup

Schedule daily on a trusted runner with server credentials. Each run removes up to 100 abandoned reservations older than 24 hours and their objects; finalized evidence is retained. Back up PostgreSQL and Storage with your Supabase/hosting backup process.

## 8. Repeatable verification

GitHub Actions builds and tests the production app and starts a disposable Supabase Docker stack. The cloud suite exercises real Auth, PostgreSQL and Storage. Its test identities and tiny image fixtures never enter a hosted civic database.

To repeat locally with Docker and the Supabase CLI:

    npm ci
    npm test
    npm run build
    supabase start -x studio,postgres-meta,realtime,imgproxy,edge-runtime,logflare,vector,supavisor
    mkdir -p .data/ci
    supabase status -o json > .data/ci/supabase.json
    npm run test:cloud
    supabase stop --no-backup

In PowerShell use New-Item -ItemType Directory -Force .data/ci and write the status JSON with Set-Content -Encoding utf8. Tests refuse non-loopback Supabase URLs. They cover ownership, operator permissions, private upload/download bytes, immutable evidence, concurrent upload limits, resolution photographs, citizen confirmation and reopening. No GitHub secrets are needed for this isolated suite.

Google OAuth and Gemini inference still need a real configured account and should be checked once on your deployed domain. No automatic government delivery is claimed.
