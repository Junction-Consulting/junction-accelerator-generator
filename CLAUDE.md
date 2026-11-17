# Junction Dashboard Generator

You are working inside the Junction Dashboard Generator. Your job is to produce
polished, fully-functional HTML dashboard pages by reading a client's `plan.md`
and filling the appropriate template.

---

# Part 1: Shared Preamble

These rules apply to **every dashboard type** (accelerator, experience, etc.).

---

## Generation method (hard constraint)

**NEVER write a dashboard file from scratch. NEVER regenerate the whole document in one pass. NEVER use a subagent task to generate the dashboard.**

The templates are roughly 6,000 lines. Writing them wholesale drops sections, corrupts the JS arrays, and takes hours. Every change must be a targeted edit against a copied file.

**Required procedure:**
1. Copy the template to the output path first: `cp template/[template].html [output-dir]/[slug]/index.html`
2. **Remove the template header comment** (the `<!-- ... -->` block at the top of the file before `<!DOCTYPE html>`). This comment contains documentation for Claude and must NOT appear in generated client files. Nested `<!-- -->` markers inside comments break HTML parsing.
3. **Verify the Supabase SDK script** is in `<head>`: `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`. Without this, auth will fail and redirect to login.
4. Edit that copy in place with targeted replacements, one region at a time:
   - Placeholders
   - The three Track/Tactic pages
   - The twelve roadmap weeks
   - The four JS arrays
   - The tour text

---

## Writing style rules

**Never use em dashes.** All dashboards, assessments, and reports must avoid em dashes (the long dash character). Instead:
- Use a colon to introduce a list or elaboration
- Use a period to start a new sentence
- Use a comma for light pauses
- Use "and" or rewrite the sentence

Examples:
- Wrong: "Five things worth fixing this week — these land on your plan"
- Right: "Five things worth fixing this week. These land on your plan"
- Wrong: "Week 3 — Getting Found on Google"
- Right: "Week 3: Getting Found on Google"

**Use Canadian spelling.** Use Canadian/British spelling for most words (e.g., "colour", "favourite", "optimise"). Exception: always use "program" (not "programme").

---

## Supabase integration (required for every page)

Every generated `index.html` must include the following for the live dashboard system.
These are non-negotiable. Do not omit them even if the template doesn't show them.

**1. In `<head>`: Supabase JS SDK (before any other scripts)**
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

**2. On the `<body>` tag: client slug attribute**
```html
<body data-client-slug="[client-slug]">
```
Use the exact client slug (e.g. `alberni-adventure-gear`). This is how `auth.js` and `progress.js` identify which client page they're on.

**3. On every week section container: data-week attribute**
```html
<div class="week-card" id="wc-N" data-week="N">
```
The `data-week="N"` attribute is required on the week container element. N = 1-12.
`data-week` is how `progress.js` knows which week a checkbox belongs to.
The container can use any class/id naming (e.g., `week-card`, `week-block`), but must have `data-week`.

**4. On every checkbox in the roadmap: data-key attribute**

| Checkbox type | Format | Example |
|---|---|---|
| Action item | `data-key="week-N-action-M"` | `data-key="week-3-action-2"` |
| Checklist item | `data-key="week-N-check-M"` | `data-key="week-3-check-1"` |

N = week number. M = index of that item within the week, starting at 1.
This is the primary key used to save and load progress in Supabase.

Example checkbox HTML:
```html
<input type="checkbox" class="check-input" id="rw1_d1" data-key="week-1-check-1" onchange="onCheck(this)">
```
The `id` attribute (e.g., `rw1_d1`) is used by the inline localStorage backup system.
The `data-key` attribute (e.g., `week-1-check-1`) is used by `progress.js` for Supabase sync.

**5. Before `</body>`: shared scripts (in this exact order)**
```html
<script src="/shared/supabase-client.js"></script>
<script src="/shared/auth.js"></script>
<script src="/shared/progress.js"></script>
```

**6. Progress counting must read from DOM**

The inline `countChecked()` function must read checkbox state from the DOM, not from the `state.checks` object. This ensures progress trackers update correctly when `progress.js` loads/changes checkboxes from Supabase.

```javascript
// CORRECT: Read from DOM
function countChecked(ids) {
  return ids.filter(id => {
    const el = document.getElementById(id);
    return el && el.checked;
  }).length;
}

// WRONG: Read from state object (won't reflect Supabase changes)
function countChecked(ids) {
  return ids.filter(id => state.checks[id]).length;
}
```

Also ensure `updateProgress` is globally accessible so `progress.js` can call it:
```javascript
// Define at top level of script (not inside a function)
function updateProgress() { ... }
```

---

## JavaScript array conventions

Every dashboard has these four arrays/objects that must match the actual checklist IDs:

```javascript
const ALL_CHECK_IDS = ["week-1-check-1", "week-1-check-2", "week-2-check-1", ...];
const WEEK_CHECKS   = { 1: ['week-1-check-1', 'week-1-check-2', ...], 2: [...], ... };
const MONTH_CHECKS  = { 1: [...], 2: [...], 3: [...] };
const TACTIC_CHECKS = { 1: ['week-1-check-1', ...], 2: [...], 3: [...] };
```

The checklist ID convention is `week-N-check-M`, e.g. `week-1-check-1`, `week-3-check-2`, etc.

**Important:** These IDs must match:
- The `id` attribute on the checkbox input
- The `data-key` attribute on the checkbox input
- The patterns used in `saveNote()` and `toggleNote()` calls

---

## General quality checklist

Run this mentally before writing any dashboard file:

- [ ] No `{{PLACEHOLDER}}` tokens remain in the output
- [ ] No `<!-- IF:... -->` markers remain (all resolved)
- [ ] ALL_CHECK_IDS matches the actual checklist item count
- [ ] Every "how to" link points to a real `step-tN-N` id that exists in the page
- [ ] Optional sections correctly included or excluded per the plan
- [ ] Tour step descriptions feel specific to this client, not generic
- [ ] localStorage keys use the client slug (not a hardcoded prefix)
- [ ] Strategy page has goal, positioning, and all 3 objectives filled
- [ ] Print-only content has correct client name, goal, and coach email
- [ ] **Implementation Steps use collapsible `.tactic-parts-list` structure** (see Step 4)
- [ ] **Roadmap checklists use `.check-item` structure with note areas** (see Week Cards)
- [ ] **Quick Wins page uses `.check-item` structure with checkboxes** (see Step 3.6)

---

# Part 2: Routing Table

Determine which type to generate based on the command:

| Command says | Plan format | Template | Output directory |
|---|---|---|---|
| "accelerator page" | `PLAN_FORMAT.md` | `template/accelerator-template.html` | `clients/[slug]/` |
| "experience dashboard" | `PLAN_FORMAT_EXPERIENCE.md` | `template/experience-template.html` | `clients/[slug]/` |

---

# Part 3: Type-Specific Generation Steps

---

## Type A: Accelerator Page (Marketing)

**Source template:** `template/accelerator-template.html`

> **DEPRECATED:** Do NOT use `clients/red-cariboo-resort/index.html` or `template/accelerator-dashboard-template.html`. These are outdated. Always use `template/accelerator-template.html` as the source template.

The template contains:
- All structural HTML with `{{PLACEHOLDER}}` tokens for client-specific content
- `<!-- IF:CONDITION -->` markers for optional sections (TACTIC_4, QUICK_WINS, PROJECTIONS)
- `<!-- IMG:IDENTIFIER: description -->` comments for image placeholders
- `data-editable-key` attributes on body text for inline editing
- `data-editable-link` attributes on links for link editing
- JavaScript array placeholders (`/* {{ALL_CHECK_IDS}} */`, etc.)

