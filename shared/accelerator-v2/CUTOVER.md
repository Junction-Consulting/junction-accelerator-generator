# Accelerator v2: what must change before a real client moves

v2 work only touches the v2 paths (see "Accelerator v2 (in development)" in `CLAUDE.md`). Everything below is outside them: v1 code, shared scripts, Supabase, Netlify functions and the coach documentation. Each item must be done, reviewed and released before the first real client's dashboard is built by v2. Until then, `clients/andreas-resort/` is the only v2 page, and it is a sandbox.

Items are grouped by what breaks if they are skipped.

## Would show wrong information to a client or coach

### 1. The Friday recap email uses positional checklist keys
- **File:** `supabase/functions/send-friday-email/index.ts` (`buildItemLabels`, and the `weekItemKeys` filter in the handler)
- **Why:** it rebuilds progress keys from `plan.json` as `week-N-check-M` and `week-N-action-M`, then matches them against the `progress` table. v2 saves ticks under checklist item IDs (`chk_xxxxxx`), so for a v2 client every item would be reported as not done.
- **Change:** put each checklist item's ID into `plan.json` (`generatePlanJsonV2` in `shared/accelerator-v2/plan-json.js` can add a `checklist_ids` array, or objects with `id` and `text`), and have the function match on those IDs. Keep the positional keys for v1 clients until they move.

### 2. The checklist tactic marker would show as text in v1
- **Files:** `PLAN_FORMAT.md`, `shared/plan-validator.js`, `shared/plan-generator.js`, the drafting instructions (`CLAUDE_PROJECT_INSTRUCTIONS.md`, `GOOGLE_DOC_TEMPLATE.md`, `COACH_SOP.md`), and `tests/plan-format-docs.test.js`
- **Why:** v2 reads `→ tactic: N` at the end of a checklist item to decide which tactic it counts towards (SCHEMA.md, Roadmap). v1 does not know the marker, so a v1 dashboard would show "→ tactic: 2" as part of the item, and it would also appear in v1's `plan.json` and the weekly emails. The sandbox plan already uses it; v1 tests pass, but only because they do not look at that text.
- **Change:** when new clients move to v2, add the marker to the plan format and the drafting instructions (coaches should write it on every checklist item), teach the v1 validator to accept it, and have the v1 generator strip it, for as long as any plan can still go through v1.

### 3. The v1 client validator misreads v2 pages
- **File:** `scripts/validate-client.js`
- **Why:** it looks for v1 patterns (`week-N-check-M`, `step-tN-M`), so it reports the v2 sandbox as "assessment-only, 0 checklist items" and passes it. It would not catch a broken v2 page.
- **Change:** detect `data-template-version="v2"` on `<body>` and run the v2 checks instead (`checkContent` on `content.json`, and `validateDashboardV2` from `shared/accelerator-v2/render.js` on the page). Equivalent today: `node shared/accelerator-v2/cli.mjs check <slug>`.

### 4. The no-client-content guard does not cover the v2 template
- **File:** `tests/no-client-content.test.js`
- **Why:** it checks a fixed list of v1 templates. `template/v2/accelerator.html`, `shared/accelerator-v2/components.js` and `assets/v2/` are not compared against client wording.
- **Change:** add them, and a v2 page built from `tests/fixtures/neutral-plan.md`, to the guard.

## Would overwrite or lose a v2 page

### 5. The regenerate script overwrites v2 pages
- **File:** `scripts/regenerate-dashboards.js`
- **Why:** with `--write` it replaces `clients/<slug>/index.html` with a page built by the v1 generator from `plan.md`. On a v2 client that replaces the v2 page with a v1 one. `content.json` is untouched, so a v2 build restores the page, but the live page is wrong until someone notices.
- **Change:** refuse to write when the folder has a `content.json` (or the page has `data-template-version="v2"`), and point to `node shared/accelerator-v2/cli.mjs build <slug> --save`.

### 6. Add Plan overwrites v2 pages, and must switch to the v2 generator
- **Files:** `netlify/functions/create-project.js`, `admin/create-project/index.html`, `shared/plan-report-ui.js`
- **Why:** the upload parses `plan.md` with the v1 generator and commits `index.html` and `plan.json`. For a v2 client it would replace the v2 page and never write `content.json`.
- **Change:** for v2 clients, run `convertPlan` with the client's existing `content.json` (so IDs, media and stored tactic assignments are kept), then `checkContent`, then commit `content.json`, `plan.json` and the page from `renderDashboard`, with the client's assessment read from `client_assessments`. The upload report must show the converter's matched items (`matches`), removed items (`removed`), guessed checklist tactics (`guessed`) and the warnings, and ask the coach to confirm matches before saving. The browser check on the form should run the same report.

