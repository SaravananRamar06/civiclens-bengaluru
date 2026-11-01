# Hosting CivicLens

CivicLens runs on Vercel with Supabase for Auth, PostgreSQL, PostGIS and private Storage.

## 1. Connect Vercel and Supabase

Import the repository into a Vercel project and add the Supabase integration. It supplies the database variables, and every push to `main` then deploys to production.

On Vercel the app runs in cloud mode automatically, takes its public address from `VERCEL_PROJECT_PRODUCTION_URL`, and uses Node 24 from `package.json`. Set `APP_ORIGIN` only if you attach a custom domain.

Add the one variable the integration can't supply:

    vercel env add GEMINI_API_KEY production

Redeploy after adding it. Without a key, reporting and routing still work, and AI analysis says it is off. CivicLens never shows simulated results.

## 2. Apply the schema

Apply every file in `supabase/migrations` in filename order. On a new project:

    supabase login
    supabase link --project-ref YOUR_PROJECT_REF
    supabase db push

For an existing database, check its history first and run only the files it is missing. Don't rerun the table-creation migrations.

The migrations seed no grievances. Keep the `civic-evidence` bucket private.

## 3. Turn on sign-in

Enable **Anonymous sign-ins** in Supabase Auth so people can report with no account.

Google sign-in is optional. To add it, create a web OAuth client in Google Cloud with this redirect URI:

    https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback

Enter the client ID and secret under Supabase Auth, Providers. Under URL Configuration, set the Site URL to your public address and allow `https://YOUR_DOMAIN/auth/callback`.

## 4. Assign reviewers

A reviewer moves reports through acknowledgement and proposes a resolution. Each must sign in once, then run this as a database administrator:

    insert into public.civic_operators(user_id)
    select id from auth.users where email = 'REPLACE_WITH_REVIEWER_EMAIL'
    on conflict do nothing;

This is a project role, not a government credential. Proposing a resolution needs a repair photo from the current review cycle, and only the person who filed the report can confirm it or reopen it.

## 5. Import the archive and check

    npm ci
    npm run data:import:cloud
    npm run cloud:check

The importer upserts 5,000 Sahaaya records, keeps their provenance, omits staff and contact fields, and invents no coordinates. Upstream ODbL terms apply.

`/api/health` returns `status: ok` when the site is ready. Otherwise `failedAt` names the failing stage: `configuration`, `schema` or `archive`.

## 6. Maintenance

    npm run cloud:cleanup

Run this daily with server credentials. It removes up to 100 abandoned upload reservations older than 24 hours. Finished evidence is kept. Back up PostgreSQL and Storage through Supabase.
