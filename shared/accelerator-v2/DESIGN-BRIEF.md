# Accelerator dashboard v2: design brief

Owner: Andrea. Status: approved direction, ready to build on the sandbox (`clients/andreas-resort`). Conner approves before anything reaches real clients.

This brief turns the approved mockups into a build spec for the v2 template, components and tokens. It changes how the dashboard looks and reads. It does not change what a plan contains or how coaches write one.

## 1. Ground rules

- Work only in the v2 paths and `clients/andreas-resort/`, on a branch, through a pull request. The safety section in `CLAUDE.md` applies in full.
- Everything is generated from `content.json` (and the assessment record). No client copy in templates, no layout in content.
- Every colour, size, radius and spacing value comes from `assets/v2/tokens.css`. No raw values in components.
- Empty optional content is hidden, never replaced with default text.
- If something here needs a change outside the v2 paths, stop and list it. Do not make it.

## 2. The reference mockups

`mockups/` holds the approved screens as HTML. They were made in a design canvas, so they contain canvas markup (`<x-dc>`, `{{holes}}`, `<sc-if>`). Treat them as the visual reference for layout, spacing, colour, type and component structure. Do not copy their markup or their sample scripts into the product.

| File | Shows |
|---|---|
| `R3-Stage1` | Dashboard before the plan exists |
| `S2a-PlanDelivered` | Dashboard when the plan has just been delivered (apply the section 4 and 5 rules to it) |
| `R3-Dashboard` | Dashboard during the plan |
| `S3-PlanDone` | Dashboard when the plan is finished (apply the section 4 and 5 rules to it) |
| `R3-Assessment` | Assessment |
| `R3-Strategy` | Strategy |
| `R3-TacticOverview`, `R3-TacticSteps` | Tactic page, both tabs |
| `R3-Roadmap` | 90-day roadmap |
| `R3-Materials` | Materials |
| `R3-Phone` | Phone direction (see section 9 for the reduced scope) |
| `PDF-Assessment`, `PDF-Plan` | Sample pages of the two PDFs |

Numbers, scores and some wording in the mockups are sample content. Real values come from the client's files.

## 3. Brand and tokens

The Accelerator is a Junction product. Remove every eLearningU reference from v2.

**Colour roles**

| Role | Name | Value |
|---|---|---|
| Page ground | Newsprint | `#F4F0E8` |
| Card surface | White | `#FFFFFF` |
| Sunken or hover surface | Newsprint-hover | `#EDE6DA` |
| Empty track, empty ring | | `#DDD5C6` |
| Text, dark surfaces | Carbon | `#1C1C1A` |
| Secondary text | Flint | `#6A6862` |
| Secondary text on dark | | `#BDB8AE` |
| Buttons, links, tick boxes | Canopy-text | `#2B764A` |
| Progress fills, 2px dividers | Canopy | `#2E7D4F` |
| Accent on dark, progress on dark | Fern | `#7FC99A` |
| Empty track on dark | | `#3A3A36` |
| Highlight boxes | Sage | `#C8E8D4` with Forest `#1A4D2E` text |
| Notes, tips | Sage-25 | `#E9EEE3` |
| Stats on Carbon, current-stage marker | Gold | `#C4963A` |
| Large numerals on light | Gold-on-light | `#A57E31` |
| Gold text on light ("You are here") | | `#7A5C1E` |
| Small meta labels on light | Copper | `#A55527`, sparingly |
| Hover and active on clickable things only | Break pink | `#CD1561` on light, `#ED5192` on dark |

Do not use the JunctionU colours (`#16241C`, `#20352A`, `#B6F0C9`). Forest is not used as a large ground: the first rebrand read as too green.

**Score scale.** Assessment scores use their own colours, deliberately outside the brand palette. The colour follows the letter grade the assessment gives, not a separate score range. Plus and minus grades follow their letter.

| Level | Grade | Value |
|---|---|---|
| Strong | A | `#1F5F6B` |
| Good | B | `#3E8E8A` |
| Fair | C | `#D97F3A` |
| Needs work | D and below | `#B5503A` |

Always show the letter grade beside a coloured score. The level word is optional where space is tight. Keep the grade-to-level mapping in one place so it can change. A score donut's arc and the number inside it are always the same colour.

**Type** (Google Fonts)

- Headings: Epilogue 900. Smallest heading level: Epilogue 600.
- Body, labels, buttons and every number in body text and tables: DM Sans 400 and 500.
- Bebas Neue only inside donuts and for the large step and week numerals. Never for words, never in tables.
- Fraunces 900 italic only for the positioning statement and the "what we heard" pull quote.
- Buttons are sentence case.

**Rules**