Command pattern:
> "Generate an accelerator page for [Client Name] using clients/[client-slug]/plan.md
> Coach email: [coach@email.com]
> Onboarding call date: [YYYY-MM-DD]"

### Step 1: Copy template and read plan
1. Copy the template: `cp template/accelerator-template.html clients/[slug]/index.html`
2. Read `clients/[slug]/plan.md`
3. Read `brand/elearningu-brand.md`

### Step 2: Fill the simple placeholders
Replace every `{{PLACEHOLDER}}` token with the corresponding value from the plan.
See the full list in the template header comment.

**Deriving values that aren't spelled out in the plan:**
| Placeholder | How to derive it |
|---|---|
| `{{CLIENT_SLUG}}` | Lowercase, hyphens, no special chars. e.g. `alberni-adventure-gear` |
| `{{CLIENT_NAME}}` | Title-cased client name. e.g. `Alberni Adventure Gear` |
| `{{TOTAL_TASKS}}` | Count every checklist item across all roadmap weeks |
| `{{TACTIC_N_TOTAL}}` | Count checklist items assigned to that tactic in the roadmap |
| `{{TACTIC_N_NAV_LABEL}}` | Short 2-4 word label for the sidebar. Derive from tactic title. |
| `{{WM_SUBLINE}}` | 1-2 sentences of warm encouragement that acknowledges where the client is and frames the plan as the next step. Keep it specific to them, not generic. |
| `{{PAGE_SUBTITLE}}` | 1-sentence version of the goal, tighter than the goal paragraph |
| `{{GOAL_TEXT}}` | The full goal paragraph from the plan. Used in Strategy page and print header |
| `{{STRATEGIC_POSITIONING}}` | The strategic positioning statement from the plan |
| `{{ONBOARDING_CALL_DATE}}` | Date of the client's onboarding call (from command). Format: `Month DD, YYYY` |
| `{{COHORT_START_DATE}}` | Alias for onboarding call date (backwards compatibility). Format: `Month DD, YYYY` |
| `{{ASSESSMENT_DATE}}` | Alias for onboarding call date (backwards compatibility). Format: `Month DD, YYYY` |
| `{{COACH_EMAIL}}` | Coach email from the command. Used in print footer |
| `{{OBJECTIVE_N_TITLE}}` | Short title for objective N (1-3). From the Objectives section of the plan. |
| `{{OBJECTIVE_N_DESCRIPTION}}` | 1-2 sentence description for objective N. |
| `{{OBJECTIVE_N_TACTIC_PILL}}` | Tactic pill text, e.g. `Tactic 1 · Weeks 1-4` |
| `{{OVERALL_SCORE}}` | Numeric score (0-100) from the assessment |
| `{{OVERALL_GRADE}}` | Letter grade (A, B+, C, etc.) from the assessment |
| `{{ASSESSMENT_SUMMARY}}` | 1-2 sentence summary of the assessment findings |
| `{{REPORT_STRENGTHS}}` | `<li>` items for key strengths (4-5 items) |
| `{{REPORT_GAPS}}` | `<li>` items for critical gaps (4-5 items) |
| `{{PRIORITY_1_TEXT}}` | Text describing the #1 priority from the assessment |
| `{{REPORT_QUICK_WINS}}` | `<li>` items for quick wins (5 items) |
| `{{REPORT_CATEGORIES}}` | HTML for the 8 category breakdown items (see template structure) |
| `{{REPORT_RECOMMENDATIONS}}` | HTML for 4 priority recommendations (see template structure) |
| `{{OBJECTIVES_LABEL}}` | Label for the objectives section (typically "Your Objectives") |
| `{{TACTIC_N_WHAT_IS}}` | "What This Is" overview content for tactic N. From the plan's tactic description. |
| `{{TACTIC_N_HEARD}}` | "What We Heard From You" overview content for tactic N. From the plan's context/rationale. |
| `{{TACTIC_N_MATTERS}}` | "Why It Matters" overview content for tactic N. From the plan's reasoning. |
| `{{TACTIC_N_BREAKDOWN_COMMITMENT}}` | Time commitment breakdown for tactic N (e.g. "15 hours total") |
| `{{TACTIC_N_BREAKDOWN_COST}}` | Cost breakdown for tactic N (e.g. "$0 - built into workflow") |
| `{{TACTIC_N_BREAKDOWN_SKILLS}}` | Skills required for tactic N (e.g. "Canva basics, existing photo archives") |
| `{{TACTIC_N_BREAKDOWN_SUPPORT}}` | Support level for tactic N (e.g. "Moderate coach support") |
| `{{MONTH_N_TOTAL}}` | Total checklist items for month N (1-3). Used in roadmap progress display. |
| `{{WEEK_N_TITLE}}` | Title for week N (1-12). From the plan's roadmap week headings. |
| `{{TACTIC_N_METRICS_ROWS}}` | `<tbody>` content for tactic N success metrics table. Generate `<tr>` rows with Metric, 30 Days, 60 Days, 90 Days columns from plan. |
| `{{TACTIC_N_TIPS}}` | `<li>` items for tactic N tips. Generate from plan's Tips section for that tactic. |
| `{{TACTIC_N_RESOURCES}}` | `<li>` items with `<a>` links for tactic N resources. Generate from plan's Resources section. |
| `{{TACTIC_N_IMPLEMENTATION_STEPS}}` | Full HTML for tactic N implementation steps tab. Generate from plan's Implementation Steps. |

**Assessment page placeholders (REQUIRED):**

| Placeholder | How to derive it |
|---|---|
| `{{CATEGORY_1_SCORE}}` through `{{CATEGORY_6_SCORE}}` | Numeric score (0-100) for each assessment category. Categories are: 1=Website & Technical, 2=Reviews & Reputation, 3=Online Booking & Conversion, 4=Social Media & Content, 5=Digital Guest Experience, 6=Local Visibility. |
| `{{CATEGORY_1_GRADE}}` through `{{CATEGORY_6_GRADE}}` | Letter grade for each category (A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F). |
| `{{CATEGORY_1_GRADE_CLASS}}` through `{{CATEGORY_6_GRADE_CLASS}}` | CSS class for styling: `grade-a`, `grade-b`, `grade-c`, `grade-d`, or `grade-f`. Use the base letter only (B+ and B- both use `grade-b`). |
| `{{EXECUTIVE_HEADLINE}}` | 1-2 sentence summary that captures the key finding and opportunity. Be specific to the client. |
| `{{KEY_STRENGTHS}}` | 4-6 `<li>` items listing key strengths from the assessment. Each strength should be specific and actionable. |
| `{{CRITICAL_GAPS}}` | 4-6 `<li>` items listing critical gaps. Focus on measurable gaps (e.g., "Instagram engagement at 0.49%, well below the 1.5% target"). |
| `{{BOTTOM_LINE}}` | 1-2 sentences summarizing the overall opportunity. Frame positively with clear next step. |
| `{{QUICK_WINS_CARDS}}` | HTML grid of 5-6 quick win cards. See Step 3.5 for format. |
| `{{PRIORITY_RECOMMENDATIONS}}` | HTML list of 4 priority recommendation cards. See Step 3.5 for format. |
| `{{CATEGORY_CARDS}}` | HTML grid of 6 collapsible category analysis cards. See Step 3.5 for format. |

**Tactic breakdown placeholders (REQUIRED):**

