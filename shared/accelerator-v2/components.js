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
  document: '<svg class="media-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>',
  email: '<svg class="media-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>',
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
    if (link === 'quick_wins') howTo = `<button type="button" class="link-btn" onclick="openGbpWins()">How to</button>`;
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
    return `<div class="task-row task-row--win"><input type="checkbox" class="tick" id="${id}" data-qw="${id}" onchange="onQuickWinTick(this)"><div class="task-body"><label class="task-label task-label--strong" for="${id}">${text(w.task)}</label>${has(w.impact) ? `<div class="task-sub">${text(w.impact)}</div>` : ''}</div>${has(w.time_estimate) ? `<span class="task-time">${text(w.time_estimate)}</span>` : ''}</div>`;
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

// Strategy (DESIGN-BRIEF.md section 6): goal on Carbon, positioning with the
// statement as a Sage pull quote, then one row per objective linking to its
// tactic, with that tactic's ring and weeks. Tactics are not listed again.

export function positioningBlock(strategy) {
  const text = paragraphs(strategy.positioning);
  const statement = has(strategy.positioning_statement)
    ? `<section class="tp-card tp-card--sage st-statement"><blockquote class="pull-quote pull-quote--lg">“${md(strategy.positioning_statement)}”</blockquote></section>` : '';
  if (!text && !statement) return '';
  return `<div class="tp-row">
      ${text ? `<section class="tp-card"><h2 class="tp-h2">Your positioning</h2><div class="tp-text" data-editable-key="strategy.positioning">${text}</div></section>` : ''}
      ${statement}
    </div>`;
}

/** tactic: { n, name } or null */
export function objectiveRow(objective, n, tactic) {
  const weeks = objective.weeks && objective.weeks.length === 2 ? (objective.weeks[0] === objective.weeks[1] ? `week ${objective.weeks[0]}` : `weeks ${objective.weeks[0]} to ${objective.weeks[1]}`) : '';
  const inner = `<span class="st-obj-text"><span class="tp-h3 st-obj-title"${editKey(`${objective.id}.title`)}>${plain(objective.title)}</span><span class="st-obj-desc"${editKey(`${objective.id}.description`)}>${md(objective.description)}</span></span>
        ${tactic ? `<span class="st-obj-tactic"><span class="pie" data-live-pie="tactic-${tactic.n}" aria-hidden="true"></span><span><span class="st-obj-name">${plain(tactic.name)}</span>${weeks ? ` · ${weeks}` : ''}</span></span>` : ''}`;
  return tactic
    ? `<div class="st-obj st-obj--link" role="link" tabindex="0" onclick="navigate('tactic${tactic.n}')" onkeydown="if(event.key==='Enter'){navigate('tactic${tactic.n}')}">
        ${inner}
      </div>`
    : `<div class="st-obj">
        ${inner}
      </div>`;
}

// ── Materials (DESIGN-BRIEF.md section 6) ─────────────────────────────────
// Only the two PDFs can be wired now. Items that do not exist yet are greyed
// with when they arrive. Onboarding call notes and the coaching call summary
// wait for approval (brief section 11).

export function materialsPage({ hasAssessmentPdf, date, days, checkinWeek }) {
  const row = (title, desc, action, extra = '') => `<div class="mat-item${action ? '' : ' mat-item--later'}${extra}">
      <div><h2 class="tp-h3">${title}</h2><p>${desc}</p></div>
      ${action || ''}
    </div>`;
  const pdf = fn => `<button type="button" class="btn" onclick="${fn}()">Download PDF</button>`;
  return `<section id="page-materials" class="page">
  <div class="tp mat">
    <header class="tp-head-text">
      <h1 class="tp-h1">Materials</h1>
      <p class="tp-sub">Everything from your program, in one place.</p>
    </header>
    <div class="mat-list">
    ${hasAssessmentPdf ? row('Assessment report', `Your full digital marketing assessment as a PDF.${has(date) ? ` ${attr(date)}.` : ''}`, pdf('downloadPDF')) : ''}
    ${row(`Your ${days}-day plan`, 'Your roadmap as a document to print or share with your team.', pdf('printRoadmap'), ' plan-ready-only')}
    ${row(`Your ${days}-day plan`, 'Arrives after your coaching call.', '', ' plan-coming-only')}
    ${row('30-day check-in report', `Arrives after your check-in${checkinWeek ? `, once week ${checkinWeek} is done` : ''}.`, '')}
    ${row(`${days}-day review`, 'Arrives when your plan is done.', '')}
    </div>
  </div>
</section>`;
}

// ── Tactic page (DESIGN-BRIEF.md section 6, "Tactic") ─────────────────────
//
// Two tabs: Overview, and Implementation steps as one continuous scroll.
// ctx: { total (the tactic's task count), stepWeeks (step ID -> [week numbers]),
//        next ({ n, title } or null), assetUrl }

