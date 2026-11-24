/**
 * Accelerator v2 converter: plan.md -> content.json (shared/accelerator-v2/SCHEMA.md).
 */

const fs = require('fs');
const path = require('path');

const { convertPlan } = require('../../shared/accelerator-v2/convert.js');
const { splitStepNote, extractConfirms, parseResource } = require('../../shared/accelerator-v2/parse-plan.js');
const { makeIdFactory, collectIds, ID_PATTERN } = require('../../shared/accelerator-v2/ids.js');
const { similarity } = require('../../shared/accelerator-v2/match.js');
const { checkContent, allSteps } = require('../../shared/accelerator-v2/checks.js');
const { generatePlanJsonV2 } = require('../../shared/accelerator-v2/plan-json.js');
const { buildMedia } = require('../../shared/accelerator-v2/media.js');
const { parsePlanMd, generatePlanJson } = require('../../shared/plan-generator.js');

const ROOT = path.join(__dirname, '..', '..');
const PLAN = fs.readFileSync(path.join(ROOT, 'clients', 'andreas-resort', 'plan.md'), 'utf8');

// A deterministic random source, so tests can predict IDs
function seededRandom(seed = 1) {
  let s = seed;
  return count => Array.from({ length: count }, () => { s = (s * 1103515245 + 12345) % 2147483648; return s % 36; });
}

const convert = (md = PLAN, options = {}) => convertPlan(md, { slug: 'andreas-resort', random: seededRandom(), ...options });
const steps = content => allSteps(content).map(s => s.step);
const step = (content, t, n) => allSteps(content).filter(s => s.tactic === content.tactics[t - 1])[n - 1].step;

describe('IDs', () => {
  test('have a type prefix and six random characters', () => {
    const newId = makeIdFactory();
    expect(newId('stp')).toMatch(/^stp_[a-z0-9]{6}$/);
  });

  test('never collide with IDs already taken', () => {
    const fixed = () => [0, 0, 0, 0, 0, 0];
    let calls = 0;
    const random = count => (calls++ < 1 ? fixed(count) : [1, 1, 1, 1, 1, 1]);
    const newId = makeIdFactory({ taken: new Set(['stp_aaaaaa']), random });
    expect(newId('stp')).toBe('stp_bbbbbb');
  });

  test('every item in a converted plan has a valid, unique ID with the right prefix', () => {
    const { content } = convert();
    const ids = collectIds(content);
    expect(ids.length).toBeGreaterThan(150);
    ids.forEach(id => expect(id).toMatch(ID_PATTERN));
    expect(new Set(ids).size).toBe(ids.length);
    content.tactics.forEach(t => {
      expect(t.id).toMatch(/^tac_/);
      t.parts.forEach(p => {
        expect(p.id).toMatch(/^prt_/);
        p.steps.forEach(s => expect(s.id).toMatch(/^stp_/));
      });
    });
    content.roadmap.weeks.forEach(w => {
      expect(w.id).toMatch(/^wk_/);
      w.actions.forEach(a => expect(a.id).toMatch(/^act_/));
      w.checklist.forEach(c => expect(c.id).toMatch(/^chk_/));
    });
  });

  test('are random, not derived from position or wording', () => {
    const a = convertPlan(PLAN, { slug: 'x', random: seededRandom(1) }).content;
    const b = convertPlan(PLAN, { slug: 'x', random: seededRandom(2) }).content;
    expect(a.tactics[0].id).not.toBe(b.tactics[0].id);
  });
});