| Placeholder | How to derive it |
|---|---|
| `{{T1_BREAKDOWN_1_TITLE}}` through `{{T1_BREAKDOWN_3_TITLE}}` | Short title (2-4 words) for each breakdown item in Tactic 1. Derive from the plan's Part A/B/C headings. |
| `{{T1_BREAKDOWN_1_DESC}}` through `{{T1_BREAKDOWN_3_DESC}}` | 1-2 sentence description of what each breakdown involves. |
| `{{T2_BREAKDOWN_1_TITLE}}` through `{{T2_BREAKDOWN_3_TITLE}}` | Same pattern for Tactic 2. |
| `{{T2_BREAKDOWN_1_DESC}}` through `{{T2_BREAKDOWN_3_DESC}}` | Same pattern for Tactic 2. |
| `{{T3_BREAKDOWN_1_TITLE}}` through `{{T3_BREAKDOWN_4_TITLE}}` | Same pattern for Tactic 3. Note: Tactic 3 may have 3-4 items depending on the plan. |
| `{{T3_BREAKDOWN_1_DESC}}` through `{{T3_BREAKDOWN_4_DESC}}` | Same pattern for Tactic 3. |

### Step 3: Handle optional blocks

The template uses `<!-- IF:CONDITION -->` and `<!-- ENDIF:CONDITION -->` markers for optional sections. Process each condition:

| Condition | Include if... | Action |
|---|---|---|
| `IF:TACTIC_4` | Plan has 4 tactics | Keep content, remove markers |
| `IF:QUICK_WINS` | Plan has Quick Wins section | Keep content, remove markers |
| `IF:PROJECTIONS` | Plan has `Has Projections: yes` in Meta section (accommodation businesses only) | Keep content, remove markers |
| `IF:GRANT_BUDGET` | Plan has a grant budget | Keep content, remove markers |
| `IF:TARGET_MILESTONE` | Plan has target milestone | Keep content, remove markers |

**Important: IF:PROJECTIONS is for accommodation businesses ONLY**

To include projections, the plan.md Meta section must have `Has Projections: yes`. If this field is missing or set to "no", the projections section will be removed.

The projections section displays Room Nights and Room Revenue metrics. It should ONLY be included for:
- Hotels, motels, lodges, resorts
- B&Bs, vacation rentals, cabins
- Any business that sells overnight accommodation

It should be REMOVED (entire block deleted) for:
- Museums, galleries, visitor centres
- Restaurants, cafes, retail stores
- Tour operators, attractions
- Any business that does NOT sell room nights

When removing, delete both the HTML block (between IF:PROJECTIONS markers) AND the associated JavaScript (SCENARIOS object and setScenario function).

**Processing rules:**
1. If condition is TRUE: Remove the `<!-- IF:... -->` and `<!-- ENDIF:... -->` markers, keep the content between them
2. If condition is FALSE: Remove the entire block including markers and all content between them
3. Update sidebar navigation to show/hide corresponding nav items

### Step 3.5: Build the Assessment page

The Assessment page displays the client's digital marketing audit results. Fill all assessment placeholders based on the client's audit data from plan.md.

> **CRITICAL: Generate Assessment content fresh for each client.** Never copy Assessment sections from another client's dashboard. Each finding, metric, and recommendation must come from THIS client's audit data. Copying creates incorrect findings (e.g., mentioning a "Winter Packing List page" for a cafe that has no such page).

**Assessment data sources:**
- Metrics mentioned in the plan's Goal section (e.g., "519 Google reviews at 4.8 stars", "Instagram engagement rate of 20.42 percent")
- "What We Heard From You" sections in each tactic
- GBP Quick Wins section (if present)
- Any explicit assessment data in the Meta section

**1. Grade Breakdown Scores (6 categories):**

Fill `{{CATEGORY_N_SCORE}}`, `{{CATEGORY_N_GRADE}}`, and `{{CATEGORY_N_GRADE_CLASS}}` for each category. Derive scores from plan data:

| Category | What to assess | Score indicators |
|---|---|---|
| 1. Website & Technical | Tracking, pixel, speed, mobile | Pixel missing = low score; good tracking = high |
| 2. Reviews & Reputation | Google reviews count, rating, recency | 500+ reviews at 4.5+ = A; 13 reviews with none recent = D |
| 3. Online Booking & Conversion | Booking platform, checkout flow | On-site checkout with tracking = B+; no tracking = C |
| 4. Social Media & Content | Engagement rate, posting frequency, Reels % | 20%+ engagement = A; 0.49% = D |
| 5. Digital Guest Experience | Email strength, list growth, guest journey | Strong email channel = B; purchase-only growth = B- |
| 6. Local Visibility | GBP completeness, photo freshness, Ad Grants | Active Ad Grants + fresh photos = B; outdated = C |

**2. Executive Summary format:**

```html
<p class="executive-headline" data-editable-key="executive-headline">{{EXECUTIVE_HEADLINE}}</p>
<div class="executive-columns">
  <div class="executive-column strengths">
    <h4>Key Strengths</h4>
    <ul>
      <li>Specific strength with data (e.g., "519 Google reviews at 4.8 stars")</li>
      <!-- 4-6 items total -->
    </ul>
  </div>
  <div class="executive-column gaps">
    <h4>Critical Gaps</h4>
    <ul>
      <li>Specific gap with data (e.g., "Instagram engagement at 0.49%, well below the 1.5% target")</li>
      <!-- 4-6 items total -->
    </ul>
  </div>
</div>
<div class="executive-bottom-line">
  <strong>Bottom Line:</strong> {{BOTTOM_LINE}}
</div>
```

**3. Quick Wins Cards format (`{{QUICK_WINS_CARDS}}`):**

Generate 5-6 quick win cards. Each should be completable in under 30 minutes:

```html
<div class="quick-win-item">
  <div class="quick-win-number">1</div>
  <div class="quick-win-content">
    <div class="quick-win-task" data-editable-key="qw-1-label">Action to take (e.g., "Reply to all existing Google reviews")</div>
    <div class="quick-win-impact">Why it matters (e.g., "Shows the profile is active")</div>
  </div>
  <div class="quick-win-time">30 min</div>
</div>
<!-- Repeat for items 2-6 -->
```

**4. Priority Recommendations format (`{{PRIORITY_RECOMMENDATIONS}}`):**

Generate exactly 4 priority recommendation cards:

```html
<div class="priority-item">
  <div class="priority-item-number">1</div>
  <div class="priority-item-content">
    <h4>Recommendation title (e.g., "Connect GA4 and the Meta Pixel")</h4>
    <div class="priority-item-meta">
      <span class="priority-item-tag">Category (e.g., Tracking)</span>
      <span class="priority-item-tag">Timeframe (e.g., Weeks 1-3)</span>
    </div>
    <p class="priority-item-result">Expected outcome (e.g., "Every ticket sale will show which channel it came from.")</p>
  </div>
</div>
<!-- Repeat for items 2-4 -->
```

**5. Detailed Category Analysis format (`{{CATEGORY_CARDS}}`):**

Generate 6 collapsible category cards (one per assessment category):

```html
<div class="category-card">
  <div class="category-header" onclick="this.parentElement.classList.toggle('open')">
    <div class="category-icon website">
      <svg><!-- Use appropriate icon --></svg>
    </div>
    <div class="category-title-wrap">
      <h3 class="category-title">Website & Technical</h3>
      <span class="category-grade grade-c">C</span>
    </div>
    <svg class="category-chevron"><!-- Chevron icon --></svg>
  </div>
  <div class="category-body">
    <p class="category-summary">2-3 sentence summary of findings for this category.</p>
    <div class="category-metrics">
      <div class="category-metric"><span class="metric-label">Label</span><span class="metric-value">Value</span></div>
      <!-- 3-4 metrics -->
    </div>
    <div class="category-findings">
      <h4>Key Findings</h4>
      <ul>
        <li>Specific finding 1</li>
        <li>Specific finding 2</li>
        <li>Specific finding 3</li>
      </ul>
    </div>
  </div>
</div>
```

