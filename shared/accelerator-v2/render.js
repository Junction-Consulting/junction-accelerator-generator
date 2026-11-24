/**
 * The v2 generator: content.json in, dashboard HTML out.
 *
 *   renderDashboard(content, { template, assetUrl, assetBase, assessment })
 *     -> { html, data, problems }
 *
 * - template:  the text of template/v2/accelerator.html
 * - assetUrl:  (assetId) -> URL of a media file (the media library)
 * - assetBase: URL of the shared v2 stylesheet and scripts (default /assets/v2)
 * - assessment: the client's assessment data (assessment_data of its
 *   client_assessments record in Supabase). Without one, there is no
 *   Assessment page.
 *
 * Everything that can be counted is computed from the content: tactics,
 * phases, totals, grid columns, which checklist items count towards which
 * tactic. Optional content that is missing is left out, never replaced by
 * default text.
 *
 * Pure: no filesystem, network or environment.
 */

import * as C from './components.js';
import { allSteps } from './checks.js';
import { stripMarkdown } from '../plan-generator.js';

// The text a label shows once the page script reads it back (Markdown and [CONFIRM: ] markers removed)
const stripText = text => stripMarkdown(String(text || '')).replace(/\[CONFIRM: ([^\]]*)\]/g, (m, inner) => inner);

const has = text => typeof text === 'string' && text.trim() !== '';
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** The program's length in days, as the program names it: 12 weeks is the "90-day" accelerator. */
export function programDays(weeks) {
  return weeks === 12 ? 90 : weeks * 7;
}

export function formatDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

// Neutral program wording, used when content.voice does not give its own.
export const PROGRESS_HEADLINES = [
  { max: 10, headline: 'Getting started', subcopy: "You're in the first phase of your accelerator. Keep checking items off your roadmap to move forward." },
  { max: 25, headline: 'Building momentum', subcopy: "You've made solid progress on the early weeks. Keep the pace going." },
  { max: 50, headline: 'Halfway there', subcopy: "You're closing in on the halfway mark. The work you've done so far is the base for everything that follows." },
  { max: 75, headline: 'The home stretch', subcopy: 'Impressive progress. Most of the plan is behind you. Keep working through the remaining weeks.' },
  { max: 99, headline: 'Almost there', subcopy: 'Just a few more items to check off. Finish strong.' },
  { max: 100, headline: 'You did it', subcopy: 'Every week is complete. Take a moment to look back at how much you\'ve put in place.' }
];

export function tourSteps(days, hasQuickWins) {
  const sections = hasQuickWins ? `tactics, your ${days}-day roadmap, and quick wins` : `tactics and your ${days}-day roadmap`;
  return [
    { targetId: 'sidebar', mobileTargetId: 'nav-hamburger', page: 'dashboard', title: 'Navigate Your Plan', desc: `Use the sidebar to move between sections: ${sections}. Your progress is always visible at the top.`, mobileDesc: `Tap the menu icon to move between sections: ${sections}.`, pos: 'right', pad: 0, mobilePos: 'below' },
    { targetId: 'goal-section', page: 'dashboard', title: 'Your Progress Overview', desc: `This shows your overall completion and which phase of the ${days}-day plan you are in. The ring fills as you check off tasks.`, pos: 'below', pad: 8 },
    { targetId: 'objectives-section', mobileTargetId: 'next-step-main', page: 'dashboard', title: 'Your Next Step', desc: 'This card shows exactly what to focus on right now. It updates automatically as you complete tasks in the roadmap.', pos: 'below', pad: 8 },
    { targetId: 'tactic-cards-section', page: 'dashboard', title: 'Track Each Tactic', desc: 'These cards show progress on each of your tactics. Click a card to open its detailed guide and implementation steps.', mobileDesc: 'These cards show progress on each of your tactics. Tap a card to open its detailed guide and implementation steps.', pos: 'below', pad: 8 },
    { targetId: 'nav-roadmap', mobileTargetId: 'roadmap-page-header', page: 'dashboard', mobilePage: 'roadmap', title: 'Your Week-by-Week Action Plan', desc: `The ${days}-Day Roadmap is your primary tracker. Each week shows exactly what to do and how to confirm it's done.`, pos: 'right', pad: 8, mobilePos: 'below' },
    { targetId: 'wc-1', mobileTargetId: 'w1-checklist', page: 'roadmap', weekToOpen: 1, title: 'Check Off Tasks as You Go', desc: 'Each week has a completion checklist on the right. Check off each item as you finish it. Your progress saves automatically.', pos: 'below', pad: 8 },
    { targetId: 'w1-howto-example', page: 'roadmap', weekToOpen: 1, title: '"How To" Links', desc: 'Tap "how to" next to any action to jump straight to the step-by-step guide in the tactics section: exactly what to click, type, and verify.', pos: 'below', pad: 8 },
    { targetId: 'w1-note-example', page: 'roadmap', weekToOpen: 1, title: 'Notes on Every Task', desc: 'Tap the pencil icon on any checklist item to add a personal note: a reminder, a date, a decision. Notes save automatically and are here every time you return.', pos: 'below', pad: 8 }
  ];
}

