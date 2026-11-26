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
 * phases, totals, grid columns, which actions count towards which
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

export function tourSteps(days, hasQuickWins) {
  const sections = `your tactics, your ${days}-day roadmap and your materials`;
  return [
    { targetId: 'sidebar', mobileTargetId: 'nav-hamburger', page: 'dashboard', title: 'Find your way around', desc: `Use the menu on the left to move between sections: ${sections}. The small ring beside each tactic fills as you tick off its tasks.`, mobileDesc: `Tap the menu icon to move between sections: ${sections}.`, pos: 'right', pad: 0, mobilePos: 'below' },
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
 * Which tactic each step, week and action belongs to (DESIGN-BRIEF.md section 7).
 * Tasks are the roadmap's actions. An action counts towards the tactic its
 * "how to" points into; an action with no link, or a link to the quick wins,
 * counts towards the overall total only. A week's main tactic is the one most
 * of its actions point to; a week with no links keeps the previous week's.
 */
export function mapProgress(content) {
  const stepTactic = new Map();
  allSteps(content).forEach(({ step, tactic }) => stepTactic.set(step.id, content.tactics.indexOf(tactic) + 1));
  const tacticCount = content.tactics.length;
  const byTactic = Object.fromEntries(content.tactics.map((_, i) => [i + 1, []]));
  const weekTactic = {};
  let previous = 1;
  for (const week of content.roadmap.weeks) {
    const counts = {};
    const order = [];
    week.actions.forEach(a => {
      const t = stepTactic.get(a.how_to);
      if (!t) return;
      byTactic[t].push(a.id);
      if (!counts[t]) order.push(t);
      counts[t] = (counts[t] || 0) + 1;
    });
    const main = order.length ? order.reduce((best, t) => (counts[t] > counts[best] ? t : best), order[0]) : previous;
    weekTactic[week.number] = main;
    previous = main;
  }
  return { stepTactic, byTactic, weekTactic, tacticCount };
}

const joinWords = list => (list.length > 1 ? `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}` : list.join(''));

/** "3 actions, from Social Media and your quick wins" */
export function weekSummary(week, stepTactic, tactics) {
  const from = [];
  week.actions.forEach(a => {
    const t = stepTactic.get(a.how_to);
    const name = t ? (tactics[t - 1].short_label || tactics[t - 1].title) : (a.how_to === 'quick_wins' ? 'your quick wins' : null);
    if (name && !from.includes(name)) from.push(name);
  });
  const n = week.actions.length;
  return `${n} action${n === 1 ? '' : 's'}${from.length ? `, from ${joinWords(from)}` : ''}`;
}

/** The assessment numbers the dashboard needs, or null without an assessment. */
export function assessmentSummary(assessment) {
  if (!C.hasAssessment(assessment)) return null;
  const areas = {};
  C.ASSESSMENT_CATEGORIES.forEach(c => {
    const cat = assessment.categories[c.key];
    if (cat) areas[c.key] = { name: c.title, score: Math.round(Number(cat.score)), grade: cat.grade || '' };
  });
  return { overall: { score: Math.round(Number(assessment.overall.score)), grade: assessment.overall.grade || '' }, areas, quickWins: (assessment.quick_wins || []).length };
}

/** The data the page script needs, all computed from the content. */
export function pageData(content, assessment) {
  const { client, program, roadmap, phases, tactics } = content;
  const { stepTactic, byTactic, weekTactic } = mapProgress(content);
  const days = programDays(program.weeks);
  const hasQuickWins = ((content.quick_wins || {}).groups || []).length > 0;
  const voice = content.voice || {};
  const tour = tourSteps(days, hasQuickWins).map((s, i) => (has(voice.tour && voice.tour[i]) ? { ...s, desc: voice.tour[i], mobileDesc: voice.tour[i] } : s));
  const actionsIn = weeks => weeks.flatMap(w => w.actions.map(a => a.id));
  return {
    slug: client.slug,
    name: client.name,
    sandbox: !!(client.flags && client.flags.sandbox),
    hasPlan: tactics.length > 0 && roadmap.weeks.some(w => w.actions.length > 0),
    totalWeeks: program.weeks,
    totalDays: days,
    welcome: has(content.strategy.welcome_message) ? stripText(content.strategy.welcome_message) : null,
    tasks: {
      all: actionsIn(roadmap.weeks),
      byWeek: Object.fromEntries(roadmap.weeks.map(w => [w.number, w.actions.map(a => a.id)])),
      byPhase: Object.fromEntries(phases.map((p, i) => [i + 1, actionsIn(roadmap.weeks.filter(w => w.number >= p.weeks[0] && w.number <= p.weeks[1]))])),
      byTactic
    },
    weekList: roadmap.weeks.map(w => ({ number: w.number, actions: w.actions.map(a => a.id) })),
    weeks: Object.fromEntries(roadmap.weeks.map(w => [w.number, {
      id: w.id,
      title: stripText(w.title),
      tactic: weekTactic[w.number],
      summary: weekSummary(w, stepTactic, tactics)
    }])),
    actions: Object.fromEntries(roadmap.weeks.flatMap(w => w.actions.map(a => [a.id, { text: stripText(a.text), week: w.number, tactic: stepTactic.get(a.how_to) || null }]))),
    tactics: tactics.map((t, i) => ({ num: i + 1, id: t.id, name: t.short_label || t.title, title: t.title })),
    phases: phases.map((p, i) => ({ num: i + 1, name: p.name, weeks: Array.from({ length: p.weeks[1] - p.weeks[0] + 1 }, (_, k) => p.weeks[0] + k) })),
    steps: Object.fromEntries([...stepTactic.entries()]),
    stepNumbers: stepNumbers(content),
    assessment: assessmentSummary(assessment),
    // Check-in and review scores (30 and 90 days) are not stored yet (CUTOVER.md)
    checkins: null,
    tour
  };
}

/** step ID -> its number within its tactic, as the tactic page numbers it */
function stepNumbers(content) {
  const out = {};
  content.tactics.forEach(t => { let n = 0; t.parts.forEach(p => p.steps.forEach(st => { n += 1; out[st.id] = n; })); });
  return out;
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
  const data = pageData(content, options.assessment);
  const { client, strategy, phases, objectives, tactics, roadmap } = content;
  const qw = content.quick_wins || { groups: [] };
  const hasQuickWins = (qw.groups || []).length > 0;
  const days = data.totalDays;
  const tacticNumber = new Map(tactics.map((t, i) => [t.id, i + 1]));
  const stepNumber = new Map();
  const stepById = new Map();
  tactics.forEach((t, ti) => { let n = 0; t.parts.forEach(p => p.steps.forEach(s => { n += 1; stepNumber.set(s.id, { tactic: ti + 1, number: n }); stepById.set(s.id, s); })); });

  // Roadmap: weeks grouped by phase. "How to" previews show the linked
  // step's first two bullets.
  const previewOf = st => {
    const block = (st.body || []).find(b => b.type === 'bullets' && (b.items || []).length);
    return block ? block.items.slice(0, 2).map(i => i.text) : [];
  };
  const linkFor = action => {
    if (action.how_to === 'quick_wins') return hasQuickWins ? 'quick_wins' : null;
    const s = stepNumber.get(action.how_to);
    if (!s) return null;
    const t = tactics[s.tactic - 1];
    return { tactic: s.tactic, stepId: action.how_to, tacticName: t.short_label || t.title, preview: previewOf(stepById.get(action.how_to)) };
  };
  // Each step's weeks on the roadmap, for "On your roadmap in week N"
  const stepWeeks = new Map();
  roadmap.weeks.forEach(w => w.actions.forEach(a => {
    if (!stepNumber.has(a.how_to)) return;
    const list = stepWeeks.get(a.how_to) || [];
    if (!list.includes(w.number)) list.push(w.number);
    stepWeeks.set(a.how_to, list);
  }));
  const links = Object.fromEntries(roadmap.weeks.map(w => [w.number, w.actions.map(linkFor)]));
  const roadmapPhases = phases.map((p, i) => {
    const weeks = roadmap.weeks.filter(w => w.number >= p.weeks[0] && w.number <= p.weeks[1]);
    const html = weeks.map(w => C.weekCard(w, links[w.number], { first: w.number === roadmap.weeks[0].number })).join('\n');
    return C.phaseBlock(p, i + 1, html, data.tasks.byPhase[i + 1].length);
  }).join('\n\n    ');

  // Positioning: paragraphs, then the statement under its label (as v1 shows a blockquote)
  let positioning = C.paragraphs(strategy.positioning);
  if (has(strategy.positioning_statement)) positioning += `${positioning ? '<br><br>' : ''}<strong>Your Strategic Positioning</strong><br>${C.md(strategy.positioning_statement)}`;

  const printPhases = phases.map(p => `${C.plain(p.name)} (Weeks ${p.weeks[0]}-${p.weeks[1]})`);
  const printPhaseText = printPhases.length > 1 ? `${printPhases.slice(0, -1).join(', ')}, and ${printPhases[printPhases.length - 1]}` : printPhases.join('');
  const pageDataJson = JSON.stringify(data).replace(/</g, '\\u003c');
  const goal = C.paragraphs(strategy.goal);

  const values = {
    DASHBOARD: C.dashboard({ content, data, links, assessment: options.assessment, days }),
    STAGE_SWITCHER: data.sandbox ? C.stageSwitcher() : '',
    ASSET_BASE: C.attr(assetBase),
    CLIENT_SLUG: C.attr(client.slug),
    CLIENT_NAME: C.attr(client.name),
    COHORT_START: C.attr(client.cohort_start || ''),
    PROGRAM_DAYS: String(days),
    PROGRAM_WEEKS: String(content.program.weeks),
    TOTAL_TASKS: String(data.tasks.all.length),
    NAV_TACTICS: tactics.map((t, i) => C.navTactic(t, i + 1, data.tasks.byTactic[i + 1].length)).join('\n      '),
    NAV_COACH: C.navCoach(client.coach_email),
    NAV_ASSESSMENT: C.hasAssessment(options.assessment) ? C.navAssessment() : '',
    MATERIALS_ASSESSMENT: C.hasAssessment(options.assessment) ? `<div class="materials-item">
      <div><h2>Assessment report</h2><p>Your digital marketing assessment as a document to print or save as a PDF.</p></div>
      <button type="button" class="materials-btn" onclick="downloadPDF()">Download PDF</button>
    </div>` : '',
    ASSESSMENT_PAGE: C.assessmentPage(options.assessment, { date: formatDate(client.cohort_start) }),
    PHASE_COUNT_WORD: NUMBER_WORDS[phases.length] || String(phases.length),
    TACTIC_COUNT: String(tactics.length),
    GOAL: goal,
    POSITIONING: positioning,
    OBJECTIVES: objectives.map((o, i) => C.objectiveCard(o, i + 1, tacticNumber.get(o.tactic))).join('\n        '),
    TACTIC_OVERVIEW_CARDS: tactics.map((t, i) => C.tacticOverviewCard(t, i + 1)).join('\n        '),
    TACTIC_PAGES: tactics.map((t, i) => C.tacticPage(t, i + 1, { assetUrl, total: data.tasks.byTactic[i + 1].length, stepWeeks, next: tactics[i + 1] ? { n: i + 2, title: tactics[i + 1].title } : null })).join('\n\n'),
    PRINT_COHORT_START: client.cohort_start ? `<strong>Cohort Start:</strong> ${formatDate(client.cohort_start)}<br>\n          ` : '',
    PRINT_PHASES: printPhaseText,
    ROADMAP_PHASES: roadmapPhases,
    ROADMAP_CLOSING: has(roadmap.closing) ? `<div class="rm-closing" data-editable-key="roadmap.closing">${C.md(roadmap.closing)}</div>` : '',
    GBP_WINS: C.gbpWins(qw),
    PRINT_FOOTER: has(client.coach_email) ? `<div class="print-only print-footer">
      <div class="print-footer-brand">Junction</div>
      <div class="print-footer-contact">
        <strong>Questions?</strong> Contact your coach at ${C.attr(client.coach_email)}
      </div>
    </div>` : '',
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
    for (const a of w.actions) if ((html.match(new RegExp(`data-key="${a.id}"`, 'g')) || []).length !== 1) problems.push(`Action ${a.id} needs exactly one saved tick box`);
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
