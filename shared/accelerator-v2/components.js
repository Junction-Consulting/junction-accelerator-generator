/**
 * Accelerator v2 components. Each recurring piece of the dashboard is one
 * function here, returning an HTML string built from content.json.
 *
 * The markup and class names are the v1 template's, so the v1 look and the
 * shared scripts (progress, Edit Mode, analytics, the tour) keep working.
 *
 * Rules (SCHEMA.md, Principles):
 *   - Content gives words and facts. Labels and layout live here.
 *   - Missing means hidden: a component with no content returns ''.
 *   - Progress keys and edit keys are item IDs, never positions.
 *
 * Pure: no filesystem, network or environment.
 */

import { escapeHtml, inlineMarkdown, stripMarkdown } from '../plan-generator.js';
import Model from '../../assets/v2/progress-model.js';

const { scoreLevel } = Model;

// ── Text ───────────────────────────────────────────────────────────────────

const CONFIRM = /\[CONFIRM: ([^\]]*)\]/g;
const confirmMark = html => html.replace(CONFIRM, (m, text) => `<mark class="confirm-note">${text}</mark>`);

/** Inline Markdown to safe HTML, with [CONFIRM: ...] as a light highlight. */
export function md(text) {
  return confirmMark(inlineMarkdown(text));
}

/** Plain text for titles and labels (Markdown markers removed), with [CONFIRM] highlighted. */
export function plain(text) {
  return confirmMark(escapeHtml(stripMarkdown(String(text || ''))));
}

/** Paragraphs in one block, as v1 shows them: separated by a blank line. */
export function paragraphs(list) {
  return (list || []).map(md).join('<br><br>');
}

export const attr = text => escapeHtml(String(text ?? ''));
const editKey = key => (key ? ` data-editable-key="${attr(key)}"` : '');
const has = text => typeof text === 'string' && text.trim() !== '';

// ── Icons (drawings, not style values) ─────────────────────────────────────

export const ICONS = {
  chevronPart: '<svg class="tactic-part-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>',
  chevronWeek: '<svg class="week-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>',
  check: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>',
  checkSmall: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  note: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 2.5H3a.5.5 0 00-.5.5v14a.5.5 0 00.5.5h10a.5.5 0 00.5-.5V3a.5.5 0 00-.5-.5zM3 0h10a3 3 0 013 3v14a3 3 0 01-3 3H3a3 3 0 01-3-3V3a3 3 0 013-3zm2 5h6v2H5V5zm0 4h6v2H5V9z"/></svg>',
  noteOutline: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 2.5H3C2.17157 2.5 1.5 3.17157 1.5 4V12C1.5 12.8284 2.17157 13.5 3 13.5H13C13.8284 13.5 14.5 12.8284 14.5 12V4C14.5 3.17157 13.8284 2.5 13 2.5Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 5.5H11.5M4.5 8H9.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrowRight: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd"/></svg>',
  document: '<svg class="tactic-mockup-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>',
  email: '<svg class="tactic-mockup-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>',
  // Sidebar icons, one per tactic position (they cycle)
  tactics: [
    '<path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>',
    '<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>',
    '<path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/>',
    '<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>'
  ]
};

const cycle = (n, size = 4) => ((n - 1) % size) + 1;

// ── Navigation ─────────────────────────────────────────────────────────────

export function navTactic(tactic, n, total) {
  return `<button type="button" class="nav-item" data-page="tactic${n}" onclick="navigate('tactic${n}')"><span class="nav-ring" id="nav-ring-${n}" aria-hidden="true"></span><span class="nav-label">${plain(tactic.short_label || tactic.title)}</span><span class="sr-only" id="nav-ring-${n}-text">, 0 of ${total} done</span></button>`;
}

/** "Email your coach" under the navigation panel. Left out when there is no coach email. */
export function navCoach(email) {
  if (!has(email)) return '';
  return `<a class="nav-coach" href="mailto:${attr(email)}">Email your coach</a>`;
}

// ── Dashboard (DESIGN-BRIEF.md sections 5 and 6) ──────────────────────────
//
// All four stage panels are on the page; the page script shows one and fills
// every count from the ticks (data-live attributes). Labels here are neutral
// program wording; every other word comes from the content or the assessment.

const STEP_LABELS = days => ({
  onboarding: 'Onboarding call',
  assessment: 'Assessment',
  coaching: 'Coaching call',
  plan: `${days}-day plan`,
  checkin: '30-day check-in',
  review: `${days}-day review`
});

/** A donut: a conic fill sized by --pct (0 to 100). tone: dark | light | score-<level> */
export function donut({ pct = 0, tone = 'light', size = 'lg', number = '', sub = '', live = '', label = '' }) {
  const liveAttr = live ? ` data-live-donut="${attr(live)}"` : '';
  const numLive = live ? ` data-live="${attr(live)}-pct"` : '';
  return `<div class="donut donut--${size} donut--${tone}" style="--pct:${Number(pct) || 0}"${liveAttr} role="img" aria-label="${attr(label)}"><div class="donut-hole"><span class="donut-num"${numLive}>${attr(number)}</span>${sub ? `<span class="donut-sub">${attr(sub)}</span>` : ''}</div></div>`;
}

export function stageStrip(days) {
  const labels = STEP_LABELS(days);
  return `<ol class="stage-strip" aria-label="Your program">
      ${Object.entries(labels).map(([key, label]) => `<li class="stage-step" data-step="${key}"><span class="stage-step-bar" aria-hidden="true"></span><span class="stage-step-label">${label}</span><span class="stage-step-note" data-step-note></span></li>`).join('\n      ')}
    </ol>`;
}

function phaseBars(phases, tone) {
  return `<div class="phase-bars">
          ${phases.map((p, i) => `<div class="phase-bar"><span class="bar bar--${tone}"><span class="bar-fill" data-live-bar="phase-${i + 1}"></span></span><span class="phase-bar-name">${plain(p.name)}</span><span class="phase-bar-weeks">Weeks ${p.weeks[0]} to ${p.weeks[1]}</span></div>`).join('\n          ')}
        </div>`;
}

/** "Your progress": a donut, "N of M tasks checked off" and one bar per phase. */
export function progressCard(phases, total, { dark = true, id = '' } = {}) {
  const tone = dark ? 'dark' : 'light';
  return `<section class="dash-card dash-progress dash-progress--${tone}"${id ? ` id="${id}"` : ''}>
        <h2 class="dash-h3">Your progress</h2>
        ${donut({ tone, number: '0%', sub: 'of your plan', live: 'plan', label: 'Plan progress' })}
        <p><strong><span data-live="plan-done">0</span> of ${total}</strong> tasks checked off</p>
        ${phaseBars(phases, tone)}
      </section>`;
}

/** One card per tactic, with its ring and "N of M done". */
export function tacticProgressCard(tactic, n, total) {
  return `<button type="button" class="tactic-tile" onclick="navigate('tactic${n}')"><span class="ring" data-live-ring="tactic-${n}" aria-hidden="true"></span><span class="tactic-tile-text"><span class="tactic-tile-name">${plain(tactic.short_label || tactic.title)}</span><span class="tactic-tile-count"><span data-live="tactic-${n}-done">0</span> of ${total} done</span></span></button>`;
}