Category icon classes: `website`, `reviews`, `booking`, `social`, `experience`, `local`

### Step 3.6: Build the Quick Wins Page (page-gbp)

The Quick Wins PAGE is a separate page (distinct from the Quick Wins Cards section on the Assessment page) that displays actionable items with checkboxes. This page uses the `{{QUICK_WINS_PAGE_CONTENT}}` placeholder.

**Page structure:**
```html
<div class="section-label">On the Google Business Profile</div>
<div class="card" style="padding:0;margin-bottom:24px">
  <div class="card-body">
    <div class="check-list" style="gap:16px">
      <div class="check-item">
        <div class="check-row">
          <input type="checkbox" class="check-input" id="qw_1" onchange="onCheck(this)">
          <label class="check-box" for="qw_1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </label>
          <label class="check-label" for="qw_1" data-editable-key="qw_1-label">
            <strong>Action title.</strong> Description of what to do and why.
          </label>
          <button class="note-toggle-btn" onclick="toggleNote('qw_1')">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M13 2.5H3C2.17157 2.5 1.5 3.17157 1.5 4V12C1.5 12.8284 2.17157 13.5 3 13.5H13C13.8284 13.5 14.5 12.8284 14.5 12V4C14.5 3.17157 13.8284 2.5 13 2.5Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M4.5 5.5H11.5M4.5 8H9.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="note-area" id="note-area-qw_1">
          <textarea class="note-textarea" id="note-qw_1" placeholder="Add a note…" oninput="saveNote('qw_1',this.value)"></textarea>
        </div>
      </div>
      <!-- More check-items -->
    </div>
  </div>
</div>
```

**Key conventions:**
- Use `.section-label` for category headers (e.g., "On the Google Business Profile", "On the Website")
- Each category is wrapped in a `.card` with `.card-body` containing `.check-list`
- Each item is a `.check-item` containing `.check-row` with checkbox, label, and note toggle
- Checkbox IDs use underscore: `qw_1`, `qw_2`, etc. (NOT `qw-1`)
- Editable keys also use underscore: `data-editable-key="qw_1-label"`
- Each item has a note area with matching ID: `note-area-qw_1`, `note-qw_1`

