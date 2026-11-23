# Launchpad

Launchpad helps college students and recent graduates find internships and entry-level roles, compare their skills with job postings, and track applications.

Built on the [DeepSpace SDK](https://deep.space/).

**Live app:** [Launchpad on DeepSpace staging](https://launchpad-internships.spacestest.com)

## What it does

- Browse curated sample opportunities or sign in to search the web for up to six distinct postings per search.
- Use profile preferences for class year, location, skills, and sponsorship. Apply browse filters and match any or all selected skills.
- See which skills appear in a posting and request an optional AI fit summary based on your skills and the excerpt.
- Save opportunities to a private tracker and move them through Interested, Applied, Interviewing, and Closed.

Live results use excerpts from the web and may omit details about skills, eligibility, or sponsorship. Follow each result’s source link to confirm details and availability with the employer.

## How it’s built

Launchpad uses React and TypeScript. DeepSpace handles sign-in and real-time record updates over WebSockets. Profiles and saved applications persist in a SQLite-backed Durable Object, with record permissions scoped to the signed-in owner. The staging app is deployed through DeepSpace.

The app calls Exa for web search and Anthropic for optional fit summaries through DeepSpace’s integration proxy. Calls use the signed-in user’s DeepSpace credits. Sample listings remain available when search returns no useful results or the service is unavailable.

## Run your own

Use Node.js 24 and npm 11.6 or newer. For an independent copy, change the top-level `name` in `wrangler.toml` to an available name of your choice. Use 2–63 lowercase letters, digits, or dashes. The checked-in app ID belongs to the existing staging deployment. The `--new-id` command below creates a separate app and writes its ID into your checkout.

```bash
npm ci
npx deepspace auth login
npx deepspace auth whoami
npx deepspace app init --new-id
npm run dev
```

Open the URL printed by the dev server. The CLI defaults to production. To work on staging, set `DEEPSPACE_ENV=staging` in your shell before signing in. `.env.example` lists the variable name. Keep generated `.dev.vars` and session files local.

Commit the fork’s configuration before deploying. The first deploy determines the fork’s source authority, so confirm the intended Git remote first.

```bash
npm run validate
npm run build
npm run deploy
```

[DeepSpace app identity and names](https://docs.deep.space/guides/app-identity) · [DeepSpace source control](https://docs.deep.space/guides/source-control)

Launchpad was built with Codex as an AI coding assistant. [DeepSpace](https://deep.space/) · [Documentation](https://docs.deep.space/)