/** The actions of one week, as the "This week" card lists them. Tick boxes mirror the roadmap's. */
export function thisWeekPanel(week, links) {
  const rows = week.actions.map((a, i) => {
    const link = links[i];
    let howTo = '';
    if (link === 'quick_wins') howTo = `<button type="button" class="link-btn" onclick="navigate('gbp')">How to</button>`;
    else if (link) howTo = `<button type="button" class="link-btn" onclick="howToLink('tactic${link.tactic}','${attr(link.stepId)}')">How to</button>`;
    const id = `dw-${attr(a.id)}`;
    return `<div class="task-row"><input type="checkbox" class="tick" id="${id}" data-mirror="${attr(a.id)}" onchange="onMirrorTick(this)"><label class="task-label" for="${id}">${md(a.text)}</label>${howTo}</div>`;
  });
  return `<div class="week-panel" data-week-panel="${week.number}" hidden>
            ${rows.join('\n            ')}
          </div>`;
}

const READ_LIST_STRATEGY = 'your goal, positioning and objectives';

/** Stage 2a: Strategy and each tactic, with read state. */
export function readList(tactics) {
  const row = (key, title, detail) => `<button type="button" class="read-row" data-read="${attr(key)}" onclick="openToRead('${attr(key)}')"><span class="read-dot" aria-hidden="true"></span><span class="read-text"><strong>${title}</strong> · ${detail}</span><span class="read-state" data-read-state></span></button>`;
  const steps = t => t.parts.reduce((n, p) => n + p.steps.length, 0);
  return [row('strategy', 'Strategy', READ_LIST_STRATEGY)]
    .concat(tactics.map(t => row(t.id, plain(t.title), `${steps(t)} step${steps(t) === 1 ? '' : 's'}`)))
    .join('\n          ');
}

/** The assessment's quick wins on Sage, tickable. Kept in this browser; not plan progress. */
export function assessmentQuickWins(data) {
  const wins = (data && data.quick_wins) || [];
  if (!wins.length) return '';
  const rows = wins.map((w, i) => {
    const id = `aqw-${i + 1}`;
    return `<div class="task-row task-row--win"><input type="checkbox" class="tick" id="${id}" onchange="onQuickWinTick(this)"><div class="task-body"><label class="task-label task-label--strong" for="${id}">${text(w.task)}</label>${has(w.impact) ? `<div class="task-sub">${text(w.impact)}</div>` : ''}</div>${has(w.time_estimate) ? `<span class="task-time">${text(w.time_estimate)}</span>` : ''}</div>`;
  });
  return `<section class="dash-card dash-card--sage dash-wins">
        <div class="dash-card-head">
          <div><h2 class="dash-h2">Quick wins you can start today</h2><p>Small fixes from your assessment. No need to wait for the plan.</p></div>
          <div class="dash-wins-count"><span class="ring ring--sage" data-live-ring="wins" aria-hidden="true"></span><span><strong><span data-live="wins-done">0</span> of ${wins.length}</strong> done</span></div>
        </div>
        ${rows.join('\n        ')}
      </section>`;
}

function materialsCard(hasAssessmentPdf, days) {
  return `<section class="dash-tile">
          <h3 class="dash-h3">Materials</h3>
          ${hasAssessmentPdf ? '<button type="button" class="link-btn" onclick="downloadPDF()">Assessment report (PDF)</button>' : ''}
          <button type="button" class="link-btn plan-ready-only" onclick="printRoadmap()">Your ${days}-day plan (PDF)</button>
          <button type="button" class="link-btn" onclick="navigate('materials')">All materials</button>
        </section>`;
}

function coachTile(email) {
  if (!has(email)) return '';
  return `<section class="dash-tile">
          <h3 class="dash-h3">Your coach</h3>
          <p class="dash-muted">Questions about the plan? Send a note any time.</p>
          <a class="link-btn" href="mailto:${attr(email)}">Email your coach</a>
        </section>`;
}

/**
 * The whole dashboard.
 * ctx: { content, data, links (week number -> resolved how-to links), assessment, days }
 */
