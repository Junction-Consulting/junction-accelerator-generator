# Accelerator v2

Code for v2 of the accelerator dashboard, as defined in `SCHEMA.md`. Nothing in the live system uses it yet. See "Accelerator v2 (in development)" in the repository's `CLAUDE.md` for the rules that apply to v2 work.

## Modules

| File | What it does | Pure |
|---|---|---|
| `parse-plan.js` | Reads a `plan.md` into a draft tree. Uses the v1 normaliser, so every variation the v1 upload accepts is read the same way | yes |
| `convert.js` | `convertPlan(md, { slug, client, existing })`: assigns IDs, keeps the IDs (and media, cards, Next Step and other non-plan fields) of an existing `content.json`, resolves "how to" links. Runs the v1 structure check first | yes |
| `match.js` | Matches new items to existing ones by text and previous position | yes |
| `ids.js` | ID format, prefixes and generation | yes |
| `checks.js` | `checkContent(content, { previous, otherClients, assetExists })`: blocking errors, warnings and the list of hidden optional content | yes |
| `plan-json.js` | `generatePlanJsonV2(content)`: the email feed, in today's `plan.json` shape | yes |
| `media.js` | Builds media entries with IDs, and neutral placeholder images | yes |
| `render.js` | `renderDashboard(content, { template, assetUrl })`: the dashboard HTML, with every count, total and grid computed from the content. `validateDashboardV2()` checks the result | yes |
| `components.js` | One function per recurring piece: tactic header, part, step, step labels, bullets, table, each media type and frame, metrics, tips, resources, week card, checklist item, quick win, objective, phase | yes |
| `tools/tokenise-css.mjs` | Used once to move the v1 stylesheet's values into `assets/v2/tokens.css` | no |
| `repo.js` | Reads other clients and the media library from the repository (Node only) | no |
| `cli.mjs` | The command line, below | no |

"Pure" modules use no filesystem, network or environment, so they can run in a Netlify function or the browser later.

## Commands

Report only (writes nothing):

    node shared/accelerator-v2/cli.mjs convert andreas-resort

Write `content.json` and `plan.json`:

    node shared/accelerator-v2/cli.mjs convert andreas-resort --save

Saving is refused for a client folder that is not on v2 (no `content.json`, and not listed in `V2_CLIENTS` in `cli.mjs`), when there is any error, and, until `--confirm-matches` is added, when items were matched by similarity rather than identical text.

Check a saved `content.json`:

    node shared/accelerator-v2/cli.mjs check andreas-resort

Build the dashboard from `content.json` (add `--save` to write `index.html`):

    node shared/accelerator-v2/cli.mjs build andreas-resort

Before a real client moves to v2, see `CUTOVER.md`. The brand rules the v2 design follows are in `BRAND.md`.

## Interpretations of SCHEMA.md

Where the schema left a choice open, the code does this:

- **Phases** are the three `Month N Name:` blocks, with the weeks shared out evenly (4, 4, 4). They are time periods only. A tactic's `Phase:` line is kept as written in `phase_label`.
- **Step notes** are split on commas and full stops. Time is anything with a unit of time; cost is anything with `$`, "cost" or "budget"; "contractor" and "Critical" become tags. Words that are neither stay with the part before them ("about 45 minutes, once verified" is all time). A note that is none of these is kept as the time, with a warning.
- **`[CONFIRM ...]`** stays inline where the coach wrote it, tidied to `[CONFIRM: text]`. Nothing blocks or warns on it.
- **Asset IDs** are the `med_` ID of the image they belong to. Each image-bearing item (images, social posts, gallery items, images in a group) has its own `med_` ID. Files are `clients/[slug]/assets/[asset ID].[ext]`.
- **Another client's wording** is a warning, not an error: real plans legitimately share instruction wording. Another client's name or website is an error.
- **Optional fields** are always present in `content.json`, as `null` or `[]` when empty, so every file has the same shape.
- **plan.json** actions are the action text only. v1 leaves "→ links to: ..." on the end of each action, which shows in the emails.
