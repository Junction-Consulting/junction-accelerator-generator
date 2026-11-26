# Andrea's Resort: Accelerator v2 sandbox

This is the first dashboard built by Accelerator v2 (see `shared/accelerator-v2/SCHEMA.md`). It is a sandbox: it is not a real client, and no weekly emails are meant to go out for it (`flags.send_emails` is `false`).

**Do not edit `index.html`.** It is generated from `content.json` and is overwritten by the next build. `tests/v2/render.test.js` fails if the committed page differs from what the generator builds.

## Files

| File | What it is | How it changes |
|---|---|---|
| `plan.md` | The coach's plan, in the `PLAN_FORMAT.md` format | Edited by hand, then converted |
| `content.json` | The single source of truth for the page: every item with its permanent ID, plus media | Written by the converter and the media script only |
| `assets/` | Media files, named by media ID (`med_xxxxxx.svg`). Neutral placeholders for now | Written by the media script |
| `index.html` | The dashboard | Built from `content.json` |
| `plan.json` | The weekly email feed | Built from `content.json` |
| `assessment.json` | The sandbox's assessment, in the shape of a Supabase `client_assessments` record (a renamed copy of the sales demo's). Real clients' assessments come from Supabase | Edited by hand |
| `sandbox-media.md` | The media this sandbox carries, and the cases it is built to test | Edited by hand |
| `add-sandbox-media.mjs` | Adds the media in `sandbox-media.md`. A stand-in for the media tool | Run by hand |

The page follows the Junction redesign in `shared/accelerator-v2/DESIGN-BRIEF.md` (phase 1, tokens and navigation, is in). Its stylesheet and scripts are shared, not copied in: `assets/v2/tokens.css`, `assets/v2/accelerator.css`, `assets/v2/accelerator.js` and `assets/v2/accelerator-after.js`, with the page layout in `template/v2/accelerator.html`.

## Workflow

### Change the plan

1. Edit `plan.md`.
2. Convert it. This reports what changed and writes nothing:

       node shared/accelerator-v2/cli.mjs convert andreas-resort

   Items that were reworded keep their IDs, and are listed so you can check the match. Checklist items without a `→ tactic: N` marker get a tactic worked out from the week's "how to" links; those are listed too (weeks 4 and 12 are left without markers on purpose, to cover this). Media, Next Step details and other fields that are not in `plan.md` are kept.
3. Save it, adding `--confirm-matches` if the report listed matches you have checked:

       node shared/accelerator-v2/cli.mjs convert andreas-resort --save

4. Build the page:

       node shared/accelerator-v2/cli.mjs build andreas-resort --save

5. Run `npm test`, then commit.

### Change the design

Edit the shared files, not the page:

- Colours, fonts, sizes, spacing, radii and shadows: `assets/v2/tokens.css`. `assets/v2/accelerator.css` may only use `var(--...)`; `tests/v2/styles.test.js` checks this.
- A component's markup: `shared/accelerator-v2/components.js`.
- The page layout and fixed labels: `template/v2/accelerator.html`.
- Behaviour: `assets/v2/accelerator.js`.

Then rebuild the page (step 4 above) and run `npm test`. Every v2 page picks up the change, because they all load the same files.

### Add or change media

For now, edit `add-sandbox-media.mjs` and run it. It only adds media to steps that have none, so existing IDs and files never change. The real media tool is open decision 2 in `SCHEMA.md`.

## Not yet in v2

- The PDFs (the roadmap prints from the browser, as in v1).
- Notes and Quick Wins ticks are saved in this browser only, as in v1. Checklist ticks are saved to the account, keyed by `chk_` ID.
- Edit Mode edits are saved by the existing Edit Mode, keyed by item ID and field (for example `stp_xxxxxx.title`), but they are not yet written back into `content.json`.

## Before a real client moves to v2

See `shared/accelerator-v2/CUTOVER.md`: the changes needed outside v2 (emails, Add Plan, saved notes, Edit Mode, draft status, PDFs and the tactic marker).

## Do not use the v1 tools on this folder

`scripts/regenerate-dashboards.js andreas-resort --write` and the Add Plan upload would replace this page with a v1 page. `scripts/validate-client.js` reads it as v1 and reports it as "assessment-only, 0 checklist items"; use `node shared/accelerator-v2/cli.mjs check andreas-resort` instead.

## Access

- Production: https://accelerator.elearningu.com/andreas-resort/
- Requires login (admin/PSM access or explicit permission in Supabase)