/**
 * Which tactic each step, week and checklist item belongs to.
 * Each checklist item counts towards exactly one tactic: the one stored on
 * it (see assignChecklistTactics in convert.js). A week's main tactic (for
 * the Next Step card) is the one most of its actions point to; a week with
 * no links keeps the previous week's.
 */
export function mapProgress(content) {
  const stepTactic = new Map();
  allSteps(content).forEach(({ step, tactic }) => stepTactic.set(step.id, content.tactics.indexOf(tactic) + 1));
  const tacticNumber = new Map(content.tactics.map((t, i) => [t.id, i + 1]));
  const tacticCount = content.tactics.length;
  const byTactic = Object.fromEntries(content.tactics.map((_, i) => [i + 1, []]));
  const weekTactic = {};
  let previous = 1;
  for (const week of content.roadmap.weeks) {
    week.checklist.forEach(c => {
      const t = tacticNumber.get(c.tactic);
      if (t) byTactic[t].push(c.id);
    });
    const counts = {};
    const order = [];
    week.actions.forEach(a => {
      const t = stepTactic.get(a.how_to);
      if (!t) return;
      if (!counts[t]) order.push(t);
      counts[t] = (counts[t] || 0) + 1;
    });
    const main = order.length ? order.reduce((best, t) => (counts[t] > counts[best] ? t : best), order[0]) : previous;
    weekTactic[week.number] = main;
    previous = main;
  }
  return { stepTactic, byTactic, weekTactic, tacticCount };
}

/** The data the page script needs, all computed from the content. */
export function pageData(content) {
  const { client, program, roadmap, phases, tactics } = content;
  const { stepTactic, byTactic, weekTactic } = mapProgress(content);
  const days = programDays(program.weeks);
  const hasQuickWins = ((content.quick_wins || {}).groups || []).length > 0;
  const voice = content.voice || {};
  const tour = tourSteps(days, hasQuickWins).map((s, i) => (has(voice.tour && voice.tour[i]) ? { ...s, desc: voice.tour[i], mobileDesc: voice.tour[i] } : s));
  const headlines = PROGRESS_HEADLINES.map((h, i) => {
    const v = voice.progress_headlines && voice.progress_headlines[i];
    return v && typeof v === 'object' ? { ...h, ...v } : h;
  });
  return {
    slug: client.slug,
    totalWeeks: program.weeks,
    totalDays: days,
    checks: {
      all: roadmap.weeks.flatMap(w => w.checklist.map(c => c.id)),
      byWeek: Object.fromEntries(roadmap.weeks.map(w => [w.number, w.checklist.map(c => c.id)])),
      byPhase: Object.fromEntries(phases.map((p, i) => [i + 1, roadmap.weeks.filter(w => w.number >= p.weeks[0] && w.number <= p.weeks[1]).flatMap(w => w.checklist.map(c => c.id))])),
      byTactic
    },
    weeks: Object.fromEntries(roadmap.weeks.map(w => [w.number, {
      id: w.id,
      title: w.title,
      tactic: weekTactic[w.number],
      timeNeeded: w.next_step && has(w.next_step.time_needed) ? w.next_step.time_needed : null,
      who: w.next_step && has(w.next_step.who) ? w.next_step.who : null
    }])),
    tactics: tactics.map((t, i) => ({ num: i + 1, id: t.id, name: t.short_label || t.title })),
    phases: phases.map((p, i) => ({ num: i + 1, name: p.name, weeks: Array.from({ length: p.weeks[1] - p.weeks[0] + 1 }, (_, k) => p.weeks[0] + k) })),
    steps: Object.fromEntries([...stepTactic.entries()]),
    headlines,
    tour
  };
}

function fill(template, values) {
  const problems = [];
  const html = template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, name) => {
    if (!(name in values)) { problems.push(`The template has {{${name}}}, which the generator does not fill.`); return ''; }
    return values[name];
  });
  return { html, problems };
}

