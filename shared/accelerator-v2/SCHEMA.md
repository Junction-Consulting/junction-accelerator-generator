# Accelerator content schema (v2)

Status: draft for review by Andrea and Conner. Nothing in the live system uses this yet.

## What this is for

Today a plan is generated once from `plan.md`, and every later change (media, copy fixes, layout fixes) is made by hand in the client's `index.html`. The page and the plan drift apart, and the page can never be rebuilt.

In v2, each client has one structured content file. The dashboard and the PDFs are always built from it, and nothing is ever edited in HTML.

    coach uploads plan.md          (unchanged for coaches)
            |
        converter                  assigns permanent IDs, runs the checks
            |
    clients/[slug]/content.json    the single source of truth
            |
        generator
          /     \
    dashboard   PDFs               same content, same tokens, two layouts

After upload, three things write to `content.json`, and nothing else does: the media tool, Edit Mode (see Open decisions) and a re-upload of the plan.

## Principles

1. **Content holds words and facts. The template holds layout and labels.** No client copy in a template, and no layout markup in content.
2. **Every item has a permanent ID.** Progress, notes, edits, "how to" links, emails and media files are keyed by ID, never by position.
3. **Missing means hidden.** If an optional field is empty, the component is not shown. The generator never fills a gap with default or placeholder text.
4. **Counts are computed.** Number of tactics, tasks per week, grid columns and totals come from the content.
5. **A plan with problems does not publish.** The checks below block the build and say what to fix.

## File

`clients/[slug]/content.json`. JSON, because the file is written by tools (converter, media tool, Edit Mode), not by people, and the repo already reads JSON everywhere. Text fields hold inline Markdown only: `**bold**`, `*italic*`, `` `code` `` and `[links](https://...)`.

`plan.json` (the email feed) becomes an output generated from `content.json`.

## IDs

- Format: a type prefix and six random characters, for example `stp_k4m9qx`. Prefixes: `tac` tactic, `prt` part, `stp` step, `blt` bullet, `med` media, `wk` week, `act` action, `chk` checklist item, `qw` quick win, `phs` phase, `obj` objective.
- Assigned once by the converter. Never changed, never reused, never derived from position or wording.
- On a re-upload, the converter matches items to their existing IDs (by previous position and text similarity) and shows the coach what it matched before saving. New items get new IDs.
- `legacy_keys` (optional, any item): the old positional keys for a migrated client, for example `["week-3-check-2", "rw3_d2"]`, so saved progress and edits can be carried over.

## Structure

```json
{
  "schema_version": 2,
  "template_version": "v2",
  "client": {
    "slug": "andreas-resort",
    "name": "Andrea's Resort",
    "coach_email": "conner@elearningu.com",
    "cohort_start": "2026-10-15",
    "flags": { "sandbox": true, "send_emails": false }
  },
  "program": { "weeks": 12 },
  "strategy": {
    "goal": ["Paragraph one.", "Paragraph two."],
    "positioning": ["Paragraph."],
    "positioning_statement": "Two or three sentences.",
    "welcome_message": "One or two sentences."
  },
  "phases": [
    { "id": "phs_a1b2c3", "name": "Foundation", "description": "Profiles, pattern and first content", "weeks": [1, 4] }
  ],
  "objectives": [
    { "id": "obj_d4e5f6", "title": "Build Social Presence", "description": "...", "tactic": "tac_g7h8i9", "weeks": [1, 4] }
  ],
  "tactics": [],
  "roadmap": { "weeks": [], "closing": "Optional closing paragraph." },
  "quick_wins": { "groups": [], "note": null },
  "voice": { "progress_headlines": [], "tour": [] }
}
```

`phases[].weeks` and `objectives[].weeks` are ranges. Phases must cover every week once, with no overlap. The objective pill ("Tactic 1 · Weeks 1-4") is built from `tactic` and `weeks`, not typed.

Phases are time periods: the three month blocks of the roadmap. They are not linked to tactics. Tactics overlap in time, and steps from different tactics can fall in the same week. A tactic's own theme ("Search Visibility") is its `phase_label`.

### Tactic

```json
{
  "id": "tac_g7h8i9",
  "title": "Social Media Activation",
  "short_label": "Social Media",
  "subtitle": "One sentence.",
  "phase_label": "Search Visibility",
  "what_we_heard": ["Paragraph."],
  "what_this_is": ["Paragraph."],
  "why_it_matters": ["Paragraph."],
  "time_commitment": { "amount": "2 hrs", "detail": "per week for content and engagement" },
  "parts": [],
  "metrics": {
    "columns": ["Metric", "30 Days", "60 Days", "90 Days"],
    "rows": [["Instagram followers", "350", "600", "1,000"]]
  },
  "tips": ["One tip."],
  "resources": [{ "title": "Meta Business Suite", "url": "https://business.facebook.com/", "description": "Optional." }]
}
```

