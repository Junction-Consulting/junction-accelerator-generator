/**
 * Guard for v2: no client's content may be pre-loaded into a future
 * dashboard through the v2 template, components or shared assets.
 *
 * The same method as tests/no-client-content.test.js (which covers the v1
 * templates and is left unchanged):
 *   - every piece of content in tests/fixtures/neutral-plan.md carries the
 *     marker "Zzq", so anything on a page built from it that does not carry
 *     the marker came from the template or the components;
 *   - client names come from the clients/ and elevated/ folders, and client
 *     wording from every real plan.md, plan.json, content.json, assessment
 *     file and embedded assessment in the repo.
 */

const fs = require('fs');
const path = require('path');

const { convertPlan } = require('../../shared/accelerator-v2/convert.js');
const { renderDashboard, validateDashboardV2 } = require('../../shared/accelerator-v2/render.js');
const { checkContent } = require('../../shared/accelerator-v2/checks.js');

const ROOT = path.join(__dirname, '..', '..');
const read = (...parts) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

// The v2 files that reach every page
const V2_SOURCES = [
  'template/v2/accelerator.html',
  'shared/accelerator-v2/components.js',
  'shared/accelerator-v2/render.js',
  'assets/v2/accelerator.js',
  'assets/v2/accelerator-after.js',
  'assets/v2/accelerator.css',
  'assets/v2/tokens.css'
];

// ── Client identifiers and wording, gathered from the repo ─────────────────
const NOT_CLIENTS = new Set(['sample-demo', 'sample-experience', 'junction']);
const clientSlugs = ['clients', 'elevated']
  .flatMap(dir => fs.readdirSync(path.join(ROOT, dir)).filter(name => fs.statSync(path.join(ROOT, dir, name)).isDirectory()))
  .filter(slug => !NOT_CLIENTS.has(slug));

const clientNames = [...new Set(clientSlugs.flatMap(slug => {
  const words = slug.split('-');
  const names = [slug, words.join(' ')];
  if (words.length > 2) names.push(words.slice(0, 2).join(' '));
  return names;
}))];

