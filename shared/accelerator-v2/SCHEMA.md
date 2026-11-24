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

- Format: a type prefix and six random characters, for example `stp_k4m9qx`. Prefixes: `tac` tactic, `prt` part, `stp` step, `blt` bullet, `med` media, `wk` week, `act` action, `chk` checklist item, `qw` quick win, `phs` phase, `obj` objective, `cnf` confirm note.
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

### Tactic

```json
{
  "id": "tac_g7h8i9",
  "title": "Social Media Activation",
  "short_label": "Social Media",
  "subtitle": "One sentence.",
  "phase": "phs_a1b2c3",
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

`card` feeds "What This Breaks Into". If it is missing, the card shows the part name only.

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
  "media": [],
  "confirm": [{ "id": "cnf_e4f5g6", "text": "Drive time from Kelowna", "bullet": "blt_m4n5o6" }]
}
```

- `time` and `cost` are separate fields, never text inside the title.
- `tags`: any of `critical`, `contractor`. A fixed list, so every tag gets one designed style.
- `body` is an ordered list of blocks. Block types: `bullets` (one level of `children`) and `table`.
- `links` are resource links for this step only, separate from the tactic's resource list.
- Media always sits below the step text. There is no layout option in the content.
- `confirm` holds the things the client needs to confirm before carrying out the step. They are shown to the client as their own component, not as bracketed text inside a sentence. `bullet` (optional) is the bullet the note came from.

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

- `asset`: an asset ID, resolved by the media library. Never a file path. Files are stored under the client slug and named by media ID, so renumbering a step can never break an image.
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
    { "id": "chk_y7z8a9", "text": "Both bios say where the resort is and link to the booking page" }
  ]
}
```

- `how_to` is a step ID, `quick_wins` or empty. It is checked at build time, and it survives steps being added, removed or reordered.
- `next_step` is optional. If it is missing, the Next Step card shows the action and tactic only.
- Tactic progress is counted from the checklist items of weeks whose actions point into that tactic.

### Quick Wins

```json
{
  "groups": [
    { "title": "On the Google Business Profile", "items": [
      { "id": "qw_b1c2d3", "title": "Reply to all 20 Google reviews", "text": "None of them has a response." }
    ] }
  ],
  "note": { "title": "One Thing Worth Watching", "text": "Paragraph." }
}
```

### Voice (optional)

`progress_headlines` (one per progress tier) and `tour` (one description per tour stop). If missing, the neutral program wording from the template is used. This is the only place a template default is allowed, because the wording is about the program, not the client.

## Saved state

All saved state moves to Supabase and is keyed by item ID:

| State | Today | v2 |
|---|---|---|
| Checklist ticks | Supabase, keyed by position | Supabase, keyed by `chk_` ID |
| Quick Wins ticks | this browser only | Supabase, keyed by `qw_` ID |
| Item and week notes | this browser only | Supabase, keyed by `chk_` or `wk_` ID |
| Text edits | Supabase, keyed by position | keyed by item ID and field |

## Checks that block publishing

- Empty items, or items that are only `---`
- Placeholder or template text (`[Step title]`, `{{NAME}}`)
- Another client's name, domain or wording
- A `how_to` that points at a step that does not exist
- A media entry with no `alt`, or an `asset` the library cannot find
- A resource whose title is a bare URL
- Duplicate or changed IDs
- Phases that do not cover every week exactly once
- An objective without a tactic, or a tactic without an objective

Warnings (do not block). The coach sees these in the upload report and in Edit Mode:

- Optional content that is empty and will therefore be hidden: phase descriptions, Next Step time and who, part card descriptions, the roadmap closing note, time commitment
- `[INSERT ...]` or `[ADD ...]` left in visible text, which usually means an unfinished draft
- House copy rules: no em dashes, no "--", "then" in place of arrows, Canadian spelling
- A short label over 28 characters

## How `plan.md` maps to this

Coaches keep writing and uploading `plan.md` in the format in `PLAN_FORMAT.md`. The converter reads it as follows.

| In `plan.md` | Becomes |
|---|---|
| `## Goal`, `## Strategic Positioning`, blockquote, `## Welcome Message` | `strategy` |
| `Phase:` on each tactic, `Month N Name:` | `phases` (ranges from the month blocks until a plan says otherwise) |
| `## Tactic N`, its header lines and seven sections | `tactics[]` |
| `#### Part X: Name` | `parts[]` |
| `1. **Title.** *(note)*` | `title`, and the note is split into `time`, `cost` and `tags` |
| Bullets and sub-bullets | `body` bullets and `children` |
| A Markdown table under a step | `body` table (v1 drops these) |
| `[CONFIRM: ...]` anywhere | a `confirm` entry on that step, shown to the client as a designed callout |
| `→ links to: Tactic 2 / Step 5` | `how_to` with that step's ID |
| `## Objectives` | `objectives[]`, with the pill parsed into `tactic` and `weeks` |
| `## GBP Quick Wins` | `quick_wins` |

Fields with no `plan.md` equivalent (`card`, `next_step`, `phases[].description`, `roadmap.closing`, `time_commitment`, `voice`) are optional. They can be added to the drafting instructions later as extra labelled lines, so coaches still type nothing new. Until then those components are hidden, not filled with defaults.

Media is never written in `plan.md`. It is added afterwards through the media tool.

## Open decisions

1. **Edit Mode.** Recommended: keep edits as an overlay in Supabase, keyed by item ID and field, and write them into `content.json` whenever the plan is rebuilt. Committing every small edit to the repo would trigger a site deploy per edit. Either way, the PDF must show the edited text.
2. **Media library handoff.** The media tool writes `media` entries in the shape above and owns `asset` IDs. To agree with Conner before either side builds.
3. **Program length.** `program.weeks` and phase ranges allow plans that are not 12 weeks. The weekly emails and `week_completions` currently assume 1 to 12.
4. **Existing clients.** They stay on v1 untouched. Migration (including `legacy_keys`) is a separate, later decision.

## Changelog

- 2026-11-23: first draft.
- 2026-11-24: Andrea's decisions. Media always below the step (no side layout). `[CONFIRM]` notes are client-facing and become `confirm` entries; nothing blocks on them. Empty optional content is hidden from clients and listed for the coach.