export function tacticHeader(tactic, n, total) {
  const label = has(tactic.phase_label) ? `Tactic ${n} · ${plain(tactic.phase_label)}` : `Tactic ${n}`;
  const tabs = [['overview', 'Overview'], ['steps', 'Implementation steps']];
  return `<header class="tp-head" data-tactic="${n}">
      <div class="tp-head-text">
        <h1 class="tp-h1"${editKey(`${tactic.id}.title`)}>${plain(tactic.title)}</h1>
        ${has(tactic.subtitle) ? `<p class="tp-sub"${editKey(`${tactic.id}.subtitle`)}>${md(tactic.subtitle)}</p>` : ''}
        <div class="meta-label">${label}</div>
      </div>
      <div class="tp-progress">
        ${donut({ tone: 'ground', size: 'sm', number: '0%', live: `tactic-${n}`, label: 'Share of this tactic done' })}
        <p class="tp-progress-text"><span data-live="tactic-${n}-done">0</span> of ${total} tasks done</p>
      </div>
    </header>
    <div class="tp-tabs" role="tablist" aria-label="${attr(tactic.short_label || tactic.title)}">
      ${tabs.map(([tab, name], i) => `<button type="button" class="tp-tab${i === 0 ? ' active' : ''}" id="tab-t${n}-${tab}" role="tab" aria-selected="${i === 0}" aria-controls="panel-t${n}-${tab}" data-tactic-tab="${n}" data-tab="${tab}" onclick="switchTacticTab(${n}, '${tab}')">${name}</button>`).join('\n      ')}
    </div>`;
}

const proseBlock = (tactic, key, title) => ((tactic[key] || []).length
  ? `<div class="tp-prose"><h2 class="tp-h3">${title}</h2><div class="tp-text"${editKey(`${tactic.id}.${key}`)}>${paragraphs(tactic[key])}</div></div>` : '');

/** A plain table: header row, rows separated by alternating tints, no lines. */
export function plainTable(columns, rows, extraClass = '', cell = md) {
  return `<div class="table-scroll">
            <table class="plain-table${extraClass}">
              <thead><tr>${columns.map(c => `<th scope="col">${cell(c)}</th>`).join('')}</tr></thead>
              <tbody>
                ${rows.map(r => `<tr>${r.map((c, i) => (i === 0 ? `<th scope="row">${cell(c)}</th>` : `<td>${cell(c)}</td>`)).join('')}</tr>`).join('\n                ')}
              </tbody>
            </table>
          </div>`;
}

export function metricsTable(metrics) {
  if (!metrics || !(metrics.rows || []).length) return '';
  return `<section class="tp-card">
        <h2 class="tp-h2">Success metrics</h2>
        ${plainTable(metrics.columns, metrics.rows, ' tp-metrics')}
      </section>`;
}

export function tips(tactic) {
  if (!(tactic.tips || []).length) return '';
  return `<section class="tp-card tp-card--sage25">
          <h2 class="tp-h3">Tips</h2>
          <ul class="tp-list">
            ${tactic.tips.map((tip, i) => `<li${editKey(`${tactic.id}.tips.${i}`)}>${md(tip)}</li>`).join('\n            ')}
          </ul>
        </section>`;
}

export function resources(tactic) {
  if (!(tactic.resources || []).length) return '';
  return `<section class="tp-card">
          <h2 class="tp-h3">Resources</h2>
          <ul class="tp-links">
            ${tactic.resources.map((r, i) => `<li><a href="${attr(r.url)}" data-editable-link="${attr(`${tactic.id}.resources.${i}`)}" target="_blank" rel="noopener">${plain(r.title)}</a>${has(r.description) ? `<span class="tp-link-note">${md(r.description)}</span>` : ''}</li>`).join('\n            ')}
          </ul>
        </section>`;
}

export function tacticOverview(tactic, n) {
  const tc = tactic.time_commitment;
  const time = tc && has(tc.amount)
    ? `<p class="tp-time"><strong>Time commitment:</strong> <span class="tactic-time-value">${plain(tc.amount)}</span>${has(tc.detail) ? ` <span class="tactic-time-context">${plain(tc.detail)}</span>` : ''}</p>` : '';
  const main = proseBlock(tactic, 'what_this_is', 'What this is') + proseBlock(tactic, 'why_it_matters', 'Why it matters') + time;
  const heard = (tactic.what_we_heard || []).length
    ? `<section class="tp-card tp-card--sage tp-heard">
          <h2 class="tp-h3">What we heard from you</h2>
          <div class="tp-text"${editKey(`${tactic.id}.what_we_heard`)}>${paragraphs(tactic.what_we_heard)}</div>
          ${has(tactic.heard_quote) ? `<blockquote class="pull-quote"${editKey(`${tactic.id}.heard_quote`)}>“${plain(tactic.heard_quote)}”</blockquote>` : ''}
        </section>` : '';
  const tipsHtml = tips(tactic);
  const resHtml = resources(tactic);
  return `${main || heard ? `<div class="tp-row">
        ${main ? `<section class="tp-card">${main}</section>` : ''}
        ${heard}
      </div>` : ''}
      ${metricsTable(tactic.metrics)}
      ${tipsHtml || resHtml ? `<div class="tp-row">
        ${tipsHtml}
        ${resHtml}
      </div>` : ''}
      <div class="tp-foot tp-foot--end"><button type="button" class="btn" onclick="switchTacticTab(${n}, 'steps')">Next: implementation steps</button></div>`;
}

// Step labels: time, cost, Contractor, Critical
const TAG_LABELS = { contractor: 'Contractor', critical: 'Critical' };

