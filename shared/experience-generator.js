/**
 * Experience dashboard generator: turns an Experience Design plan.md
 * (PLAN_FORMAT_EXPERIENCE.md) into a dashboard (index.html) and plan.json.
 *
 * Used by:
 *   - netlify/functions/create-experience-project.js
 *   - tests/experience-generator.test.js
 *
 * Experience plans have the same shape as accelerator plans with different
 * names ("Track" for "Tactic", "Launch Roadmap" for "90-Day Roadmap"), so
 * the Markdown is parsed by the accelerator parser in shared/plan-generator.js
 * after those names are normalised. Only the experience-specific sections
 * (The Experience, Price Point, Launch Target, Bookability Checklist) are
 * parsed here. The HTML is rendered here because the experience template
 * uses different markup from the accelerator template.
 *
 * This module is pure: no network, no filesystem, no environment variables.
 */

import { parsePlanMd as parseAcceleratorPlanMd, normalisePlanMd, escapeHtml, stripMarkdown, plainText, inlineMarkdown, richText } from './plan-generator.js';

const CHECK_SVG = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>';
const NOTE_SVG = '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>';
const CHEVRON_SVG = '<svg class="section-block-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';
const WEEK_CHEVRON_SVG = '<svg class="week-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';

// ═══════════════════════════════════════════════════════════════════════════
// PLAN.MD PARSER (Experience format)
// ═══════════════════════════════════════════════════════════════════════════

