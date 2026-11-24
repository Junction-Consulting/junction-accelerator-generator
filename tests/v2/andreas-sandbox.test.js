/**
 * The v2 sandbox: clients/andreas-resort/content.json is up to date with
 * its plan.md, carries the media from sandbox-media.md, and every image it
 * uses is stored under the client and named by its media ID.
 */

const fs = require('fs');
const path = require('path');

const { convertPlan } = require('../../shared/accelerator-v2/convert.js');
const { checkContent, allSteps } = require('../../shared/accelerator-v2/checks.js');
const { assetsOf } = require('../../shared/accelerator-v2/media.js');
const { generatePlanJsonV2 } = require('../../shared/accelerator-v2/plan-json.js');
const { assetChecker, loadOtherClients } = require('../../shared/accelerator-v2/repo.js');

const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, 'clients', 'andreas-resort');
const read = file => fs.readFileSync(path.join(DIR, file), 'utf8');

let content;
let plan;
beforeAll(() => {
  content = JSON.parse(read('content.json'));
  plan = read('plan.md');
});

const stepAt = (t, n) => allSteps(content).filter(s => s.tactic === content.tactics[t - 1])[n - 1].step;

test('content.json is what the converter makes from plan.md (no ID or field would change)', () => {
  const again = convertPlan(plan, { slug: 'andreas-resort', existing: content });
  expect(again.errors).toEqual([]);
  expect(again.matches).toEqual([]);
  expect(again.content).toEqual(content);
});

test('it is a sandbox that sends no emails', () => {
  expect(content.client).toMatchObject({ slug: 'andreas-resort', name: "Andrea's Resort", flags: { sandbox: true, send_emails: false } });
});

test('it passes the publishing checks, with every asset found', () => {
  const checks = checkContent(content, { assetExists: assetChecker(ROOT, 'andreas-resort'), otherClients: loadOtherClients(ROOT, 'andreas-resort') });
  expect(checks.errors).toEqual([]);
});

test('plan.json is generated from content.json', () => {
  expect(JSON.parse(read('plan.json'))).toEqual(generatePlanJsonV2(content));
});

test('it has the media listed in sandbox-media.md', () => {
  const rows = read('sandbox-media.md').split('\n')
    .map(l => l.match(/^\| (\d) \/ (\d+) \| (.+?) \|/))
    .filter(Boolean)
    .map(m => ({ t: Number(m[1]), n: Number(m[2]), media: m[3] }));
  expect(rows).toHaveLength(14);
  const expected = {};
  for (const r of rows) {
    const key = `${r.t}/${r.n}`;
    const two = r.media.match(/^two `(\w+)`/);
    const types = two ? [two[1], two[1]] : [r.media.match(/`(\w+)`/)[1]];
    expected[key] = [...(expected[key] || []), ...types];
  }
  const actual = {};
  allSteps(content).forEach(({ step }) => {
    if (!step.media.length) return;
    const [t, n] = (() => {
      const ti = content.tactics.findIndex(x => x.parts.some(p => p.steps.includes(step)));
      return [ti + 1, allSteps(content).filter(s => s.tactic === content.tactics[ti]).findIndex(s => s.step === step) + 1];
    })();
    actual[`${t}/${n}`] = step.media.map(m => m.type);
  });
  expect(actual).toEqual(expected);
});

test('the media fields match sandbox-media.md', () => {
  expect(stepAt(1, 1).media[0]).toMatchObject({ type: 'image', frame: 'phone', badge: 'mockup', caption: 'Updated bio with location and booking link' });
  expect(stepAt(1, 2).media[0]).toMatchObject({ frame: 'document', bar: 'Weekly posting pattern', badge: 'example' });
  expect(stepAt(1, 4).media[0]).toMatchObject({ frame: 'website', bar: 'business.facebook.com', badge: null, link: { url: 'https://business.facebook.com/', label: 'Open site' } });
  expect(stepAt(1, 5).media.map(m => m.post_type || m.title)).toEqual(['Cabin walkthrough', 'Dock at sunrise', 'How to shoot a 30-second Reel']);
  expect(stepAt(1, 5).media[0]).toMatchObject({ handle: '@andreasresort' });
  expect(stepAt(1, 5).media[2]).toMatchObject({ provider: 'youtube' });
  expect(stepAt(2, 2).media[0]).toMatchObject({ frame: 'email', badge: 'mockup', caption: 'Review request: sent three days after checkout' });
  expect(stepAt(2, 3).media[0]).toMatchObject({ frame: 'none', caption: 'QR card beside the checkout instructions' });
  expect(stepAt(3, 1).media[0]).toMatchObject({ layout: 'pair' });
  expect(stepAt(3, 1).media[0].items.map(i => [i.frame, i.bar, i.caption])).toEqual([['website', 'google.com/maps', 'Before'], ['website', 'google.com/maps', 'After']]);
  expect(stepAt(3, 2).media[0]).toMatchObject({ title: 'Photos to upload' });
  expect(stepAt(3, 2).media[0].items.map(i => i.caption)).toEqual(['Exterior', 'Interior', 'Dock', 'Fire pit', 'Winter', 'Arrival']);
  expect(stepAt(3, 3).media[0]).toMatchObject({ frame: 'website', bar: 'andreasresort.example', fit: 'full', badge: 'mockup' });
  expect(stepAt(3, 6).media[0].items.map(i => i.caption)).toEqual(['Apple Maps', 'Bing Places', 'Tripadvisor', 'Regional tourism office']);
  expect(stepAt(3, 9).media[0]).toMatchObject({ type: 'link_card', title: 'Google Search Console', subtitle: 'Performance report' });
  expect(stepAt(4, 1).media[0]).toMatchObject({ bar: 'andreasresort.example', badge: 'mockup', caption: 'Book Now in the header on every page' });
  expect(stepAt(4, 5).media[0]).toMatchObject({ frame: 'email', badge: 'mockup', caption: 'Pre-arrival email: sent five days before check-in' });
});

test('every image has alt text and a file named by its media ID, and there are no stray files', () => {
  const assets = allSteps(content).flatMap(({ step }) => step.media.flatMap(assetsOf));
  expect(assets).toHaveLength(22);
  assets.forEach(a => {
    expect(a.alt).toBeTruthy();
    expect(a.asset).toMatch(/^med_[a-z0-9]{6}$/);
    expect(fs.existsSync(path.join(DIR, 'assets', `${a.asset}.svg`))).toBe(true);
  });
  expect(fs.readdirSync(path.join(DIR, 'assets')).sort()).toEqual(assets.map(a => `${a.asset}.svg`).sort());
});