const wordsOf = text => (text.toLowerCase().match(/[a-z0-9$%'’]+/g) || []);
const SHINGLE = 5;
const shinglesOf = text => {
  const words = wordsOf(text);
  const out = new Set();
  for (let i = 0; i + SHINGLE <= words.length; i++) out.add(words.slice(i, i + SHINGLE).join(' '));
  return out;
};
const collectStrings = (value, out) => {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach(v => collectStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach(v => collectStrings(v, out));
  return out;
};

const clientShingles = new Map();
const addText = (text, source) => shinglesOf(text).forEach(s => { if (!clientShingles.has(s)) clientShingles.set(s, source); });
for (const slug of fs.readdirSync(path.join(ROOT, 'clients'))) {
  if (NOT_CLIENTS.has(slug)) continue;
  for (const file of ['plan.md', 'plan.json']) {
    const p = path.join(ROOT, 'clients', slug, file);
    if (fs.existsSync(p)) addText(fs.readFileSync(p, 'utf8'), `${slug}/${file}`);
  }
  for (const file of ['content.json', 'assessment.json']) {
    const p = path.join(ROOT, 'clients', slug, file);
    if (fs.existsSync(p)) collectStrings(JSON.parse(fs.readFileSync(p, 'utf8')), []).forEach(text => addText(text, `${slug}/${file}`));
  }
  const page = path.join(ROOT, 'clients', slug, 'index.html');
  if (fs.existsSync(page)) {
    const m = fs.readFileSync(page, 'utf8').match(/window\.ASSESSMENT_DATA = (\{[\s\S]*?\});<\/script>/);
    if (m) {
      try { collectStrings(JSON.parse(m[1]), []).forEach(text => addText(text, `${slug}/assessment`)); } catch (e) { /* not JSON */ }
    }
  }
}

// Wording that belongs to the plan format or the program (as in the v1 guard)
const GENERIC_PHRASES = new Set([
  'what we heard from you',
  'success metrics metric 30 days',
  'metrics metric 30 days 60',
  '30 days 60 days 90',
  'days 60 days 90 days',
  'metric 30 days 60 days',
  'in front of the people'
]);

const visibleText = html => html
  .replace(/data:[a-z/+;0-9-]+,[A-Za-z0-9+/=]+/g, ' ')
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"');

const sharedWithClients = text => [...shinglesOf(text)]
  .filter(s => clientShingles.has(s) && !GENERIC_PHRASES.has(s))
  .map(s => `"${s}" (also in ${clientShingles.get(s)})`);

// For a generated page: drop every piece of text that carries the plan marker
const templateContribution = html => html
  .replace(/<style[\s\S]*?<\/style>/g, ' ')
  .replace(/<script type="application\/json"[\s\S]*?<\/script>/g, ' ')
  .split(/<[^>]+>/)
  .filter(piece => !/zzq/i.test(piece))
  .join(' \n ');

// A neutral assessment: every text carries the marker, so the Assessment
// page components are covered too
const NEUTRAL_ASSESSMENT = {
  overall: { score: 70, grade: 'C', summary: 'Zzq overall summary.' },
  executive_summary: { headline: 'Zzq headline.', key_strengths: ['Zzq strength one.'], critical_gaps: ['Zzq gap one.'], bottom_line: 'Zzq bottom line.' },
  quick_wins: [{ task: 'Zzq quick win task.', impact: 'Zzq impact.', time_estimate: 'Zzq 30 minutes' }],
  priority_recommendations: [{ category: 'Zzq category', text: 'Zzq recommendation.', time_estimate: 'Zzq 1 hour', impact: 'high', expected_result: 'Zzq result.' }],
  categories: Object.fromEntries(['website_technical', 'reviews_reputation', 'booking_conversion', 'social_media', 'guest_experience', 'local_visibility']
    .map(key => [key, { score: 70, grade: 'C', summary: `Zzq ${key} summary.`, metrics: [{ label: `Zzq ${key} metric`, value: 'Zzq 1', status: 'good' }], findings: [{ type: 'positive', text: `Zzq ${key} finding.` }] }]))
};

const COACH = 'zzq-coach@example.com';
function neutralPage() {
  const { content, errors } = convertPlan(read('tests', 'fixtures', 'neutral-plan.md'), { slug: 'zzq-client', client: { coach_email: COACH, cohort_start: '2026-01-15' } });
  const { html, problems } = renderDashboard(content, { template: read('template', 'v2', 'accelerator.html'), assetUrl: id => `/clients/zzq-client/assets/${id}.svg`, assessment: NEUTRAL_ASSESSMENT });
  return { content, errors, html, problems };
}

test('there is real client material to compare against, including the v2 sandbox', () => {
  expect(clientSlugs.length).toBeGreaterThan(20);
  expect(clientShingles.size).toBeGreaterThan(50000);
  expect([...clientShingles.values()]).toEqual(expect.arrayContaining(['andreas-resort/content.json', 'andreas-resort/assessment.json']));
});

describe.each(V2_SOURCES)('%s', file => {
  const source = read(file);
  const lower = source.toLowerCase();

  test('names no client', () => {
    expect(clientNames.filter(client => lower.includes(client))).toEqual([]);
  });

  test("shares no wording with any client's plan, content or assessment", () => {
    expect(sharedWithClients(file.endsWith('.html') ? visibleText(source) : source)).toEqual([]);
  });

  test('contains no money amounts, email addresses or client image folders', () => {
    expect(source.match(/\$\d[\d,]*/g) || []).toEqual([]);
    expect(source.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi) || []).toEqual([]);
    expect(source.match(/\/assets\/[\w-]+-mockups\//g) || []).toEqual([]);
    expect(source.match(/\/clients\/(?!\$\{)[\w-]+\//g) || []).toEqual([]);
  });
});

describe('a v2 dashboard built from the neutral plan', () => {
  let page;
  let lower;
  beforeAll(() => { page = neutralPage(); lower = page.html.toLowerCase(); });

  test('builds and is a valid page', () => {
    expect(page.errors).toEqual([]);
    expect(page.problems).toEqual([]);
    expect(validateDashboardV2(page.html, page.content)).toEqual([]);
    expect(checkContent(page.content).errors).toEqual([]);
    expect(page.html).toContain('id="page-assessment"');
  });

  test('names no client', () => {
    expect(clientNames.filter(client => lower.includes(client))).toEqual([]);
  });

  test("shares no wording with any client's plan, content or assessment", () => {
    expect(sharedWithClients(templateContribution(page.html))).toEqual([]);
  });

  test('has no money amounts and no email address other than the coach from the plan', () => {
    expect(visibleText(page.html.replace(/<script[\s\S]*?<\/script>/g, ' ')).match(/\$\d[\d,]*/g) || []).toEqual([]);
    expect([...new Set(page.html.match(/[\w.+-]+@[\w-]+\.[a-z]{2,}/gi) || [])].filter(e => e !== COACH)).toEqual([]);
  });

  test('links and images point only at the plan, its own media, the program assets and shared libraries', () => {
    const allowed = /^(#|data:|mailto:|\/shared\/|\/assets\/v2\/[\w.-]+$|\/clients\/zzq-client\/assets\/|https:\/\/example\.com\/zzq-|https:\/\/cdn\.jsdelivr\.net\/)/;
    const urls = [...page.html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map(m => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    expect([...new Set(urls.filter(url => !allowed.test(url)))]).toEqual([]);
  });

  test("the plan's own content is what fills the page", () => {
    expect((page.html.match(/Zzq/g) || []).length).toBeGreaterThan(150);
  });
});