export function dashboard(ctx) {
  const { content, data, assessment, days } = ctx;
  const { tactics, phases, roadmap } = content;
  const total = data.tasks.all.length;
  const hasA = hasAssessment(assessment);
  const email = content.client.coach_email;
  const overall = hasA ? assessment.overall : null;
  const level = overall ? scoreLevel(overall.grade) : null;
  const summary = hasA ? (assessment.overall.summary || (assessment.executive_summary || {}).headline || '') : '';
  const firstWeek = roadmap.weeks.find(w => w.actions.length) || roadmap.weeks[0];

  const scoreDonut = (size, extra = {}) => donut({ pct: overall.score, tone: level ? `score-${level.key}` : 'light', size, number: String(overall.score), label: `Overall score ${overall.score} out of 100, grade ${overall.grade}`, ...extra });

  const before = `<div class="dash-stage" data-stage-panel="before" hidden>
      <div class="dash-row">
        ${hasA ? `<section class="dash-card dash-score">
          ${scoreDonut('lg', { sub: 'out of 100' })}
          <div class="dash-score-text">
            <h2 class="dash-h2">Your digital marketing assessment</h2>
            <p class="grade-line"><span class="grade-chip grade-chip--${level ? level.key : 'none'}">${text(overall.grade)}</span>${level ? ` ${level.word}` : ''}</p>
            ${has(summary) ? `<p>${text(summary)}</p>` : ''}
            <div class="btn-row"><button type="button" class="btn" onclick="navigate('assessment')">Read your assessment</button><button type="button" class="link-btn" onclick="downloadPDF()">Download as PDF</button></div>
          </div>
        </section>` : ''}
        <section class="dash-card dash-card--dark dash-next">
          <h2 class="dash-h3 dash-h3--gold">What happens next</h2>
          <p>On your coaching call we walk through your assessment together and agree on the tactics that matter most.</p>
          <p class="dash-muted-dark">Your ${days}-day plan appears here after the call.</p>
        </section>
      </div>
      ${hasA ? assessmentQuickWins(assessment) : ''}
      <section class="dash-section">
        <h2 class="dash-h2 dash-h2--rule">Coming with your plan</h2>
        <div class="dash-tiles dash-tiles--3">
          <div class="dash-tile dash-tile--sunken"><strong>Strategy</strong><p class="dash-muted">Your goal, your positioning and your objectives.</p></div>
          <div class="dash-tile dash-tile--sunken"><strong>Tactics</strong><p class="dash-muted">Step-by-step guides for each area you will work on.</p></div>
          <div class="dash-tile dash-tile--sunken"><strong>${days}-day roadmap</strong><p class="dash-muted">What to do each week, ticked off as you go.</p></div>
        </div>
      </section>
    </div>`;

  const delivered = `<div class="dash-stage" data-stage-panel="delivered" hidden>
      <div class="dash-row">
        <section class="dash-card dash-read">
          <div class="dash-card-head dash-card-head--baseline"><h2 class="dash-h2">Start here: read your plan</h2><span class="dash-muted"><span data-live="read-done">0</span> of ${tactics.length + 1} read</span></div>
          <p class="dash-measure">Read it through once before you begin. The weekly tasks will make more sense, and you can always come back to the how-to later.</p>
          <div class="read-list">
          ${readList(tactics)}
          </div>
          <div class="btn-row btn-row--end"><button type="button" class="btn" data-continue-reading onclick="continueReading()">Continue reading</button><button type="button" class="link-btn" onclick="printRoadmap()">Download the plan as a PDF</button></div>
        </section>
        ${progressCard(phases, total, { dark: false })}
      </div>
      <section class="dash-card dash-then">
        <div><h2 class="dash-h2 dash-h2--small">Then start week ${firstWeek.number}: ${plain(firstWeek.title)}</h2><p class="dash-muted">${attr(data.weeks[firstWeek.number].summary)}</p></div>
        <button type="button" class="btn btn--outline" onclick="openRoadmapWeek(${firstWeek.number})">Open week ${firstWeek.number}</button>
      </section>
      <div class="dash-tiles dash-tiles--3">
        ${hasA && (assessment.quick_wins || []).length ? `<section class="dash-tile">
          <h3 class="dash-h3">Quick wins</h3>
          <p class="dash-muted"><span data-live="wins-done">0</span> of ${assessment.quick_wins.length} done from your assessment.</p>
          <button type="button" class="link-btn" onclick="navigate('assessment')">See your quick wins</button>
        </section>` : ''}
        ${coachTile(email)}
        ${materialsCard(hasA, days)}
      </div>
    </div>`;

  const weekPanels = roadmap.weeks.filter(w => w.actions.length).map(w => thisWeekPanel(w, ctx.links[w.number])).join('\n          ');
  const firstPhaseEnd = phases.length ? phases[0].weeks[1] : null;
  const during = `<div class="dash-stage" data-stage-panel="during" hidden>
      <div class="dash-row">
        <section class="dash-card dash-week" id="objectives-section">
          <div>
            <h2 class="dash-h2">This week: <span data-live="week-title"></span></h2>
            <p class="dash-muted">Week <span data-live="week-number"></span> of ${content.program.weeks} · <span data-live="week-done">0</span> of <span data-live="week-total">0</span> done</p>
          </div>
          <div class="week-panels" id="next-step-main">
          ${weekPanels}
          </div>
          <div class="dash-week-foot" data-week-foot="open">
            <button type="button" class="btn" onclick="openRoadmapWeek(shownWeek)">Open week <span data-live="week-number"></span> in the roadmap</button>
            <button type="button" class="link-btn" data-resume onclick="resumeLastStep()" hidden></button>
          </div>
          <div class="dash-week-foot dash-week-foot--done" data-week-foot="done" hidden>
            <p><strong>Week <span data-live="week-number"></span> is done.</strong> <span data-live="week-up-next"></span></p>
            <button type="button" class="btn btn--forest" data-week-advance onclick="advanceWeek()"></button>
          </div>
        </section>
        ${progressCard(phases, total, { dark: true, id: 'goal-section' })}
      </div>
      <section class="dash-section">
        <h2 class="dash-h2 dash-h2--rule">Your tactics</h2>
        <div class="dash-tactics tactic-grid" id="tactic-cards-section" data-columns="${tactics.length}">
          ${tactics.map((t, i) => tacticProgressCard(t, i + 1, data.tasks.byTactic[i + 1].length)).join('\n          ')}
        </div>
      </section>
      <div class="dash-tiles dash-tiles--3">
        <section class="dash-tile dash-tile--sage" data-coming-up>
          <h3 class="dash-h3">Coming up</h3>
          <p><strong data-live="next-title"></strong></p>
          <p class="dash-small" data-live="next-summary"></p>
          <button type="button" class="link-btn link-btn--forest" data-live-next onclick="openRoadmapWeek(this.dataset.week)">Look ahead</button>
        </section>
        <section class="dash-tile dash-tile--sage25">
          <h3 class="dash-h3">30-day check-in</h3>
          <p class="dash-small">${firstPhaseEnd ? `Opens after week ${firstPhaseEnd}. ` : ''}Your six areas are scored again so you can see what moved.</p>
        </section>
        ${materialsCard(hasA, days)}
      </div>
    </div>`;

  const areaRows = hasA ? ASSESSMENT_CATEGORIES.filter(c => assessment.categories[c.key]).map(c => {
    const cat = assessment.categories[c.key];
    return `<tr data-area="${c.key}"><th scope="row">${text(c.title)}</th><td>${scoreCell(cat.score, cat.grade)}</td><td data-slot="checkin"><span class="slot-empty">Not yet</span></td><td data-slot="review"><span class="slot-empty">Not yet</span></td><td data-slot="change"><span class="slot-empty">Not yet</span></td></tr>`;
  }) : [];

  const done = `<div class="dash-stage" data-stage-panel="done" hidden>
      ${hasA ? `<section class="dash-card dash-results">
        <div class="dash-card-head"><h2 class="dash-h2">Your results</h2><span class="sample-badge" data-sample-only hidden>Sample scores for review</span></div>
        <div class="results-top">
          <div class="results-donuts">
            <figure class="results-donut">${scoreDonut('md', { sub: `Grade ${overall.grade}` })}<figcaption>When you started</figcaption></figure>
            <span class="dash-muted">to</span>
            <figure class="results-donut" data-review-donut><div class="donut-slot">Not yet</div><figcaption>After ${days} days</figcaption></figure>
          </div>
          <div class="results-text">
            <p class="results-line" data-live="results-line">Your ${days}-day review scores your six areas again so you can see what changed.</p>
            <div class="btn-row"><button type="button" class="btn" onclick="navigate('assessment')">Read your assessment</button><button type="button" class="link-btn" onclick="downloadPDF()">Download as PDF</button></div>
          </div>
        </div>
        <div class="table-scroll">
          <table class="plain-table results-table">
            <thead><tr><th scope="col">Area</th><th scope="col">Start</th><th scope="col">30 days</th><th scope="col">${days} days</th><th scope="col">Change</th></tr></thead>
            <tbody>
              ${areaRows.join('\n              ')}
            </tbody>
          </table>
        </div>
      </section>` : ''}
      <section class="dash-card dash-keep" data-keep-doing hidden>
        <div><h2 class="dash-h2">What to keep doing</h2><p class="dash-muted">The habits from your plan that keep these numbers where they are. This list resets each month.</p></div>
        <span class="sample-badge">Sample list for review</span>
        <div class="keep-list" data-keep-list></div>
      </section>
      <section class="dash-card dash-card--dark dash-junction">
        <div><h2 class="dash-h2">Your next step with Junction</h2><p class="dash-muted-dark">Go through these results with your coach and decide what your next ${days} days should focus on.</p></div>
        ${has(email) ? `<a class="btn btn--light" href="mailto:${attr(email)}">Email your coach</a>` : ''}
      </section>
      <p class="dash-muted dash-small">Your plan, assessment and materials stay here for you to come back to.</p>
    </div>`;

  return `<div class="dash-v2 dash" data-dashboard>
    <header class="dash-head">
      <h1 class="dash-h1" id="dash-greeting"></h1>
      <p class="dash-sub" id="dash-sub" hidden></p>
    </header>
    ${stageStrip(days)}
    ${before}
    ${delivered}
    ${during}
    ${done}
  </div>`;
}