- No thin grey lines. Section dividers are 2px Canopy. Separate rows with spacing or alternating tints.
- Small-caps labels are for meta only, never above a section heading.
- Avoid boxes inside boxes. One surface level inside a card at most.
- A donut's percentage is always the same colour as its filled arc.
- When an item is ticked, its sentence drops to 70% opacity. The tick box itself does not change.
- Wordmark: the supplied files, reversed on dark and solid on light. No suffix.

## 4. Navigation

A white rounded panel that floats on the page ground at the left and ends where its links end. It must not run as a solid column from top to bottom. The wordmark sits above it, and "Email your coach" below it.

Items, in order:

1. Dashboard, Assessment, Strategy
2. Group "Tactics": one link per tactic, each with a small ring showing that tactic's progress. No status words.
3. Group "Your plan": 90-day roadmap, Materials

There is no Quick wins item. Before the plan exists, Strategy, Tactics and 90-day roadmap are listed under "Coming with your plan", greyed and not clickable.

## 5. The three stages

The dashboard changes with where the client is. A six-step strip sits under the greeting on every stage: Onboarding call, Assessment, Coaching call, 90-day plan, 30-day check-in, 90-day review. Done steps are Canopy, the current one Gold with "You are here", later ones empty.

| Stage | When | Dashboard leads with |
|---|---|---|
| 1. Before the plan | Assessment exists, no plan | Assessment score and summary, "What happens next", the assessment's quick wins (tickable, on Sage), and "Coming with your plan" |
| 2a. Plan delivered | Plan exists, nothing read or ticked | "Start here: read your plan" listing Strategy and each tactic with read state, then week 1 |
| 2b. During the plan | Anything read or ticked | This week's actions, progress donut, tactic progress, coming up, 30-day check-in note, materials |
| 3. Plan done | Every action ticked | Results, then "What to keep doing", then the next step with Junction |

Notes:

- The current week is the first week with an unticked action. There are no calendar dates anywhere, and nothing says a client is behind.
- Stage 3 results compare the first assessment with later ones. Until check-in data exists, show the starting score and the empty slots.
- "What to keep doing" and the check-in comparison need content that does not exist yet. Build the layout, and list the content needs under section 11.

## 6. Pages

**Dashboard (during the plan)**

- "This week" card: the week's actions as one list. Each row has a tick box, the action, and a "How to" link to its step.
- When every action in the week is ticked, the card's footer becomes a Sage "Week N is done" message with a button to the next week.
- Progress card on Carbon: donut, "N of M tasks checked off", three phase bars.
- "Your tactics": one card per tactic with a ring and "N of M done". The grid follows the number of tactics.
- Bottom row: Coming up (Sage), 30-day check-in (Sage-25), Materials.
- A "Pick up where you left off" link to the last step the client opened.

**Assessment.** Nothing from the report is removed.

- Jump links: Summary, Your six areas, Quick wins, Priority recommendations, Your visitors and market.
- Summary: overall score donut, grade, headline, key strengths, critical gaps, bottom line.
- Your six areas: one list. Each row shows area, score, grade, bar and share of total, with a chevron, and opens in place to show the summary, the numbers, findings, recommendations, sources and confidence, plus a link to the tactic that covers it when there is one. Long lists show the first few with "Show all N".
- Slots for the 30-day check-in and 90-day review: later scores become extra columns in the same list.
- Quick wins on Sage, tickable, with time and impact.
- Priority recommendations as a plain table: recommendation, area, time, impact, expected result.
- Your visitors and market: visitor profile, discovery journey, seasons, trip integration.

**Strategy.** Goal on Carbon, positioning with the statement as a Sage pull quote, then one row per objective linking to its tactic with its ring and weeks. Tactics are not listed a second time.

**Tactic.** Header with title, subtitle, "Tactic N · theme label" and a donut. Two tabs.

- Overview: What this is, Why it matters, What we heard from you (Sage, pull quote), Success metrics as a plain table, Tips (Sage-25), Resources. No "What this breaks into".
- Implementation steps: one continuous scroll. Parts are headings, not tabs. Every step is collapsible with a chevron. An open step shows its labels (time, cost, Contractor, Critical), a link to its week on the roadmap, bullets and sub-bullets, tables, media and step resources.
- `[CONFIRM ...]` notes render inline as a Sage highlight.
- Media uses one frame per type (website, document, phone, email, none) with a Mockup or Example badge and an optional caption, always below the step text.
- Footer: back to overview, and next tactic.

**90-day roadmap**

- Month dividers with "N of M done".
- Weeks are plain rows with a small ring. Only the open week sits on a white panel.
- Inside a week: one list of actions, each with a tick box, "How to" and "Note". "How to" expands a short preview from the linked step (its first two bullets) with a link to the full step.
- Week notes field.
- After Month 3: a section named "Google Business Profile wins" holding the plan's own quick-win groups and its "One thing worth watching" note. Tickable. Roadmap actions that point to quick wins link here.
- Download as PDF.