## State that is not saved to the account yet

### 7. Notes and Quick Wins ticks live in one browser
- **Files:** a new Supabase migration in `supabase/migrations/`, `shared/progress.js` (or a new shared script), and `assets/v2/accelerator.js` (inside v2)
- **Why:** SCHEMA.md (Saved state) moves Quick Wins ticks and item and week notes to Supabase, keyed by `qw_`, `chk_` and `wk_` IDs. Today, as in v1, they are saved in `localStorage`, so a client who changes device or browser loses them, and the coach cannot see them.
- **Change:** add tables (or columns) with row-level security for notes and Quick Wins ticks, and load and save them by item ID. Quick Wins checkboxes then get a `data-key`.

### 8. Edit Mode does not write back into content.json
- **Files:** `shared/content-editor.js`, `netlify/functions/content-edits.js`, the `content_edits` table, `shared/github-repo.js`
- **Why:** edits are saved in `content_edits`, keyed by `data-editable-key`. v2 keys are item ID and field (for example `stp_xxxxxx.title`), so they survive reordering, but `content.json` never receives them: a rebuild from `content.json` shows the original text, and the PDFs (item 10) would too. SCHEMA.md open decision 1 recommends keeping edits as an overlay and writing them into `content.json` whenever the plan is rebuilt.
- **Change:** apply stored edits to `content.json` on rebuild (by ID and field), and decide how a later plan upload interacts with an edited item. Also: Edit Mode saves plain text, so editing a bullet loses its bold, code and links.

## Missing features a real client needs