/**
 * Sandbox only (client.flags.sandbox): preview the four stages with sample
 * state (DESIGN-BRIEF.md section 10). Styled apart from the product.
 */
export function stageSwitcher() {
  const options = [['before', 'Before the plan'], ['delivered', 'Plan just delivered'], ['during', 'During the plan'], ['done', 'Plan done']];
  return `<div class="stage-switcher" role="group" aria-label="Sandbox preview: choose a stage">
  <span class="stage-switcher-label">Sandbox preview</span>
  ${options.map(([key, label]) => `<button type="button" class="stage-switcher-btn" data-preview-stage="${key}" aria-pressed="false" onclick="choosePreviewStage('${key}')">${label}</button>`).join('\n  ')}
</div>`;
}

/** A score with its letter, coloured by the letter's level. */
export function scoreCell(score, grade) {
  const level = scoreLevel(grade);
  return `<span class="score score--${level ? level.key : 'none'}">${attr(score)} <span class="score-letter">${text(grade || '')}</span></span>`;
}

// ── Strategy ───────────────────────────────────────────────────────────────

export function objectiveCard(objective, n, tacticNumber) {
  const pill = tacticNumber ? `Tactic ${tacticNumber} · Weeks ${objective.weeks[0]}-${objective.weeks[1]}` : '';
  return `<div class="strategy-objective-card" style="--obj-color:var(--objective-color-${cycle(n)})">
          <div class="strategy-objective-num">${String(n).padStart(2, '0')}</div>
          <div class="strategy-objective-content">
            <h3 class="strategy-objective-title"${editKey(`${objective.id}.title`)}>${plain(objective.title)}</h3>
            <p class="strategy-objective-desc"${editKey(`${objective.id}.description`)}>${md(objective.description)}</p>
            ${pill ? `<span class="strategy-objective-pill">${pill}</span>` : ''}
          </div>
        </div>`;
}

export function tacticOverviewCard(tactic, n) {
  const label = has(tactic.phase_label) ? `<div class="tactic-overview-phase">${plain(tactic.phase_label)}</div>` : '';
  return `<div class="tactic-overview-card" style="--color:var(--tactic-color-${cycle(n)})">
          ${label}
          <h3 class="tactic-overview-title">${plain(tactic.title)}</h3>
          <p class="tactic-overview-desc">${md(tactic.subtitle)}</p>
          <button class="tactic-overview-link" onclick="navigate('tactic${n}')">View full guide ${ICONS.arrowRight}</button>
        </div>`;
}

// ── Tactic page ────────────────────────────────────────────────────────────

export function tacticHeader(tactic, n) {
  const label = has(tactic.phase_label) ? `Tactic ${n} · ${plain(tactic.phase_label)}` : `Tactic ${n}`;
  const tabs = [['overview', 'Overview'], ['steps', 'Implementation Steps'], ['metrics', 'Success Metrics'], ['tips', 'Tips &amp; Resources']];
  return `<div class="tactic-hero" data-tactic="${n}">
      <div class="tactic-hero-top">
        <div class="tactic-hero-meta">
          <span class="tactic-hero-label">${label}</span>
          <span class="tactic-hero-status" id="t${n}-status">Not Started</span>
        </div>
        <div class="tactic-hero-progress">
          <svg class="tactic-hero-ring" viewBox="0 0 80 80">
            <circle class="tactic-hero-ring-bg" cx="40" cy="40" r="31"></circle>
            <circle class="tactic-hero-ring-bar" id="t${n}-ring" cx="40" cy="40" r="31" transform="rotate(-90 40 40)"></circle>
          </svg>
          <div>
            <div class="tactic-hero-pct" id="t${n}-pct">0%</div>
            <div class="tactic-hero-pct-label">of this tactic</div>
          </div>
        </div>
      </div>
      <h1${editKey(`${tactic.id}.title`)}>${plain(tactic.title)}</h1>
      <p${editKey(`${tactic.id}.subtitle`)}>${md(tactic.subtitle)}</p>
      <div class="tactic-tabs" role="tablist" aria-label="Tactic ${n} sections">
        ${tabs.map(([tab, name], i) => `<button class="tactic-tab${i === 0 ? ' active' : ''}" id="tab-t${n}-${tab}" role="tab" aria-selected="${i === 0}" aria-controls="panel-t${n}-${tab}" data-tactic-tab="${n}" data-tab="${tab}" onclick="switchTacticTab(${n}, '${tab}')">${name}</button>`).join('\n        ')}
      </div>
    </div>`;
}

function cardBlock(label, inner, extraClass = '') {
  return `<div class="tactic-card-block${extraClass}">
          <div class="tactic-card-label">${label}</div>
          ${inner}
        </div>`;
}

export function partCard(part, isLastOdd) {
  const title = part.card && has(part.card.title) ? part.card.title : part.name;
  const titleKey = part.card && has(part.card.title) ? `${part.id}.card.title` : null; // the name is edited in the part header
  const desc = part.card && has(part.card.description)
    ? `\n              <div class="tactic-breakdown-desc"${editKey(`${part.id}.card.description`)}>${plain(part.card.description)}</div>` : '';
  return `<div class="tactic-breakdown-item${isLastOdd ? ' full-width' : ''}">
              <div class="tactic-breakdown-title"${editKey(titleKey)}>${plain(title)}</div>${desc}
            </div>`;
}

export function tacticOverview(tactic) {
  const parts = tactic.parts || [];
  const breakdown = parts.length
    ? cardBlock('What This Breaks Into', `<div class="tactic-breakdown-grid">
            ${parts.map((p, i) => partCard(p, parts.length % 2 === 1 && i === parts.length - 1)).join('\n            ')}
          </div>`)
    : '';
  const tc = tactic.time_commitment;
  const time = tc && has(tc.amount)
    ? cardBlock('Time Commitment', `<div>
            <span class="tactic-time-value">${plain(tc.amount)}</span>${has(tc.detail) ? `\n            <span class="tactic-time-context">${plain(tc.detail)}</span>` : ''}
          </div>`)
    : '';
  const prose = (key, label, extra = '') => ((tactic[key] || []).length
    ? cardBlock(label, `<p${editKey(`${tactic.id}.${key}`)}>${paragraphs(tactic[key])}</p>`, extra) : '');
  return `<div class="tactic-overview-grid">
      <div class="tactic-overview-col">
        ${prose('what_this_is', 'What This Is')}
        ${breakdown}
      </div>
      <div class="tactic-overview-col">
        ${prose('what_we_heard', 'What We Heard From You', ' navy')}
        ${prose('why_it_matters', 'Why It Matters')}
        ${time}
      </div>
    </div>`;
}