`phase_label` is the tactic's `Phase:` line, kept exactly as written. It is a theme, not a time period, and is shown as written (for example on the tactic cards). Optional: if it is empty, it is hidden.

`time_commitment` is optional. It is never estimated from step counts.

### Part

```json
{
  "id": "prt_j1k2l3",
  "name": "Set Up Your Content System",
  "card": { "title": "Content System", "description": "Fix both profiles and set a weekly pattern" },
  "steps": []
}
```

`card` fed "What This Breaks Into", which the redesign removes (DESIGN-BRIEF.md section 6). It is kept in `content.json` but not shown.

### Step

```json
{
  "id": "stp_k4m9qx",
  "title": "Fix both profiles before you post anything",
  "time": "about 20 minutes",
  "cost": null,
  "tags": [],
  "body": [
    { "type": "bullets", "items": [
      { "id": "blt_m4n5o6", "text": "On Instagram, tap **Edit profile** and rewrite the bio.",
        "children": [] }
    ] },
    { "type": "table", "columns": ["Directory", "Why it matters", "Time"], "rows": [["Apple Maps", "Default on every iPhone", "15 minutes"]] }
  ],
  "links": [{ "title": "About story highlights", "url": "https://help.instagram.com/813938898787367" }],
  "media": []
}
```

- `time` and `cost` are separate fields, never text inside the title.
- `tags`: any of `critical`, `contractor`. A fixed list, so every tag gets one designed style.
- `body` is an ordered list of blocks. Block types: `bullets` (one level of `children`) and `table`.
- `links` are resource links for this step only, separate from the tactic's resource list.
- Media always sits below the step text. There is no layout option in the content.
- `[CONFIRM ...]` reminders stay inline in the text, exactly where the coach wrote them. They remind the client to adapt the step to their own business. The converter stores each one in a single form, `[CONFIRM: which rooms]`, with the text tidied for display (code backticks removed, capitals calmed), and a component shows it as a light highlight reading "which rooms". They can appear in any text field. They never block or warn. A bullet that is only a reminder stays a bullet.

### Media

One model for everything that is currently hand-coded. Each entry in a step's `media` list is one of:

| `type` | Fields | Replaces |
|---|---|---|
| `image` | `asset`, `alt`, `frame`, `bar`, `badge`, `fit`, `caption`, `link` | browser-frame screenshots, loose images, clickable frames |
| `video` | `provider`, `video_id`, `title`, `caption` | the two different video markups |
| `social_post` | `asset`, `alt`, `post_type`, `handle`, `url` | phone-style reel and post cards |
| `gallery` | `title`, `items[]` of `{asset, alt, caption}` | shot lists and photo grids |
| `group` | `layout` (`pair` or `four`), `items[]` of `image` | side-by-side pairs and the four-up row |
| `link_card` | `title`, `subtitle`, `url` | frames for tools with no screenshot |

Every entry also has `id`.

`image` fields:

- `asset`: an asset ID, resolved by the media library. Never a file path. Files are stored under the client slug and named by media ID, so renumbering a step can never break an image. For now, an asset ID is the `med_` ID of the image it belongs to, and every image-bearing item (an image, a social post, each gallery item, each image in a group) has its own `med_` ID. The file is `clients/[slug]/assets/[asset ID].[ext]`. See Open decisions.
- `alt`: required.
- `frame`: `website`, `document`, `phone`, `email` or `none`. This fixes the overloaded URL bar: a website frame shows an address, a document frame shows a title.
- `bar`: the address (website) or the title (document). Omitted for other frames.
- `badge`: `mockup`, `example` or none. A real screenshot has no badge.
- `fit`: `crop` (default, fixed ratio) or `full` (whole page, opens larger).
- `caption`: optional.
- `link`: optional `{ "url": "...", "label": "Open site" }`.

Hand-coded HTML mockups (the booking bar, the booking page, the emails) are not modelled. They become images with `badge: "mockup"`.

### Roadmap

```json
{
  "id": "wk_p7q8r9",
  "number": 1,
  "title": "Profiles and Pattern",
  "next_step": { "time_needed": "1 to 2 hours", "who": "You" },
  "actions": [
    { "id": "act_s1t2u3", "text": "Rewrite both bios and add the booking link", "how_to": "stp_k4m9qx" },
    { "id": "act_v4w5x6", "text": "Reply to all 20 existing Google reviews", "how_to": "quick_wins" }
  ],
  "checklist": [
    { "id": "chk_y7z8a9", "text": "Both bios say where the resort is and link to the booking page",
      "tactic": "tac_g7h8i9", "tactic_source": "plan" }
  ]
}
```