export function renderDashboard(content, options = {}) {
  const { template } = options;
  if (!template) throw new Error('renderDashboard needs the template text');
  const assetBase = options.assetBase || '/assets/v2';
  const assetUrl = options.assetUrl || (id => `/clients/${content.client.slug}/assets/${id}`);
  const data = pageData(content);
  const { client, strategy, phases, objectives, tactics, roadmap } = content;
  const qw = content.quick_wins || { groups: [] };
  const hasQuickWins = (qw.groups || []).length > 0;
  const days = data.totalDays;
  const tacticNumber = new Map(tactics.map((t, i) => [t.id, i + 1]));
  const stepNumber = new Map();
  tactics.forEach((t, ti) => { let n = 0; t.parts.forEach(p => p.steps.forEach(s => { n += 1; stepNumber.set(s.id, { tactic: ti + 1, number: n }); })); });

  // Roadmap: weeks grouped by phase
  const linkFor = action => {
    if (action.how_to === 'quick_wins') return hasQuickWins ? 'quick_wins' : null;
    const s = stepNumber.get(action.how_to);
    return s ? { tactic: s.tactic, stepId: action.how_to } : null;
  };
  const roadmapPhases = phases.map((p, i) => {
    const weeks = roadmap.weeks.filter(w => w.number >= p.weeks[0] && w.number <= p.weeks[1]);
    const html = weeks.map(w => C.weekCard(w, w.actions.map(linkFor), { first: w.number === roadmap.weeks[0].number })).join('\n');
    return C.phaseBlock(p, i + 1, html, data.checks.byPhase[i + 1].length);
  }).join('\n\n    ');

  // Positioning: paragraphs, then the statement under its label (as v1 shows a blockquote)
  let positioning = C.paragraphs(strategy.positioning);
  if (has(strategy.positioning_statement)) positioning += `${positioning ? '<br><br>' : ''}<strong>Your Strategic Positioning</strong><br>${C.md(strategy.positioning_statement)}`;

  const quickWinsPage = hasQuickWins ? `<section id="page-gbp" class="page">
  <div class="page-header">
    <div class="page-header-eyebrow">Quick-Hit Recommendations</div>
    <h1>Quick Wins</h1>
    <p>Short, self-contained improvements. Each one stands alone, so they can be done in any order.</p>
  </div>
  <div class="content-area">
    ${has(qw.intro) ? `<p class="qw-intro" data-editable-key="quick_wins.intro">${C.md(qw.intro)}</p>` : ''}
    ${qw.groups.map(C.quickWinGroup).join('\n')}
    ${C.quickWinsNote(qw.note)}
  </div>
</section>` : '';

  const navQuickWins = hasQuickWins ? `<div class="nav-item" data-page="gbp" onclick="navigate('gbp')">
      <svg class="nav-icon" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd"/></svg>
      Quick Wins
    </div>` : '';

  const printPhases = phases.map(p => `${C.plain(p.name)} (Weeks ${p.weeks[0]}-${p.weeks[1]})`);
  const printPhaseText = printPhases.length > 1 ? `${printPhases.slice(0, -1).join(', ')}, and ${printPhases[printPhases.length - 1]}` : printPhases.join('');
  const pageDataJson = JSON.stringify(data).replace(/</g, '\\u003c');
  const goal = C.paragraphs(strategy.goal);

  // The Next Step card as it first shows, before any item is ticked. The page
  // script recalculates it from saved progress.
  const firstWeek = roadmap.weeks[0];
  const firstInfo = data.weeks[firstWeek.number];
  const firstTactic = data.tactics[firstInfo.tactic - 1];
  const nextTasks = firstWeek.checklist.slice(0, 4).map(c => `<div class="dash-next-task" data-key="${C.attr(c.id)}"><div class="dash-next-task-box"><svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,6 4.5,9 10.5,3"/></svg></div><span class="dash-next-task-text">${C.attr(stripText(c.text))}</span></div>`).join('');

  const values = {
    NEXT_EYEBROW: C.attr(`YOUR NEXT STEP · WEEK ${firstWeek.number} OF ${content.program.weeks} · ${firstWeek.title}`),
    NEXT_TITLE: C.attr(stripText(firstWeek.checklist[0] ? firstWeek.checklist[0].text : '')),
    NEXT_TASKS: nextTasks,
    NEXT_TACTIC: C.attr(firstTactic ? firstTactic.name : ''),
    NEXT_TACTIC_NUM: String(firstTactic ? firstTactic.num : 1),
    NEXT_TIME: C.attr(firstInfo.timeNeeded || ''),
    NEXT_TIME_HIDDEN: firstInfo.timeNeeded ? '' : ' hidden',
    NEXT_WHO: C.attr(firstInfo.who || ''),
    NEXT_WHO_HIDDEN: firstInfo.who ? '' : ' hidden',
    NEXT_WEEK: String(firstWeek.number),
    NEXT_TASK_COUNT: String(firstWeek.checklist.length),
    ASSET_BASE: C.attr(assetBase),
    CLIENT_SLUG: C.attr(client.slug),
    CLIENT_NAME: C.attr(client.name),
    COHORT_START: C.attr(client.cohort_start || ''),
    PROGRAM_DAYS: String(days),
    PROGRAM_WEEKS: String(content.program.weeks),
    TOTAL_TASKS: String(data.checks.all.length),
    FIRST_HEADLINE: C.attr(data.headlines[0].headline),
    FIRST_SUBCOPY: C.attr(data.headlines[0].subcopy),
    NAV_TACTICS: tactics.map((t, i) => C.navTactic(t, i + 1)).join('\n    '),
    NAV_QUICK_WINS: navQuickWins,
    NAV_ASSESSMENT: C.hasAssessment(options.assessment) ? C.navAssessment() : '',
    ASSESSMENT_PAGE: C.assessmentPage(options.assessment, { date: formatDate(client.cohort_start) }),
    PHASE_COUNT: String(phases.length),
    PHASE_COUNT_WORD: NUMBER_WORDS[phases.length] || String(phases.length),
    DASHBOARD_PHASES: phases.map((p, i) => C.phaseCard(p, i + 1)).join('\n          '),
    TACTIC_COUNT: String(tactics.length),
    TACTIC_PILLS: tactics.map((t, i) => C.tacticPill(t, i + 1, data.checks.byTactic[i + 1].length)).join('\n      '),
    GOAL: goal,
    POSITIONING: positioning,
    OBJECTIVES: objectives.map((o, i) => C.objectiveCard(o, i + 1, tacticNumber.get(o.tactic))).join('\n        '),
    TACTIC_OVERVIEW_CARDS: tactics.map((t, i) => C.tacticOverviewCard(t, i + 1)).join('\n        '),
    TACTIC_PAGES: tactics.map((t, i) => C.tacticPage(t, i + 1, assetUrl)).join('\n\n'),
    PRINT_COHORT_START: client.cohort_start ? `<strong>Cohort Start:</strong> ${formatDate(client.cohort_start)}<br>\n          ` : '',
    PRINT_PHASES: printPhaseText,
    ROADMAP_PHASES: roadmapPhases,
    ROADMAP_CLOSING: has(roadmap.closing) ? `<div class="callout callout-roadmap" data-editable-key="roadmap.closing">${C.md(roadmap.closing)}</div>` : '',
    PRINT_FOOTER: has(client.coach_email) ? `<div class="print-only print-footer">
      <div class="print-footer-brand">e<span>Learning</span>U</div>
      <div class="print-footer-contact">
        <strong>Questions?</strong> Contact your coach at ${C.attr(client.coach_email)}
      </div>
    </div>` : '',
    QUICK_WINS_PAGE: quickWinsPage,
    WELCOME_MESSAGE: has(strategy.welcome_message) ? `<p class="wm-subline">${C.md(strategy.welcome_message)}</p>` : '',
    PAGE_DATA: pageDataJson
  };
  const { html, problems } = fill(template, values);
  return { html, data, problems };
}

