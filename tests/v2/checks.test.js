/**
 * Accelerator v2 publishing checks (SCHEMA.md, "Checks that block publishing").
 * Each blocking check and each warning is triggered on a copy of a valid plan.
 */

const fs = require('fs');
const path = require('path');

const { convertPlan } = require('../../shared/accelerator-v2/convert.js');
const { checkContent, allSteps } = require('../../shared/accelerator-v2/checks.js');
const { makeIdFactory, collectIds } = require('../../shared/accelerator-v2/ids.js');
const { buildMedia } = require('../../shared/accelerator-v2/media.js');
const { shingles } = require('../../shared/accelerator-v2/checks.js');

const ROOT = path.join(__dirname, '..', '..');
const PLAN = fs.readFileSync(path.join(ROOT, 'clients', 'andreas-resort', 'plan.md'), 'utf8');

let base;
beforeAll(() => { base = convertPlan(PLAN, { slug: 'andreas-resort' }).content; });
const copy = () => JSON.parse(JSON.stringify(base));
const step = (content, t, n) => allSteps(content).filter(s => s.tactic === content.tactics[t - 1])[n - 1].step;
const errorsOf = (content, options) => checkContent(content, options).errors.map(e => e.message);
const warningsOf = (content, options) => checkContent(content, options).warnings.map(e => e.message);

test('the converted plan passes', () => {
  expect(checkContent(base).errors).toEqual([]);
});

test('a file that is not v2 is refused', () => {
  expect(errorsOf({ schema_version: 1 })).toEqual([expect.stringMatching(/not a v2 content file/)]);
});