describe('the whole plan', () => {
  let result;
  beforeAll(() => { result = convert(); });

  test('has the top-level shape in SCHEMA.md', () => {
    expect(Object.keys(result.content)).toEqual(['schema_version', 'template_version', 'client', 'program', 'strategy', 'phases', 'objectives', 'tactics', 'roadmap', 'quick_wins', 'voice']);
    expect(result.content.schema_version).toBe(2);
    expect(result.content.program).toEqual({ weeks: 12 });
    expect(result.errors).toEqual([]);
  });

  test('reads the strategy', () => {
    const s = result.content.strategy;
    expect(s.goal).toHaveLength(2);
    expect(s.goal[0]).toMatch(/^Andrea's Resort is a lakeside cabin property/);
    expect(s.positioning).toHaveLength(1);
    expect(s.positioning_statement).toMatch(/^Andrea's Resort is the lakeside escape/);
    expect(s.positioning_statement).not.toContain('**');
    expect(s.welcome_message).toMatch(/^You already deliver a five-star stay/);
  });

  test('makes one phase per month, covering every week once, and puts each tactic in its phase', () => {
    const { phases, tactics } = result.content;
    expect(phases.map(p => [p.name, p.weeks])).toEqual([['Foundation', [1, 4]], ['Growth', [5, 8]], ['Scale', [9, 12]]]);
    expect(phases.every(p => p.description === null)).toBe(true);
    const phaseName = id => phases.find(p => p.id === id).name;
    expect(tactics.map(t => phaseName(t.phase))).toEqual(['Foundation', 'Growth', 'Scale', 'Scale']);
  });

  test('parses each objective pill into a tactic and a week range', () => {
    const { objectives, tactics } = result.content;
    expect(objectives.map(o => [o.tactic, o.weeks])).toEqual([
      [tactics[0].id, [1, 3]], [tactics[1].id, [3, 8]], [tactics[2].id, [5, 12]], [tactics[3].id, [7, 12]]
    ]);
  });

  test('keeps the tactic header and sections', () => {
    const t = result.content.tactics[2];
    expect(t.title).toBe('Local Search Visibility and the Pages That Earn Search Traffic All Year');
    expect(t.short_label).toBe('Local Search');
    expect(t.subtitle).toMatch(/^Be the first result/);
    expect(t.parts.map(p => p.name)).toHaveLength(5);
    expect(t.time_commitment).toBeNull();
    expect(t.metrics.columns).toEqual(['Metric', '30 Days', '60 Days', '90 Days']);
    expect(t.metrics.rows).toContainEqual(['Guides published', 'n/a', '1', '3']);
    expect(t.parts.every(p => p.card === null)).toBe(true);
  });

  test('keeps resources with and without descriptions', () => {
    const r = result.content.tactics[0].resources;
    expect(r[0]).toEqual({ title: 'Meta Business Suite', url: 'https://business.facebook.com/', description: 'free scheduling for both accounts' });
    expect(r[1]).toEqual({ title: 'Instagram for Business', url: 'https://business.instagram.com/', description: null });
  });

  test('reads Quick Wins groups', () => {
    const qw = result.content.quick_wins;
    expect(qw.groups.map(g => [g.title, g.items.length])).toEqual([['On the Google Business Profile', 3], ['On the Website', 2]]);
    expect(qw.groups[0].items[0]).toMatchObject({ title: 'Reply to all 20 Google reviews', text: expect.stringMatching(/^None of them has a response/) });
    expect(qw.note).toBeNull();
  });
});

describe('steps', () => {
  let content;
  beforeAll(() => { content = convert().content; });

  test('step titles lose the bold markers and the trailing full stop', () => {
    expect(step(content, 1, 1).title).toBe('Fix both profiles before you post anything');
  });

  test('title notes are split into time, cost and tags', () => {
    expect(step(content, 1, 1)).toMatchObject({ time: 'about 20 minutes', cost: null, tags: [] });
    expect(step(content, 2, 3)).toMatchObject({ time: null, cost: 'print cost $40 to $60', tags: [] });
    expect(step(content, 3, 4)).toMatchObject({ time: null, cost: '$300 to $500', tags: ['contractor'] });
    expect(step(content, 4, 1)).toMatchObject({ time: null, cost: '$200 to $400', tags: ['contractor', 'critical'] });
    expect(step(content, 1, 2)).toMatchObject({ time: null, cost: null, tags: [] });
  });

  test('splitStepNote handles the notes used in real plans', () => {
    expect(splitStepNote('about 45 minutes, once verified')).toMatchObject({ time: 'about 45 minutes, once verified', cost: null, tags: [] });
    expect(splitStepNote('contractor task, $3,500 to $5,000 including travel')).toMatchObject({ cost: '$3,500 to $5,000 including travel', tags: ['contractor'] });
    expect(splitStepNote('total contractor scope, $4,100 to $6,500')).toMatchObject({ cost: 'total contractor scope, $4,100 to $6,500', tags: ['contractor'] });
    expect(splitStepNote('5 minutes a day across the team')).toMatchObject({ time: '5 minutes a day across the team' });
    expect(splitStepNote('one conversation')).toMatchObject({ time: 'one conversation', unrecognised: 'one conversation' });
  });

  test('sub-bullets become children of the bullet above', () => {
    const bullets = step(content, 1, 1).body[0].items;
    expect(bullets.map(b => b.children.length)).toEqual([0, 0, 4, 0]);
    expect(bullets[2].children.map(c => c.text)).toEqual(['Cabins', 'The Lake', 'Getting Here', 'Things To Do']);
    expect(Object.keys(bullets[2].children[0])).toEqual(['id', 'text']);
  });

  test('inline formatting is kept: bold, code and links', () => {
    const texts = steps(content).flatMap(s => s.body.filter(b => b.type === 'bullets').flatMap(b => b.items.map(i => i.text)));
    expect(texts).toContain('On Instagram, tap **Edit profile** and rewrite the bio to say what the resort is and where it is, including the drive time from the nearest city.');
    expect(texts).toContain('Create three folders named `cabins`, `activities` and `guests`.');
    expect(texts).toContain('Open [Meta Business Suite](https://business.facebook.com/) and choose **Planner**, then **Schedule post**.');
  });

  test('a table inside a step is kept as a table block, in order with the bullets', () => {
    const body = step(content, 3, 6).body;
    expect(body.map(b => b.type)).toEqual(['bullets', 'table']);
    expect(body[1].columns).toEqual(['Directory', 'Why it matters', 'Time']);
    expect(body[1].rows).toHaveLength(4);
    expect(body[1].rows[0]).toEqual(['Apple Maps', 'Default on every iPhone', '15 minutes']);
  });

  test('[CONFIRM] notes become confirm entries pointing at their bullet, and leave the text', () => {
    const s = step(content, 1, 1);
    expect(s.confirm).toEqual([{ id: expect.stringMatching(/^cnf_/), text: 'Drive time from Kelowna', bullet: s.body[0].items[0].id }]);
    const all = steps(content).flatMap(x => x.confirm.map(c => c.text));
    expect(all).toEqual(['Drive time from Kelowna', 'Which booking system the resort uses', 'Send date with the owners']);
    expect(JSON.stringify(content)).not.toContain('[CONFIRM');
  });

  test('extractConfirms: end of text is removed, a blank in a sentence stays, shouting is calmed', () => {
    expect(extractConfirms('Add the link. [CONFIRM: page URL]')).toEqual({ text: 'Add the link.', notes: [{ text: 'Page URL', inline: false }] });
    expect(extractConfirms('Add the link `[CONFIRM: page URL]`.')).toEqual({ text: 'Add the link.', notes: [{ text: 'Page URL', inline: false }] });
    expect(extractConfirms('Pets stay in [CONFIRM WHICH ROOMS] for a fee.')).toEqual({ text: 'Pets stay in [CONFIRM WHICH ROOMS] for a fee.', notes: [{ text: 'Which rooms', inline: true }] });
  });

  test('a bullet that is only a [CONFIRM] note becomes a confirm entry with no bullet', () => {
    const md = PLAN.replace('   - Keep the email to three sentences: thank them, ask, give the link.\n', '   - Keep the email to three sentences: thank them, ask, give the link.\n   - [CONFIRM: email sender name]\n');
    const s = step(convert(md).content, 2, 2);
    expect(s.body[0].items).toHaveLength(2);
    expect(s.confirm.map(c => [c.text, 'bullet' in c])).toEqual([['Email sender name', false], ['Which booking system the resort uses', true]]);
  });

  test('an indented line straight after a bullet continues it', () => {
    const md = PLAN.replace('   - Monday is a cabin feature, Wednesday is a local activity, Friday is a guest experience.\n', '   - Monday is a cabin feature, Wednesday is a local activity, Friday is a guest experience. Use this tag:\n     `#lakeside`\n');
    const result = convert(md);
    expect(step(result.content, 1, 2).body[0].items[0].text).toMatch(/Use this tag: `#lakeside`$/);
    expect(result.warnings.map(w => w.message)).toContain('This line continues the bullet above it.');
  });

  test('parseResource reads the variations found in real plans', () => {
    expect(parseResource('[Title](https://a.example/x): words')).toMatchObject({ title: 'Title', url: 'https://a.example/x', description: 'words', reformatted: false });
    expect(parseResource('[Title](https://a.example/x) -- words')).toMatchObject({ title: 'Title', description: 'words', reformatted: true });
    expect(parseResource('Booking engine overview: [https://a.example/x](https://a.example/x)')).toMatchObject({ title: 'Booking engine overview', url: 'https://a.example/x' });
    expect(parseResource('No link here')).toBeNull();
  });
});

describe('roadmap', () => {
  let content;
  beforeAll(() => { content = convert().content; });

  test('"links to: Tactic N / Step M" becomes the ID of that step', () => {
    const w1 = content.roadmap.weeks[0];
    expect(w1.actions.map(a => a.how_to)).toEqual([step(content, 1, 1).id, step(content, 1, 2).id, 'quick_wins']);
    expect(w1.actions[0].text).toBe('Rewrite the Instagram and Facebook bios and add the booking link');
    const w6 = content.roadmap.weeks[5];
    expect(w6.actions.map(a => a.how_to)).toEqual([step(content, 3, 9).id, step(content, 3, 3).id, step(content, 3, 4).id]);
  });

  test('actions with no link have an empty how_to', () => {
    expect(content.roadmap.weeks[3].actions[2]).toMatchObject({ text: 'Check Instagram insights and note the three best posts', how_to: null });
    expect(content.roadmap.weeks[11].actions.every(a => a.how_to === null)).toBe(true);
  });

  test('a link to a step that does not exist is an error', () => {
    const result = convert(PLAN.replace('→ links to: Tactic 2 / Step 4', '→ links to: Tactic 2 / Step 9'));
    expect(result.ok).toBe(false);
    expect(result.errors.map(e => e.message)).toEqual(expect.arrayContaining([expect.stringContaining('Tactic 2 / Step 9')]));
  });

  test('weeks hold two, three and four checklist items as written', () => {
    expect(content.roadmap.weeks.map(w => w.checklist.length)).toEqual([4, 2, 3, 3, 3, 3, 3, 2, 3, 2, 3, 2]);
    expect(content.roadmap.weeks.every(w => w.next_step === null)).toBe(true);
  });
});

describe('re-running keeps IDs', () => {
  let first;
  beforeAll(() => { first = convert(); });

  test('the same plan gives identical content, and no ID changes', () => {
    const again = convertPlan(PLAN, { slug: 'andreas-resort', existing: first.content, random: seededRandom(99) });
    expect(again.content).toEqual(first.content);
    expect(checkContent(again.content, { previous: first.content }).errors).toEqual([]);
  });

  test('a reworded bullet and a reworded step title keep their IDs, and are listed for the coach', () => {
    const edited = PLAN
      .replace('Block 30 minutes every Sunday to check the week ahead.', 'Block 45 minutes every Sunday evening to check the week ahead.')
      .replace('**Set a fixed weekly pattern**', '**Set a fixed weekly posting pattern**');
    const again = convertPlan(edited, { slug: 'andreas-resort', existing: first.content, random: seededRandom(99) });
    const before = step(first.content, 1, 2);
    const after = step(again.content, 1, 2);
    expect(after.id).toBe(before.id);
    expect(after.body[0].items[1].id).toBe(before.body[0].items[1].id);
    expect(after.body[0].items[1].text).toMatch(/45 minutes/);
    expect(again.matches.map(m => m.kind).sort()).toEqual(['bullet', 'step']);
  });

  test('moving a step keeps its ID and its "how to" links follow it', () => {
    // Swap steps 1 and 2 of Tactic 2 (Part A)
    const a = PLAN.indexOf('1. **Create your Google review link**');
    const b = PLAN.indexOf('2. **Send a review request three days after checkout**');
    const c = PLAN.indexOf('3. **Put a QR card in every cabin.**');
    const stepA = PLAN.slice(a, b).replace('1. **', '2. **');
    const stepB = PLAN.slice(b, c).replace('2. **', '1. **');
    const swapped = PLAN.slice(0, a) + stepB + stepA + PLAN.slice(c);
    const again = convertPlan(swapped, { slug: 'andreas-resort', existing: first.content, random: seededRandom(99) });
    expect(step(again.content, 2, 1).id).toBe(step(first.content, 2, 2).id);
    expect(step(again.content, 2, 2).id).toBe(step(first.content, 2, 1).id);
  });

  test('a new step gets a new ID, a removed step is reported, and nothing else changes ID', () => {
    const edited = PLAN.replace(
      '#### Part B: Reply to Every Review',
      '4. **Thank guests who leave a review**\n   - Send a short thank-you message the same week.\n\n#### Part B: Reply to Every Review'
    ).replace('4. **Reply within 24 hours and mention something specific**', '5. **Reply within 24 hours and mention something specific**')
      .replace('Reply to new reviews within 24 hours → links to: Tactic 2 / Step 4', 'Reply to new reviews within 24 hours → links to: Tactic 2 / Step 5');
    const again = convertPlan(edited, { slug: 'andreas-resort', existing: first.content, random: seededRandom(99) });
    expect(again.errors).toEqual([]);
    const oldIds = new Set(collectIds(first.content));
    const newIds = collectIds(again.content).filter(id => !oldIds.has(id));
    expect(newIds.map(id => id.slice(0, 4)).sort()).toEqual(['blt_', 'stp_']);
    // The roadmap link follows the step, not the number
    expect(again.content.roadmap.weeks[4].actions[2].how_to).toBe(step(first.content, 2, 4).id);

    const removedPlan = PLAN.replace(/3\. \*\*Put a QR card in every cabin\.\*\*[\s\S]*?(?=#### Part B)/, '')
      .replace('4. **Reply within 24 hours', '3. **Reply within 24 hours')
      .replace('→ links to: Tactic 2 / Step 4', '→ links to: Tactic 2 / Step 3')
      .replace('- Print and place QR cards in every cabin → links to: Tactic 2 / Step 3\n', '');
    const removed = convertPlan(removedPlan, { slug: 'andreas-resort', existing: first.content, random: seededRandom(99) });
    expect(removed.removed).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'step', id: step(first.content, 2, 3).id })]));
  });

  test('media, step links, part cards, Next Step, phase descriptions, time commitment and client details are carried over', () => {
    const existing = JSON.parse(JSON.stringify(first.content));
    const newId = makeIdFactory({ taken: new Set(collectIds(existing)) });
    const s = step(existing, 1, 3);
    s.media.push(buildMedia({ type: 'image', frame: 'none', alt: 'Folders' }, newId));
    s.links.push({ title: 'Help', url: 'https://help.example/' });
    existing.tactics[0].parts[0].card = { title: 'Content System', description: 'Fix both profiles' };
    existing.tactics[0].time_commitment = { amount: '2 hrs', detail: 'per week' };
    existing.roadmap.weeks[0].next_step = { time_needed: '1 to 2 hours', who: 'You' };
    existing.roadmap.closing = 'Closing.';
    existing.phases[0].description = 'Profiles and first content';
    existing.client = { ...existing.client, coach_email: 'coach@example.com', cohort_start: '2026-10-15', flags: { sandbox: true, send_emails: false } };
    existing.roadmap.weeks[0].checklist[0].legacy_keys = ['week-1-check-1', 'rw1_d1'];
    existing.voice = { progress_headlines: ['Keep going'], tour: [] };

    const again = convertPlan(PLAN, { slug: 'andreas-resort', existing, random: seededRandom(99) });
    expect(again.content).toEqual(existing);
  });

  test('a changed ID is caught by the checks', () => {
    const fresh = convertPlan(PLAN, { slug: 'andreas-resort', random: seededRandom(7) });
    const errors = checkContent(fresh.content, { previous: first.content }).errors;
    expect(errors.length).toBeGreaterThan(100);
    expect(errors[0].message).toMatch(/was .* and is now .*, with the same text/);
  });
});

describe('similarity', () => {
  test('is 1 for the same words and 0 for none shared', () => {
    expect(similarity('Reply to every review', 'reply to EVERY review.')).toBe(1);
    expect(similarity('Reply to every review', 'Book the boat')).toBe(0);
  });
});

describe('plan.json', () => {
  test('matches v1\'s plan.json for the same plan, apart from the "links to" notes v1 leaves in actions', () => {
    const { content } = convert(PLAN, { client: { coach_email: 'coach@example.com' } });
    const v2 = generatePlanJsonV2(content);
    const v1 = generatePlanJson("Andrea's Resort", 'andreas-resort', 'coach@example.com', parsePlanMd(PLAN));
    v1.weeks.forEach(w => { w.actions = w.actions.map(a => a.replace(/\s*→ links to:.*$/, '')); });
    expect(v2).toEqual(v1);
  });
});