**Materials.** One row per item: assessment report, onboarding call notes, coaching call summary, 90-day plan PDF. Items that do not exist yet (30-day check-in report, 90-day review) show greyed with when they arrive. Only the two PDFs can be wired now. List the rest under section 11.

## 7. Behaviour

- **Tasks are the actions.** Progress counts ticked actions. The plan's checklist lines stay in `content.json` but are not shown. Coaches do not change how they write plans.
- **Tactic progress** counts the actions whose "how to" points into that tactic. Actions with no link count toward the overall total only.
- **Everything updates at once.** Ticking an action updates the week count, the donut, the phase bars, the tactic rings in the navigation and the tactic cards without a reload, on every page that shows them.
- **Keys.** Ticks are saved by action ID through the existing `shared/progress.js`. Do not edit that file.
- **Quick wins and Google Business Profile wins** are tickable and do not count toward plan progress.
- **Read state** (stage 2a) and **last step opened** can be kept in the browser for now. Note this in `CUTOVER.md` as something to move to the account later.
- **Steps and areas** remember nothing: they open collapsed except the one linked to.

## 8. PDFs

Two documents, generated per client from the same content and tokens as the dashboard: the assessment report and the 90-day plan. They are designed documents, not a print of the page.

- Letter size. Dark cover (Carbon, reversed wordmark, title, client, date, and the score or goal). Inside pages are white with a running header and page numbers.
- They use the same components as the dashboard, restyled for the page: score table, area pages, step blocks with media, roadmap weeks with empty tick boxes, tips.
- Content must reflow for any client. Rules: a step never separates from its title, media stays with its step, tables repeat their header on a new page, a part or week heading is never the last line on a page.
- Print body text no smaller than 11pt.
- Build them as templates that a renderer can turn into PDFs. Which renderer is Conner's decision (section 11). Until then, they must also produce a correct result through the browser's print dialog.
- Test both PDFs against every real plan and assessment in `clients/`, in a scratch folder.

## 9. Phone

The phone view is deliberately limited. Design two things well:

1. **The to-do list**: this week's actions with ticks. "How to" opens that one step.
2. **The scorecard**: overall score and the six areas, each opening in place.

Everything else stays reachable from a menu in a plain single-column layout, with no extra design work. Wide tables scroll inside their own box. Touch targets are at least 44px.

## 10. Build order

Stop after each phase and report with desktop and phone screenshots.

1. Tokens and navigation. Update `tokens.css` to section 3, build the side panel, apply to the sandbox.
2. Dashboard for the four stage states, with live updates.
3. Roadmap and tactic pages.
4. Assessment, Strategy, Materials.
5. Phone pass.
6. PDF templates.
7. Welcome window and tour, rebuilt for the new layouts.

**Sandbox stage switcher.** Build this in Phase 2. On the sandbox only, show a small "Preview stage" control fixed to the bottom of the screen with four options: Before the plan, Plan just delivered, During the plan, Plan done.

- It appears only when `client.flags.sandbox` is true in `content.json`, so it can never show on a real client.
- Choosing a stage changes what every page shows (dashboard, navigation, assessment slots, materials) by using sample state for that stage. It never writes to saved progress.
- "During the plan" uses the real saved ticks, so ticking still works there.
- "Plan done" shows sample check-in scores, clearly labelled as sample.
- The choice is remembered in the browser, and each stage has its own link (for example `?stage=done`) so a specific stage can be shared for review.
- It is visibly a review tool: styled apart from the product, with a short "Sandbox preview" label.

## 11. For Conner's approval

Nothing here is built without his say.

- PDF renderer: extend the existing DocRaptor or PDFShift path used for assessment-only clients, and confirm the account.
- "Request your check-in" and "Book your review call" as buttons that open a pre-filled email to the coach.
- The Friday recap email counting actions in place of checklist items.
- Storing check-in assessments (30 and 90 days) so scores can be compared.
- Onboarding call notes and coaching call summary as Materials items.
- The monthly "What to keep doing" list for finished plans: where its content comes from.
- Read state, last step opened, notes and quick-win ticks moving from the browser to the account.
- Everything already listed in `CUTOVER.md`.

## 12. Done means

- The sandbox matches the mockups at 1440px and 390px for every page and stage.
- All 13 real plans generate without errors in a scratch folder, with no client's wording in another's page.
- No raw colour or size values outside `tokens.css`.
- `npm test` passes, with new tests for progress counting, stage selection and the grid rules.
- `SCHEMA.md` and `CUTOVER.md` are updated with anything this build added or deferred.