describe('blocking checks', () => {
  test('an empty item, or one that is only ---', () => {
    const c = copy();
    step(c, 1, 2).body[0].items[0].text = '   ';
    c.roadmap.weeks[0].checklist[1].text = '---';
    const errors = errorsOf(c);
    expect(errors).toEqual(expect.arrayContaining(['The bullet is empty.', 'The checklist item is empty (only "---").']));
  });

  test('placeholder text from the plan template, and template tokens', () => {
    const c = copy();
    step(c, 1, 2).title = '[Step title]';
    c.tactics[0].tips[0] = 'Post at {{TIME}} every day.';
    const errors = errorsOf(c);
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringMatching(/placeholder text from the plan template: "\[Step title\]"/),
      expect.stringMatching(/template token: "\{\{TIME\}\}"/)
    ]));
  });

  test('a template-looking token inside code is not a placeholder', () => {
    const c = copy();
    step(c, 1, 2).body[0].items[0].text = 'Use `utm_campaign={{campaign.name}}` in the ad.';
    expect(errorsOf(c)).toEqual([]);
  });

  test("another client's name or website", () => {
    const c = copy();
    c.tactics[0].tips.push('Ask Sasquatch Inn how they did it.');
    step(c, 1, 2).body[0].items[1].text = 'See [their page](https://www.sasquatchinn.ca/rooms).';
    const otherClients = [{ slug: 'sasquatch-inn', name: 'Sasquatch Inn', domains: ['sasquatchinn.ca'], shingles: new Set() }];
    const errors = errorsOf(c, { otherClients });
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringMatching(/names another client: "Sasquatch Inn"/),
      expect.stringMatching(/links to another client's website: sasquatchinn.ca/)
    ]));
  });

  test("another client's wording is a warning, not an error", () => {
    const c = copy();
    const sentence = 'Every guest who stays in the river cabin gets a jar of our own blackberry jam';
    c.tactics[0].tips.push(sentence);
    const otherClients = [{ slug: 'some-other-client', name: 'Some Other Client', domains: [], shingles: shingles(sentence) }];
    expect(errorsOf(c, { otherClients })).toEqual([]);
    expect(warningsOf(c, { otherClients })).toEqual(expect.arrayContaining([expect.stringMatching(/repeats wording from another client's plan \(some-other-client\)/)]));
  });

  test("a related business's name is not another client", () => {
    const c = copy();
    c.client.slug = 'lifty-life-vacation-rentals';
    c.client.name = 'Lifty Life Vacation Rentals';
    c.tactics[0].tips.push('Link to the Lifty Life page.');
    expect(errorsOf(c, { otherClients: [{ slug: 'lifty-life', name: 'Lifty Life', domains: [], shingles: new Set() }] })).toEqual([]);
  });

  test('a "how to" that points at a step that does not exist', () => {
    const c = copy();
    c.roadmap.weeks[0].actions[0].how_to = 'stp_zzzzzz';
    expect(errorsOf(c)).toEqual(['"how to" points at stp_zzzzzz, which is not a step.']);
  });

  test('a media entry with no alt, or an asset the library cannot find', () => {
    const c = copy();
    const newId = makeIdFactory({ taken: new Set(collectIds(c)) });
    const m = buildMedia({ type: 'image', frame: 'website', bar: 'example.com', alt: '' }, newId);
    step(c, 1, 2).media.push(m);
    const errors = errorsOf(c, { assetExists: () => false });
    expect(errors).toEqual(expect.arrayContaining(['An image has no alt text.', `The media library cannot find the asset "${m.asset}".`]));
  });

  test('media fields outside the fixed lists, and groups of the wrong size', () => {
    const c = copy();
    const newId = makeIdFactory({ taken: new Set(collectIds(c)) });
    const img = buildMedia({ type: 'image', frame: 'tablet', badge: 'new', fit: 'zoom', alt: 'x' }, newId);
    const group = buildMedia({ type: 'group', layout: 'pair', items: [{ alt: 'a', frame: 'none' }] }, newId);
    step(c, 1, 2).media.push(img, group, { id: newId('med'), type: 'carousel' });
    const errors = errorsOf(c);
    expect(errors).toEqual(expect.arrayContaining([
      '"tablet" is not a frame.', '"new" is not a badge.', '"zoom" is not a fit.',
      'A "pair" group needs 2 images and has 1.', '"carousel" is not a media type.'
    ]));
  });

  test('a resource whose title is a bare URL', () => {
    const c = copy();
    c.tactics[1].resources[0].title = 'https://support.google.com/business/answer/7035772';
    expect(errorsOf(c)).toEqual([expect.stringMatching(/title is a bare web address/)]);
  });

  test('duplicate IDs, malformed IDs and IDs on the wrong kind of item', () => {
    const c = copy();
    step(c, 1, 2).id = step(c, 1, 1).id;
    c.roadmap.weeks[0].checklist[0].id = 'chk_ABC';
    c.roadmap.weeks[0].actions[0].id = c.roadmap.weeks[0].checklist[1].id;
    const errors = errorsOf(c);
    expect(errors).toEqual(expect.arrayContaining([
      expect.stringMatching(/is used twice/),
      '"chk_ABC" is not a valid ID.',
      expect.stringMatching(/is on a action, which needs the prefix "act_"/)
    ]));
  });

  test('a changed ID', () => {
    const c = copy();
    const oldId = c.tactics[0].id;
    c.tactics[0].id = 'tac_aaaaaa';
    c.objectives[0].tactic = 'tac_aaaaaa';
    c.roadmap.weeks.forEach(w => w.checklist.forEach(item => { if (item.tactic === oldId) item.tactic = 'tac_aaaaaa'; }));
    expect(errorsOf(c, { previous: base })).toEqual([expect.stringMatching(/This tactic was tac_\w+ and is now tac_aaaaaa, with the same text/)]);
  });

  test('phases that leave a week out, or overlap', () => {
    const c = copy();
    c.phases[1].weeks = [6, 8];
    expect(errorsOf(c)).toEqual(['Week 5 is in no phase.']);
    c.phases[1].weeks = [4, 8];
    expect(errorsOf(c)).toEqual(['Week 4 is in 2 phases.']);
  });

  test('a checklist item with no tactic, or a tactic that does not exist', () => {
    const c = copy();
    c.roadmap.weeks[0].checklist[0].tactic = null;
    c.roadmap.weeks[0].checklist[1].tactic = 'tac_zzzzzz';
    expect(errorsOf(c)).toEqual(['This checklist item counts towards no tactic.', 'This checklist item counts towards tac_zzzzzz, which is not a tactic.']);
  });

  test('an objective without a tactic, and a tactic without an objective', () => {
    const c = copy();
    c.objectives[3].tactic = null;
    expect(errorsOf(c)).toEqual(['The objective has no tactic.', 'The tactic has no objective.']);
  });
});

describe('warnings', () => {
  test('empty optional content is listed as hidden', () => {
    const result = checkContent(base);
    expect(result.hidden.map(h => h.field)).toEqual([
      'quick_wins.note'
    ]);
    expect(result.hidden.map(h => h.field)).not.toContain('quick_wins.intro');
    // Kept in content.json but not shown by the redesigned dashboard, so nothing is hidden
    expect(result.hidden.map(h => h.field)).not.toEqual(expect.arrayContaining(['phases[].description']));
    expect(result.hidden.map(h => h.field)).not.toContain('roadmap.weeks[].next_step');
    expect(result.hidden.map(h => h.field)).not.toContain('tactics[].parts[].card');
    // Not shown by the redesign either: the brief and mockups have no place for them
    ['roadmap.closing', 'tactics[].time_commitment'].forEach(f => expect(result.hidden.map(h => h.field)).not.toContain(f));
    expect(result.warnings.filter(w => /is empty, so it is hidden/.test(w.message))).toHaveLength(1);
  });

  test('filled optional content is not listed', () => {
    const c = copy();
    c.phases.forEach(p => { p.description = 'Words.'; });
    c.roadmap.closing = 'Words.';
    expect(checkContent(c).hidden.map(h => h.field)).not.toEqual(expect.arrayContaining(['phases[].description', 'roadmap.closing']));
  });

  test('a missing quick wins introduction is listed as hidden', () => {
    const c = copy();
    c.quick_wins.intro = null;
    expect(checkContent(c).hidden.map(h => h.field)).toContain('quick_wins.intro');
  });

  test('[CONFIRM] reminders neither block nor warn', () => {
    const c = copy();
    step(c, 1, 2).body[0].items[0].text = 'Post in [CONFIRM: which rooms] style.';
    const before = checkContent(base);
    const after = checkContent(c);
    expect(after.errors).toEqual([]);
    expect(after.warnings.length).toBe(before.warnings.length);
  });

  test('guessed checklist tactics are listed for the coach', () => {
    const w = checkContent(base).warnings.find(x => /checklist item\(s\) count towards a tactic worked out/.test(x.message));
    expect(w.message).toMatch(/^5 checklist item/);
    expect(w.where).toContain('Week 4: "A QR card is in every cabin" (Tactic 2)');
    expect(w.where).toContain('Week 12:');
  });

  test('[INSERT] and [ADD] left in visible text', () => {
    const c = copy();
    step(c, 1, 2).body[0].items[0].text = 'Post at [INSERT TIME] every day.';
    expect(warningsOf(c)).toContain('The bullet contains "[INSERT TIME]", which usually means an unfinished draft.');
  });

  test('house copy rules: em dashes, "--", arrows and Canadian spelling', () => {
    const c = copy();
    c.tactics[0].tips.push('Pick a color — any color.', 'Open Settings -- then Billing.', 'Open Settings → Billing.');
    const warnings = warningsOf(c);
    expect(warnings).toEqual(expect.arrayContaining([
      'The tip 4 has an em dash.', 'The tip 4 uses "color".', 'The tip 5 has "--".', 'The tip 6 has an arrow.'
    ]));
  });

  test('house copy rules ignore code and link addresses', () => {
    const c = copy();
    c.tactics[0].tips.push('Add `/old -> /new 301` to the [redirects](https://example.com/a--b).');
    expect(warningsOf(c).filter(w => /tip 4/.test(w))).toEqual([]);
  });

  test('a short label over 28 characters', () => {
    const c = copy();
    c.tactics[0].short_label = 'Social Media and Short Video Content';
    expect(warningsOf(c)).toContain('The short label "Social Media and Short Video Content" is 36 characters, over 28.');
  });
});