/** Structural checks on a generated page. An empty list means it is consistent. */
export function validateDashboardV2(html, content) {
  const problems = [];
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const seen = new Set();
  ids.forEach(id => { if (seen.has(id)) problems.push(`Duplicate id="${id}"`); seen.add(id); });
  const keys = [...html.matchAll(/data-editable-key="([^"]+)"/g)].map(m => m[1]);
  const seenKeys = new Set();
  keys.forEach(k => { if (seenKeys.has(k)) problems.push(`Duplicate data-editable-key="${k}"`); seenKeys.add(k); });
  for (const w of content.roadmap.weeks) {
    if (!html.includes(`data-week="${w.number}"`)) problems.push(`Week ${w.number} has no data-week container`);
    for (const c of w.checklist) if (!html.includes(`data-key="${c.id}"`)) problems.push(`Checklist item ${c.id} has no checkbox`);
  }
  for (const m of html.matchAll(/howToLink\('tactic(\d+)','([^']+)'\)/g)) {
    if (!seen.has(m[2])) problems.push(`"how to" points at ${m[2]}, which is not on the page`);
    if (!seen.has(`page-tactic${m[1]}`)) problems.push(`"how to" opens tactic ${m[1]}, which is not on the page`);
  }
  if (/\{\{[A-Z0-9_]+\}\}/.test(html)) problems.push('A template slot is unfilled');
  if (!html.includes('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>')) problems.push('The Supabase SDK is missing from <head>');
  const order = ['/shared/supabase-client.js', '/shared/auth.js', '/shared/progress.js'].map(s => html.indexOf(`<script src="${s}">`));
  if (order.some(i => i === -1) || order[0] > order[1] || order[1] > order[2]) problems.push('The shared scripts are missing or out of order');
  return problems;
}
