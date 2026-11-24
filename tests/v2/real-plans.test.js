/**
 * Accelerator v2: every real accelerator plan.md in clients/ converts to
 * content.json without losing anything.
 *
 * Plans are read and converted in memory. Nothing is written to any client
 * folder.
 *
 * The source counts are taken straight from the Markdown, independently of
 * the v2 parser, and compared with what the converter produced.
 */

const fs = require('fs');
const path = require('path');

const { normalisePlanMd } = require('../../shared/plan-generator.js');
const { convertPlan, countContent } = require('../../shared/accelerator-v2/convert.js');
const { checkContent } = require('../../shared/accelerator-v2/checks.js');
const { generatePlanJsonV2 } = require('../../shared/accelerator-v2/plan-json.js');
const { loadOtherClients } = require('../../shared/accelerator-v2/repo.js');

const ROOT = path.join(__dirname, '..', '..');
const CLIENTS = path.join(ROOT, 'clients');

const SLUGS = fs.readdirSync(CLIENTS).filter(slug => {
  const p = path.join(CLIENTS, slug, 'plan.md');
  return fs.existsSync(p) && /^## Tactic \d+:/m.test(fs.readFileSync(p, 'utf8'));
});

const STEP = /^\s{0,3}(?:\d+\.\s+\*\*.+?\*\*|\*\*\d+\.\s+.+?\*\*)/;
const LIST = /^\s*-\s+\S/;
const CONFIRM_ONLY = /^\s*-\s+`?\[CONFIRM\b[^\]]*\]`?\s*$/i;

