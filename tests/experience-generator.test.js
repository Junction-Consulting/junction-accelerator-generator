/**
 * Tests for shared/experience-generator.js, the generator behind the
 * Experience Design plan upload.
 *
 * The sample plan in clients/sample-experience/plan.md is run through the
 * generator against the current experience template.
 */

const fs = require('fs');
const path = require('path');

const {
  parseExperiencePlanMd,
  renderExperienceDashboard,
  generateExperiencePlanJson,
  validateExperienceHtml,
  splitIntoPhases
} = require('../shared/experience-generator.js');
const { buildExperienceFiles, materialLinkProblems, projectInputs, materialsAddedAfter } = require('../shared/experience-project.js');
const { validatePlan } = require('../shared/plan-validator.js');

const ROOT = path.join(__dirname, '..');
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'template', 'experience-template.html'), 'utf8');
const SAMPLE_MD = fs.readFileSync(path.join(ROOT, 'clients', 'sample-experience', 'plan.md'), 'utf8');
// The sample is an 8-week plan; the neutral fixture is a 12-week one
const TWELVE_WEEK_MD = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'neutral-experience-plan.md'), 'utf8');
const SAMPLE_WEEKS = (SAMPLE_MD.match(/^### Week \d+:/gm) || []).length;

function render(md, overrides = {}) {
  const plan = parseExperiencePlanMd(md);
  const result = renderExperienceDashboard(TEMPLATE, {
    clientName: 'Foothills Quarter Horses',
    slug: 'sample-experience',
    coachEmail: 'coach@example.com',
    ...plan,
    ...overrides
  });
  return { plan, ...result };
}

let warnSpy;
beforeAll(() => { warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {}); });
afterAll(() => { warnSpy.mockRestore(); });

describe('experience template', () => {
  test('contains no hard-coded sample content', () => {
    const body = TEMPLATE.slice(TEMPLATE.indexOf('<!DOCTYPE'));
    expect(body).not.toMatch(/class="week-card"/);
    expect(body).not.toMatch(/class="step-item"/);
    expect(body).not.toMatch(/class="tip-item"/);
    expect(body).not.toMatch(/id="bookability_\d+"/);
    expect(body).not.toMatch(/Squarespace|Port Alberni|Tofino/);
  });

  test('counts progress from the DOM', () => {
    expect(TEMPLATE).not.toContain('ids.filter(id => state.checks[id]).length');
  });
});

describe('parser', () => {
  let plan;
  beforeAll(() => { plan = parseExperiencePlanMd(SAMPLE_MD); });

  test('parses the sample plan', () => {
    expect(plan.error).toBeUndefined();
    expect(plan.tactics).toHaveLength(3);
    expect(plan.objectives).toHaveLength(3);
    expect(plan.roadmap.weeks).toHaveLength(SAMPLE_WEEKS);
    expect(SAMPLE_WEEKS).toBe(8);
  });

  test('keeps every implementation step', () => {
    const expected = SAMPLE_MD
      .split(/(?=^## )/m)
      .filter(section => /^## Track \d+:/.test(section))
      .map(section => ((section.split('### Implementation Steps')[1] || '').split('### Success Metrics')[0].match(/^\s*(?:\d+\.\s+\*\*|\*\*\d+\.\s)/gm) || []).length);
    expect(plan.tactics.map(t => t.implementationSteps.length)).toEqual(expected);
    expect(expected.every(n => n > 0)).toBe(true);
  });

  test('every track section has content', () => {
    for (const track of plan.tactics) {
      expect(track.whatHeard).not.toBe('');
      expect(track.whatIs).not.toBe('');
      expect(track.whyMatters).not.toBe('');
      expect(track.successMetrics.length).toBeGreaterThan(0);
      expect(track.tips.length).toBeGreaterThan(0);
      expect(track.resources.length).toBeGreaterThan(0);
    }
  });

  test('reads the experience-specific fields', () => {
    expect(plan.experienceSentence).toMatch(/^A half-day at the ranch/);
    expect(plan.pricePoint).toBe('$145 per guest');
    expect(plan.launchTarget).toContain('·');
    expect(plan.hasBookabilityChecklist).toBe(true);
    expect(plan.bookabilityItems).toHaveLength((SAMPLE_MD.split('## Bookability Checklist')[1].split('## After Launch')[0].match(/^### /gm) || []).length);
    expect(plan.afterLaunchItems).toEqual([{ title: 'First Booking Confirmed', description: expect.stringMatching(/first paying guest/) }]);
    expect(plan.goalTiles).toHaveLength(5);
    expect(plan.goalTiles[0]).toEqual({ value: '$145', label: 'per guest' });
    expect(plan.launchDate).toBe('2027-05-22');
    expect(plan.bookabilityItems[0]).toEqual({ title: 'Insurance Coverage Confirmed', description: expect.stringMatching(/liability coverage/) });
  });

  test('the bookability section does not leak into the last week', () => {
    const lastWeek = plan.roadmap.weeks[plan.roadmap.weeks.length - 1];
    expect(lastWeek.checklist).toHaveLength(3);
    lastWeek.checklist.forEach(item => expect(item).not.toMatch(/^-+$|###/));
  });

  test('accepts a week heading directly followed by Actions', () => {
    const tight = SAMPLE_MD.replace(/(### Week \d+: .+)\n\n(\*\*Actions:\*\*)/g, '$1\n$2');
    expect(parseExperiencePlanMd(tight).roadmap.weeks).toHaveLength(SAMPLE_WEEKS);
  });

  test('rejects an accelerator plan with a clear message', () => {
    const accelerator = SAMPLE_MD.replace(/^## Track (\d+):/gm, '## Tactic $1:');
    expect(parseExperiencePlanMd(accelerator).error).toMatch(/## Track N:/);
  });

  test('reports missing weeks in track terms', () => {
    const md = SAMPLE_MD.replace('### Week 8:', '### Wk 8:');
    expect(parseExperiencePlanMd(md).error).toMatch(/expected 8 to 12/);
    const twoTracks = SAMPLE_MD.replace('## Track 3:', '## Stage 3:');
    expect(parseExperiencePlanMd(twoTracks).error).toMatch(/3 tracks/);
  });
});

describe('generated dashboard', () => {
  let out;
  beforeAll(() => { out = render(SAMPLE_MD); });

  test('fills every placeholder in the template', () => {
    expect(out.unfilledPlaceholders).toEqual([]);
  });

  test('is structurally valid', () => {
    expect(validateExperienceHtml(out.html)).toEqual([]);
  });

  test("shows this operator's content", () => {
    expect(out.html).toContain(out.plan.tactics[0].implementationSteps[0].title);
    expect(out.html).toContain('<div class="week-title" data-editable-key="week-1-title">Know Your Guest</div>');
    expect(out.html).toContain('Insurance Coverage Confirmed');
    expect(out.html).toContain('A half-day at the ranch');
    expect(out.html).toContain('$145 per guest');
  });

  test('maps Track N steps and links to tacticN ids', () => {
    expect(out.html).toContain('<li class="step-item" id="step-t1-1">');
    expect(out.html).toContain("howToLink('tactic1','step-t1-1')");
    expect(out.html).not.toContain('→ links to:');
  });

  test('roadmap checkboxes use rwN_dM ids with week-N-check-M data keys', () => {
    expect(out.html).toContain('<input type="checkbox" class="check-input" id="rw1_d1" data-key="week-1-check-1" onchange="onCheck(this)">');
    expect(out.html).toContain('id="note-area-rw1_d1"');
  });

  test('phase totals and checklist arrays follow the phases the plan sets', () => {
    const monthChecks = JSON.parse(out.html.match(/const MONTH_CHECKS = (\{[\s\S]*?\});/)[1]);
    const tacticChecks = JSON.parse(out.html.match(/const TACTIC_CHECKS = (\{[\s\S]*?\});/)[1]);
    const weeks = out.plan.roadmap.weeks;
    // The sample says "Phase 2 Starts: Week 3" and "Phase 3 Starts: Week 6"
    const phaseOf = w => (w >= 6 ? 3 : w >= 3 ? 2 : 1);
    [1, 2, 3].forEach(phase => {
      const expected = weeks.filter(w => phaseOf(w.number) === phase).reduce((sum, w) => sum + w.checklist.length, 0);
      expect(monthChecks[phase]).toHaveLength(expected);
      expect(tacticChecks[phase]).toEqual(monthChecks[phase]);
      expect(out.html).toContain(`id="m${phase}-prog"><span>0</span> of ${expected} done`);
    });
    expect(out.html).toContain('<span class="month-badge">Phase 1</span>');
  });

  test('the page says how long this roadmap is, not "90 days"', () => {
    expect(out.html).toMatch(/<body[^>]*data-total-weeks="8"/);
    expect(out.html).toMatch(/<body[^>]*data-total-days="56"/);
    expect(out.html).toContain('Your 8-week roadmap runs from the date you pick');
    const visible = out.html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
    expect(visible).not.toMatch(/90[- ]day/i);
    expect(visible).not.toMatch(/12 weeks/);
  });

  test('metrics tables use the column headings written in the plan', () => {
    expect(out.html).toContain('<th>Metric</th><th>Week 2</th><th>Week 5</th><th>Week 8</th>');
    expect(out.html).not.toContain('<th>30 Days</th>');
  });

  test('the header subtitle is never cut mid-word', () => {
    const subtitle = out.html.match(/<h1>Hi [^<]*<\/h1>\s*<p>([^<]*)<\/p>/)[1];
    expect(subtitle).toMatch(/[.!?…]$/);
    expect(out.plan.goal.startsWith(subtitle.replace(/…$/, ''))).toBe(true);
  });

  test('guide checkboxes are not counted in the checklist arrays', () => {
    const allIds = JSON.parse(out.html.match(/const ALL_CHECK_IDS = (\[[\s\S]*?\]);/)[1]);
    expect(allIds.filter(id => id.startsWith('gs'))).toEqual([]);
    expect(allIds.filter(id => id.startsWith('bookability_'))).toHaveLength(out.plan.bookabilityItems.length);
  });

  test('materials and guide start as coming soon', () => {
    expect(out.html).toContain('class="guide-status-pill coming"');
    expect(out.html).not.toMatch(/class="[^"]*\bavailable\b[^"]*"[^>]*>Coming Soon/);
  });

  test('cohort start date is left empty for the operator to set', () => {
    expect(out.html).toMatch(/<body[^>]*data-cohort-start=""/);
  });

  test('track progress labels use the plan phases', () => {
    const phases = out.plan.tactics.map(t => t.phase);
    expect(out.html).toContain(`const labels = ${JSON.stringify({ 1: phases[0], 2: phases[1], 3: phases[2] })};`);
  });
});

describe('optional blocks', () => {
  test('bookability page and its nav link are removed when the plan has none', () => {
    const md = SAMPLE_MD.replace(/^Has Bookability Checklist:.*$/m, 'Has Bookability Checklist: no');
    const { html } = render(md);
    expect(html).not.toContain('id="page-bookability"');
    expect(html).not.toContain("navigate('bookability')");
    expect(html).not.toMatch(/bookability_\d/);
    expect(validateExperienceHtml(html)).toEqual([]);
  });

  test('price point and launch target blocks are removed when not set', () => {
    const md = SAMPLE_MD.replace(/^Price Point:.*\n/m, '').replace(/^Launch Target:.*\n/m, '');
    const { html, plan } = render(md);
    expect(plan.pricePoint).toBeNull();
    expect(plan.launchTarget).toBeNull();
    expect(html).not.toContain('$145 per guest</div>');
    expect(validateExperienceHtml(html)).toEqual([]);
  });
});

describe('plan.json', () => {
  test('has one plain-text entry per week with root deep links', () => {
    const plan = parseExperiencePlanMd(SAMPLE_MD);
    const json = generateExperiencePlanJson('Foothills Quarter Horses', 'sample-experience', 'coach@example.com', plan);
    expect(json.goal).toBe(plan.goal);
    expect(json.weeks).toHaveLength(SAMPLE_WEEKS);
    json.weeks.forEach((week, i) => {
      expect(week.month).toBe(plan.roadmap.phaseWeeks[i + 1]);
      expect(week.deep_link).toBe(`https://accelerator.elearningu.com/sample-experience/#week-${i + 1}`);
      [...week.actions, ...week.checklist].forEach(text => expect(text).not.toMatch(/\*\*|→ links to:/));
    });
  });
});

describe('roadmap length', () => {
  const dropWeeks = (md, from) => md.replace(new RegExp(`### Week ${from}:[\\s\\S]*?(?=\\n## |$)`), '');

  test('a 12-week plan still works, split into three four-week phases', () => {
    const { plan, html, unfilledPlaceholders } = render(TWELVE_WEEK_MD, { clientName: 'Zzq Client', slug: 'zzq-client' });
    expect(plan.roadmap.weeks).toHaveLength(12);
    expect(unfilledPlaceholders).toEqual([]);
    expect(validateExperienceHtml(html)).toEqual([]);
    expect(Object.values(plan.roadmap.phaseWeeks)).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]);
    expect(html).toMatch(/<body[^>]*data-total-weeks="12"/);
  });

  test('weeks are shared out evenly when the plan does not say', () => {
    expect(Object.values(splitIntoPhases(8))).toEqual([1, 1, 1, 2, 2, 2, 3, 3]);
    expect(Object.values(splitIntoPhases(10))).toEqual([1, 1, 1, 1, 2, 2, 2, 3, 3, 3]);
    expect(Object.values(splitIntoPhases(8, 3, 6))).toEqual([1, 1, 2, 2, 2, 3, 3, 3]);
    // Starts that do not fit are ignored
    expect(Object.values(splitIntoPhases(8, 6, 3))).toEqual([1, 1, 1, 2, 2, 2, 3, 3]);
  });

  test('a 10-week plan is accepted by the upload check and generates', () => {
    const md = dropWeeks(TWELVE_WEEK_MD, 11);
    expect(validatePlan(md, { type: 'experience' }).errors).toEqual([]);
    const { plan, html } = render(md, { clientName: 'Zzq Client', slug: 'zzq-client' });
    expect(plan.roadmap.weeks).toHaveLength(10);
    expect(validateExperienceHtml(html)).toEqual([]);
  });

  test('fewer than 8 weeks, or a skipped week, is rejected in plain words', () => {
    const seven = validatePlan(dropWeeks(TWELVE_WEEK_MD, 8), { type: 'experience' });
    expect(seven.errors.map(e => e.message).join(' ')).toMatch(/needs 8 to 12 weeks.*Missing: Week 8/);
    const skipped = validatePlan(TWELVE_WEEK_MD.replace('### Week 5:', '### Week 13:'), { type: 'experience' });
    expect(skipped.ok).toBe(false);
  });

  test('an accelerator plan must still be exactly 12 weeks', () => {
    const accelerator = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'neutral-plan.md'), 'utf8');
    const report = validatePlan(dropWeeks(accelerator, 11), { type: 'accelerator' });
    expect(report.errors.map(e => e.message).join(' ')).toMatch(/needs Weeks 1 to 12/);
  });

  test('phase starts must come as a pair that fits the roadmap', () => {
    const one = SAMPLE_MD.replace(/^Phase 3 Starts:.*\n/m, '');
    expect(validatePlan(one, { type: 'experience' }).errors.map(e => e.message).join(' ')).toMatch(/Only one of/);
    const bad = SAMPLE_MD.replace('Phase 3 Starts: Week 6', 'Phase 3 Starts: Week 9');
    expect(validatePlan(bad, { type: 'experience' }).errors.map(e => e.message).join(' ')).toMatch(/does not fit a 8-week roadmap/);
  });
});

describe('onboarding stage (dashboard created before the plan exists)', () => {
  const build = (extra = {}) => buildExperienceFiles({
    template: TEMPLATE, clientName: 'Zzq Client', slug: 'zzq-client', coachEmail: 'coach@example.com', ...extra
  });

  test('builds a valid dashboard with no plan', () => {
    const built = build();
    expect(built.ok).toBe(true);
    expect(built.stage).toBe('onboarding');
    expect(built.files.map(f => f.path)).toEqual(['clients/zzq-client/project.json', 'clients/zzq-client/index.html']);
    const html = built.files[1].content;
    expect(html).toMatch(/<body[^>]*data-stage="onboarding"/);
    expect(html).not.toMatch(/class="week-card"/);
    expect(html).not.toContain('id="page-bookability"');
    expect(html).toContain('id="program-steps"');
    expect(html).toContain('<h2 class="next-title">Complete your questionnaire</h2>');
    expect(JSON.parse(html.match(/const ALL_CHECK_IDS = (\[[\s\S]*?\]);/)[1])).toEqual([]);
    expect(html).not.toMatch(/\{\{[A-Z_0-9]+\}\}/);
  });

  test('everything that needs a plan is marked so it is hidden until there is one', () => {
    const html = build().files[1].content;
    for (const page of ['strategy', 'roadmap', 'tactic1', 'tactic2', 'tactic3']) {
      expect(html).toMatch(new RegExp(`<div class="nav-item plan-only"[^>]*data-page="${page}"`));
    }
    for (const page of ['guide', 'materials']) {
      expect(html).toMatch(new RegExp(`<div class="nav-item"[^>]*data-page="${page}"`));
    }
    expect(html).toContain('body[data-stage="onboarding"] .plan-only{display:none!important}');
    expect(html).toMatch(/<div class="plan-only">\s*<div class="next-head">[\s\S]*?id="start-date-card"/);
  });

  test('adding the plan keeps the material links and moves to the plan stage', () => {
    const materials = { guide: 'https://example.com/guide', session1: 'https://example.com/call-1' };
    const before = build({ materials });
    const project = JSON.parse(before.files[0].content);
    expect(project.stage).toBe('onboarding');
    expect(project.materials).toEqual({ guide: 'https://example.com/guide', questionnaire: '', session1: 'https://example.com/call-1', session2: '', calculator: '' });

    const after = build({ planMd: TWELVE_WEEK_MD, materials: project.materials });
    expect(after.ok).toBe(true);
    expect(after.stage).toBe('plan');
    expect(after.files.map(f => f.path.split('/').pop()).sort()).toEqual(['index.html', 'plan.json', 'plan.md', 'project.json']);
    const html = after.files.find(f => f.path.endsWith('index.html')).content;
    expect(html).toMatch(/<body[^>]*data-stage="plan"/);
    expect(html).toContain('<a href="https://example.com/guide" target="_blank" class="guide-action-btn available">Open Your Guide</a>');
    expect(html).toContain('<a href="https://example.com/call-1" target="_blank" class="guide-action-btn available">Read the Summary</a>');
    expect(html).toContain('<a href="#" target="_blank" class="guide-action-btn coming">Coming soon</a>');
    expect(validateExperienceHtml(html)).toEqual([]);
  });

  test('a plan with problems is rejected and nothing is built', () => {
    const built = build({ planMd: TWELVE_WEEK_MD.replace('## The Experience', '## About') });
    expect(built.ok).toBe(false);
    expect(built.step).toBe('validate');
    expect(built.files).toBeUndefined();
  });

  test('only web links are accepted for materials', () => {
    expect(materialLinkProblems({ guide: 'https://example.com/a', session1: '' })).toEqual([]);
    expect(materialLinkProblems({ guide: 'javascript:alert(1)' })).toHaveLength(1);
    expect(materialLinkProblems({ calculator: 'my calculator.xlsx' })[0]).toMatch(/Costing and Pricing Calculator/);
    const html = build({ materials: { guide: 'javascript:alert(1)', session1: 'https://example.com/"><script>' } }).files[1].content;
    expect(html).not.toContain('javascript:alert');
    expect(html).not.toContain('"><script>');
  });
});

describe('home page', () => {
  const build = (extra = {}) => buildExperienceFiles({
    template: TEMPLATE, clientName: 'Zzq Client', slug: 'zzq-client', coachEmail: 'coach@example.com', ...extra
  });
  const page = extra => build(extra).files.find(f => f.path.endsWith('index.html')).content;
  const steps = html => [...html.matchAll(/<li class="program-step (\w+)"/g)].map(m => m[1]);

  test('greets the owner by first name, or the business when none is given', () => {
    expect(page({ ownerFirstName: 'Dana' })).toContain('<h1>Hi Dana</h1>');
    expect(page()).toContain('<h1>Hi Zzq Client</h1>');
  });

  test('the next step follows the program steps staff have ticked', () => {
    expect(steps(page())).toEqual(['current', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming']);
    const midway = page({ program: { questionnaire_done: true, onboarding_done: true, next_call_date: '2027-01-19' } });
    expect(steps(midway)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming', 'upcoming']);
    expect(midway).toContain('<h2 class="next-title">Get ready for Coaching Call 1</h2>');
    expect(midway).toContain('Your next call: January 19, 2027');
    expect(midway).toContain('<dt>Next coaching call</dt><dd>January 19, 2027</dd>');
    const waiting = page({ program: { questionnaire_done: true, onboarding_done: true, call1_done: true, call2_done: true } });
    expect(steps(waiting)).toEqual(['done', 'done', 'done', 'done', 'current', 'upcoming']);
    expect(waiting).toContain('Your launch plan is on its way');
  });

  test('with a launch plan, every earlier step is done and the roadmap is the current step', () => {
    const html = page({ planMd: SAMPLE_MD });
    expect(steps(html)).toEqual(['done', 'done', 'done', 'done', 'current', 'upcoming']);
    expect(html).toContain('<dt>Next coaching call</dt><dd>Complete</dd>');
    expect(html).toMatch(/<body[^>]*data-launch-date="2027-05-22"/);
    expect(html).toContain('id="countdown-card"');
    expect(html).toContain('<dt>Launch</dt><dd>May 22, 2027</dd>');
  });

  test('a launch target with no full date leaves the countdown out and warns', () => {
    const md = SAMPLE_MD.replace(/^Launch Target:.*$/m, 'Launch Target: Late May 2027 · $1,740 in first-month bookings');
    const html = page({ planMd: md });
    expect(html).not.toContain('id="countdown-card"');
    expect(html).toMatch(/<body[^>]*data-launch-date=""/);
    expect(validatePlan(md, { type: 'experience' }).warnings.map(w => w.message).join(' ')).toMatch(/countdown to launch will be left out/);
    expect(validateExperienceHtml(html)).toEqual([]);
  });

  test("what's new lists materials and the plan by the date they were added, newest first", () => {
    const html = page({
      planMd: SAMPLE_MD,
      materials: { guide: 'https://example.com/g', session1: 'https://example.com/1' },
      materialsAdded: { guide: '2027-01-12', session1: '2027-01-20', calculator: '2027-01-25' },
      planAdded: '2027-02-22'
    });
    const news = [...html.matchAll(/class="news-link"[^>]*>([^<]+)<\/button><span class="news-date">([^<]+)</g)].map(m => m[2]);
    expect(news).toEqual(['February 22, 2027', 'January 20, 2027', 'January 12, 2027']);
    expect(page()).toContain('class="news-empty"');
  });

  test('material dates: new and changed links get today, unchanged keep theirs, removed lose theirs', () => {
    const before = { guide: 'https://example.com/g', session1: 'https://example.com/1', session2: 'https://example.com/2' };
    const added = { guide: '2027-01-12', session1: '2027-01-20', session2: '2027-02-08' };
    const after = { guide: 'https://example.com/g', session1: 'https://example.com/new', session2: '', calculator: 'https://example.com/c' };
    expect(materialsAddedAfter(before, added, after, '2027-03-01')).toEqual({ guide: '2027-01-12', session1: '2027-03-01', calculator: '2027-03-01' });
  });

  test('the coach card shows the name when given and always links to their email', () => {
    const named = page({ coachName: 'Pat Example' });
    expect(named).toContain('<div class="coach-name">Pat Example</div>');
    expect(named).toContain('<span class="coach-avatar" aria-hidden="true">P</span>');
    expect(page()).toContain('<div class="coach-name">Your coach</div>');
    expect(page()).toContain('href="mailto:coach@example.com"');
  });
});

describe('sidebar, launch strategy and bookability', () => {
  let html;
  beforeAll(() => { html = render(SAMPLE_MD).html; });

  test('sidebar order: overview, your plan, build your experience, resources', () => {
    const nav = html.slice(html.indexOf('<nav>'), html.indexOf('</nav>'));
    const order = [...nav.matchAll(/class="nav-section-label[^"]*">([^<]+)<|data-page="(\w+)"/g)].map(m => m[1] || m[2]);
    expect(order).toEqual(['Overview', 'dashboard', 'Your Plan', 'strategy', 'roadmap', 'Build Your Experience', 'tactic1', 'tactic2', 'tactic3', 'bookability', 'Resources', 'guide', 'materials', 'activity']);
    expect(nav).toContain('Launch Strategy');
    expect(nav).toContain('Track 1 · Define It');
  });

  test('each track is described once, with its objective, weeks, progress and link', () => {
    const strategy = html.slice(html.indexOf('id="page-strategy"'), html.indexOf('id="page-guide"'));
    expect(strategy).not.toMatch(/Three Objectives|The Three Build Tracks/);
    expect((strategy.match(/class="track-card"/g) || [])).toHaveLength(3);
    expect(strategy).toContain('<div class="track-card-eyebrow">Track 1 · Weeks 1–2</div>');
    expect(strategy).toContain('<div class="track-card-eyebrow">Track 2 · Weeks 3–5</div>');
    expect(strategy).toContain('<div class="track-card-eyebrow">Track 3 · Weeks 6–8</div>');
    expect(strategy).toContain('data-editable-key="objective-2-title">Set a sustainable price and confirm operational readiness</p>');
    expect(strategy).toContain('id="tc3-bar"');
    expect(strategy).toContain('style="flex:2;--tc:var(--t1)');
    expect(strategy).toContain('style="flex:3;--tc:var(--t2)');
    expect((strategy.match(/<span><i>Week <\/i>\d+<\/span>/g) || [])).toHaveLength(8);
  });

  test('goal tiles come from the plan, or from price, date and length when it has none', () => {
    expect((html.match(/class="goal-tile"/g) || [])).toHaveLength(5);
    expect(html).toContain('<div class="goal-tile-value">$145</div><div class="goal-tile-label">per guest</div>');
    const fallback = render(SAMPLE_MD.replace(/## Goal at a Glance\n[\s\S]*?\n\n/, '')).html;
    const values = [...fallback.matchAll(/class="goal-tile-value">([^<]+)</g)].map(m => m[1]);
    expect(values).toEqual(['$145', 'May 22', '8 weeks']);
  });

  test('bookability covers what comes before bookings open; later milestones sit apart and are not counted', () => {
    const page = html.slice(html.indexOf('id="page-bookability"'), html.indexOf('id="page-activity"'));
    expect(page).toContain('before you open for bookings');
    expect(page).not.toContain('before you can accept your first booking');
    expect(page.indexOf('After You Launch')).toBeGreaterThan(page.indexOf('id="bookability_8"'));
    expect(page).toContain('<input type="checkbox" class="check-input" id="afterlaunch_1" data-key="after-launch-1"');
    const allIds = JSON.parse(html.match(/const ALL_CHECK_IDS = (\[[\s\S]*?\]);/)[1]);
    expect(allIds.filter(id => id.startsWith('afterlaunch'))).toEqual([]);
    expect(validatePlan(SAMPLE_MD, { type: 'experience' }).warnings).toEqual([]);
  });

  test('the upload check flags a bookability item that can only happen after launch', () => {
    const md = SAMPLE_MD.replace('### Test Booking Completed', '### First Booking Confirmed');
    expect(validatePlan(md, { type: 'experience' }).warnings.map(w => w.message).join(' ')).toMatch(/happens after bookings open/);
    const noAfter = render(SAMPLE_MD.replace(/## After Launch\n[\s\S]*$/, '')).html;
    expect(noAfter).not.toContain('After You Launch');
    expect(validateExperienceHtml(noAfter)).toEqual([]);
  });
});

describe('template behaviour', () => {
  test('uses the Junction logo and never swaps it for another', () => {
    expect(TEMPLATE).toContain('<img id="sidebar-logo-img" src="/assets/junction-logo-white.png" alt="Junction">');
    expect(TEMPLATE).not.toContain('LOGO_B64');
    // The only embedded image left is the site favicon in <head>
    expect(TEMPLATE.slice(TEMPLATE.indexOf('<body'))).not.toMatch(/data:image\/png;base64/);
  });

  test('opens the week named in an emailed #week-N link', () => {
    expect(TEMPLATE).toContain("window.addEventListener('hashchange', openWeekFromHash)");
  });

  test('the start date comes from a confirmed choice, not the account creation date', () => {
    expect(TEMPLATE).toContain("rpc('get_launch_start_date'");
    expect(TEMPLATE).toContain("rpc('set_launch_start_date'");
    const migration = fs.readFileSync(path.join(ROOT, 'supabase', 'migrations', '015_experience_launch_start.sql'), 'utf8');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION get_launch_start_date(p_client_slug TEXT)');
    expect(migration).toContain('CREATE OR REPLACE FUNCTION set_launch_start_date(');
  });

  test('a tour step with nothing to point at is skipped, not treated as the end', () => {
    const { html } = render(SAMPLE_MD);
    expect(html).not.toContain("if (!el) { endTour(); return; }");
    expect(validateExperienceHtml(html.replace('id="materials-list"', 'id="materials-renamed"')).map(p => p.code)).toContain('tour');
  });
});

describe('single source of truth', () => {
  test.each(['create-experience-project.js', 'update-experience-project.js'])('%s builds through the shared modules and commits last', file => {
    const source = fs.readFileSync(path.join(ROOT, 'netlify', 'functions', file), 'utf8');
    expect(source).toContain('shared/experience-project.js');
    expect(source).toContain('shared/github-repo.js');
    expect(source).not.toMatch(/function (parsePlanMd|processTemplate|commitToGitHub)\b/);
    const builtAt = source.indexOf('buildExperienceFiles({');
    const refusedAt = source.indexOf('if (!built.ok)');
    const commitAt = source.indexOf('await commitToGitHub(built.files');
    expect(builtAt).toBeGreaterThan(-1);
    expect(refusedAt).toBeGreaterThan(builtAt);
    expect(commitAt).toBeGreaterThan(refusedAt);
  });

  test('the shared builder checks the plan, then the page, and writes to clients/', () => {
    const source = fs.readFileSync(path.join(ROOT, 'shared', 'experience-project.js'), 'utf8');
    const validateAt = source.indexOf('validatePlan(planMd');
    const pageCheckAt = source.indexOf('pageProblems');
    expect(validateAt).toBeGreaterThan(-1);
    expect(pageCheckAt).toBeGreaterThan(validateAt);
    expect(source).toContain('path: `clients/${slug}/index.html`');
  });

  test('the committed sample matches what the generator builds today', () => {
    const dir = path.join(ROOT, 'clients', 'sample-experience');
    const project = JSON.parse(fs.readFileSync(path.join(dir, 'project.json'), 'utf8'));
    const built = buildExperienceFiles({ ...projectInputs(project), template: TEMPLATE, slug: 'sample-experience', planMd: SAMPLE_MD });
    expect(built.ok).toBe(true);
    for (const file of built.files) {
      expect(fs.readFileSync(path.join(ROOT, file.path), 'utf8')).toBe(file.content);
    }
  });
});

describe('sub-bullets in steps', () => {
  test('a bullet indented under the one above renders as a sub-bullet', () => {
    const lines = SAMPLE_MD.split('\n');
    const start = lines.findIndex(l => l.startsWith('### Implementation Steps'));
    const bullets = lines.map((l, i) => i).filter(i => i > start && /^\s*- /.test(lines[i]));
    lines[bullets[1]] = '  ' + lines[bullets[1]];
    const { html } = render(lines.join('\n'));
    expect(html).toContain('<li class="tactic-step-sub" data-editable-key="t1-bullet-2">');
    expect(html).toContain('<li data-editable-key="t1-bullet-1">');
    expect(TEMPLATE).toContain('.step-content li.tactic-step-sub{');
  });
});