### 9. Draft and published status
- **Files:** `shared/auth.js`, the `user_plans` access rules and a migration in `supabase/migrations/`, a notification function in `netlify/functions/`, `my-clients/index.html`
- **Why:** SCHEMA.md (Planned) adds a plan status: a draft can be built and given media and edits, but the client cannot open it until it is published, and publishing can notify them. Today a client can open their page as soon as it is committed.
- **Change:** store the status (most likely on the client's project record), have `auth.js` refuse clients on a draft while letting staff and the coach in, and send the client an email with the link on publish.

### 10. The PDF service
- **File:** `netlify/functions/generate-pdf.js`
- **Why:** server-side accelerator PDFs are not implemented (`generateAcceleratorHTML` throws "not yet available"); the roadmap prints from the browser, as in v1. SCHEMA.md builds the dashboard and the PDFs from the same `content.json` and tokens.
- **Change:** build the accelerator PDF HTML from `content.json` with the v2 components and `assets/v2/tokens.css`, including Edit Mode edits (item 8).

## Still branded eLearningU outside v2

The v2 dashboard is rebranded to Junction (see `BRAND.md`). Everything below is outside the v2 paths and still says eLearningU, or uses its navy and mint, its fonts or its domain. A client on a v2 dashboard would still meet these.

### 11. The domain
- **Where:** `accelerator.elearningu.com` appears about 70 times: `shared/accelerator-v2/plan-json.js` (`DASHBOARD_ORIGIN`, the weekly email deep links, with `tests/v2/real-plans.test.js`), `shared/plan-generator.js`, `shared/experience-generator.js`, `shared/editor-bridge.js` and `netlify/functions/generate-pdf.js` (allowed origins), `shared/user-menu.js` (password reset redirect), the Netlify functions that send email, the Supabase functions, `scripts/`, the coach docs and every client's `plan.json`. Also `experience.elearningu.com` and `www.elearningu.com/accelerator`.
- **Change:** decide the Junction domain, set up redirects from the old one (existing emails and bookmarks link to it), then change the origin in one place per system. `DASHBOARD_ORIGIN` is the only copy in v2.

### 12. Email addresses
- **Where:** `support@`, `noreply@`, `dashboard@`, `coach@`, `brooke@` and `conner@elearningu.com` in `shared/user-menu.js` (the help link), `netlify/functions/invite-client.js`, `notify-*.js`, `generate-pdf.js`, the Supabase email functions, `CLAUDE.md`, `SCHEMA.md` (an example) and tests.
- **Change:** move sender and support addresses to the Junction domain (sender domains need SPF and DKIM set up first).

### 13. The emails
- **Where:** `supabase/email-templates/monday.html` and `friday.html`, and `supabase/functions/send-monday-email`, `send-friday-email`, `send-milestone-email`, `send-test-emails`, `check-due-milestones`, `check-milestone-assessments`; `netlify/functions/invite-client.js`, `notify-client-assessment.js`, `notify-coach-assigned.js`, `notify-week-complete.js`.
- **Why:** they print "eLearningU" as a text logo and in footers ("the Junction eLearningU Accelerator"), in navy `#11154b` and mint `#aadab6`.
- **Change:** use the Junction wordmark (hosted PNG, since email clients block web fonts and SVG), Forest and Newsprint, and Junction wording.

### 14. Login, account and staff pages
- **Where:** `login/index.html`, `auth/callback/index.html`, `auth/set-password/index.html`, `account/profile/index.html`, `my-clients/index.html`, and `admin/` (`analytics`, `create-project`, `create-experience`, `manage-experience`, `generate-assessment`, `trigger-milestone`).
- **Why:** each has the eLearningU logo or name, Raleway and Open Sans, and navy and mint. A client meets the login page before their dashboard.
- **Change:** load `assets/v2/tokens.css` (or a shared copy of the roles) and the brand fonts, and use the Junction wordmark.

### 15. Shared scripts that draw on the dashboard
- **Where:** `shared/auth.js` (loading and access-denied screens), `shared/user-menu.js` (menu, help link), `shared/content-editor.js` (Edit Mode toolbar), `shared/share-modal.js`.
- **Why:** they inject their own styles with navy and mint written in. `share-modal.js` reads `--navy`, `--navy-light`, `--mint`, `--cream` and `--font-d` with eLearningU fallbacks; `tokens.css` keeps those names as aliases of the Junction roles, so on v2 pages it already shows Junction colours. The others do not read tokens.
- **Change:** read the role tokens (`--color-dark`, `--color-action`, `--color-text` and so on) with Junction fallbacks, and remove the aliases from `tokens.css` once nothing reads them.

### 16. PDFs and assessment pages
- **Where:** `netlify/functions/generate-pdf.js` (loads `https://accelerator.elearningu.com/assets/elearningu-logo-white.png`, "Powered by eLearningU"), `template/pdf/assessment-report.html`, `template/assessment-only-template.html`, `netlify/functions/generate-assessment-background.js`.
- **Change:** with item 10, build from `tokens.css` and the Junction wordmark. Keep `assets/elearningu-logo-white.png` until no live page or old email links to it.

### 17. v1 templates, other products and docs
- **Where:** `template/accelerator-template.html`, `template/experience-template.html`, `template/elevated-learner-template.html` and the `elevated/` pages, `junction-editor/` (layout, page, `DashboardFrame.tsx`, `tailwind.config.ts`), `design/` (the eLearningU design system), and the coach and Claude docs (`CLAUDE.md`, `CLAUDE_PROJECT_INSTRUCTIONS.md`, `EXPERIENCE_DASHBOARD_GUIDE.md`, `GOOGLE_DOC_TEMPLATE*.md`, `.claude/skills/accelerator/SKILL.md`). `CLAUDE.md` also points to `brand/elearningu-brand.md`, which is not in the repository.
- **Change:** v1 clients stay on eLearningU until they move. Docs should point v2 work at `shared/accelerator-v2/BRAND.md`.

### 18. Client folders
- **Where:** 55 files under `clients/` mention eLearningU (generated v1 pages, `plan.json` deep links, `clients/andreas-resort/README.md`'s production link).
- **Change:** v2 pages pick up the brand when rebuilt. `plan.json` deep links follow item 11.

## Already handled inside v2

For reference, these do not need changes outside v2:
- `shared/progress.js` saves any checkbox with a `data-key` and finds its week from `data-week`, so `chk_` IDs work unchanged.
- `shared/content-editor.js` applies edits by `data-editable-key`, whatever its format, and indents bullets in the flat `.tactic-step-bullets` list that v2 renders.
- `my-clients/index.html` counts checklist items from `plan.json` and ticks from the `progress` table, so its totals work for v2 clients. Old v1 ticks saved under `week-N-check-M` keys stay in the table and would be counted too; a client moving from v1 needs them removed or mapped through `legacy_keys`.
