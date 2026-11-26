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

## Added by the v2 redesign (DESIGN-BRIEF.md)

### 11. The Junction brand outside the dashboard
- **Files:** `shared/accelerator-v2/plan-json.js` (`DASHBOARD_ORIGIN`, inside v2 but tied to the live domain), `shared/user-menu.js`, `shared/auth.js`, the login pages (`login/`, `auth/`), the email templates in `supabase/functions/`, and the `coach_email` on each client record
- **Why:** the v2 page no longer names eLearningU, but the weekly emails link to `accelerator.elearningu.com`, the coach email is an `@elearningu.com` address, and the login and account pages still use the old brand. `user-menu.js` and the Edit Mode switch in `auth.js` draw themselves for the old dark sidebar; `assets/v2/accelerator.css` redraws them for the light page ground, which works but depends on their class names.
- **Change:** decide the dashboard domain and coach addresses, then rebrand the shared pages and emails. Give `user-menu.js` and the Edit Mode switch a light variant so v2 no longer needs to override them.

### 12. Browser-only state added by the redesign
- **Why:** the brief keeps the plan's read state (stage 2a) and the last step opened in the browser for now. Like item 7, they are lost on a new device and invisible to the coach.
- **Change:** move them to the account with notes and Quick Wins ticks (item 7).

### 13. Web fonts from Google
- **Why:** v2 loads Epilogue, DM Sans, Bebas Neue and Fraunces from Google Fonts. The Content Security Policy in `netlify.toml` already allows `fonts.googleapis.com` and `fonts.gstatic.com`, so nothing is blocked today. Keep them allowed if the policy changes, or self-host the four fonts in `assets/v2/`.

## Already handled inside v2

For reference, these do not need changes outside v2:
- `shared/progress.js` saves any checkbox with a `data-key` and finds its week from `data-week`, so `chk_` IDs work unchanged.
- `shared/content-editor.js` applies edits by `data-editable-key`, whatever its format, and indents bullets in the flat `.tactic-step-bullets` list that v2 renders.
- `my-clients/index.html` counts checklist items from `plan.json` and ticks from the `progress` table, so its totals work for v2 clients. Old v1 ticks saved under `week-N-check-M` keys stay in the table and would be counted too; a client moving from v1 needs them removed or mapped through `legacy_keys`.