/** Counts read directly from the Markdown. */
function sourceCounts(md) {
  const lines = normalisePlanMd(md).split('\n');
  const counts = { tactics: 0, parts: 0, steps: 0, bullets: 0, confirmOnlyBullets: 0, tables: 0, weeks: 0, actions: 0, how_to: 0, checklist: 0, quick_wins: 0 };
  let section = null;     // 'steps' | 'roadmap' | 'quick_wins' | null
  let inStep = false;
  let weekMode = null;
  let previousTableRow = false;
  const hasQuickWins = /^Has GBP Quick Wins:\s*yes/mi.test(lines.join('\n'));
  for (const line of lines) {
    if (/^## Tactic \d+:/.test(line)) { counts.tactics += 1; section = null; continue; }
    if (/^## (GBP )?Quick Wins\s*$/i.test(line)) { section = hasQuickWins ? 'quick_wins' : null; continue; }
    if (/^## /.test(line)) { section = /Roadmap/i.test(line) ? 'roadmap' : null; continue; }
    if (/^### Implementation Steps/.test(line)) { section = 'steps'; inStep = false; continue; }
    if (/^### Week \d+:/.test(line)) { counts.weeks += 1; section = 'roadmap'; weekMode = null; continue; }
    if (/^### /.test(line) && section === 'steps') { section = null; continue; }
    if (section === 'steps') {
      if (/^#### Part [A-Z]:/.test(line)) { counts.parts += 1; inStep = false; continue; }
      if (STEP.test(line)) { counts.steps += 1; inStep = true; previousTableRow = false; continue; }
      if (!inStep) continue;
      if (CONFIRM_ONLY.test(line)) counts.confirmOnlyBullets += 1;
      else if (LIST.test(line)) counts.bullets += 1;
      const isTableRow = /^\s*\|.*\|\s*$/.test(line);
      if (isTableRow && !previousTableRow) counts.tables += 1;
      previousTableRow = isTableRow;
    }
    if (section === 'roadmap') {
      if (/^\*\*Actions:\*\*$/.test(line.trim())) { weekMode = 'actions'; continue; }
      if (/^\*\*Checklist:\*\*$/.test(line.trim())) { weekMode = 'checklist'; continue; }
      if (weekMode && LIST.test(line)) {
        counts[weekMode] += 1;
        if (weekMode === 'actions' && /→ links to:/.test(line)) counts.how_to += 1;
      }
    }
    if (section === 'quick_wins' && LIST.test(line)) counts.quick_wins += 1;
  }
  return counts;
}

let otherClients;
const results = {};
beforeAll(() => {
  otherClients = slug => loadOtherClients(ROOT, slug);
});

const convert = slug => {
  if (!results[slug]) results[slug] = convertPlan(fs.readFileSync(path.join(CLIENTS, slug, 'plan.md'), 'utf8'), { slug });
  return results[slug];
};

test('there are real accelerator plans to convert', () => {
  expect(SLUGS.length).toBeGreaterThanOrEqual(10);
  expect(SLUGS).toEqual(expect.arrayContaining(['andreas-resort', 'sasquatch-inn', 'red-cariboo-resort', 'stsailes-development-corp']));
});

describe.each(SLUGS)('%s', slug => {
  let md;
  let result;
  beforeAll(() => {
    md = fs.readFileSync(path.join(CLIENTS, slug, 'plan.md'), 'utf8');
    result = convert(slug);
  });

  test('converts without errors', () => {
    expect(result.errors).toEqual([]);
  });

  test('loses nothing: same tactics, parts, steps, bullets, weeks, actions, checklist items and quick wins as the plan', () => {
    const source = sourceCounts(md);
    const counts = countContent(result.content);
    expect({
      tactics: counts.tactics,
      parts: counts.parts,
      steps: counts.steps,
      bullets: counts.bullets,
      tables: counts.tables,
      weeks: counts.weeks,
      actions: counts.actions,
      how_to: counts.how_to,
      checklist: counts.checklist,
      quick_wins: counts.quick_wins
    }).toEqual({
      tactics: source.tactics,
      parts: source.parts,
      steps: source.steps,
      bullets: source.bullets,
      tables: source.tables,
      weeks: source.weeks,
      actions: source.actions,
      how_to: source.how_to,
      checklist: source.checklist,
      quick_wins: source.quick_wins
    });
    // A bullet that is only a [CONFIRM] note becomes a confirm entry instead
    expect(counts.confirm).toBeGreaterThanOrEqual(source.confirmOnlyBullets);
  });

  test('keeps every [CONFIRM] note as a confirm entry', () => {
    const inSteps = md.split(/^### Implementation Steps/m).slice(1).map(s => s.split(/^### Success Metrics/m)[0]).join('\n');
    expect(countContent(result.content).confirm).toBe((inSteps.match(/\[CONFIRM\b/gi) || []).length);
  });

  test('passes the blocking checks', () => {
    const checks = checkContent(result.content, { otherClients: otherClients(slug) });
    expect(checks.errors).toEqual([]);
  });

  test('converting again from its own content.json changes nothing', () => {
    const again = convertPlan(md, { slug, existing: result.content });
    expect(again.content).toEqual(result.content);
    expect(again.matches).toEqual([]);
    expect(again.removed).toEqual([]);
  });

  test('plan.json has the shape of today\'s plan.json', () => {
    const planJson = generatePlanJsonV2({ ...result.content, client: { ...result.content.client, coach_email: 'coach@example.com' } });
    expect(Object.keys(planJson)).toEqual(['client_name', 'client_slug', 'goal', 'coach_email', 'weeks']);
    expect(planJson.weeks).toHaveLength(12);
    planJson.weeks.forEach((w, i) => {
      expect(Object.keys(w)).toEqual(['week', 'month', 'title', 'actions', 'checklist', 'deep_link']);
      expect(w.week).toBe(i + 1);
      expect(w.month).toBe(Math.ceil((i + 1) / 4));
      expect(w.deep_link).toBe(`https://accelerator.elearningu.com/${slug}/#week-${i + 1}`);
      [...w.actions, ...w.checklist].forEach(text => {
        expect(text).not.toMatch(/→ links to|\*\*/);
      });
    });
  });
});