- `how_to` is a step ID, `quick_wins` or empty. It is checked at build time, and it survives steps being added, removed or reordered.
- **Tasks are the actions** (DESIGN-BRIEF.md section 7). Each action is a tick box, saved under its `act_` ID. Progress counts ticked actions. An action counts towards the tactic its `how_to` step belongs to; an action with no link, or a link to `quick_wins`, counts towards the overall total only.
- `next_step` is optional. The redesigned dashboard does not show it; it is kept for now.
- The checklist stays in `content.json` (and in `plan.json` for the emails) but is not shown on the page and does not count towards progress. Each checklist item still records one tactic:
  - `tactic_source` is `plan` when the plan says so with `→ tactic: N` at the end of the item, and `guess` when the converter worked it out.
  - With no marker, the converter uses v1's rule: the tactic of the action in the matching position in the week, otherwise the week's main tactic (the one most of its actions link to; a week with no links keeps the previous linked week's).
  - Once stored, an assignment is kept on re-conversion unless the plan's marker changes, so a coach's correction is never replaced by a guess.
  - Guessed assignments are listed in the upload report (and as a warning) so the coach can check them. A marker that names a tactic that does not exist blocks publishing.

### Quick Wins

Shown on the roadmap, after the last month, as "Google Business Profile wins" (DESIGN-BRIEF.md section 6). There is no separate Quick Wins page. Roadmap actions whose `how_to` is `quick_wins` link there. Ticks do not count toward plan progress.

```json
{
  "intro": "One or two sentences shown above the groups.",
  "groups": [
    { "title": "On the Google Business Profile", "items": [
      { "id": "qw_b1c2d3", "title": "Reply to all 20 Google reviews", "text": "None of them has a response." }
    ] }
  ],
  "note": { "title": "One Thing Worth Watching", "text": "Paragraph." }
}
```

### Voice (optional)

`progress_headlines` (one per progress tier; not shown by the redesigned dashboard, kept for now) and `tour` (one description per tour stop). If missing, the neutral program wording from the template is used. This is the only place a template default is allowed, because the wording is about the program, not the client.

## Assessment

The Assessment page is not part of `content.json`. It is built from the client's assessment: the `assessment_data` of its row in the Supabase `client_assessments` table, which the assessment generator writes. In production the generator reads that row at build time; if there is none, the page and its nav item are left out.

The Andrea's Resort sandbox has no Supabase row, so it keeps a copy in `clients/andreas-resort/assessment.json`, in the same shape as a `client_assessments` record. That file exists for the sandbox only.

Assessment items have no IDs. Their edit keys are their path in `assessment_data`, for example `assessment.executive_summary.key_strengths.0`.

## Saved state

All saved state moves to Supabase and is keyed by item ID:

| State | Today | v2 |
|---|---|---|
| Task ticks (the actions) | Supabase, keyed by position (checklist items) | Supabase, keyed by `act_` ID |
| Read state and last step opened (stage 2a) | none | this browser only for now, then Supabase |
| The assessment's quick wins on the dashboard | none | this browser only for now, keyed by position (`aqw-N`: assessment items have no IDs) |
| Quick Wins ticks | this browser only | Supabase, keyed by `qw_` ID |
| Item and week notes | this browser only | Supabase, keyed by `act_` or `wk_` ID |
| Text edits | Supabase, keyed by position | keyed by item ID and field |

## Checks that block publishing

- Empty items, or items that are only `---`
- Placeholder or template text (`[Step title]`, `{{NAME}}`)
- Another client's name or website (domain)
- A `how_to` that points at a step that does not exist
- A media entry with no `alt`, or an `asset` the library cannot find
- A resource whose title is a bare URL
- Duplicate or changed IDs
- Phases that do not cover every week exactly once
- An objective without a tactic, or a tactic without an objective

`[CONFIRM ...]` reminders are content, not problems: nothing blocks or warns on them. `[INSERT ...]` and `[ADD ...]` still warn.

Warnings (do not block). The coach sees these in the upload report and in Edit Mode:

- Optional content that is empty and will therefore be hidden: the roadmap closing note, time commitment, tactic phase labels, the Quick Wins intro and closing note
- `[INSERT ...]` or `[ADD ...]` left in visible text, which usually means an unfinished draft
- House copy rules: no em dashes, no "--", "then" in place of arrows, Canadian spelling
- A short label over 28 characters
- Wording shared with another client's plan (a run of 12 words in one field). Plans legitimately share tactics and instructions, so this only asks the coach to check.

## How `plan.md` maps to this

Coaches keep writing and uploading `plan.md` in the format in `PLAN_FORMAT.md`. The converter reads it as follows.

| In `plan.md` | Becomes |
|---|---|
| `## Goal`, `## Strategic Positioning`, blockquote, `## Welcome Message` | `strategy` |
| `Phase:` on each tactic | `phase_label`, exactly as written |
| `Month N Name:` | `phases` (ranges from the month blocks until a plan says otherwise) |
| `## Tactic N`, its header lines and seven sections | `tactics[]` |
| `#### Part X: Name` | `parts[]` |
| `1. **Title.** *(note)*` | `title`, and the note is split into `time`, `cost` and `tags` |
| Bullets and sub-bullets | `body` bullets and `children` |
| A Markdown table under a step | `body` table (v1 drops these) |
| `[CONFIRM: ...]` anywhere | kept inline, as `[CONFIRM: text]`, shown as a light highlight |
| `→ links to: Tactic 2 / Step 5` | `how_to` with that step's ID |
| `→ tactic: 2` at the end of a checklist item | that item's `tactic` (the tactic's ID), with `tactic_source: "plan"`. The marker is removed from the text. Not yet in `PLAN_FORMAT.md` (see `CUTOVER.md`) |
| `## Objectives` | `objectives[]`, with the pill parsed into `tactic` and `weeks` |
| `## GBP Quick Wins` | `quick_wins`: text above the first group is `intro`, a heading with paragraphs and no bullets ("One Thing Worth Watching") is `note` |