function parseExperiencePlanMd(content) {
  try {
    const text = normalisePlanMd(content);

    if (!/^## Track \d+:/m.test(text)) {
      return { error: 'Missing "## Track N:" sections. Experience plans use "## Track 1:", "## Track 2:" and "## Track 3:".' };
    }

    // ── Experience-only sections ───────────────────────────────────────────
    const meta = (text.match(/## Meta\n([\s\S]*?)(?=\n## )/) || [])[1] || '';
    const metaValue = label => {
      const m = meta.match(new RegExp(`^${label}:\\s*(.+)$`, 'm'));
      return m ? m[1].trim() : null;
    };
    const pricePoint = metaValue('Price Point');
    const launchTarget = metaValue('Launch Target');
    const hasBookabilityChecklist = (metaValue('Has Bookability Checklist') || '').toLowerCase() === 'yes';

    const experienceMatch = text.match(/## The Experience\n+([\s\S]*?)(?=\n---|\n## |$)/);
    const experienceSentence = experienceMatch ? experienceMatch[1].trim() : '';

    // Bookability Checklist: "### Title" followed by a description
    const bookabilityItems = [];
    const bookabilityMatch = text.match(/\n## Bookability Checklist\n([\s\S]*?)(?=\n## |$)/);
    if (bookabilityMatch) {
      for (const block of bookabilityMatch[1].split(/\n(?=### )/)) {
        const m = block.match(/^\s*### (.+)\n([\s\S]*)$/);
        if (!m) continue;
        const description = m[2].split('\n').map(l => l.trim()).filter(l => l && !/^-{3,}$/.test(l)).join(' ');
        bookabilityItems.push({ title: m[1].trim(), description });
      }
    }

    // After Launch: milestones that come once bookings are open, same shape
    const afterLaunchItems = [];
    const afterLaunchMatch = text.match(/\n## After Launch\n([\s\S]*?)(?=\n## |$)/);
    if (afterLaunchMatch) {
      for (const block of afterLaunchMatch[1].split(/\n(?=### )/)) {
        const m = block.match(/^\s*### (.+)\n?([\s\S]*)$/);
        if (!m) continue;
        const description = m[2].split('\n').map(l => l.trim()).filter(l => l && !/^-{3,}$/.test(l)).join(' ');
        afterLaunchItems.push({ title: m[1].trim(), description });
      }
    }

    // Goal at a Glance: up to five "- value | label" lines for the strategy page
    const goalTiles = [];
    const tilesMatch = text.match(/\n## Goal at a Glance\n([\s\S]*?)(?=\n## |$)/);
    if (tilesMatch) {
      for (const line of tilesMatch[1].split('\n')) {
        const m = line.match(/^\s*-\s+([^|]+?)\s*\|\s*(.+?)\s*$/);
        if (m && goalTiles.length < MAX_GOAL_TILES) goalTiles.push({ value: m[1].trim(), label: m[2].trim() });
      }
    }

    // ── Shared structure: parse with the accelerator parser ────────────────
    let normalised = text;
    for (const match of [bookabilityMatch, afterLaunchMatch, tilesMatch]) {
      if (match) normalised = normalised.replace(match[0], '\n');
    }
    normalised = normalised
      .replace(/^## Track (\d+):/gm, '## Tactic $1:')
      .replace(/^Track Pill:/gm, 'Tactic Pill:')
      .replace(/^## Launch Roadmap\s*$/m, '## 90-Day Roadmap')
      .replace(/^Phase ([123]) Name:/gm, 'Month $1 Name:')
      .replace(/→ links to: Track (\d+)/g, '→ links to: Tactic $1');

    const base = parseAcceleratorPlanMd(normalised, { minWeeks: MIN_WEEKS });
    if (base.error) {
      return { error: base.error.replace(/tactics/g, 'tracks').replace(/Tactic/g, 'Track') };
    }

    // A launch roadmap runs 8 to 12 weeks, numbered from 1 with none missing
    const weeks = [...base.roadmap.weeks].sort((a, b) => a.number - b.number);
    if (weeks.length > MAX_WEEKS) {
      return { error: `Found ${weeks.length} weeks, expected ${MIN_WEEKS} to ${MAX_WEEKS}` };
    }
    const outOfSequence = weeks.find((w, i) => w.number !== i + 1);
    if (outOfSequence) {
      return { error: `Roadmap weeks must be numbered 1 to ${weeks.length} with none missing or repeated (found Week ${outOfSequence.number} in position ${weeks.indexOf(outOfSequence) + 1})` };
    }

    // The roadmap is shown in three phases, one per track. Weeks are shared
    // out evenly unless the plan says where Phase 2 and Phase 3 start.
    const phaseStart = n => {
      const m = text.match(new RegExp(`^(?:Phase|Month) ${n} Starts:\\s*(?:Week\\s*)?(\\d+)`, 'mi'));
      return m ? Number(m[1]) : null;
    };
    const phaseWeeks = splitIntoPhases(weeks.length, phaseStart(2), phaseStart(3));

    // Column headings of each track's Success Metrics table, as written
    const metricsHeaders = normalised
      .split(/\n(?=## Tactic \d+:)/)
      .filter(section => /^## Tactic \d+:/.test(section))
      .map(section => {
        const m = section.match(/### Success Metrics[\r\n]+\|([^\n]+)\|[ \t]*[\r\n]+\|[-|:\s]+\|/);
        const cells = m ? m[1].split('|').map(c => c.trim()) : [];
        return cells.length >= 4 ? cells.slice(0, 4) : DEFAULT_METRICS_HEADER;
      });

    return {
      meta: base.meta,
      goal: base.goal,
      experienceSentence,
      strategicPositioning: base.strategicPositioning,
      welcomeMessage: base.welcomeMessage,
      objectives: base.objectives,
      tactics: base.tactics.slice(0, 3).map((track, i) => ({ ...track, metricsHeader: metricsHeaders[i] || DEFAULT_METRICS_HEADER })),
      roadmap: { ...base.roadmap, weeks, phaseWeeks },
      hasBookabilityChecklist,
      bookabilityItems,
      afterLaunchItems,
      goalTiles,
      pricePoint,
      launchTarget,
      launchDate: parseDate((launchTarget || '').split('·')[0])
    };
  } catch (err) {
    return { error: `Parse error: ${err.message}` };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HTML GENERATORS (experience template markup)
// ═══════════════════════════════════════════════════════════════════════════

const MIN_WEEKS = 8;
const MAX_WEEKS = 12;
const MAX_GOAL_TILES = 5;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Read a date written as "May 22, 2027", "Saturday, May 22, 2027",
 * "22 May 2027" or "2027-05-22". Returns "2027-05-22", or '' when the text
 * holds no full date (for example "Late May 2027").
 */
function parseDate(text) {
  const t = String(text || '');
  const pad = n => String(n).padStart(2, '0');
  const valid = (y, m, d) => {
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : '';
  };
  const iso = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return valid(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const monthIndex = name => MONTHS.findIndex(m => m.toLowerCase().startsWith(name.toLowerCase().slice(0, 3))) + 1;
  const names = 'jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec';
  const mdy = t.match(new RegExp(`\\b((?:${names})[a-z]*)\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, 'i'));
  if (mdy) return valid(Number(mdy[3]), monthIndex(mdy[1]), Number(mdy[2]));
  const dmy = t.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+((?:${names})[a-z]*)\\.?,?\\s+(\\d{4})\\b`, 'i'));
  if (dmy) return valid(Number(dmy[3]), monthIndex(dmy[2]), Number(dmy[1]));
  return '';
}

/** "2027-05-22" as "May 22, 2027". Returns '' for anything else. */
function longDate(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : '';
}
const DEFAULT_METRICS_HEADER = ['Metric', '30 Days', '60 Days', '90 Days'];

/**
 * Share the roadmap weeks between the three phases. Returns the phase (1-3)
 * of each week, as an object keyed by week number. With no starts given the
 * weeks are split evenly and earlier phases take any extra week:
 * 8 weeks = 3/3/2, 10 = 4/3/3, 12 = 4/4/4.
 */
function splitIntoPhases(totalWeeks, phase2Start, phase3Start) {
  const base = Math.floor(totalWeeks / 3);
  const extra = totalWeeks % 3;
  let start2 = base + (extra > 0 ? 1 : 0) + 1;
  let start3 = start2 + base + (extra > 1 ? 1 : 0);
  const valid = Number.isInteger(phase2Start) && Number.isInteger(phase3Start)
    && phase2Start > 1 && phase3Start > phase2Start && phase3Start <= totalWeeks;
  if (valid) { start2 = phase2Start; start3 = phase3Start; }
  const phaseOf = {};
  for (let w = 1; w <= totalWeeks; w++) phaseOf[w] = w >= start3 ? 3 : (w >= start2 ? 2 : 1);
  return phaseOf;
}

function paragraphsHtml(text) {
  return (text || '')
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .map(p => `<p>${inlineMarkdown(p.replace(/^>\s?/, ''))}</p>`)
    .join('\n            ');
}

function stepsHtml(steps, trackNum) {
  const parts = [];
  for (const step of steps || []) {
    const last = parts[parts.length - 1];
    if (last && last.label === (step.partLabel || '')) last.steps.push(step);
    else parts.push({ label: step.partLabel || '', steps: [step] });
  }

  let bulletNum = 1;
  return parts.map((part, idx) => {
    const badge = part.label ? `<span class="section-block-badge">Part ${String.fromCharCode(65 + idx)}</span>` : '';
    const title = part.label || 'Implementation Steps';
    const items = part.steps.map(step => {
      const bullets = (step.bullets || [])
        .map((b, i) => {
          const subClass = step.bulletLevels && step.bulletLevels[i] ? ' class="tactic-step-sub"' : '';
          return `<li${subClass} data-editable-key="t${trackNum}-bullet-${bulletNum++}">${inlineMarkdown(b)}</li>`;
        })
        .join('');
      return `            <li class="step-item" id="step-t${trackNum}-${step.number}"><div class="step-num">${step.number}</div><div class="step-content"><h4 data-editable-key="tactic-${trackNum}-step-${step.number}-title">${plainText(step.title)}</h4>${bullets ? `<ul>${bullets}</ul>` : ''}</div></li>`;
    }).join('\n');

    return `<div class="section-block open">
        <div class="section-block-header" onclick="toggleSection(this)">
          ${badge}
          <span class="section-block-title">${escapeHtml(title)}</span>
          ${CHEVRON_SVG}
        </div>
        <div class="section-block-body">
          <ol class="steps-list">
${items}
          </ol>
        </div>
      </div>`;
  }).join('\n      ');
}

function metricsRowsHtml(metrics) {
  return (metrics || [])
    .map(m => `              <tr><td>${inlineMarkdown(m.metric)}</td><td>${inlineMarkdown(m.day30)}</td><td>${inlineMarkdown(m.day60)}</td><td>${inlineMarkdown(m.day90)}</td></tr>`)
    .join('\n');
}

function tipsHtml(tips, trackNum) {
  return (tips || [])
    .map((tip, i) => `        <div class="tip-item"><div class="tip-icon">💡</div><div class="tip-text" data-editable-key="t${trackNum}-tip-${i + 1}">${inlineMarkdown(tip)}</div></div>`)
    .join('\n');
}

function resourcesHtml(resources, trackNum) {
  return (resources || [])
    .map((r, i) => `        <div class="resource-item">🔗 <a href="${escapeHtml(r.url)}" data-editable-link="t${trackNum}-resource-${i + 1}" target="_blank">${plainText(r.title)}</a>${r.description ? ': ' + inlineMarkdown(r.description) : ''}</div>`)
    .join('\n');
}

function checkId(weekNum, index) {
  return `rw${weekNum}_d${index}`;
}

function checkItemHtml({ id, dataKey, labelHtml, editableKey, extraAttr = '', placeholder = 'Add a note for this task…' }) {
  return `                <div class="check-item"${extraAttr}>
                  <div class="check-row"><input type="checkbox" class="check-input" id="${id}" data-key="${dataKey}" onchange="onCheck(this)"><label class="check-box" for="${id}">${CHECK_SVG}</label><label class="check-label" for="${id}" data-editable-key="${editableKey}">${labelHtml}</label><button class="note-toggle-btn" onclick="toggleNote('${id}')" title="Add note">${NOTE_SVG}</button></div>
                  <div class="note-area" id="note-area-${id}"><textarea class="note-textarea" id="note-${id}" placeholder="${placeholder}" oninput="saveNote('${id}',this.value)"></textarea></div>
                </div>`;
}

function weekCardHtml(week, { hasBookabilityPage = false } = {}) {
  const n = week.number;

  // The onboarding tour points at #w1-howto-example and #w1-note-example.
  // Put them on the first "how to" action (or the first action) and the
  // first checklist item of Week 1.
  const parsedActions = week.actions.map(raw => {
    const link = raw.match(/→ links to: Tactic (\d+) \/ Step (\d+)/);
    // "→ links to: Bookability Checklist" opens that page
    const page = !link && hasBookabilityPage && /→ links to: Bookability Checklist\s*$/i.test(raw) ? 'bookability' : null;
    return { text: raw.replace(/\s*→ links to:.*$/, '').trim(), link, page };
  });
  const firstHowTo = parsedActions.findIndex(a => a.link);
  const tourActionIndex = firstHowTo === -1 ? 0 : firstHowTo;

  const actions = parsedActions.map((a, i) => {
    const idAttr = n === 1 && i === tourActionIndex ? ' id="w1-howto-example"' : '';
    const howTo = a.link
      ? `<button class="howto-link" onclick="howToLink('tactic${a.link[1]}','step-t${a.link[1]}-${a.link[2]}')" title="See how to complete this step">how to</button>`
      : (a.page ? `<button class="howto-link" onclick="navigate('${a.page}')" title="See how to complete this step">how to</button>` : '');
    return `                <li class="week-task-item"${idAttr}><div class="week-task-dot"></div><span class="week-task-text" data-editable-key="week-${n}-action-${i + 1}">${inlineMarkdown(a.text)}</span>${howTo}</li>`;
  }).join('\n');

  const checklist = week.checklist.map((item, i) => {
    const id = checkId(n, i + 1);
    return checkItemHtml({
      id,
      dataKey: `week-${n}-check-${i + 1}`,
      labelHtml: inlineMarkdown(item),
      editableKey: `week-${n}-check-${i + 1}-label`,
      extraAttr: n === 1 && i === 0 ? ' id="w1-note-example"' : ''
    });
  }).join('\n');

  return `      <!-- Week ${n} -->
      <div class="week-card" id="wc-${n}" data-week="${n}">
        <div class="week-card-header" onclick="toggleWeek(${n})">
          <div class="week-num">W${n}</div>
          <div class="week-title" data-editable-key="week-${n}-title">${plainText(week.title)}</div>
          <div class="week-progress-pill" id="wp-${n}">0 / ${week.checklist.length}</div>
          ${WEEK_CHEVRON_SVG}
        </div>
        <div class="week-card-body">
          <div class="week-cols">
            <div>
              <div class="week-col-label">This Week's Actions</div>
              <ul class="week-tasks-list">
${actions}
              </ul>
            </div>
            <div>
              <div class="week-col-label">Completion Checklist</div>
              <div class="check-list">
${checklist}
              </div>
            </div>
          </div>
          <div class="week-note-section">
            <div class="week-note-label">📝 Week Notes</div>
            <textarea class="note-textarea" id="note-week-${n}" placeholder="Add general notes for this week…" oninput="saveNote('week_${n}',this.value)" style="width:100%"></textarea>
          </div>
        </div>
      </div>`;
}

function bookabilityItemsHtml(items) {
  return (items || []).map((item, i) => {
    const n = i + 1;
    const title = plainText(item.title.replace(/[.\s]+$/, ''));
    return checkItemHtml({
      id: `bookability_${n}`,
      dataKey: `bookability-${n}`,
      labelHtml: `<strong>${title}.</strong> ${inlineMarkdown(item.description)}`,
      editableKey: `bookability_${n}-label`,
      placeholder: 'Add a note…'
    });
  }).join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE PROCESSOR
// ═══════════════════════════════════════════════════════════════════════════

// The five things on the Guide and Materials pages. Each is a link staff add
// when it is ready; until then the card says "Coming soon".
const MATERIALS = {
  guide: { placeholder: 'GUIDE', button: 'Open Your Guide' },
  questionnaire: { placeholder: 'MATERIAL_QUESTIONNAIRE', button: 'View Your Answers' },
  session1: { placeholder: 'MATERIAL_SESSION1', button: 'Read the Summary' },
  session2: { placeholder: 'MATERIAL_SESSION2', button: 'Read the Summary' },
  calculator: { placeholder: 'MATERIAL_CALCULATOR', button: 'Open the Calculator' }
};
const MATERIAL_KEYS = Object.keys(MATERIALS);

const ONBOARDING_WELCOME = 'This is your home for the program. Your guide and materials live here, and your launch plan will be added after your coaching calls.';
const ONBOARDING_SUBTITLE = 'Your guide, your materials and, after your coaching calls, your launch plan.';

/** Only web links are accepted; anything else is treated as not yet available. */
function safeUrl(value) {
  const url = String(value == null ? '' : (typeof value === 'object' ? value.url || '' : value)).trim();
  return /^https?:\/\/[^\s"'<>]+$/i.test(url) ? url : '';
}

/** Always returns all five material keys, each a link or ''. */
function normaliseMaterials(input) {
  const out = {};
  for (const key of MATERIAL_KEYS) out[key] = safeUrl(input && input[key]);
  return out;
}

/** First sentence of the goal, or as much of it as fits, never cut mid-word. */
function shortGoal(goal, max = 170) {
  const text = stripMarkdown(goal || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const sentence = text.match(/^.+?[.!?](?=\s)/);
  if (sentence && sentence[0].length <= max) return sentence[0];
  return text.slice(0, max).replace(/\s+\S*$/, '').replace(/[,;:]$/, '') + '…';
}

const MATERIAL_NEWS = {
  guide: { text: 'Your Experience Development Guide is ready', page: 'guide' },
  questionnaire: { text: 'Questionnaire responses added to Materials', page: 'materials' },
  session1: { text: 'Coaching Call 1 summary added to Materials', page: 'materials' },
  session2: { text: 'Coaching Call 2 summary added to Materials', page: 'materials' },
  calculator: { text: 'Costing and pricing calculator added to Materials', page: 'materials' }
};

const PROGRAM_STEPS = ['questionnaire_done', 'onboarding_done', 'call1_done', 'call2_done'];

/** Always returns the four step flags (true or false) and next_call_date ('' or a date). */
function normaliseProgram(input) {
  const out = {};
  for (const key of PROGRAM_STEPS) out[key] = !!(input && input[key]);
  out.next_call_date = parseDate(input && input.next_call_date);
  return out;
}

// What the home page tells an operator to do before their launch plan exists
const ONBOARDING_NEXT = [
  { title: 'Complete your questionnaire', desc: 'Your answers shape your guide and both coaching calls. Your coach has sent you the link.', button: 'Go to Materials', page: 'materials' },
  { title: 'Join your onboarding call', desc: 'We walk through the program, this dashboard and your guide, and book both coaching calls together.', button: 'Open your guide', page: 'guide' },
  { title: 'Get ready for Coaching Call 1', desc: 'Work through the first sections of your guide. We leave the call with one experience, described in one sentence, and one launch window.', button: 'Open your guide', page: 'guide' },
  { title: 'Get ready for Coaching Call 2', desc: 'Finish your guide and gather what it costs you to run one departure. We leave the call with a price, a booking method and a launch date.', button: 'Open your guide', page: 'guide' },
  { title: 'Your launch plan is on its way', desc: 'Your coach is turning your guide and both calls into a week-by-week roadmap. It will appear here when it is ready.', button: 'Go to Materials', page: 'materials' }
];

function goalTilesHtml(tiles) {
  return (tiles || []).slice(0, MAX_GOAL_TILES)
    .map(tile => `        <div class="goal-tile"><div class="goal-tile-value">${plainText(tile.value)}</div><div class="goal-tile-label">${plainText(tile.label)}</div></div>`)
    .join('\n');
}

function afterLaunchItemsHtml(items) {
  return (items || []).map((item, i) => {
    const n = i + 1;
    const title = plainText(item.title.replace(/[.\s]+$/, ''));
    return checkItemHtml({
      id: `afterlaunch_${n}`,
      dataKey: `after-launch-${n}`,
      labelHtml: `<strong>${title}.</strong> ${inlineMarkdown(item.description)}`,
      editableKey: `afterlaunch_${n}-label`,
      placeholder: 'Add a note…'
    });
  }).join('\n');
}

const EMPTY_PLAN = {
  goal: '', experienceSentence: '', strategicPositioning: '', objectives: [], tactics: [],
  roadmap: { monthNames: ['', '', ''], weeks: [], phaseWeeks: {} },
  hasBookabilityChecklist: false, bookabilityItems: [], afterLaunchItems: [], goalTiles: [],
  pricePoint: null, launchTarget: null, launchDate: ''
};

/**
 * Fill the experience template.
 *
 * data.stage is 'plan' (a parsed plan.md is included) or 'onboarding' (the
 * dashboard exists before the plan does: Home, Guide and Materials only).
 * When stage is not given it is 'plan' if the data has roadmap weeks.
 */
function renderExperienceDashboard(template, input) {
  const stage = input.stage || (input.roadmap && input.roadmap.weeks && input.roadmap.weeks.length ? 'plan' : 'onboarding');
  const data = stage === 'plan' ? input : { ...input, ...EMPTY_PLAN };
  const phaseOf = week => (data.roadmap.phaseWeeks && data.roadmap.phaseWeeks[week]) || splitIntoPhases(data.roadmap.weeks.length, null, null)[week];
  const materials = normaliseMaterials({ guide: input.guideUrl, ...(input.materials || {}) });
  let html = template;

  // Remove the template header comment (documentation for maintainers)
  html = html.replace(/^<!--[\s\S]*?-->\s*(?=<!DOCTYPE)/m, '');

  const fill = (name, value) => { html = html.split(`{{${name}}}`).join(value == null ? '' : String(value)); };

  // ── Checklist IDs ────────────────────────────────────────────────────────
  const weekChecks = {};
  const monthChecks = { 1: [], 2: [], 3: [] };
  const tacticChecks = { 1: [], 2: [], 3: [] };
  const roadmapIds = [];
  data.roadmap.weeks.forEach(week => {
    weekChecks[week.number] = week.checklist.map((_, i) => checkId(week.number, i + 1));
    roadmapIds.push(...weekChecks[week.number]);
    // Phase N of the roadmap is the work of Track N
    monthChecks[phaseOf(week.number)].push(...weekChecks[week.number]);
    tacticChecks[phaseOf(week.number)].push(...weekChecks[week.number]);
  });

  const includeBookability = data.hasBookabilityChecklist && (data.bookabilityItems || []).length > 0;
  const bookabilityIds = includeBookability ? data.bookabilityItems.map((_, i) => `bookability_${i + 1}`) : [];
  // ALL_CHECK_IDS drives the progress ring and restores saved state, so it
  // includes the bookability items when that page is present.
  const allCheckIds = [...roadmapIds, ...bookabilityIds];

  // ── Simple placeholders ──────────────────────────────────────────────────
  const goal = data.goal || '';
  fill('CLIENT_NAME', escapeHtml(data.clientName));
  fill('CLIENT_SLUG', data.slug);
  const totalWeeks = data.roadmap.weeks.length;
  fill('STAGE', stage);
  fill('TOTAL_WEEKS', totalWeeks);
  fill('TOTAL_DAYS', totalWeeks * 7);
  fill('PAGE_SUBTITLE', stage === 'plan' ? escapeHtml(shortGoal(goal)) : ONBOARDING_SUBTITLE);
  fill('GOAL_TEXT', richText(goal));
  fill('WM_SUBLINE', richText(input.welcomeMessage || (stage === 'plan' ? shortGoal(goal) : ONBOARDING_WELCOME)));
  fill('STRATEGIC_POSITIONING', richText(data.strategicPositioning));
  fill('EXPERIENCE_SENTENCE', richText(data.experienceSentence));
  fill('COACH_EMAIL', escapeHtml(data.coachEmail));

  // ── People ───────────────────────────────────────────────────────────────
  const ownerFirstName = (input.ownerFirstName || '').trim();
  const coachName = (input.coachName || '').trim();
  fill('GREETING_NAME', escapeHtml(ownerFirstName || data.clientName));
  fill('COACH_NAME', escapeHtml(coachName || 'Your coach'));
  fill('COACH_INITIAL', escapeHtml((coachName || data.coachEmail || '?').trim().charAt(0).toUpperCase()));

  // ── Where the operator is in the program ─────────────────────────────────
  // Once there is a launch plan, everything before it has happened.
  const program = normaliseProgram(input.program);
  const launchDate = stage === 'plan' ? (data.launchDate || parseDate((data.launchTarget || '').split('·')[0])) : '';
  const stepsDone = PROGRAM_STEPS.map(key => stage === 'plan' || program[key]);
  const firstOpen = stepsDone.indexOf(false); // -1 when all four are done
  const stepStates = stepsDone.map((done, i) => (done ? 'done' : (i === firstOpen ? 'current' : 'upcoming')));
  stepStates.push(firstOpen === -1 ? 'current' : 'upcoming'); // Launch Roadmap
  stepStates.push('upcoming'); // Launch
  const stepNotes = stepStates.map(state => ({ done: 'Done', current: 'You are here', upcoming: 'Up next' }[state]));
  if (stage !== 'plan' && firstOpen === -1) stepNotes[4] = 'Being prepared';
  stepNotes[5] = longDate(launchDate) || 'Date to be set';
  stepStates.forEach((state, i) => {
    fill(`STEP_${i + 1}_STATE`, state);
    fill(`STEP_${i + 1}_NOTE`, escapeHtml(stepNotes[i]));
  });

  const next = ONBOARDING_NEXT[firstOpen === -1 ? 4 : firstOpen];
  fill('ONBOARDING_NEXT_TITLE', next.title);
  fill('ONBOARDING_NEXT_DESC', next.desc);
  fill('ONBOARDING_NEXT_BUTTON', next.button);
  fill('ONBOARDING_NEXT_PAGE', next.page);

  const nextCall = stepsDone[3] ? 'Complete' : (longDate(program.next_call_date) || 'To be booked');
  fill('KEY_DATE_NEXT_CALL', nextCall);
  fill('ONBOARDING_NEXT_CALL', !stepsDone[3] && program.next_call_date ? `Your next call: ${longDate(program.next_call_date)}` : '');

  fill('LAUNCH_DATE', launchDate);
  fill('LAUNCH_DATE_LONG', longDate(launchDate) || 'To be set');

  // ── What's new: the latest things staff have added ───────────────────────
  const news = MATERIAL_KEYS
    .filter(key => materials[key] && parseDate(input.materialsAdded && input.materialsAdded[key]))
    .map(key => ({ ...MATERIAL_NEWS[key], date: parseDate(input.materialsAdded[key]) }));
  if (stage === 'plan' && parseDate(input.planAdded)) {
    news.push({ text: 'Your launch plan was added', page: 'roadmap', date: parseDate(input.planAdded) });
  }
  news.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  fill('WHATS_NEW', news.length
    ? news.slice(0, 4).map(item => `        <li><button class="news-link" onclick="navigate('${item.page}')">${item.text}</button><span class="news-date">${longDate(item.date)}</span></li>`).join('\n')
    : '        <li class="news-empty">Nothing new yet. New materials are listed here as they are added.</li>');
  // The operator picks their own start date in the dashboard
  fill('COHORT_START_DATE', 'To be set');
  fill('TOTAL_TASKS', allCheckIds.length);

  for (let i = 0; i < 3; i++) {
    const n = i + 1;
    const objective = data.objectives[i] || {};
    fill(`OBJECTIVE_${n}_TITLE`, escapeHtml(objective.title));
    fill(`OBJECTIVE_${n}_DESC`, inlineMarkdown(objective.description));
    fill(`OBJECTIVE_${n}_TACTIC_PILL`, escapeHtml(objective.tacticPill));

    const track = data.tactics[i] || {};
    fill(`TACTIC_${n}_TITLE`, escapeHtml(track.title));
    fill(`TACTIC_${n}_NAV_LABEL`, escapeHtml(track.shortLabel));
    fill(`TACTIC_${n}_PHASE`, escapeHtml(track.phase));
    fill(`TACTIC_${n}_SUBTITLE`, inlineMarkdown(track.subtitle));
    fill(`TACTIC_${n}_TOTAL`, tacticChecks[n].length);

    // The weeks this track's phase covers, for the strategy page
    const phaseWeekNumbers = data.roadmap.weeks.map(w => w.number).filter(w => phaseOf(w) === n);
    const firstWeek = phaseWeekNumbers[0];
    const lastWeek = phaseWeekNumbers[phaseWeekNumbers.length - 1];
    fill(`TACTIC_${n}_WEEKS`, !phaseWeekNumbers.length ? '' : (firstWeek === lastWeek ? `Week ${firstWeek}` : `Weeks ${firstWeek}–${lastWeek}`));
    fill(`TACTIC_${n}_SPAN`, phaseWeekNumbers.length || 1);

    fill(`TACTIC_${n}_HEARD`, paragraphsHtml(track.whatHeard));
    fill(`TACTIC_${n}_WHAT_IS`, paragraphsHtml(track.whatIs));
    fill(`TACTIC_${n}_MATTERS`, paragraphsHtml(track.whyMatters));
    fill(`TACTIC_${n}_IMPLEMENTATION_STEPS`, stepsHtml(track.implementationSteps, n));
    fill(`TACTIC_${n}_METRICS_HEADER`, (track.metricsHeader || DEFAULT_METRICS_HEADER).map(cell => `<th>${plainText(cell)}</th>`).join(''));
    fill(`TACTIC_${n}_METRICS_ROWS`, metricsRowsHtml(track.successMetrics));
    fill(`TACTIC_${n}_TIPS`, tipsHtml(track.tips, n));
    fill(`TACTIC_${n}_RESOURCES`, resourcesHtml(track.resources, n));

    fill(`MONTH_${n}_NAME`, escapeHtml(data.roadmap.monthNames[i]));
    fill(`MONTH_${n}_TOTAL`, monthChecks[n].length);
    fill(`MONTH_${n}_WEEKS`, data.roadmap.weeks.filter(w => phaseOf(w.number) === n).map(w => weekCardHtml(w, { hasBookabilityPage: includeBookability })).join('\n\n'));
  }

  // ── Guide and Materials: a link when staff have added one ────────────────
  for (const key of MATERIAL_KEYS) {
    const { placeholder, button } = MATERIALS[key];
    const url = materials[key];
    fill(`${placeholder}_URL`, url ? escapeHtml(url) : '#');
    fill(`${placeholder}_STATUS`, url ? 'available' : 'coming');
    fill(`${placeholder}_STATUS_LABEL`, url ? 'Available' : 'Coming soon');
    fill(`${placeholder}_BUTTON_TEXT`, url ? button : 'Coming soon');
  }

  // ── Conditional blocks ───────────────────────────────────────────────────
  const conditional = (name, include) => {
    if (include) {
      html = html.replace(new RegExp(`<!-- /?IF:${name} -->\\n?`, 'g'), '');
    } else {
      html = html.replace(new RegExp(`<!-- IF:${name} -->[\\s\\S]*?<!-- /IF:${name} -->\\n?`, 'g'), '');
    }
  };

  conditional('PRICE_POINT', !!data.pricePoint);
  fill('PRICE_POINT', escapeHtml(data.pricePoint));

  conditional('LAUNCH_TARGET', !!data.launchTarget);
  const [launchTitle, ...launchRest] = (data.launchTarget || '').split('·').map(s => s.trim());
  fill('LAUNCH_TARGET_TITLE', escapeHtml(launchTitle));
  fill('LAUNCH_TARGET_DESC', escapeHtml(launchRest.join(' · ')));

  conditional('BOOKABILITY_CHECKLIST', includeBookability);
  fill('BOOKABILITY_ITEMS', bookabilityItemsHtml(data.bookabilityItems));

  // After-launch milestones sit on the Bookability page, under their own heading
  const includeAfterLaunch = includeBookability && (data.afterLaunchItems || []).length > 0;
  conditional('AFTER_LAUNCH', includeAfterLaunch);
  fill('AFTER_LAUNCH_ITEMS', afterLaunchItemsHtml(data.afterLaunchItems));

  // Strategy page: goal tiles from the plan, or from what the plan always has
  const tiles = (data.goalTiles || []).length ? data.goalTiles : [
    data.pricePoint ? { value: data.pricePoint.replace(/\s+per\s+.*$/i, ''), label: (data.pricePoint.match(/\bper\s+.*$/i) || ['price'])[0] } : null,
    launchDate ? { value: longDate(launchDate).replace(/,\s*\d{4}$/, ''), label: `first departure, ${launchDate.slice(0, 4)}` } : null,
    totalWeeks ? { value: `${totalWeeks} weeks`, label: 'from start date to open for booking' } : null
  ].filter(Boolean);
  conditional('GOAL_TILES', tiles.length > 0);
  fill('GOAL_TILES', goalTilesHtml(tiles));
  fill('TIMELINE_WEEK_LABELS', data.roadmap.weeks.map(w => `<span><i>Week </i>${w.number}</span>`).join(''));
  conditional('LAUNCH_DATE', !!launchDate);
  if (!includeBookability) {
    // Remove the sidebar link to a page that no longer exists
    html = html.replace(/[ \t]*<div class="nav-item[^"]*"[^>]*onclick="navigate\('bookability'\)"[^>]*>[\s\S]*?<\/div>\n?/, '');
  }

  // ── JavaScript arrays ────────────────────────────────────────────────────
  const replaceJs = (name, open, close, value) => {
    const pattern = new RegExp(`const ${name}\\s*=\\s*\\${open}[\\s\\S]*?\\${close};`);
    if (!pattern.test(html)) throw new Error(`Template is missing the ${name} declaration`);
    html = html.replace(pattern, () => `const ${name} = ${JSON.stringify(value)};`);
  };
  replaceJs('ALL_CHECK_IDS', '[', ']', allCheckIds);
  replaceJs('WEEK_CHECKS', '{', '}', weekChecks);
  replaceJs('MONTH_CHECKS', '{', '}', monthChecks);
  replaceJs('TACTIC_CHECKS', '{', '}', tacticChecks);

  const phaseLabels = { 1: data.tactics[0]?.phase || '', 2: data.tactics[1]?.phase || '', 3: data.tactics[2]?.phase || '' };
  html = html.replace(/\/\* \{\{TACTIC_PHASE_LABELS\}\} \*\/ \{[^}]*\}/, () => JSON.stringify(phaseLabels));

  // ── Report anything the template still expected ──────────────────────────
  const unfilledPlaceholders = [...new Set(html.match(/\{\{[A-Z_0-9]+\}\}/g) || [])];
  if (unfilledPlaceholders.length > 0) {
    console.warn(`[experience-generator] WARNING: ${unfilledPlaceholders.length} unfilled placeholder types:`, unfilledPlaceholders.slice(0, 15).join(', '));
  }
  html = html.replace(/\{\{[A-Z_0-9]+\}\}/g, '');

  return { html, unfilledPlaceholders };
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAN.JSON GENERATOR
// ═══════════════════════════════════════════════════════════════════════════

function generateExperiencePlanJson(clientName, slug, coachEmail, planData) {
  const plain = text => stripMarkdown(text).replace(/\s*→ links to:.*$/, '').trim();
  return {
    client_name: clientName,
    client_slug: slug,
    goal: planData.goal,
    coach_email: coachEmail,
    weeks: planData.roadmap.weeks.map(week => ({
      week: week.number,
      month: (planData.roadmap.phaseWeeks || splitIntoPhases(planData.roadmap.weeks.length, null, null))[week.number],
      title: `Week ${week.number}: ${week.title}`,
      actions: week.actions.map(plain),
      checklist: week.checklist.map(plain),
      deep_link: `https://accelerator.elearningu.com/${slug}/#week-${week.number}`
    }))
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// OUTPUT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

function validateExperienceHtml(html) {
  const problems = [];
  const add = (code, message) => problems.push({ code, message });

  const stage = (html.match(/<body[^>]*data-stage="([a-z]*)"/) || [])[1];
  if (stage !== 'plan' && stage !== 'onboarding') add('stage', 'data-stage on <body> must be "plan" or "onboarding"');
  const hasPlan = stage === 'plan';

  const placeholders = [...new Set(html.match(/\{\{[A-Z_0-9]+\}\}/g) || [])];
  if (placeholders.length) add('placeholder', `Unfilled placeholders: ${placeholders.join(', ')}`);

  const markers = [...new Set(html.match(/<!--\s*\/?(?:IF|ENDIF):[A-Z_0-9]+\s*-->/g) || [])];
  if (markers.length) add('if-marker', `Unresolved conditional markers: ${markers.join(', ')}`);

  if (!/^\s*<!DOCTYPE html>/i.test(html)) add('header', 'Page does not start with <!DOCTYPE html>');
  if (!/<body[^>]*data-client-slug="[a-z0-9-]+"/.test(html)) add('slug', 'Missing data-client-slug on <body>');
  if (!/<body[^>]*data-cohort-start=""/.test(html)) add('cohort-start', 'data-cohort-start must be empty');
  if (!html.includes('cdn.jsdelivr.net/npm/@supabase/supabase-js@2')) add('supabase-sdk', 'Supabase SDK script is missing');
  for (const script of ['/shared/supabase-client.js', '/shared/auth.js', '/shared/progress.js']) {
    if (!html.includes(`src="${script}"`)) add('shared-script', `Missing shared script ${script}`);
  }
  if (/id="page-assessment"/.test(html)) add('assessment', 'Experience dashboards must not have an Assessment page');

  const readJs = name => {
    const m = html.match(new RegExp(`const ${name}\\s*=\\s*([\\[{][\\s\\S]*?[\\]}]);`));
    if (!m) { add('js-array', `${name} not found`); return null; }
    try { return JSON.parse(m[1]); } catch (e) { add('js-array', `${name} is not valid JSON`); return null; }
  };
  const allIds = readJs('ALL_CHECK_IDS') || [];
  const weekChecks = readJs('WEEK_CHECKS') || {};
  const monthChecks = readJs('MONTH_CHECKS') || {};
  const tacticChecks = readJs('TACTIC_CHECKS') || {};

  const roadmapDom = [...html.matchAll(/<input[^>]*id="(rw\d+_d\d+)"[^>]*data-key="(week-\d+-check-\d+)"/g)].map(m => m[1]);
  const bookabilityDom = [...html.matchAll(/<input[^>]*id="(bookability_\d+)"/g)].map(m => m[1]);
  const sameSet = (a, b) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');
  if (!sameSet(allIds, [...roadmapDom, ...bookabilityDom])) add('js-array', `ALL_CHECK_IDS (${allIds.length}) does not match checkboxes on the page (${roadmapDom.length + bookabilityDom.length})`);
  for (const [name, obj] of [['WEEK_CHECKS', weekChecks], ['MONTH_CHECKS', monthChecks], ['TACTIC_CHECKS', tacticChecks]]) {
    if (!sameSet(Object.values(obj).flat(), roadmapDom)) add('js-array', `${name} does not cover the roadmap checkboxes`);
  }
  if (allIds.some(id => /^gs\d/.test(id))) add('js-array', 'Guide checkboxes (gs1-gs5) must not be in ALL_CHECK_IDS');

  const afterLaunchDom = [...html.matchAll(/<input[^>]*id="(afterlaunch_\d+)"/g)].map(m => m[1]);
  if (allIds.some(id => /^afterlaunch_/.test(id))) add('js-array', 'After-launch milestones must not be in ALL_CHECK_IDS');
  for (const id of ['next-step-card', 'program-steps', 'next-title', 'next-tasks']) {
    if (!html.includes(`id="${id}"`)) add('home', `Home page element #${id} is missing`);
  }
  for (const id of [...roadmapDom, ...bookabilityDom, ...afterLaunchDom]) {
    if (!html.includes(`id="note-area-${id}"`)) add('note-area', `Checklist item ${id} has no note area`);
  }

  const weeks = [...html.matchAll(/<div class="week-card" id="wc-(\d+)" data-week="(\d+)"/g)].map(m => Number(m[2]));
  if (hasPlan && (weeks.length < MIN_WEEKS || weeks.length > MAX_WEEKS || weeks.some((w, i) => w !== i + 1))) {
    add('weeks', `Expected ${MIN_WEEKS} to ${MAX_WEEKS} week cards numbered from 1, found: ${weeks.join(',') || 'none'}`);
  }
  if (!hasPlan && weeks.length) add('weeks', 'An onboarding dashboard must not have roadmap weeks');
  const totalWeeksAttr = Number((html.match(/<body[^>]*data-total-weeks="(\d+)"/) || [])[1]);
  if (totalWeeksAttr !== weeks.length) add('weeks', `data-total-weeks is ${totalWeeksAttr} but the page has ${weeks.length} week cards`);

  for (const m of html.matchAll(/howToLink\('tactic(\d)','(step-t\d-\d+)'\)/g)) {
    if (!html.includes(`id="${m[2]}"`)) add('howto', `"how to" link points at ${m[2]}, which does not exist`);
  }
  if (/→ links to:/.test(html)) add('howto', 'A "→ links to:" annotation was left in the page text');

  for (const id of hasPlan ? ['w1-howto-example', 'w1-note-example'] : []) {
    if (!html.includes(`id="${id}"`)) add('tour', `Onboarding tour target #${id} is missing`);
  }
  // Every tour step must point at something on the page
  const tourBlock = (html.match(/const TOUR_STEPS = \[[\s\S]*?\n\];/) || [''])[0];
  for (const step of tourBlock.match(/\{[^{}]*\}/g) || []) {
    const stepStage = (step.match(/stage:\s*'([a-z]+)'/) || [])[1];
    if (stepStage && stepStage !== stage) continue;
    for (const m of step.matchAll(/(?:targetId|mobileTargetId):\s*'([^']+)'/g)) {
      if (!html.includes(`id="${m[1]}"`)) add('tour', `Welcome tour points at #${m[1]}, which does not exist`);
    }
  }
  for (const m of html.matchAll(/<a [^>]*href="([^"]*)"[^>]*class="guide-action-btn (available|coming)"/g)) {
    if (m[2] === 'available' && !/^https?:\/\//.test(m[1])) add('materials', `An available material has no link (${m[1]})`);
    if (m[2] === 'coming' && m[1] !== '#') add('materials', 'A material marked coming soon has a link');
  }
  for (let n = 1; n <= 5; n++) {
    if (!new RegExp(`id="gs${n}"`).test(html)) add('guide', `Guide checkbox gs${n} is missing`);
  }

  const seen = new Set();
  const dupes = new Set();
  for (const m of html.matchAll(/data-editable-(?:key|link)="([^"]+)"/g)) {
    if (seen.has(m[1])) dupes.add(m[1]);
    seen.add(m[1]);
  }
  if (dupes.size) add('editable-key', `Duplicate editable keys: ${[...dupes].slice(0, 10).join(', ')}`);

  return problems;
}

/**
 * The small record kept beside each experience dashboard
 * (clients/[slug]/project.json). The dashboard is always rebuilt from the
 * template, this record and, once it exists, plan.md.
 */
function buildExperienceProject({ clientName, slug, coachEmail, stage, materials, welcomeMessage, ownerFirstName, coachName, program, materialsAdded, planAdded }) {
  const links = normaliseMaterials(materials);
  const added = {};
  for (const key of MATERIAL_KEYS) {
    const date = parseDate(materialsAdded && materialsAdded[key]);
    if (links[key] && date) added[key] = date;
  }
  return {
    type: 'experience',
    client_name: clientName,
    client_slug: slug,
    owner_first_name: (ownerFirstName || '').trim(),
    coach_email: coachEmail,
    coach_name: (coachName || '').trim(),
    stage: stage === 'plan' ? 'plan' : 'onboarding',
    welcome_message: (welcomeMessage || '').trim(),
    // Which program steps have happened, ticked by staff on the Manage page
    program: normaliseProgram(program),
    materials: links,
    // The day each material link was added, for "What's new" on the home page
    materials_added: added,
    plan_added: stage === 'plan' ? parseDate(planAdded) : ''
  };
}

export {
  PROGRAM_STEPS,
  normaliseProgram,
  parseDate,
  longDate,
  MATERIAL_KEYS,
  MIN_WEEKS,
  MAX_WEEKS,
  normaliseMaterials,
  splitIntoPhases,
  buildExperienceProject,
  parseExperiencePlanMd,
  renderExperienceDashboard,
  generateExperiencePlanJson,
  validateExperienceHtml
};
