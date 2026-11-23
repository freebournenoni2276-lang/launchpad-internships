# Launchpad

Launchpad helps college students and recent graduates find internships and entry-level roles, compare their skills with a posting, and track applications. The dashboard includes sample opportunities, multi-select filters with **Match any** and **Match all** for skills, profile preferences, and a private application tracker. [Existing DeepSpace deployment](https://launchpad-internships.spacestest.com)

## Local setup

Use Node.js 24 and npm 11.6 or newer. This project uses npm and commits its lockfile.

```bash
npm ci
npm run validate
npm run build
```

To run the full app with DeepSpace auth and records, sign in with an authorized DeepSpace account, then start the development server. For the existing staging app, first set `DEEPSPACE_ENV=staging` in your shell and use an account with access to that app. The CLI reads this optional setting from the shell.

```bash
npx deepspace auth login
npm run dev
```

Open the local URL printed by the dev server. There are no provider keys to enter for Exa, Anthropic, or Google Calendar. DeepSpace supplies the app bindings and local authentication configuration. Keep generated `.dev.vars` and session files local. The app ID in `wrangler.toml` identifies the existing deployment and is public configuration. If you are setting up an independent copy, register that checkout as a separate app with `npx deepspace app init --new-id` before running it against your account. [DeepSpace setup](https://docs.deep.space/get-started/quickstart)

## Implemented features

- **DeepSpace auth and records** power signed-in profiles and saved applications. The Worker and Durable Object enforce per-user record permissions. Applications move through Interested, Applied, Interviewing, and Closed.
- **Exa search** runs on demand through the DeepSpace integration proxy. It combines the entered phrase with active filters and fills in unset preferences from the profile. The app reads at most 12 candidates and displays up to six distinct posting candidates. Sample jobs remain available during loading, service errors, and empty searches.
- **Anthropic fit summaries** are optional and use the selected skills and posting excerpt. The dashboard also shows a direct skill comparison without an AI call.
- **Google Calendar** can add an application deadline or interview reminder. The integration uses the signed-in user's account and prompts for Google consent as needed. Integration requests use the signed-in user's DeepSpace credits.

Key files include `src/pages/(app)/index.tsx` for the dashboard, `src/job-search.ts` for query construction and result screening, `src/sample-jobs.json` for sample listings, `src/schemas/student-schema.ts` for records, and `worker.ts` and `wrangler.toml` for runtime configuration.

## Results and limitations

Live results come from Exa's web index and excerpts. Screening removes common third-party copies, editorial results, duplicates, and detectable location mismatches. Each result links to its original source. The sample data is curated and may be outdated. Listings and eligibility details can change, and excerpts can omit location, skills, or visa requirements. **Available** requires affirmative sponsorship evidence. **Not listed** reflects missing evidence in the excerpt. **Unclear** covers ambiguous wording and flags explicit restrictions when detected. Confirm details with the employer.

## Verification

- Two live Exa queries were checked for relevance, distinct postings, and employer links. Each produced six distinct results, and all twelve links resolved at the time.
- Browser checks covered the deployed desktop and mobile dashboard and its skill filters. Local browser checks replayed real Exa responses, exercised loading, empty and retry states, and verified saving a role and persisting its application status after reload.
- Google Calendar consent and confirmation were exercised with simulated responses. Live Calendar event creation and authenticated writes on the hosted site remain unverified.
- For repeatable local checks, run `npm run validate`, `npm run lint`, and `npm run build`. The scaffold's browser specs under `tests/` include legacy public-board scenarios and are not an acceptance suite for Launchpad.

## GitHub and hosting

Keep the GitHub source copy separate from the existing DeepSpace deployment. That deployment already uses DeepSpace as its source authority. Publishing a GitHub copy does not migrate the deployment or its records. [DeepSpace source control](https://docs.deep.space/guides/source-control)
