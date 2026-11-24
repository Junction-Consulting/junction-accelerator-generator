# Accelerator v2: Junction brand rules

The v2 dashboard follows the Junction brand cheat sheet (website system, Direction 1, October 2026). This file is the summary later work must follow. The values live in `assets/v2/tokens.css`; `assets/v2/accelerator.css` only uses the role tokens, never a raw value.

The cheat sheet's type scale is for the website. The dashboard keeps its own sizes.

## Colour

| Job | Token | Value |
|---|---|---|
| Page ground | `--color-page` | Newsprint `#F4F0E8` |
| Cards | `--color-surface` | White |
| Hover fills | `--color-hover` | Newsprint-hover `#EDE6DA` |
| Sidebar and dark sections | `--color-sidebar`, `--color-dark` | Forest `#1A4D2E` |
| Text on dark | `--color-text-on-dark` | Newsprint |
| Accent on dark | `--color-accent-on-dark` | Fern `#7FC99A` |
| Text | `--color-text` | Carbon `#1C1C1A` |
| Secondary text | `--color-text-secondary` | Flint `#6A6862` |
| Buttons and links | `--color-action`, `--color-link` | Canopy-text `#2B764A` |
| Lines and fills | `--color-brand`, `--color-divider` | Canopy `#2E7D4F` |
| Boxes: callouts, table rows, the confirm highlight | `--color-box` | Sage `#C8E8D4` |
| Notes and outputs | `--color-note` | Sage-25 `#E9EEE3` |
| Numbers on light, 24px and up | `--color-stat` | Gold-on-light `#A57E31` |
| Small numbers and meta labels on light | `--color-stat-small`, `--color-meta` | Copper `#A55527` |
| Hover and active, on light | `--color-action-hover`, `--color-link-hover`, `--color-border-hover` | `#CD1561` |
| Hover and active, on dark | `--color-action-hover-on-dark` | `#ED5192` |
| Good | `--color-good` | Canopy |
| Caution | `--color-caution` | Gold-on-light |
| Critical | `--color-critical` | One muted red, `#A63A32`, for critical only |

Rules:
- **Pink** is only for hover and active states of clickable things. Nothing decorative is pink.
- **Sage** is for boxes, never a full-width section (the cheat sheet allows one approved exception per page).
- **Gold** `#C4963A` is for numbers on Carbon only, never on Forest. On Newsprint use Gold-on-light, at 24px and up. Below that, Copper.
- **Copper** is used sparingly: small stats, meta labels.
- **Buttons on dark grounds** have a Newsprint fill (`--color-action-on-dark`).
- **Lines:** no thin grey lines. Dividers are 2px Canopy (`--line-divider`). Editorial rules are Carbon. Card outlines use Newsprint-hover.
- **Grounds:** Newsprint pages; Carbon and Forest sections. Closing calls to action on Forest; footers on Carbon.
- **Do not use the JunctionU colours** (JU green `#16241C`, Moss `#20352A`, Mint `#B6F0C9`). They belong to the JunctionU sub-brand.

## Type

Loaded from Google Fonts in `template/v2/accelerator.html`.

| Job | Family | Weight | Token |
|---|---|---|---|
| Headings | Epilogue | 900; 600 for the smallest heading level | `--font-display`, `--weight-heading`, `--weight-heading-small` |
| Body | DM Sans | 400 | `--font-body`, `--weight-body` |
| Labels and buttons | DM Sans | 500 | `--weight-label` |
| Numbers only: progress percentages, counts, week numbers, scores | Bebas Neue | 400 | `--font-number`, `--weight-number` |
| The positioning statement quote | Fraunces | 900 italic | `--font-quote`, `--weight-quote` |

Rules:
- **Buttons are sentence case.**
- **Bebas is for numbers only.** Never a word on its own. Months, labels and words stay in DM Sans.
- **Fraunces** is for quotes only. On the dashboard that is the positioning statement.
- **Small caps labels** are for meta only, never above section headings.

## The wordmark

- `assets/v2/junction-wordmark.png`: solid, for light grounds (the printed roadmap).
- `assets/v2/junction-wordmark-reversed.png`: reversed, for dark grounds (sidebar, mobile header, welcome screen).
- The cheat sheet's wordmark has a coloured underscore: Canopy on the solid version, Fern on the reversed one. The files in `assets/v2/` are one colour.
- Sub-brands pair with the wordmark: `JUNCTION_U` for JunctionU. The underscore stays; the suffix follows it.

## The rules we built with (from the cheat sheet)

- **Labels:** small caps labels are for meta only, never above section headings.
- **Numbers:** data numbers are never ghosted. In a box: gold Bebas on Carbon. No box: a plain stat list.
- **Lines:** no thin grey lines. Dividers are 2px Canopy; editorial rules are Carbon.
- **Pink:** only for clickable things. Nothing decorative is pink.
- **Heroes:** hero headlines run three lines at most on desktop.
- **Questions:** FAQs are accordions with gold chevrons, never plus icons.
- **Bebas:** numbers only. Months, labels and words stay in DM Sans.
- **CTAs:** every call to action is done in four steps or fewer. No circles.

Also from the cheat sheet:
- **Quote card:** Sage box, Forest text, name below. **Proof card:** gold Bebas stat on Carbon, then the case and one line.
- **Imagery:** only the Junction team gets the spotlight; other people appear as crowds or in the background. No full-bleed photos unless truly high quality. Prefer designed visuals over stock. Team portraits are greyscale.
- **Motion:** calm and functional; everything still works with reduced motion.

## Known departures in the current design

These break a rule above but need a layout or copy change to fix, so they are left as they are for now:
- Small-caps labels sit above section headings (for example "Your Objectives", "Your Tactics", "The 90 Days", "This Week's Actions").
- The Strategy page objective cards have oversized ghosted numbers (`--color-ghost`).
- The Quick Wins block on the Assessment page is a full-width Sage-toned box.
- Progress rings and the "Open the roadmap" button are circles or rounded pills inside calls to action.