// Step labels: time, cost, Contractor, Critical (the v1 .tactic-step-tag pills)
const TAG_LABELS = { contractor: ['Contractor', 'warning'], critical: ['Critical', 'danger'] };

export function stepLabels(step) {
  const labels = [];
  if (has(step.time)) labels.push(`<span class="tactic-step-tag muted">${plain(step.time)}</span>`);
  if (has(step.cost)) labels.push(`<span class="tactic-step-tag info">${plain(step.cost)}</span>`);
  (step.tags || []).forEach(tag => {
    const [label, tone] = TAG_LABELS[tag] || [tag, 'muted'];
    labels.push(`<span class="tactic-step-tag ${tone}">${label}</span>`);
  });
  return labels.length ? `<div class="tactic-step-tags">${labels.join('')}</div>` : '';
}

/** A bullets block: one flat list, sub-bullets marked, as Edit Mode expects. */
export function bullets(block) {
  const items = [];
  (block.items || []).forEach(item => {
    items.push(`<li${editKey(`${item.id}.text`)}>${md(item.text)}</li>`);
    (item.children || []).forEach(child => items.push(`<li class="tactic-step-sub"${editKey(`${child.id}.text`)}>${md(child.text)}</li>`));
  });
  return `<ul class="tactic-step-bullets">
              ${items.join('\n              ')}
            </ul>`;
}

/** A table, in the Success Metrics table style. */
export function table(columns, rows, extraClass = '') {
  return `<div class="tactic-metrics-table${extraClass}">
            <table>
              <thead>
                <tr>${columns.map(c => `<th>${md(c)}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${rows.map(r => `<tr>${r.map(c => `<td>${md(c)}</td>`).join('')}</tr>`).join('\n                ')}
              </tbody>
            </table>
          </div>`;
}

export function stepLinks(step) {
  return (step.links || []).map(l => `<a href="${attr(l.url)}" class="tactic-step-resource" target="_blank" rel="noopener">${plain(l.title)}</a>`).join('\n');
}

export function step(stepData, number, tacticNumber, assetUrl) {
  const body = (stepData.body || []).map(block => (block.type === 'table' ? table(block.columns, block.rows, ' tactic-step-table') : bullets(block))).join('\n            ');
  const media = (stepData.media || []).length
    ? `\n            <div class="tactic-step-media-list">\n              ${mediaList(stepData.media, assetUrl)}\n            </div>` : '';
  const links = stepLinks(stepData);
  return `<li class="tactic-step-item" id="${attr(stepData.id)}" data-step-number="${number}">
          <span class="tactic-step-num">${number}</span>
          <div class="tactic-step-content">
            <div class="tactic-step-title"${editKey(`${stepData.id}.title`)}>${plain(stepData.title)}</div>
            ${stepLabels(stepData)}
            ${body}${links ? `\n            ${links}` : ''}${media}
          </div>
        </li>`;
}

export function part(partData, index, firstNumber, tacticNumber, assetUrl) {
  const count = partData.steps.length;
  const letter = String.fromCharCode(65 + index);
  return `<div class="tactic-part${index === 0 ? ' open' : ''}">
    <button class="tactic-part-header" onclick="toggleTacticPart(this)">
      <span class="tactic-part-tag">Part ${letter}</span>
      <span class="tactic-part-title"${editKey(`${partData.id}.name`)}>${plain(partData.name)}</span>
      <span class="tactic-part-meta">${count} ${count === 1 ? 'step' : 'steps'}</span>
      ${ICONS.chevronPart}
    </button>
    <div class="tactic-part-body">
      <ol class="tactic-steps-list">
        ${partData.steps.map((s, i) => step(s, firstNumber + i, tacticNumber, assetUrl)).join('\n        ')}
      </ol>
    </div>
  </div>`;
}

export function implementationSteps(tactic, tacticNumber, assetUrl) {
  let number = 1;
  const parts = (tactic.parts || []).map((p, i) => {
    const html = part(p, i, number, tacticNumber, assetUrl);
    number += p.steps.length;
    return html;
  });
  return `<div class="tactic-parts-list">\n  ${parts.join('\n  ')}\n</div>`;
}

export function metricsTable(metrics) {
  if (!metrics || !(metrics.rows || []).length) return '';
  return cardBlock('Success Metrics', table(metrics.columns, metrics.rows));
}

export function tips(tactic) {
  if (!(tactic.tips || []).length) return '';
  return cardBlock('Tips', `<ul class="tactic-tips-list">
                ${tactic.tips.map((tip, i) => `<li${editKey(`${tactic.id}.tips.${i}`)}>${md(tip)}</li>`).join('\n                ')}
              </ul>`);
}

export function resources(tactic) {
  if (!(tactic.resources || []).length) return '';
  return cardBlock('Resources', `<ul class="tactic-resources-list">
                ${tactic.resources.map((r, i) => `<li><a href="${attr(r.url)}" data-editable-link="${attr(`${tactic.id}.resources.${i}`)}" target="_blank">${plain(r.title)}</a>${has(r.description) ? `: ${md(r.description)}` : ''}</li>`).join('\n                ')}
              </ul>`);
}

export function tacticPage(tactic, n, assetUrl) {
  const panel = (tab, inner, active = false) => `<div class="tactic-tab-content${active ? ' active' : ''}" id="panel-t${n}-${tab}" role="tabpanel" aria-labelledby="tab-t${n}-${tab}" data-tactic-content="${n}" data-content="${tab}">
        ${inner}
      </div>`;
  const tipsAndResources = `<div class="tactic-overview-grid">
          <div class="tactic-overview-col">
            ${tips(tactic)}
          </div>
          <div class="tactic-overview-col">
            ${resources(tactic)}
          </div>
        </div>`;
  return `<section id="page-tactic${n}" class="page" data-tactic-id="${attr(tactic.id)}">
  <div class="tactic-page-content">
    ${tacticHeader(tactic, n)}
    <div class="tactic-body">
      ${panel('overview', tacticOverview(tactic), true)}
      ${panel('steps', implementationSteps(tactic, n, assetUrl))}
      ${panel('metrics', metricsTable(tactic.metrics))}
      ${panel('tips', tipsAndResources)}
    </div>
  </div>
</section>`;
}

// ── Media ──────────────────────────────────────────────────────────────────

const lightbox = 'class="lightbox-trigger" onclick="openLightbox(this.src, this.alt)"';
const BADGES = { mockup: 'Mockup', example: 'Example' };
const badge = b => (BADGES[b] ? `<span class="tactic-step-media-badge tactic-mockup-badge">${BADGES[b]}</span>` : '');
const caption = c => (has(c) ? `<div class="tactic-mockup-label">${plain(c)}</div>` : '');
const dots = '<span class="tactic-mockup-dot red"></span>\n            <span class="tactic-mockup-dot yellow"></span>\n            <span class="tactic-mockup-dot green"></span>';

function img(entry, assetUrl, zoom = true) {
  return `<img src="${attr(assetUrl(entry.asset))}" alt="${attr(entry.alt)}"${zoom ? ` ${lightbox}` : ''} loading="lazy">`;
}

function chrome(frame, bar, open) {
  if (frame === 'document' || frame === 'email') {
    const label = has(bar) ? bar : (frame === 'email' ? 'Email' : '');
    return `<div class="tactic-mockup-chrome tactic-mockup-chrome--titled">
            ${ICONS[frame]}
            <div class="tactic-mockup-title">${plain(label)}</div>
          </div>`;
  }
  return `<div class="tactic-mockup-chrome">
            ${dots}
            <div class="tactic-mockup-url">${plain(bar)}</div>${open ? '\n            <span class="tactic-mockup-open" aria-hidden="true"><span class="tactic-mockup-open-text">Open site </span>↗</span>' : ''}
          </div>`;
}

export function imageMedia(entry, assetUrl) {
  const frame = entry.frame || 'none';
  const linked = entry.link && entry.link.url;
  if (frame === 'none') {
    return `<figure class="tactic-media-plain" data-media-id="${attr(entry.id)}">
            <div class="tactic-media-plain-body">${badge(entry.badge)}${img(entry, assetUrl)}</div>
            ${caption(entry.caption)}
          </figure>`;
  }
  if (frame === 'phone') {
    return `<figure class="tactic-phone" data-media-id="${attr(entry.id)}">
            <div class="tactic-reel-phone">${badge(entry.badge)}${img(entry, assetUrl)}</div>
            ${has(entry.caption) ? `<figcaption class="tactic-reel-label">${plain(entry.caption)}</figcaption>` : ''}
          </figure>`;
  }
  const classes = ['tactic-mockup'];
  if (frame === 'document') classes.push('tactic-mockup--document');
  if (frame === 'email') classes.push('tactic-mockup--email');
  if (entry.fit === 'full') classes.push('tactic-mockup--page');
  const frameHtml = `<div class="${classes.join(' ')}" data-media-id="${attr(entry.id)}">
          ${chrome(frame, entry.bar, linked)}
          <div class="tactic-mockup-body">
            ${badge(entry.badge)}${img(entry, assetUrl, !linked)}
          </div>
          ${caption(entry.caption)}
        </div>`;
  if (!linked) return frameHtml;
  const label = has(entry.link.label) ? entry.link.label : 'Open site';
  return `<a href="${attr(entry.link.url)}" class="tactic-mockup-link" target="_blank" rel="noopener" aria-label="${attr(`${label}: ${entry.alt} (opens in a new tab)`)}">
        ${frameHtml}
      </a>`;
}

export function videoMedia(entry) {
  const src = entry.provider === 'vimeo'
    ? `https://player.vimeo.com/video/${encodeURIComponent(entry.video_id)}`
    : `https://www.youtube.com/embed/${encodeURIComponent(entry.video_id)}`;
  const host = entry.provider === 'vimeo' ? 'vimeo.com' : 'youtube.com';
  return `<div class="tactic-mockup tactic-embed" data-media-id="${attr(entry.id)}">
          ${chrome('website', host, false)}
          <div class="tactic-mockup-body">
            <iframe src="${src}" title="${attr(entry.title)}" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
          </div>
          ${caption(entry.caption)}
        </div>`;
}