Fields with no `plan.md` equivalent (`card`, `next_step`, `phases[].description`, `roadmap.closing`, `time_commitment`, `voice`) are optional. They can be added to the drafting instructions later as extra labelled lines, so coaches still type nothing new. Until then those components are hidden, not filled with defaults.

Media is never written in `plan.md`. It is added afterwards through the media tool.

## Planned: draft and published plans (not built yet)

Each plan will have a status, `draft` or `published`.

- A draft exists so media and edits can be added after upload. The client cannot open it. Staff and the coach can.
- Publishing makes the dashboard visible to the client, and can notify them (an email with the link).
- The status is not part of `content.json` until it is built. Deciding where it lives (most likely the client's project record in Supabase) is part of the work.

This needs changes to login and access (`shared/auth.js`, the access rules in Supabase and the notification function), which are outside the v2 paths. It is listed for Conner.

## Open decisions

1. **Edit Mode.** Recommended: keep edits as an overlay in Supabase, keyed by item ID and field, and write them into `content.json` whenever the plan is rebuilt. Committing every small edit to the repo would trigger a site deploy per edit. Either way, the PDF must show the edited text.
2. **Media library handoff.** The media tool writes `media` entries in the shape above and owns `asset` IDs. To agree with Conner before either side builds. Until then, an asset ID is the `med_` ID of its image, and each gallery item and group image has its own `med_` ID (see Media). The Andrea's Resort sandbox uses this.
3. **Program length.** `program.weeks` and phase ranges allow plans that are not 12 weeks. The weekly emails and `week_completions` currently assume 1 to 12.
4. **Existing clients.** They stay on v1 untouched. Migration (including `legacy_keys`) is a separate, later decision.
5. **Draft and published.** See Planned above. Needs login and access changes, for Conner.

## Changelog

- 2026-11-23: first draft.
- 2026-11-24: Andrea's decisions. Media always below the step (no side layout). `[CONFIRM]` notes are client-facing and become `confirm` entries; nothing blocks on them. Empty optional content is hidden from clients and listed for the coach.
- 2026-11-24 (later): Andrea's decisions after the Stage 1 converter.
  - A tactic's `Phase:` is a theme, kept as `phase_label`. `tactics[].phase` is removed. Phases are time periods only, from the months.
  - `quick_wins.intro` added, shown above the groups.
  - `[CONFIRM ...]` reminders stay inline as `[CONFIRM: text]` and are shown as a light highlight. The `confirm` entries, the `cnf` prefix and the callout are removed. Nothing blocks or warns on them.
  - Another client's name or website blocks. Shared wording is a warning.
  - Asset IDs are media IDs for now (open decision 2, for Conner).
  - Planned, not built: draft and published plan status.
- 2026-11-24 (Stage 2 follow-ups): Checklist items count towards exactly one tactic (`tactic`, `tactic_source`, the `→ tactic: N` marker). The Assessment page comes from the client's `client_assessments` record. `CUTOVER.md` lists what must change outside v2 before a real client moves.
- 2026-11-26 (design brief phase 2): Tasks are the actions: progress, tactic progress and the saved ticks use `act_` IDs, and the checklist is kept but not shown. Phase descriptions, `next_step` and `progress_headlines` are not shown by the redesigned dashboard. Stage selection, the current week and score levels (by letter grade) live in `assets/v2/progress-model.js`.
- 2026-11-26 (design brief phase 3): The roadmap shows the quick wins as "Google Business Profile wins" after the last month; the Quick Wins page is gone. Part cards are no longer shown. Tactic pages have two tabs (Overview, Implementation steps) and every step is collapsible. `what_we_heard` is shown as paragraphs: there is no separate pull-quote field yet (see the phase 3 report).