export function stepLabels(step, weeks) {
  const labels = [];
  if (has(step.time)) labels.push(`<span class="step-label">${plain(step.time)}</span>`);
  if (has(step.cost)) labels.push(`<span class="step-label">${plain(step.cost)}</span>`);
  (step.tags || []).forEach(tag => labels.push(`<span class="step-chip step-chip--${attr(tag)}">${TAG_LABELS[tag] || plain(tag)}</span>`));
  if (weeks && weeks.length) {
    const words = weeks.length === 1 ? `week ${weeks[0]}` : `weeks ${weeks.slice(0, -1).join(', ')} and ${weeks[weeks.length - 1]}`;
    labels.push(`<button type="button" class="link-btn step-week-link" onclick="openRoadmapWeek(${weeks[0]})">On your roadmap in ${words}</button>`);
  }
  return labels.length ? `<div class="step-labels">${labels.join('')}</div>` : '';
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

/** A table inside a step. */
export function table(columns, rows) {
  return plainTable(columns, rows, ' step-table');
}

export function stepLinks(step) {
  const links = (step.links || []).map(l => `<a href="${attr(l.url)}" class="step-resource" target="_blank" rel="noopener">${plain(l.title)}</a>`);
  return links.length ? `<div class="step-resources">${links.join('')}</div>` : '';
}

/** One collapsible step. Collapsed until opened, or linked to. */
export function step(stepData, number, tacticNumber, assetUrl, weeks) {
  const id = attr(stepData.id);
  const body = (stepData.body || []).map(block => (block.type === 'table' ? table(block.columns, block.rows) : bullets(block))).join('\n            ');
  const media = (stepData.media || []).length
    ? `\n            <div class="tactic-step-media-list">\n              ${mediaList(stepData.media, assetUrl)}\n            </div>` : '';
  return `<section class="step-card" id="${id}" data-step-number="${number}">
          <button type="button" class="step-head" aria-expanded="false" aria-controls="${id}-body" onclick="toggleStep(this)">
            <span class="step-numeral" aria-hidden="true">${number}</span>
            <span class="step-title"${editKey(`${stepData.id}.title`)}>${plain(stepData.title)}</span>
            <span class="chev" aria-hidden="true"></span>
          </button>
          <div class="step-body" id="${id}-body" hidden>
            ${stepLabels(stepData, weeks)}
            ${body}
            ${stepLinks(stepData)}${media}
          </div>
        </section>`;
}

export function part(partData, index, firstNumber, tacticNumber, assetUrl, stepWeeks) {
  const letter = String.fromCharCode(65 + index);
  return `<h2 class="tp-h2 part-heading">Part ${letter}: <span${editKey(`${partData.id}.name`)}>${plain(partData.name)}</span></h2>
      ${partData.steps.map((s, i) => step(s, firstNumber + i, tacticNumber, assetUrl, stepWeeks.get(s.id))).join('\n      ')}`;
}

export function implementationSteps(tactic, tacticNumber, assetUrl, stepWeeks = new Map()) {
  let number = 1;
  const parts = (tactic.parts || []).map((p, i) => {
    const html = part(p, i, number, tacticNumber, assetUrl, stepWeeks);
    number += p.steps.length;
    return html;
  });
  return `<div class="steps-scroll">\n      ${parts.join('\n      ')}\n    </div>`;
}

export function tacticPage(tactic, n, ctx) {
  const { assetUrl, total = 0, stepWeeks = new Map(), next = null } = ctx || {};
  const panel = (tab, inner, active = false) => `<div class="tp-panel${active ? ' active' : ''}" id="panel-t${n}-${tab}" role="tabpanel" aria-labelledby="tab-t${n}-${tab}" data-tactic-content="${n}" data-content="${tab}"${active ? '' : ' hidden'}>
      ${inner}
    </div>`;
  const nextButton = next
    ? `<button type="button" class="btn" onclick="navigate('tactic${next.n}')">Next tactic: ${plain(next.title)}</button>`
    : `<button type="button" class="btn" onclick="navigate('roadmap')">Open the roadmap</button>`;
  const steps = `${implementationSteps(tactic, n, assetUrl, stepWeeks)}
      <div class="tp-foot"><button type="button" class="link-btn" onclick="switchTacticTab(${n}, 'overview')">Back to overview</button>${nextButton}</div>`;
  return `<section id="page-tactic${n}" class="page" data-tactic-id="${attr(tactic.id)}">
  <div class="tp">
    ${tacticHeader(tactic, n, total)}
    ${panel('overview', tacticOverview(tactic, n), true)}
    ${panel('steps', steps)}
  </div>
</section>`;
}

// ── Media ──────────────────────────────────────────────────────────────────

const lightbox = 'class="lightbox-trigger" onclick="openLightbox(this.src, this.alt)"';
const BADGES = { mockup: 'Mockup', example: 'Example' };
const badge = b => (BADGES[b] ? `<span class="media-badge">${BADGES[b]}</span>` : '');
const caption = c => (has(c) ? `<figcaption class="media-caption">${plain(c)}</figcaption>` : '');

function img(entry, assetUrl, zoom = true) {
  return `<img src="${attr(assetUrl(entry.asset))}" alt="${attr(entry.alt)}"${zoom ? ` ${lightbox}` : ''} loading="lazy">`;
}

/** The dark bar on top of a website, document or email frame: what it is, and its badge. */
function chrome(frame, bar, open, badgeKey) {
  const label = has(bar) ? bar : (frame === 'email' ? 'Email' : '');
  const icon = frame === 'document' || frame === 'email' ? ICONS[frame] : '';
  return `<div class="media-bar">
            ${icon}<span class="media-bar-text">${plain(label)}</span>${open ? '<span class="media-open" aria-hidden="true">Open site ↗</span>' : ''}${badge(badgeKey)}
          </div>`;
}

export function imageMedia(entry, assetUrl) {
  const frame = entry.frame || 'none';
  const linked = entry.link && entry.link.url;
  if (frame === 'none') {
    return `<figure class="media media--none" data-media-id="${attr(entry.id)}">
            <div class="media-plain">${badge(entry.badge)}${img(entry, assetUrl)}</div>
            ${caption(entry.caption)}
          </figure>`;
  }
  if (frame === 'phone') {
    return `<figure class="media media--phone" data-media-id="${attr(entry.id)}">
            <div class="media-phone">${badge(entry.badge)}${img(entry, assetUrl)}</div>
            ${caption(entry.caption)}
          </figure>`;
  }
  const frameHtml = `<figure class="media media--${frame}${entry.fit === 'full' ? ' media--page' : ''}" data-media-id="${attr(entry.id)}">
          <div class="media-frame">
            ${chrome(frame, entry.bar, linked, entry.badge)}
            <div class="media-body">${img(entry, assetUrl, !linked)}</div>
          </div>
          ${caption(entry.caption)}
        </figure>`;
  if (!linked) return frameHtml;
  const label = has(entry.link.label) ? entry.link.label : 'Open site';
  return `<a href="${attr(entry.link.url)}" class="media-link" target="_blank" rel="noopener" aria-label="${attr(`${label}: ${entry.alt} (opens in a new tab)`)}">
        ${frameHtml}
      </a>`;
}

export function videoMedia(entry) {
  const src = entry.provider === 'vimeo'
    ? `https://player.vimeo.com/video/${encodeURIComponent(entry.video_id)}`
    : `https://www.youtube.com/embed/${encodeURIComponent(entry.video_id)}`;
  const host = entry.provider === 'vimeo' ? 'vimeo.com' : 'youtube.com';
  return `<figure class="media media--video" data-media-id="${attr(entry.id)}">
          <div class="media-frame">
            ${chrome('website', host, false)}
            <div class="media-body media-body--video">
              <iframe src="${src}" title="${attr(entry.title)}" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
            </div>
          </div>
          ${caption(entry.caption)}
        </figure>`;
}

function socialPost(entry, assetUrl) {
  const label = `${has(entry.handle) ? `<strong>${plain(entry.handle)}</strong>` : ''}${plain(entry.post_type)}${entry.url ? ' · <span class="media-open">Open post ↗</span>' : ''}`;
  const inner = `<div class="media-phone">${img(entry, assetUrl, !entry.url)}</div>
          <div class="media-caption">${label}</div>`;
  return entry.url
    ? `<a href="${attr(entry.url)}" class="media-post" target="_blank" rel="noopener" aria-label="${attr(`Open post: ${entry.alt} (opens in a new tab)`)}" data-media-id="${attr(entry.id)}">
          ${inner}
        </a>`
    : `<div class="media-post" data-media-id="${attr(entry.id)}">
          ${inner}
        </div>`;
}

export function galleryMedia(entry, assetUrl) {
  return `<div class="media-gallery" data-media-id="${attr(entry.id)}">
          ${has(entry.title) ? `<div class="media-gallery-title">${plain(entry.title)}</div>` : ''}
          <div class="media-gallery-grid">
            ${(entry.items || []).map(item => `<figure class="media-gallery-item">${img(item, assetUrl)}${has(item.caption) ? `<figcaption class="media-caption">${plain(item.caption)}</figcaption>` : ''}</figure>`).join('\n            ')}
          </div>
        </div>`;
}

export function groupMedia(entry, assetUrl) {
  return `<div class="media-group${entry.layout === 'four' ? ' media-group--four' : ''}" data-media-id="${attr(entry.id)}">
          ${(entry.items || []).map(item => imageMedia(item, assetUrl)).join('\n          ')}
        </div>`;
}

export function linkCardMedia(entry) {
  let host = '';
  try { host = new URL(entry.url).hostname.replace(/^www\./, ''); } catch (e) { host = entry.url; }
  return `<a href="${attr(entry.url)}" class="media-link media media--link" target="_blank" rel="noopener" aria-label="${attr(`Open ${entry.title} (opens in a new tab)`)}" data-media-id="${attr(entry.id)}">
        <div class="media-frame">
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
    case 'social_post': return `<div class="media-row">${socialPost(entry, assetUrl)}</div>`;
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
  return out.map(x => (Array.isArray(x) ? `<div class="media-row">\n          ${x.join('\n          ')}\n        </div>` : x)).join('\n              ');
}

// ── Roadmap (DESIGN-BRIEF.md section 6, "90-day roadmap") ─────────────────

const NOTE_BUTTON = (id, extraId) => `<button type="button" class="link-btn link-btn--quiet note-btn"${extraId ? ` id="${extraId}"` : ''} onclick="toggleNote('${id}')" aria-controls="note-area-${id}">Note</button>`;
const NOTE_AREA = id => `<div class="note-area" id="note-area-${id}">
      <textarea class="note-textarea" id="note-${id}" placeholder="Add a note" aria-label="Note" oninput="saveNote('${id}',this.value)"></textarea>
    </div>`;

/**
 * One action: the saved tick (data-key is the action ID, which
 * shared/progress.js loads and saves; the dashboard mirrors it), "How to"
 * and "Note".
 * link: { tactic, stepId, tacticName, preview: [bullet text] } | 'quick_wins' | null
 */
export function actionItem(action, link, { howtoId, noteButtonId } = {}) {
  const id = attr(action.id);
  const idAttr = howtoId ? ` id="${howtoId}"` : '';
  let howTo = '';
  let preview = '';
  if (link === 'quick_wins') {
    howTo = `<button type="button" class="link-btn"${idAttr} onclick="openGbpWins()">How to</button>`;
  } else if (link) {
    howTo = `<button type="button" class="link-btn"${idAttr} aria-expanded="false" aria-controls="howto-${id}" onclick="toggleHowTo('${id}', this)">How to</button>`;
    const items = (link.preview || []).map(t => `<li>${md(t)}</li>`).join('');
    preview = `
    <div class="rm-howto" id="howto-${id}" hidden>
      ${items ? `<ul class="rm-howto-list">${items}</ul>` : ''}
      <button type="button" class="link-btn" onclick="howToLink('tactic${link.tactic}','${attr(link.stepId)}')">Open the full step in ${plain(link.tacticName)}</button>
    </div>`;
  }
  return `<div class="rm-action task-row-wrap">
    <div class="task-row rm-action-row">
      <input type="checkbox" class="tick check-input" id="${id}" data-key="${id}" onchange="onCheck(this)">
      <label class="task-label rm-action-label check-label" for="${id}"${editKey(`${action.id}.text`)}>${md(action.text)}</label>
      ${howTo}
      ${NOTE_BUTTON(id, noteButtonId)}
    </div>${preview}
    ${NOTE_AREA(id)}
  </div>`;
}

/** A week: a plain row with a small pie; open, it sits on a white panel. */
export function weekCard(week, links, { first = false } = {}) {
  let howtoMarked = false;
  const actions = week.actions.map((a, i) => {
    const mark = first && !howtoMarked && links[i];
    if (mark) howtoMarked = true;
    return actionItem(a, links[i], { howtoId: mark ? 'w1-howto-example' : null, noteButtonId: first && i === 0 ? 'w1-note-example' : null });
  });
  const n = week.number;
  return `<div class="rm-week" id="wc-${n}" data-week="${n}" data-week-id="${attr(week.id)}">
  <div class="rm-week-head" role="button" tabindex="0" aria-expanded="false" aria-controls="wb-${n}" onclick="toggleWeek(${n})">
    <span class="rm-week-num">${n}</span>
    <span class="rm-week-title"${editKey(`${week.id}.title`)}>${plain(week.title)}</span>
    <span class="rm-week-count"><span data-live="week-${n}-done">0</span> of ${week.actions.length}</span>
    <span class="pie" data-live-pie="week-${n}" aria-hidden="true"></span>
  </div>
  <div class="rm-week-body" id="wb-${n}" hidden>
    <div class="rm-actions"${first ? ' id="w1-checklist"' : ''}>
      ${actions.join('\n      ')}
    </div>
    <div class="rm-notes">
      <label class="rm-notes-label" for="note-${attr(week.id)}">Week notes</label>
      <textarea class="note-textarea rm-notes-text" id="note-${attr(week.id)}" rows="2" placeholder="Add general notes for this week" oninput="saveNote('${attr(week.id)}',this.value)"></textarea>
    </div>
  </div>
</div>`;
}

export function phaseBlock(phase, n, weeksHtml, total) {
  return `<section class="rm-month">
      <div class="rm-divider">
        <h2 class="rm-h2">Month ${n} · ${plain(phase.name)}</h2>
        <span class="rm-divider-count"><span data-live="phase-${n}-done">0</span> of ${total} done</span>
      </div>
      ${weeksHtml}
    </section>`;
}

// ── Google profile and website wins (the plan's quick wins) ──────────────────

export function quickWin(item) {
  const id = attr(item.id);
  const label = has(item.title) ? `<strong>${plain(item.title)}.</strong> ${md(item.text)}` : md(item.text);
  return `<div class="rm-action task-row-wrap">
    <div class="task-row rm-action-row">
      <input type="checkbox" class="tick check-input" id="${id}" onchange="onCheck(this)">
      <label class="task-label rm-action-label check-label" for="${id}"${editKey(`${item.id}.label`)}>${label}</label>
      ${NOTE_BUTTON(id)}
    </div>
    ${NOTE_AREA(id)}
  </div>`;
}

export function quickWinGroup(group) {
  return `<div class="rm-gbp-group">
      <h3 class="tp-h3">${plain(group.title)}</h3>
      ${group.items.map(quickWin).join('\n      ')}
    </div>`;
}

export function quickWinsNote(note) {
  if (!note || !has(note.text)) return '';
  return `<div class="rm-watch">${has(note.title) ? `<strong>${plain(note.title)}.</strong> ` : ''}${md(note.text)}</div>`;
}

/** After the last month: the plan's quick-win groups and its note. Tickable; not plan progress. */
export function gbpWins(qw) {
  const groups = (qw && qw.groups) || [];
  if (!groups.length) return '';
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return `<section class="rm-gbp" id="gbp-wins">
      <div class="rm-divider">
        <h2 class="rm-h2">Google profile and website wins</h2>
        <span class="rm-divider-count"><span data-live="gbp-done">0</span> of ${total} done</span>
      </div>
      ${has(qw.intro) ? `<p class="rm-gbp-intro" data-editable-key="quick_wins.intro">${md(qw.intro)}</p>` : ''}
      <div class="rm-gbp-panel">
      ${groups.map(quickWinGroup).join('\n      ')}
      </div>
      ${quickWinsNote(qw.note)}
    </section>`;
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


const text = value => attr(value == null ? '' : value);
const score = value => (value != null && value !== '' ? String(Math.round(Number(value))) : '--');

/** True when the record has real assessment content, not an empty object. */
export function hasAssessment(data) {
  return !!(data && data.overall && data.categories && Object.keys(data.categories).length > 0);
}

// ── Assessment page (DESIGN-BRIEF.md section 6, "Assessment") ─────────────
// Everything in the record is shown: the summary, every area with all of its
// metrics, findings, recommendations, score breakdown, sources and
// confidence, every quick win, every priority recommendation and the
// visitor and market context. Long lists show the first few and "Show all N".

const LIST_FIRST = 4;
const levelOf = grade => { const l = scoreLevel(grade); return l ? l.key : 'none'; };
const words = key => String(key || '').replace(/([a-z])([A-Z])/g, (m, a, b) => `${a} ${b}`).replace(/_/g, ' ').replace(/^./, c => c.toUpperCase());
const confidenceWord = c => (has(c) ? `${words(c)} confidence` : '');

/** A value from the record as text: lists joined, objects as "key value" pairs, true and false as Yes and No. */
export function valueText(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join(', ');
  if (typeof value === 'object') return Object.entries(value).map(([k, v]) => `${words(k).toLowerCase()} ${valueText(v)}`).join(', ');
  return String(value);
}

/** A list that shows the first few items and a "Show all N" button. */
function longList(tag, items, label, extraClass = '') {
  if (!items.length) return '';
  const rows = items.map((item, i) => (i < LIST_FIRST ? `<li>${item}</li>` : `<li data-more hidden>${item}</li>`)).join('\n                ');
  const more = items.length > LIST_FIRST ? `<button type="button" class="link-btn show-all" onclick="showAll(this)">Show all ${items.length} ${label}</button>` : '';
  return `<${tag} class="as-list${extraClass}">
                ${rows}
              </${tag}>${more}`;
}

export function assessmentSummary(data, { level }) {
  const s = data.executive_summary || {};
  const list = (items, key) => (items || []).map((item, i) => `<li${editKey(`assessment.executive_summary.${key}.${i}`)}>${text(item)}</li>`).join('\n            ');
  const o = data.overall;
  return `<section class="as-card as-summary" id="as-summary">
      <div class="as-summary-top">
        ${donut({ pct: o.score, tone: `score-${level ? level.key : 'none'}`, number: score(o.score), sub: 'out of 100', label: `Overall score ${score(o.score)} out of 100, grade ${o.grade}` })}
        <div class="as-summary-text">
          <h2 class="tp-h2">Overall grade ${text(o.grade || '')}${level ? ` <span class="as-level as-level--${level.key}">${level.word}</span>` : ''}</h2>
          ${has(o.confidence) ? `<p class="as-meta">${confidenceWord(o.confidence)}</p>` : ''}
          ${has(s.headline) ? `<p${editKey('assessment.executive_summary.headline')}>${text(s.headline)}</p>` : ''}
          ${has(o.summary) ? `<p${editKey('assessment.overall.summary')}>${text(o.summary)}</p>` : ''}
        </div>
      </div>
      ${(s.key_strengths || []).length || (s.critical_gaps || []).length ? `<div class="as-columns">
        ${(s.key_strengths || []).length ? `<div><h3 class="tp-h3">Key strengths</h3><ul class="as-list">
            ${list(s.key_strengths, 'key_strengths')}
          </ul></div>` : ''}
        ${(s.critical_gaps || []).length ? `<div><h3 class="tp-h3">Critical gaps</h3><ul class="as-list">
            ${list(s.critical_gaps, 'critical_gaps')}
          </ul></div>` : ''}
      </div>` : ''}
      ${has(s.bottom_line) ? `<div class="as-bottom"><strong class="as-bottom-label">Bottom line.</strong> <span${editKey('assessment.executive_summary.bottom_line')}>${text(s.bottom_line)}</span></div>` : ''}
    </section>`;
}

/** One area as a row that opens in place. tactic: { n, title } or null */
export function areaRow(category, cat, tactic) {
  const key = category.key;
  const level = scoreLevel(cat.grade);
  const share = typeof cat.weight === 'number' ? `${Math.round(cat.weight * 100)}%` : '';
  const metrics = (cat.metrics || []).map(m => `<div class="as-num as-num--${['good', 'warning', 'critical'].includes(m.status) ? m.status : 'none'}"><b>${text(m.value)}</b><small>${text(m.label)}</small>${has(m.source) ? `<small class="as-num-source">${text(m.source)}</small>` : ''}</div>`).join('\n              ');
  const findings = (cat.findings || []).map((f, i) => `<span class="as-finding as-finding--${f.type === 'positive' ? 'positive' : 'negative'}"><span class="sr-only">${f.type === 'positive' ? 'Strength: ' : 'Gap: '}</span><span${editKey(`assessment.categories.${key}.findings.${i}`)}>${text(f.text)}</span>${has(f.confidence) ? ` <span class="as-meta">${confidenceWord(f.confidence)}</span>` : ''}</span>`);
  const recs = (cat.recommendations || []).map((r, i) => `<span${editKey(`assessment.categories.${key}.recommendations.${i}`)}>${text(typeof r === 'string' ? r : r.text)}</span>${typeof r === 'object' && has(r.confidence) ? ` <span class="as-meta">${confidenceWord(r.confidence)}</span>` : ''}`);
  const breakdown = Object.entries(cat.breakdown || {}).map(([k, b]) => [words(k), valueText(b && b.value), b && b.score != null ? `${score(b.score)}${has(b.grade) ? ` ${b.grade}` : ''}` : '', b && has(b.source) ? b.source : '']);
  const sources = [...new Set([...(cat.dataSources || []), ...(cat.data_sources || [])])];
  const sourceLine = [sources.length ? `Sources: ${sources.join(', ')}.` : '', confidenceWord(cat.confidence) ? `${confidenceWord(cat.confidence)}.` : ''].filter(Boolean).join(' ');
  return `<div class="as-area" data-area="${key}" id="area-${key}">
          <button type="button" class="as-row" aria-expanded="false" aria-controls="area-${key}-body" onclick="toggleArea(this)">
            <span class="as-row-name">${text(category.title)}</span>
            <span class="as-row-score score score--${levelOf(cat.grade)}">${score(cat.score)}</span>
            <span class="as-row-grade">${text(cat.grade || '')}${level ? `<span class="sr-only"> ${level.word}</span>` : ''}</span>
            <span class="as-bar" aria-hidden="true"><span class="as-bar-fill as-bar-fill--${levelOf(cat.grade)}" style="--pct:${Number(cat.score) || 0}"></span></span>
            <span class="as-row-share">${share}</span>
            <span class="as-row-slot" data-slot="checkin" hidden></span>
            <span class="as-row-slot" data-slot="review" hidden></span>
            <span class="chev" aria-hidden="true"></span>
          </button>
          <div class="as-area-body" id="area-${key}-body" hidden>
            ${has(cat.summary) ? `<p${editKey(`assessment.categories.${key}.summary`)}>${text(cat.summary)}</p>` : ''}
            ${metrics ? `<div class="as-nums">
              ${metrics}
            </div>` : ''}
            ${findings.length || recs.length ? `<div class="as-columns">
              ${findings.length ? `<div><h3 class="tp-h3">What we found</h3>${longList('ul', findings, 'findings', ' as-list--findings')}</div>` : ''}
              ${recs.length ? `<div><h3 class="tp-h3">What we recommend</h3>${longList('ol', recs, 'recommendations')}</div>` : ''}
            </div>` : ''}
            ${breakdown.length ? `<details class="as-breakdown"><summary>How this score was worked out</summary>${plainTable(['Measure', 'Value', 'Score', 'Source'], breakdown, ' as-breakdown-table', text)}</details>` : ''}
            <div class="as-area-foot">
              ${sourceLine ? `<span class="as-meta">${text(sourceLine)}</span>` : '<span></span>'}
              ${tactic ? `<button type="button" class="link-btn" onclick="navigate('tactic${tactic.n}')">In your plan: ${plain(tactic.title)}</button>` : ''}
            </div>
          </div>
        </div>`;
}

export function assessmentQuickWins2(wins) {
  if (!wins.length) return '';
  const rows = wins.map((w, i) => {
    const id = `aqw-p-${i + 1}`;
    const meta = [w.time_estimate, confidenceWord(w.confidence)].filter(has).map(text).join(' · ');
    return `<div class="task-row task-row--win"><input type="checkbox" class="tick" id="${id}" data-qw="aqw-${i + 1}" onchange="onQuickWinTick(this)"><div class="task-body"><label class="task-label task-label--strong" for="${id}"${editKey(`assessment.quick_wins.${i}.task`)}>${text(w.task)}</label>${has(w.impact) ? `<div class="task-sub"${editKey(`assessment.quick_wins.${i}.impact`)}>${text(w.impact)}</div>` : ''}</div>${meta ? `<span class="task-time">${meta}</span>` : ''}</div>`;
  });
  return `<section class="as-card as-card--sage" id="as-quick">
      <div class="dash-card-head">
        <div><h2 class="tp-h2">Quick wins</h2><p>Immediate actions you can complete today.</p></div>
        <div><strong><span data-live="wins-done">0</span> of ${wins.length}</strong> done</div>
      </div>
      ${rows.join('\n      ')}
    </section>`;
}

export function priorityTable(recs) {
  if (!recs.length) return '';
  const rows = recs.map((r, i) => `<tr><th scope="row"${editKey(`assessment.priority_recommendations.${i}.text`)}>${i + 1}. ${text(r.text || r.title)}</th><td>${text(r.category || '')}</td><td>${text(r.time_estimate || '')}</td><td class="as-impact">${text(has(r.impact) ? words(r.impact) : '')}</td><td${editKey(`assessment.priority_recommendations.${i}.expected_result`)}>${text(r.expected_result || '')}</td><td class="as-meta">${text(has(r.confidence) ? words(r.confidence) : '')}</td></tr>`).join('\n            ');
  return `<section class="as-section" id="as-priority">
      <div class="as-divider"><h2 class="tp-h2">Priority recommendations</h2><span class="as-meta">The changes that will make the biggest difference, in order.</span></div>
      <div class="as-card as-card--table">
        <div class="table-scroll">
          <table class="plain-table as-priority">
            <thead><tr><th scope="col">Recommendation</th><th scope="col">Area</th><th scope="col">Time</th><th scope="col">Impact</th><th scope="col">Expected result</th><th scope="col">Confidence</th></tr></thead>
            <tbody>
            ${rows}
            </tbody>
          </table>
        </div>
      </div>
    </section>`;
}

const MARKET_TITLES = { visitor_profile: 'Who visits', discovery_journey: 'How they find you', seasonal_considerations: 'Your seasons', trip_integration: 'Where you fit in a trip' };

export function visitorsAndMarket(ctx) {
  const entries = Object.entries(ctx || {}).filter(([, v]) => has(typeof v === 'string' ? v : valueText(v)));
  if (!entries.length) return '';
  const order = Object.keys(MARKET_TITLES);
  entries.sort((a, b) => (order.indexOf(a[0]) + 1 || 99) - (order.indexOf(b[0]) + 1 || 99));
  return `<section class="as-section" id="as-market">
      <div class="as-divider"><h2 class="tp-h2">Your visitors and market</h2></div>
      <div class="as-market">
        ${entries.map(([k, v]) => `<div class="as-card as-card--tile"><h3 class="tp-h3">${MARKET_TITLES[k] || text(words(k))}</h3><p${editKey(`assessment.tourism_context.${k}`)}>${text(typeof v === 'string' ? v : valueText(v))}</p></div>`).join('\n        ')}
      </div>
    </section>`;
}

/**
 * The whole Assessment page, or '' when there is no assessment.
 * options: { date, areaTactics: { areaKey: { n, title } } }
 */
export function assessmentPage(data, { date, areaTactics = {} } = {}) {
  if (!hasAssessment(data)) return '';
  const categories = ASSESSMENT_CATEGORIES.filter(c => data.categories[c.key]);
  const wins = data.quick_wins || [];
  const recs = data.priority_recommendations || [];
  const level = scoreLevel(data.overall.grade);
  const hasMarket = Object.values(data.tourism_context || {}).some(v => has(typeof v === 'string' ? v : valueText(v)));
  const jumps = [['as-summary', 'Summary'], ['as-areas', `Your ${categories.length === 6 ? 'six' : categories.length} areas`], wins.length && ['as-quick', 'Quick wins'], recs.length && ['as-priority', 'Priority recommendations'], hasMarket && ['as-market', 'Your visitors and market']].filter(Boolean);
  return `<section id="page-assessment" class="page">
  <div class="as">
    <header class="as-head">
      <div class="tp-head-text">
        <h1 class="tp-h1">Your digital marketing assessment</h1>
        ${has(date) ? `<p class="tp-sub">Assessed on ${text(date)}</p>` : ''}
      </div>
      <button type="button" class="btn btn--outline" onclick="downloadPDF()">Download as PDF</button>
    </header>
    <nav class="as-jumps" aria-label="On this page">
      ${jumps.map(([id, label]) => `<a href="#${id}" onclick="return jumpTo('${id}')">${label}</a>`).join('')}
    </nav>
    ${assessmentSummary(data, { level })}
    <section class="as-section" id="as-areas">
      <div class="as-divider"><h2 class="tp-h2">${jumps[1][1]}</h2><span class="as-meta">Open an area to see what we found and what we recommend.</span></div>
      <div class="as-card as-card--list" data-areas>
        <div class="as-row as-row--head" aria-hidden="true"><span>Area</span><span>Score</span><span>Grade</span><span>Where it sits</span><span>Share of total</span><span data-slot="checkin" hidden>30 days</span><span data-slot="review" hidden>90 days</span><span></span></div>
        ${categories.map(c => areaRow(c, data.categories[c.key], areaTactics[c.key] || null)).join('\n        ')}
      </div>
      <span class="sample-badge" data-sample-only hidden>Sample scores for review</span>
      <div class="as-slots" data-checkin-slots>
        <div class="as-slot" data-slot-note="checkin"><strong>30-day check-in</strong><span class="as-meta">Your new scores will appear as a second column beside these.</span></div>
        <div class="as-slot" data-slot-note="review"><strong>90-day review</strong><span class="as-meta">Your final scores will appear as a third column.</span></div>
      </div>
    </section>
    ${assessmentQuickWins2(wins)}
    ${priorityTable(recs)}
    ${visitorsAndMarket(data.tourism_context)}
  </div>
</section>`;
}

export function navAssessment() {
  return `<button type="button" class="nav-item" data-page="assessment" onclick="navigate('assessment')">Assessment</button>`;
}