function socialPost(entry, assetUrl) {
  const label = `${has(entry.handle) ? `<strong>${plain(entry.handle)}</strong>` : ''}${plain(entry.post_type)}${entry.url ? ' · <span class="tactic-reel-open">Open post ↗</span>' : ''}`;
  const inner = `<div class="tactic-reel-phone">${img(entry, assetUrl, !entry.url)}</div>
          <div class="tactic-reel-label">${label}</div>`;
  return entry.url
    ? `<a href="${attr(entry.url)}" class="tactic-reel" target="_blank" rel="noopener" aria-label="${attr(`Open post: ${entry.alt} (opens in a new tab)`)}" data-media-id="${attr(entry.id)}">
          ${inner}
        </a>`
    : `<div class="tactic-reel" data-media-id="${attr(entry.id)}">
          ${inner}
        </div>`;
}

export function galleryMedia(entry, assetUrl) {
  return `<div class="tactic-gallery" data-media-id="${attr(entry.id)}">
          ${has(entry.title) ? `<div class="tactic-gallery-title">${plain(entry.title)}</div>` : ''}
          <div class="tactic-gallery-grid">
            ${(entry.items || []).map(item => `<figure class="tactic-gallery-item">${img(item, assetUrl)}${has(item.caption) ? `<figcaption class="tactic-gallery-caption">${plain(item.caption)}</figcaption>` : ''}</figure>`).join('\n            ')}
          </div>
        </div>`;
}

export function groupMedia(entry, assetUrl) {
  return `<div class="tactic-mockup-pair${entry.layout === 'four' ? ' tactic-mockup-four' : ''}" data-media-id="${attr(entry.id)}">
          ${(entry.items || []).map(item => imageMedia(item, assetUrl)).join('\n          ')}
        </div>`;
}

export function linkCardMedia(entry) {
  let host = '';
  try { host = new URL(entry.url).hostname.replace(/^www\./, ''); } catch (e) { host = entry.url; }
  return `<a href="${attr(entry.url)}" class="tactic-mockup-link" target="_blank" rel="noopener" aria-label="${attr(`Open ${entry.title} (opens in a new tab)`)}" data-media-id="${attr(entry.id)}">
        <div class="tactic-mockup">
          ${chrome('website', host, true)}
          <div class="tactic-link-card-body">
            <div class="tactic-link-card-title">${plain(entry.title)}</div>
            ${has(entry.subtitle) ? `<div class="tactic-link-card-subtitle">${plain(entry.subtitle)}</div>` : ''}
          </div>
        </div>
      </a>`;
}

/** Any media entry. Consecutive social posts are grouped in one row by the step. */
export function mediaEntry(entry, assetUrl) {
  switch (entry.type) {
    case 'image': return imageMedia(entry, assetUrl);
    case 'video': return videoMedia(entry);
    case 'social_post': return `<div class="tactic-reel-row">${socialPost(entry, assetUrl)}</div>`;
    case 'gallery': return galleryMedia(entry, assetUrl);
    case 'group': return groupMedia(entry, assetUrl);
    case 'link_card': return linkCardMedia(entry);
    default: return '';
  }
}

/** A step's media, in order. Social posts next to each other share one row. */
export function mediaList(list, assetUrl) {
  const out = [];
  let row = null;
  for (const entry of list) {
    if (entry.type === 'social_post') {
      if (!row) { row = []; out.push(row); }
      row.push(socialPost(entry, assetUrl));
    } else {
      row = null;
      out.push(mediaEntry(entry, assetUrl));
    }
  }
  return out.map(x => (Array.isArray(x) ? `<div class="tactic-reel-row">\n          ${x.join('\n          ')}\n        </div>` : x)).join('\n              ');
}

// ── Roadmap ────────────────────────────────────────────────────────────────

/**
 * One action as a tick box (DESIGN-BRIEF.md section 7: tasks are the
 * actions). This is the saved tick: its data-key is the action ID, which
 * shared/progress.js loads and saves. The dashboard's tick boxes mirror it.
 * link: { tactic, stepId } | 'quick_wins' | null
 */