**DO NOT:**
- Use simple `<ul>/<li>` lists with inline styles
- Use `<div class="quick-win-item">` format (that's for the Assessment page Quick Wins Cards)
- Omit the checkbox, note toggle, or note area elements

### Step 3.7: Build the Strategy page

The Strategy page presents the 90-day plan overview. Fill in the following sections:

**1. Goal Section** (`.strategy-goal`)
- Copy the full `{{GOAL_TEXT}}` from the plan's Goal section

**2. Strategic Positioning** (`.strategy-positioning`)
- Copy `{{STRATEGIC_POSITIONING}}` from the plan

**3. Objectives Cards** (`.strategy-objectives`)
Build 3 objective cards, one per objective from the plan:
```html
<div class="objective-card">
  <div class="objective-number">1</div>
  <h3 class="objective-title">{{OBJECTIVE_1_TITLE}}</h3>
  <p class="objective-description">{{OBJECTIVE_1_DESCRIPTION}}</p>
  <span class="objective-tactic-pill">{{OBJECTIVE_1_TACTIC_PILL}}</span>
</div>
```

**4. Tactics Overview** (`.tactics-overview`)
Build 3 tactic overview cards showing:
- Tactic number and title
- Tactic subtitle/description
- Phase label (e.g., "Foundation", "Growth", "Scale")

### Step 4: Rebuild the tactic pages
Each tactic page needs full content. For each of the 3 tactics, rebuild:

**Overview tab** (section-blocks):
- "What We Heard From You": client's specific context from the plan
- "What This Is": what the tactic actually is
- "Why It Matters": the reasoning for prioritising it
- **"What This Breaks Into"**: 3-4 breakdown items showing the tactic's main work streams

**Tactic Breakdown Items (REQUIRED):**

Fill `{{TN_BREAKDOWN_M_TITLE}}` and `{{TN_BREAKDOWN_M_DESC}}` for each breakdown item:

```html
<div class="tactic-breakdown-grid">
  <div class="tactic-breakdown-item">
    <div class="tactic-breakdown-title" data-editable-key="t1-breakdown-1-title">Buyer Research</div>
    <div class="tactic-breakdown-desc" data-editable-key="t1-breakdown-1-desc">Pull 12 months of corporate inquiries and interview three recent bookers.</div>
  </div>
  <div class="tactic-breakdown-item">
    <div class="tactic-breakdown-title" data-editable-key="t1-breakdown-2-title">Landing Page Brief</div>
    <div class="tactic-breakdown-desc" data-editable-key="t1-breakdown-2-desc">Write detailed specs for the new corporate page.</div>
  </div>
  <div class="tactic-breakdown-item full-width">
    <div class="tactic-breakdown-title" data-editable-key="t1-breakdown-3-title">Lead Magnet</div>
    <div class="tactic-breakdown-desc" data-editable-key="t1-breakdown-3-desc">Build a downloadable resource that captures planner emails.</div>
  </div>
</div>
```

**How to derive breakdown content:**
- Look at the plan's "Implementation Steps" section for each tactic
- Each "Part A/B/C/D" heading becomes a breakdown item
- Title: 2-4 words summarizing the part (e.g., "Part A: Know the Buyer" → "Buyer Research")
- Description: 1-2 sentences explaining what that part involves

**Number of items per tactic:**
- Most tactics have 3 breakdown items (Parts A, B, C)
- Some tactics have 4 items (Parts A, B, C, D) - add a 4th item if the plan has 4 parts
- The 3rd (or 4th) item uses class `full-width` to span the grid

**Implementation Steps tab** (Part A, B, C sections):

The Implementation Steps tab uses a collapsible accordion structure. Each part (A, B, C, etc.) is a collapsible section with a header button.

**CRITICAL: Full HTML Structure for `{{TACTIC_N_IMPLEMENTATION_STEPS}}`:**

```html
<div class="tactic-parts-list">
  <!-- Part A: First part is open by default -->
  <div class="tactic-part open">
    <button class="tactic-part-header" onclick="toggleTacticPart(this)">
      <span class="tactic-part-tag">Part A</span>
      <span class="tactic-part-title">Part Title Here</span>
      <span class="tactic-part-meta">3 steps</span>
      <svg class="tactic-part-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>
    </button>
    <div class="tactic-part-body">
      <ol class="tactic-steps-list">
        <li class="tactic-step-item" id="step-t1-1">
          <span class="tactic-step-num">1</span>
          <div class="tactic-step-content">
            <div class="tactic-step-title" data-editable-key="tactic-1-step-1-title">Step title here.</div>
            <ul class="tactic-step-bullets">
              <li data-editable-key="t1-bullet-1">First bullet point.</li>
              <li data-editable-key="t1-bullet-2">Second bullet point.</li>
            </ul>
          </div>
        </li>
        <!-- More steps in this part -->
      </ol>
    </div>
  </div>

  <!-- Part B: Subsequent parts are collapsed by default (no .open class) -->
  <div class="tactic-part">
    <button class="tactic-part-header" onclick="toggleTacticPart(this)">
      <span class="tactic-part-tag">Part B</span>
      <span class="tactic-part-title">Second Part Title</span>
      <span class="tactic-part-meta">2 steps</span>
      <svg class="tactic-part-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>
    </button>
    <div class="tactic-part-body">
      <ol class="tactic-steps-list">
        <!-- Steps continue from previous part's numbering -->
        <li class="tactic-step-item" id="step-t1-4">
          <span class="tactic-step-num">4</span>
          <!-- ... -->
        </li>
      </ol>
    </div>
  </div>

  <!-- Part C, D, etc. follow same pattern -->
</div>
```

**Key requirements:**
- `.tactic-parts-list` - Required wrapper for all collapsible parts
- `.tactic-part` - Each collapsible section; add `.open` class ONLY to the first part
- `.tactic-part-header` - Must be a `<button>` with `onclick="toggleTacticPart(this)"`
- `.tactic-part-tag` - Part label (e.g., "Part A", "Part B")
- `.tactic-part-title` - Part heading from the plan
- `.tactic-part-meta` - Step count (e.g., "3 steps", "2 steps")
- `.tactic-part-chevron` - SVG chevron icon (exact SVG shown above)
- `.tactic-part-body` - Contains the steps list
- `.tactic-steps-list` - Ordered list wrapper
- `.tactic-step-item` - Each step; MUST have `id="step-tN-M"` for "how to" links
- `.tactic-step-num` - MUST be a `<span>`, not a `<div>`
- Step numbers continue sequentially across all parts within a tactic
- A bullet the plan indents under the bullet above it is a sub-bullet: add `class="tactic-step-sub"` to its `<li>` and keep it in the same flat list, so the `tN-bullet-M` numbering does not change. Editors can also indent or outdent a step bullet in Edit Mode (Tab / Shift+Tab, or the Indent / Outdent toolbar); that is saved as a `level:tN-bullet-M` content edit.

**DO NOT:**
- Use plain `<div class="tactic-part-header">` without button/onclick (won't toggle)
- Use `<div class="step-num">` (must be `<span class="tactic-step-num">`)
- Use `.step-item` class (must be `.tactic-step-item`)
- Put steps directly inside `<ol class="tactic-steps-list">` without the parts wrapper
- Omit the `.tactic-parts-list` wrapper

**Success Metrics tab**: fill the metrics table with 30/60/90 day targets

**Tips & Resources tab**: tips from the plan + relevant resource links

### Step 4.5: Tactic Page Enhancements (Optional)

The template includes CSS and JS for enhanced tactic step presentations. Use these when the plan includes screenshots, mockups, or external resources.

**Resource Links** (`.tactic-step-resource`)
Add links to official documentation below step bullets:
```html
<a href="https://support.google.com/..." class="tactic-step-resource" target="_blank">View GA4 documentation</a>
```

**Browser Mockups** (`.tactic-mockup`)
Wrap screenshots in a browser frame for context:
```html
<div class="tactic-mockup">
  <div class="tactic-mockup-chrome">
    <span class="tactic-mockup-dot red"></span>
    <span class="tactic-mockup-dot yellow"></span>
    <span class="tactic-mockup-dot green"></span>
    <div class="tactic-mockup-url">analytics.google.com</div>
  </div>
  <div class="tactic-mockup-body">
    <img src="/assets/client-mockups/screenshot.png" alt="Description" class="lightbox-trigger" onclick="openLightbox(this.src, this.alt)">
  </div>
  <div class="tactic-mockup-label">Caption text here</div>
</div>
```

**Two-Column Layout** (`.tactic-step-row`)
Place text and media side-by-side:
```html
<div class="tactic-step-row">
  <div class="tactic-step-text-col">
    <div class="tactic-step-title">Step Title</div>
    <ul class="tactic-step-bullets">...</ul>
  </div>
  <div class="tactic-step-media-col">
    <div class="tactic-mockup">...</div>
  </div>
</div>
```

**Lightbox Images**
**IMPORTANT:** ALL images in tactic pages (mockups, screenshots, shot lists, galleries) MUST have lightbox functionality. Add `class="lightbox-trigger"` and `onclick="openLightbox(this.src, this.alt)"` to every content image. The only exceptions are UI elements like logos and icons.

Example:
```html
<img src="/assets/client-mockups/screenshot.png" alt="Description" class="lightbox-trigger" onclick="openLightbox(this.src, this.alt)">
```

### Step 5: Rebuild the 90-Day Roadmap
For each of the 12 weeks (or however many the plan has):
- Set the week card `id="wc-N"` and week number badge
- Set the week title
- Fill "This Week's Actions" bullet list
- Fill "Completion Checklist" items

**"How to" links**: the plan.md annotates checklist items with `→ links to: Tactic X / Step N`.
For each annotated item, add a `<button class="howto-link" onclick="howToLink('tacticN','step-tN-N')">how to</button>` on the **corresponding action bullet** in "This Week's Actions" (not on the checklist item).

Match action bullets to checklist items semantically. The action that produces the checklist outcome gets the "how to" link.

**PDF Download feature**: The roadmap header includes a "Download PDF" button that triggers `printRoadmap()`. The template includes print-only content that appears when printing:
- Print header with logo, title, client name, and onboarding call date
- "About this document" section
- "How to use this roadmap" section
- Goal summary
- Print footer with coach email

All interactive elements (nav, buttons, checkboxes) are hidden in print via `.no-print` class and `@media print` styles. The print layout is optimized for A4/Letter paper.

### Step 6: Update JavaScript arrays
Update ALL_CHECK_IDS, WEEK_CHECKS, MONTH_CHECKS, and TACTIC_CHECKS to match the actual checklist IDs in the roadmap.

### Step 7: Adapt the onboarding tour
The tour already has 8 steps. Update the `desc` (and `mobileDesc` where present)
in `TOUR_STEPS` to match this client's context. Keep the structure and target IDs
the same. Only change the descriptive text to feel relevant to this client.

### Step 8: Generate plan.json

Write a second output file to `clients/[slug]/plan.json`. This file powers the weekly email system.

**Structure:**
```json
{
  "client_name": "Alberni Adventure Gear",
  "client_slug": "alberni-adventure-gear",
  "goal": "...",
  "coach_email": "coach@email.com",
  "weeks": [
    {
      "week": 1,
      "month": 1,
      "title": "Week 1: Getting Found Online",
      "actions": ["plain text action 1", "plain text action 2"],
      "checklist": ["plain text item 1", "plain text item 2"],
      "deep_link": "https://accelerator.elearningu.com/alberni-adventure-gear/#week-1"
    }
  ]
}
```

**Rules:**
- `client_name`: slug formatted as title case (hyphens to spaces, capitalise each word)
- `client_slug`: exact slug, lowercase with hyphens
- `goal`: copy **verbatim** from the `## Goal` section of `plan.md`. No edits, no summarising
- `coach_email`: use the value from the generation command `Coach email:` parameter
- `weeks`: always exactly **12 objects**, one per roadmap week
- `month`: 1 for weeks 1-4, 2 for weeks 5-8, 3 for weeks 9-12
- `title`: the week heading from the roadmap (e.g. `"Week 3: Getting Found on Google"`)
- `actions`: bullet points from "This Week's Actions" in the roadmap, **plain text only**. Strip all markdown (no `**bold**`, no links, no bullet characters)
- `checklist`: items from "Completion Checklist" in the roadmap, plain text only
- `deep_link`: always `https://accelerator.elearningu.com/[client-slug]/#week-N`

**Quality checks:**
- [ ] Exactly 12 week objects, no more, no fewer
- [ ] `goal` is copied verbatim (check for accidental paraphrasing)
- [ ] All markdown stripped from `actions` and `checklist` strings
- [ ] `deep_link` uses `#week-N` anchor (hash, not slash)
- [ ] `coach_email` matches the parameter from the generation command

### Step 9: Output and git
1. Write the completed file to `clients/[slug]/index.html`
2. Write `clients/[slug]/plan.json`
3. Copy both to `/tmp/[slug]-review/` as a preview copy
4. Report: placeholder count resolved, optional blocks included/excluded,
   total checklist items, total "how to" links, total weeks in plan.json

### Inline Editing Attributes (Required)

All generated content must include `data-editable-key` and `data-editable-link` attributes to support inline editing in the dashboard. These attributes allow coaches and clients to make minor text adjustments without regenerating the entire page.

#### Naming Conventions

| Content Type | Attribute | Pattern | Example |
|---|---|---|---|
| Implementation step titles | `data-editable-key` | `tactic-N-step-M-title` | `tactic-1-step-1-title`, `tactic-2-step-3-title` |
| Implementation step bullets | `data-editable-key` | `tN-bullet-M` | `t1-bullet-1`, `t2-bullet-15` |
| Tips list items | `data-editable-key` | `tN-tip-M` | `t1-tip-1`, `t3-tip-2` |
| Resource links | `data-editable-link` | `tN-resource-M` | `t1-resource-1`, `t2-resource-3` |
| Week titles | `data-editable-key` | `week-N-title` | `week-1-title`, `week-12-title` |
| Week actions | `data-editable-key` | `week-N-action-M` | `week-1-action-1`, `week-5-action-3` |
| Roadmap checklist labels | `data-editable-key` | `week-N-check-M-label` | `week-1-check-1-label`, `week-3-check-2-label` |
| Roadmap checkbox IDs | `id` and `data-key` | `week-N-check-M` | `week-1-check-1`, `week-3-check-2` |
| Quick wins labels | `data-editable-key` | `qw_N-label` | `qw_1-label`, `qw_5-label` |
| Quick wins checkbox IDs | `id` | `qw_N` | `qw_1`, `qw_2` |

Where:
- `N` = tactic number (1-4) or week number (1-12)
- `M` = item index within that section, starting at 1

#### Implementation Examples

**Implementation Steps** (when generating `{{TACTIC_N_IMPLEMENTATION_STEPS}}`):

See the **CRITICAL: Full HTML Structure** in Step 4 above for the complete collapsible parts structure. The key editable elements within each step are:

```html
<li class="tactic-step-item" id="step-t1-1">
  <span class="tactic-step-num">1</span>
  <div class="tactic-step-content">
    <div class="tactic-step-title" data-editable-key="tactic-1-step-1-title">Step title here.</div>
    <ul class="tactic-step-bullets">
      <li data-editable-key="t1-bullet-1">First bullet point.</li>
      <li data-editable-key="t1-bullet-2">Second bullet point.</li>
    </ul>
  </div>
</li>
```

**IMPORTANT:**
- Bullet numbering (`tN-bullet-M`) is sequential across ALL steps within a tactic. For example, if Tactic 1 Step 1 has 3 bullets (t1-bullet-1 through t1-bullet-3), then Step 2's first bullet is t1-bullet-4, not t1-bullet-1.
- Step numbers use `<span class="tactic-step-num">`, NOT `<div class="step-num">`
- Step items use class `tactic-step-item`, NOT `step-item`
- Steps MUST be wrapped in the collapsible `.tactic-parts-list` structure

**Tips** (when generating `{{TACTIC_N_TIPS}}`):
```html
<ul class="tactic-tips-list">
  <li data-editable-key="t1-tip-1">Start with your best-performing content</li>
  <li data-editable-key="t1-tip-2">Review analytics weekly</li>
  <li data-editable-key="t1-tip-3">Set up email alerts for significant changes</li>
</ul>
```

**Resources** (when generating `{{TACTIC_N_RESOURCES}}`):
```html
<ul class="tactic-resources-list">
  <li><a href="https://support.google.com/analytics" data-editable-link="t1-resource-1" target="_blank">Google Analytics Help Centre</a></li>
  <li><a href="https://skillshop.google.com" data-editable-link="t1-resource-2" target="_blank">Google Skillshop Courses</a></li>
</ul>
```

**Week Cards** (when generating `{{MONTH_N_WEEKS}}`):

Each week card has two columns: Actions and Completion Checklist. The checklist includes checkboxes with note areas.

```html
<div class="week-card" id="wc-1" data-week="1">
  <div class="week-card-header" onclick="toggleWeek(1)">
    <div class="week-num">W1</div>
    <div class="week-title" data-editable-key="week-1-title">Week 1: Getting Found Online</div>
    <div class="week-progress-pill" id="wp-1">0 / 5</div>
    <svg class="week-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
  </div>
  <div class="week-card-body">
    <div class="week-cols">
      <!-- Actions Column -->
      <div>
        <div class="week-col-label">This Week's Actions</div>
        <ul class="week-tasks-list">
          <li class="week-task-item"><div class="week-task-dot"></div><span class="week-task-text" data-editable-key="week-1-action-1">Claim your Google Business Profile</span> <button class="howto-link" onclick="howToLink('tactic1','step-t1-1')">how to</button></li>
          <li class="week-task-item"><div class="week-task-dot"></div><span class="week-task-text" data-editable-key="week-1-action-2">Verify your business information</span></li>
        </ul>
      </div>
      <!-- Checklist Column -->
      <div>
        <div class="week-col-label">Completion Checklist</div>
        <div class="check-list">
          <div class="check-item">
            <div class="check-row">
              <input type="checkbox" class="check-input" id="week-1-check-1" data-key="week-1-check-1" onchange="onCheck(this)">
              <label class="check-box" for="week-1-check-1"><svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,6 4.5,9 10.5,3"/></svg></label>
              <label class="check-label" for="week-1-check-1" data-editable-key="week-1-check-1-label">Google Business Profile is claimed and verified</label>
              <button class="note-toggle-btn" onclick="toggleNote('week-1-check-1')" title="Add note"><svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 2.5H3a.5.5 0 00-.5.5v14a.5.5 0 00.5.5h10a.5.5 0 00.5-.5V3a.5.5 0 00-.5-.5zM3 0h10a3 3 0 013 3v14a3 3 0 01-3 3H3a3 3 0 01-3-3V3a3 3 0 013-3zm2 5h6v2H5V5zm0 4h6v2H5V9z"/></svg></button>
            </div>
            <div class="note-area" id="note-area-week-1-check-1">
              <textarea class="note-textarea" id="note-week-1-check-1" placeholder="Add a note…" oninput="saveNote('week-1-check-1',this.value)"></textarea>
            </div>
          </div>
          <!-- More check-items follow same pattern -->
        </div>
      </div>
    </div>
    <div class="week-note-section"><div class="week-note-label">Week Notes</div><textarea class="note-textarea" id="note-week-1" placeholder="Add general notes for this week…" oninput="saveNote('week_1',this.value)" style="width:100%"></textarea></div>
  </div>
</div>
```

**CRITICAL requirements for Week Cards:**
- `data-week="N"` on `.week-card` container (required for progress tracking)
- `data-key="week-N-check-M"` on each `.check-input` checkbox (required for Supabase sync)
- `id="week-N-check-M"` on checkboxes matching the `data-key`
- `data-editable-key="week-N-check-M-label"` on `.check-label` elements
- Each check-item MUST have a `.note-area` with matching ID pattern
- Week note textarea uses `saveNote('week_N',this.value)` with underscore

**IMPORTANT:**
- The `data-editable-key` for week actions MUST be on a `<span class="week-task-text">` wrapper around the text only, NOT on the `<li>` element. This ensures only the text is editable, not the dot or howto button.
- The `howto-link` button targets step IDs in the format `step-tN-M` (e.g., `step-t1-1`)

#### Quality Checklist for Editable Attributes
- [ ] Every `.tactic-step-title` element has a `data-editable-key="tactic-N-step-M-title"` attribute
- [ ] Every `<li>` in `.tactic-step-bullets` has a `data-editable-key="tN-bullet-M"` attribute (numbered sequentially across all steps in the tactic)
- [ ] Every `<li>` in `.tactic-tips-list` has a `data-editable-key="tN-tip-M"` attribute
- [ ] Every `<a>` in `.tactic-resources-list` has a `data-editable-link="tN-resource-M"` attribute
- [ ] Every `.week-title` element has a `data-editable-key="week-N-title"` attribute
- [ ] Every week action text is wrapped in `<span class="week-task-text" data-editable-key="week-N-action-M">`
- [ ] Every checklist label has `data-editable-key="week-N-check-M-label"` on the `.check-label` element
- [ ] Indices (M) start at 1 and increment sequentially within each section
- [ ] No duplicate keys exist in the generated output

#### Quality Checklist for Implementation Steps Structure
- [ ] Implementation Steps tab uses `.tactic-parts-list` wrapper
- [ ] Each part is wrapped in `.tactic-part` (with `.open` on first part only)
- [ ] Part headers are `<button class="tactic-part-header">` with `onclick="toggleTacticPart(this)"`
- [ ] Part headers contain `.tactic-part-tag`, `.tactic-part-title`, `.tactic-part-meta`, and `.tactic-part-chevron`
- [ ] Step items use `.tactic-step-item` class (NOT `.step-item`)
- [ ] Step numbers use `<span class="tactic-step-num">` (NOT `<div class="step-num">`)
- [ ] Every step has `id="step-tN-M"` for "how to" links
- [ ] Step numbers continue sequentially across all parts within a tactic

#### Quality Checklist for Roadmap Week Cards
- [ ] Every `.week-card` has `data-week="N"` attribute
- [ ] Week header has `.week-chevron` SVG
- [ ] Actions column uses `.week-tasks-list` with `.week-task-item` elements
- [ ] Checklist column uses `.check-list` with `.check-item` elements
- [ ] Every checkbox has `data-key="week-N-check-M"` attribute matching its ID
- [ ] Every `.check-item` has a `.note-area` with matching ID pattern
- [ ] Week note section is present after `.week-cols`

#### Quality Checklist for Quick Wins Page
- [ ] Uses `.section-label` for category headers
- [ ] Each category wrapped in `.card` with `.card-body` containing `.check-list`
- [ ] Checkbox IDs use underscore pattern: `qw_1`, `qw_2`, etc.
- [ ] Every `.check-item` has a `.note-area` with matching ID pattern
- [ ] Labels use `data-editable-key="qw_N-label"` (with underscore)

### Accelerator-specific quality checklist
In addition to the general checklist:
- [ ] Assessment page has all required sections filled with client audit data
- [ ] `{{ONBOARDING_CALL_DATE}}` is filled with the date from the command
- [ ] All generated content includes proper inline editing attributes (see above)
- [ ] **Assessment findings are specific to THIS client** (not copied from another client's dashboard)
- [ ] Assessment findings do NOT contain content from other clients (e.g., no "Winter Packing List", "19-item dropdown", or other business-specific references that don't apply)
- [ ] Every metric, finding, and recommendation in the Assessment section can be traced to this client's audit data

**CRITICAL:** Never copy Assessment content from an existing client dashboard. Each client's Assessment section must be generated fresh from their specific audit data. Copying creates false findings that don't apply to the client.

---

## Type B: Experience Dashboard

Experience dashboards are built by code, never by hand. The same code runs on the server (the Create and Manage pages) and on this computer (`scripts/build-experience.js`), so a dashboard can always be rebuilt from its inputs.

**Never edit `clients/[slug]/index.html` for an experience dashboard.** It is overwritten the next time the dashboard is rebuilt. Change one of its inputs and rebuild.

### What a dashboard is built from

| Input | File | Holds |
|---|---|---|
| Template | `template/experience-template.html` | Layout, styling, scripts, neutral program wording |
| Project record | `clients/[slug]/project.json` | Operator name, coach email, stage, the five material links, optional welcome message |
| Launch plan | `clients/[slug]/plan.md` | Everything on Strategy, the Tracks, the Launch Roadmap and the Bookability Checklist. Follows `PLAN_FORMAT_EXPERIENCE.md` |

Outputs: `clients/[slug]/index.html` and, once there is a plan, `clients/[slug]/plan.json` (for the weekly emails).

### The two stages

| Stage | When | Pages shown |
|---|---|---|
| `onboarding` | Created before the operator's onboarding call. No plan.md yet | Home (the program step by step), Guide, Materials |
| `plan` | A plan.md has been added, after coaching call 2 | All of the above, plus Strategy, three Tracks, Launch Roadmap, Bookability Checklist |

The stage is set by whether a plan.md exists. Nothing else changes it. The template marks plan-stage elements with the class `plan-only` and onboarding-stage elements with `onboarding-only`; `data-stage` on `<body>` decides which show.

### Commands

**Create a dashboard** (normally done by staff on the Create Experience Dashboard page):
> "Create an experience dashboard for [Operator Name], slug [client-slug]. Coach email: [coach@email.com]"

1. Write `clients/[slug]/project.json`:
   ```json
   {
     "type": "experience",
     "client_name": "Salt Spring Kayak Co",
     "client_slug": "salt-spring-kayak",
     "coach_email": "coach@email.com",
     "stage": "onboarding",
     "welcome_message": "",
     "materials": { "guide": "", "questionnaire": "", "session1": "", "session2": "", "calculator": "" }
   }
   ```
2. If a plan was given, save it as `clients/[slug]/plan.md`.
3. Run `node scripts/build-experience.js [slug] --write`.

**Add or replace the launch plan:**
> "Add the launch plan for [Operator] using [file]"

1. Save the plan as `clients/[slug]/plan.md`.
2. Run `node scripts/build-experience.js [slug]` (check only). Fix anything it lists in the plan.md.
3. Run it again with `--write`.

**Add a material:**
> "The [material] for [Operator] is now available at [URL]"

1. Put the URL in the matching key of `materials` in `clients/[slug]/project.json`. Keys: `guide`, `questionnaire`, `session1` (Coaching Call 1 summary), `session2` (Coaching Call 2 summary), `calculator`.
2. Run `node scripts/build-experience.js [slug] --write`.

An empty string means "Coming soon". Only `https://` links are accepted.

**After changing the template:** run `npm test`, then `node scripts/build-experience.js sample-experience --write` so the public sample matches. A test fails if the committed sample differs from what the generator builds.

Report after any of these: stage, number of weeks, checklist items and "how to" links (the script prints them), and any warnings.

### Rules the generator applies

- **Tracks are tactics in the HTML.** The plan says "Track 1/2/3". Page ids are `page-tactic1/2/3` and step anchors are `step-tN-M`. `→ links to: Track 2 / Step 5` becomes `howToLink('tactic2','step-t2-5')` on that action, and the note is removed from the text. `→ links to: Bookability Checklist` opens that page.
- **Roadmap length is 8 to 12 weeks**, numbered from 1 with none skipped. Eight is the usual length.
- **Three phases, one per track.** The roadmap is shown as Phase 1, 2 and 3, and Track N's progress counts the checklist items in Phase N. `Phase 2 Starts: Week N` and `Phase 3 Starts: Week N` in the plan set the boundaries. Without them the weeks are shared out evenly (8 weeks is 3, 3, 2).
- **Checkbox ids.** Roadmap items are `rwN_dM` with `data-key="week-N-check-M"`. Bookability items are `bookability_N`. Both are in `ALL_CHECK_IDS`. Guide section checkboxes `gs1` to `gs5` are not: they have their own count on the Guide page.
- **The start date is the operator's choice.** `data-cohort-start` is always empty in the HTML. The operator picks a date on Home, which is saved by the `set_launch_start_date` database function (`supabase/migrations/015_experience_launch_start.sql`). The date stored on the account when the project was created is ignored for experience dashboards, and weekly emails are not sent until a start date is chosen.
- **No Assessment page.** Experience dashboards never have one.
- **Wording follows the plan's length.** The template never says "90 days" or "12 weeks". Success Metrics tables use the column headings written in the plan.

---

# Part 4: Experience Quality Checklist

`npm test` and the build script check the structure. Read the result for these, which only a person can judge:

- [ ] The Experience sentence on the Strategy page is the operator's own, word for word
- [ ] The goal names the experience, the guest, the price and the first departure date
- [ ] Each week's actions carry a `→ links to:` note wherever a matching step exists
- [ ] Each track's work sits inside its own phase of the roadmap
- [ ] Success Metrics column headings fit this plan's length
- [ ] Every material link opens for someone who is not signed in to Junction's Google account
- [ ] No em dashes, and Canadian spelling throughout

---

# Part 5: Update Commands

## Accelerator update
> "Update the accelerator page for [Client] - [what changed]"

1. Read `clients/[slug]/index.html` and `clients/[slug]/plan.md`
2. Apply only the changes described
3. Do NOT regenerate sections that weren't mentioned
4. Commit with a clear message describing what changed

## Experience update
> "Update the experience dashboard for [Operator] - [what changed]"

1. Make the change in `clients/[slug]/plan.md` or `clients/[slug]/project.json`, never in `index.html`
2. Run `node scripts/build-experience.js [slug] --write`
3. Check `git diff` shows only the change described
4. Commit with a clear message describing what changed

---

# Part 6: File Locations

| File | Purpose |
|---|---|
| `template/accelerator-template.html` | **Primary accelerator template.** Copy this file as starting point for all new accelerator dashboards. |
| `template/experience-template.html` | Experience template. Never edit directly for a client. |
| `clients/[slug]/plan.md` | Client plan (input for both types) |
| `clients/[slug]/index.html` | Generated dashboard (output) |
| `brand/elearningu-brand.md` | Brand colours, fonts, logo rules |
| `PLAN_FORMAT.md` | Standard format for accelerator plans |
| `PLAN_FORMAT_EXPERIENCE.md` | Standard format for experience design plans |
| `shared/plan-generator.js` | **The accelerator generator.** Parses plan.md and fills the template. Used by the Add Plan upload (`netlify/functions/create-project.js`) and `scripts/regenerate-dashboards.js`. Never copy its functions into another file. |
| `shared/experience-generator.js` | **The experience generator.** Parses an experience plan.md and fills the experience template. Never copy its functions into another file. |
| `shared/experience-project.js` | **Builds every file of an experience dashboard** from the template, the project record and the plan. Used by `netlify/functions/create-experience-project.js` (Create page), `netlify/functions/update-experience-project.js` (Manage page: add the plan, change material links) and `scripts/build-experience.js`. |
| `clients/[slug]/project.json` | Experience dashboards only: operator name, coach, stage and material links. |
| `admin/create-experience/`, `admin/manage-experience/` | Staff pages for creating an experience dashboard, then adding its launch plan and materials. |
| `shared/github-repo.js` | Reads and commits repository files for the experience functions. |
| `shared/plan-validator.js` | **The plan check.** Runs on every upload before anything is generated and returns each problem with its line number and fix. Also runs in the browser on the upload forms via `shared/plan-report-ui.js`. |
| `shared/coach-access.js` | **Coach dashboard access.** The only code that creates, reactivates or removes a coach's `user_plans` row. Used by the uploads, assessment generation and `netlify/functions/grant-coach-access.js` (called by Edit Project and Change Coach). Never insert a coach row any other way: the browser cannot insert into `user_plans`, and the row needs a start date. |
| `tests/plan-generator.test.js`, `tests/experience-generator.test.js`, `tests/plan-validator.test.js` | Run every real plan through the validator and generators against the current templates. Run `npm test` after changing a template, a generator or the validator. |
| `archive/` | Retired one-off scripts and working notes. Nothing depends on these files. |

**When a template gains a new `{{PLACEHOLDER}}`**, add the code that fills it to the matching generator in the same change. The tests fail if a template placeholder is left unfilled.

**Templates must never contain client content (hard rule).** A template holds only neutral program wording and `{{PLACEHOLDER}}` tokens. No client name, wording, figures, links, images or email address may be written into `template/*.html`, including inside scripts and HTML comments, because it would appear in every future dashboard. When a design change is copied from a client page (for example Andrea's Resort) into a template, copy the structure and styling only and replace all content with placeholders or neutral wording. `tests/no-client-content.test.js` enforces this: it compares every template, and pages generated from a neutral plan, against every client's plan and assessment in the repo. Run `npm test` after any template change.

The projections block in `template/accelerator-template.html` uses placeholders (`{{PROJECTIONS_LABEL}}`, `{{PROJECTIONS_SUBTITLE}}`, `{{PROJECTION_NIGHTS}}`, `{{PROJECTION_NIGHTS_BAR}}`, `{{PROJECTION_REVENUE}}`, `{{PROJECTION_REVENUE_BAR}}`, `{{PROJECTION_EMAILS}}`, `{{PROJECTION_REVIEWS}}` and the `SCENARIOS` object). When adding projections by hand, fill every one from that client's own figures.

**What the Add Plan upload does that differs from the manual steps above:**
- The Assessment page is filled from the client's record in the Supabase `client_assessments` table. If a plan is being added to an assessment and that record cannot be loaded, the upload stops and the assessment page is left as it was.
- "What This Breaks Into" uses one `{{TACTIC_N_BREAKDOWN_ITEMS}}` placeholder per tactic and shows one card per Part, however many there are.
- Each checklist item is attributed to a tactic from the plan's own `→ links to: Tactic N / Step M` notes, not from fixed four-week blocks.
- The projections block is always left out, because a plan.md has no projection figures. Add projections by hand when a client needs them.

**DEPRECATED templates (do NOT use):**
| File | Status |
|---|---|
| `clients/red-cariboo-resort/index.html` | DEPRECATED. Do not use as a template. Use `template/accelerator-template.html` instead. |
| `template/accelerator-dashboard-template.html` | DEPRECATED. Outdated and unmaintained. |

---

# Part 7: Design Sandbox Workflow

## Andrea's Resort (Design Sandbox)

`clients/andreas-resort/` is a design sandbox for testing improvements before they go into production.

**Workflow:**
1. Andrea makes design changes to `clients/andreas-resort/index.html` using Claude Code
2. Changes are committed to git automatically
3. Conner reviews the changes via `git log` and `git show`
4. Approved changes get applied to the master template

## Applying Changes to the Template

When applying design changes from Andrea's Resort to the master template:

1. Apply the change to `template/accelerator-template.html`
2. **Also apply the same change to `clients/sample-demo/index.html`** (Conner's Cabins)

Conner's Cabins is the client-facing sales demo and must always reflect the latest template design.

**Example prompt:**
> "Apply the card shadow changes from Andrea's Resort to the template and Conner's Cabins"

**Required files to update:**
- `template/accelerator-template.html` (master template)
- `clients/sample-demo/index.html` (Conner's Cabins - sales demo)