export function actionItem(action, link, { howtoId, noteButtonId } = {}) {
  const id = attr(action.id);
  const idAttr = howtoId ? ` id="${howtoId}"` : '';
  let button = '';
  if (link === 'quick_wins') button = `<button class="howto-link"${idAttr} onclick="navigate('gbp')">how to</button>`;
  else if (link) button = `<button class="howto-link"${idAttr} onclick="howToLink('tactic${link.tactic}','${attr(link.stepId)}')">how to</button>`;
  return `<div class="check-item">
  <div class="check-row">
    <input type="checkbox" class="check-input" id="${id}" data-key="${id}" onchange="onCheck(this)">
    <label class="check-box" for="${id}">${ICONS.check}</label>
    <label class="check-label" for="${id}"${editKey(`${action.id}.text`)}>${md(action.text)}</label>
    ${button}
    <button class="note-toggle-btn"${noteButtonId ? ` id="${noteButtonId}"` : ''} onclick="toggleNote('${id}')" title="Add note">${ICONS.note}</button>
  </div>
  <div class="note-area" id="note-area-${id}">
    <textarea class="note-textarea" id="note-${id}" placeholder="Add a note…" oninput="saveNote('${id}',this.value)"></textarea>
  </div>
</div>`;
}

/**
 * A roadmap week. Interim layout until the roadmap is rebuilt (brief phase 3):
 * the actions are the tick boxes, and the plan's checklist lines are kept in
 * content.json but not shown.
 */
export function weekCard(week, links, { first = false } = {}) {
  let howtoMarked = false;
  const actions = week.actions.map((a, i) => {
    const mark = first && !howtoMarked && links[i];
    if (mark) howtoMarked = true;
    return actionItem(a, links[i], { howtoId: mark ? 'w1-howto-example' : null, noteButtonId: first && i === 0 ? 'w1-note-example' : null });
  });
  return `<div class="week-card" id="wc-${week.number}" data-week="${week.number}" data-week-id="${attr(week.id)}">
  <div class="week-card-header" onclick="toggleWeek(${week.number})">
    <div class="week-num">W${week.number}</div>
    <div class="week-title"${editKey(`${week.id}.title`)}>${plain(week.title)}</div>
    <div class="week-progress-pill" id="wp-${week.number}">0 / ${week.actions.length}</div>
    ${ICONS.chevronWeek}
  </div>
  <div class="week-card-body">
    <div class="week-col-label">This week's actions</div>
    <div class="check-list week-actions"${first ? ' id="w1-checklist"' : ''}>
      ${actions.join('\n      ')}
    </div>
    <div class="week-note-section"><div class="week-note-label">Week notes</div><textarea class="note-textarea week-note-textarea" id="note-${attr(week.id)}" placeholder="Add general notes for this week…" oninput="saveNote('${attr(week.id)}',this.value)"></textarea></div>
  </div>
</div>`;
}

export function phaseBlock(phase, n, weeksHtml, total) {
  return `<div class="month-block">
      <div class="month-header">
        <span class="month-badge">Month ${n}</span>
        <span class="month-title">${plain(phase.name)}</span>
        <span class="month-progress" id="m${n}-prog"><span>0</span> of ${total} done</span>
      </div>
      ${weeksHtml}
    </div>`;
}

// ── Quick Wins ─────────────────────────────────────────────────────────────

export function quickWin(item) {
  const id = attr(item.id);
  const label = has(item.title) ? `<strong>${plain(item.title)}.</strong> ${md(item.text)}` : md(item.text);
  return `<div class="check-item">
        <div class="check-row">
          <input type="checkbox" class="check-input" id="${id}" onchange="onCheck(this)">
          <label class="check-box" for="${id}">${ICONS.checkSmall}</label>
          <label class="check-label" for="${id}"${editKey(`${item.id}.label`)}>${label}</label>
          <button class="note-toggle-btn" onclick="toggleNote('${id}')">${ICONS.noteOutline}</button>
        </div>
        <div class="note-area" id="note-area-${id}">
          <textarea class="note-textarea" id="note-${id}" placeholder="Add a note…" oninput="saveNote('${id}',this.value)"></textarea>
        </div>
      </div>`;
}

export function quickWinGroup(group) {
  return `<div class="section-label">${plain(group.title)}</div>
<div class="card qw-card">
  <div class="card-body">
    <div class="check-list qw-check-list">
      ${group.items.map(quickWin).join('\n      ')}
    </div>
  </div>
</div>`;
}

export function quickWinsNote(note) {
  if (!note || !has(note.text)) return '';
  return `<div class="callout">${has(note.title) ? `<strong>${plain(note.title)}.</strong> ` : ''}${md(note.text)}</div>`;
}

// ── Assessment ─────────────────────────────────────────────────────────────
// Built from a client_assessments record's assessment_data (Supabase in
// production). Assessment items have no IDs, so their edit keys are their
// path in that record, for example assessment.executive_summary.key_strengths.0.

export const ASSESSMENT_CATEGORIES = [
  { key: 'website_technical', title: 'Website & Technical', iconClass: 'website', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' },
  { key: 'reviews_reputation', title: 'Reviews & Reputation', iconClass: 'reviews', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
  { key: 'booking_conversion', title: 'Online Booking & Conversion', iconClass: 'booking', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
  { key: 'social_media', title: 'Social Media & Content', iconClass: 'social', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>' },
  { key: 'guest_experience', title: 'Digital Guest Experience', iconClass: 'experience', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
  { key: 'local_visibility', title: 'Local Visibility', iconClass: 'local', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' }
];

const FINDING_ICONS = {
  positive: '<svg class="finding-icon positive" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
  negative: '<svg class="finding-icon negative" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>'
};

const text = value => attr(value == null ? '' : value);
const score = value => (value != null && value !== '' ? String(Math.round(Number(value))) : '--');
export function gradeClass(grade) {
  const letter = String(grade || '').trim().charAt(0).toLowerCase();
  return letter && 'abcdf'.includes(letter) ? `grade-${letter}` : '';
}

/** True when the record has real assessment content, not an empty object. */
export function hasAssessment(data) {
  return !!(data && data.overall && data.categories && Object.keys(data.categories).length > 0);
}

export function assessmentGradeCard(data) {
  const summary = data.overall.summary || (data.executive_summary || {}).headline || '';
  return `<div class="assessment-grade-card">
      <div class="grade-circle" id="overallGrade">${text(data.overall.grade || '--')}</div>
      <div class="grade-details">
        <h3>Overall Score: <span id="overallScore">${score(data.overall.score)}</span>/100</h3>
        ${has(summary) ? `<p id="overallSummary"${editKey(data.overall.summary ? 'assessment.overall.summary' : 'assessment.executive_summary.headline.card')}>${text(summary)}</p>` : ''}
      </div>
    </div>`;
}

export function categoryScore(category, cat) {
  return `<div class="grade-breakdown-item">
          <div class="grade-breakdown-category">
            ${category.icon}
            <span>${category.title}</span>
          </div>
          <div class="grade-breakdown-score">
            <span class="grade-breakdown-number">${score(cat.score)}</span>
            <span class="grade-breakdown-letter ${gradeClass(cat.grade)}">${text(cat.grade || '--')}</span>
          </div>
        </div>`;
}

export function executiveSummary(summary) {
  if (!summary || !(has(summary.headline) || (summary.key_strengths || []).length || (summary.critical_gaps || []).length)) return '';
  const list = (items, key) => (items || []).map((item, i) => `<li${editKey(`assessment.executive_summary.${key}.${i}`)}>${text(item)}</li>`).join('\n            ');
  return `<div class="executive-summary" id="executiveSummary">
      <h2>Executive Summary</h2>
      ${has(summary.headline) ? `<p class="executive-headline"${editKey('assessment.executive_summary.headline')}>${text(summary.headline)}</p>` : ''}
      <div class="executive-columns">
        <div class="executive-column strengths">
          <h4>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Key Strengths
          </h4>
          <ul>
            ${list(summary.key_strengths, 'key_strengths')}
          </ul>
        </div>
        <div class="executive-column gaps">
          <h4>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Critical Gaps
          </h4>
          <ul>
            ${list(summary.critical_gaps, 'critical_gaps')}
          </ul>
        </div>
      </div>
      ${has(summary.bottom_line) ? `<div class="executive-bottom-line">
        <strong>Bottom Line:</strong> <span${editKey('assessment.executive_summary.bottom_line')}>${text(summary.bottom_line)}</span>
      </div>` : ''}
    </div>`;
}

export function assessmentQuickWin(win, i) {
  return `<div class="quick-win-item">
          <div class="quick-win-number">${i + 1}</div>
          <div class="quick-win-content">
            <div class="quick-win-task"${editKey(`assessment.quick_wins.${i}.task`)}>${text(win.task)}</div>
            ${has(win.impact) ? `<div class="quick-win-impact"${editKey(`assessment.quick_wins.${i}.impact`)}>${text(win.impact)}</div>` : ''}
          </div>
          ${has(win.time_estimate) ? `<div class="quick-win-time">${text(win.time_estimate)}</div>` : ''}
        </div>`;
}

export function priorityRecommendation(rec, i) {
  const tags = [
    has(rec.category) ? `<span class="priority-item-tag">${text(rec.category)}</span>` : '',
    has(rec.time_estimate) ? `<span class="priority-item-tag time">${text(rec.time_estimate)}</span>` : '',
    has(rec.impact) ? `<span class="priority-item-tag impact-${text(String(rec.impact).toLowerCase())}">${text(rec.impact)} Impact</span>` : ''
  ].filter(Boolean).join('\n              ');
  return `<div class="priority-item">
          <div class="priority-item-number">${i + 1}</div>
          <div class="priority-item-content">
            <h4${editKey(`assessment.priority_recommendations.${i}.text`)}>${text(rec.text || rec.title)}</h4>
            ${tags ? `<div class="priority-item-meta">
              ${tags}
            </div>` : ''}
            ${has(rec.expected_result) ? `<p class="priority-item-result"${editKey(`assessment.priority_recommendations.${i}.expected_result`)}>${text(rec.expected_result)}</p>` : ''}
          </div>
        </div>`;
}

export function categoryCard(category, cat) {
  const metrics = (cat.metrics || []).slice(0, 4).map(metric => {
    const status = ['good', 'warning', 'critical'].includes(metric.status) ? metric.status : 'good';
    return `<div class="metric-item">
                <div class="metric-label">${text(metric.label)}</div>
                <div class="metric-value"><span class="metric-status ${status}"></span>${text(metric.value)}</div>
              </div>`;
  }).join('\n              ');
  const findings = (cat.findings || []).slice(0, 4).map((finding, i) => `<div class="finding-item">
                ${finding.type === 'positive' ? FINDING_ICONS.positive : FINDING_ICONS.negative}
                <span${editKey(`assessment.categories.${category.key}.findings.${i}`)}>${text(finding.text)}</span>
              </div>`).join('\n              ');
  return `<div class="category-card">
          <div class="category-header" onclick="this.parentElement.classList.toggle('open')">
            <div class="category-icon ${category.iconClass}">
              ${category.icon}
            </div>
            <div class="category-title-wrap">
              <h3 class="category-title">${category.title}</h3>
              <span class="category-grade ${gradeClass(cat.grade)}">${text(cat.grade || 'N/A')}</span>
            </div>
            <svg class="category-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="category-body">
            ${has(cat.summary) ? `<p class="category-summary"${editKey(`assessment.categories.${category.key}.summary`)}>${text(cat.summary)}</p>` : ''}
            ${metrics ? `<div class="category-metrics">
              ${metrics}
            </div>` : ''}
            ${findings ? `<div class="category-findings">
              <h4>Key Findings</h4>
              ${findings}
            </div>` : ''}
          </div>
        </div>`;
}

/** The whole Assessment page, or '' when there is no assessment. */
export function assessmentPage(data, { date } = {}) {
  if (!hasAssessment(data)) return '';
  const categories = ASSESSMENT_CATEGORIES.filter(c => data.categories[c.key]);
  const wins = (data.quick_wins || []).slice(0, 6);
  const recs = (data.priority_recommendations || []).slice(0, 4);
  return `<section id="page-assessment" class="page">
  <div class="assessment-hero">
    <div class="assessment-hero-top">
      <div>
        <h1 class="assessment-hero-title">Your Digital Marketing Assessment</h1>
        ${has(date) ? `<p class="assessment-hero-date">Assessment Date: ${text(date)}</p>` : ''}
      </div>
      <div class="assessment-hero-actions">
        <button class="download-pdf-btn" onclick="downloadPDF()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download PDF
        </button>
      </div>
    </div>
    ${assessmentGradeCard(data)}
  </div>

  <div class="content-area">
    <div class="grade-breakdown">
      <h2>Score Breakdown by Category</h2>
      <div class="grade-breakdown-grid">
        ${categories.map(c => categoryScore(c, data.categories[c.key])).join('\n        ')}
      </div>
    </div>

    ${executiveSummary(data.executive_summary)}

    ${wins.length ? `<div class="quick-wins" id="quickWins">
      <h2>Quick Wins</h2>
      <p class="quick-wins-intro">Immediate actions you can complete today:</p>
      <div class="quick-wins-grid">
        ${wins.map(assessmentQuickWin).join('\n        ')}
      </div>
    </div>` : ''}

    ${recs.length ? `<div class="priority-section">
      <h2>Priority Recommendations</h2>
      <p class="priority-intro">The changes that will make the biggest difference, in priority order:</p>
      <div class="priority-list" id="priorityList">
        ${recs.map(priorityRecommendation).join('\n        ')}
      </div>
    </div>` : ''}

    <div class="categories-section">
      <h2>Detailed Category Analysis</h2>
      <div class="categories-grid">
        ${categories.map(c => categoryCard(c, data.categories[c.key])).join('\n        ')}
      </div>
    </div>
  </div>
</section>`;
}

export function navAssessment() {
  return `<button type="button" class="nav-item" data-page="assessment" onclick="navigate('assessment')">Assessment</button>`;
}
