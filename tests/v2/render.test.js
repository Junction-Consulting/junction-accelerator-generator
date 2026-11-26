/**
 * Accelerator v2 generator: content.json -> dashboard HTML.
 *
 * Checks the page against what the shared scripts in /shared/ rely on
 * (progress, Edit Mode, the tour), that everything countable is computed,
 * that missing optional content is hidden, and that the committed sandbox
 * page is what the generator builds.
 */

const fs = require('fs');
const path = require('path');

const { renderDashboard, validateDashboardV2, pageData, mapProgress, programDays } = require('../../shared/accelerator-v2/render.js');
const C = require('../../shared/accelerator-v2/components.js');
const { allSteps } = require('../../shared/accelerator-v2/checks.js');
const { convertPlan } = require('../../shared/accelerator-v2/convert.js');
const { findAsset } = require('../../shared/accelerator-v2/repo.js');

const ROOT = path.join(__dirname, '..', '..');
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'template', 'v2', 'accelerator.html'), 'utf8');
const CONTENT = JSON.parse(fs.readFileSync(path.join(ROOT, 'clients', 'andreas-resort', 'content.json'), 'utf8'));
const assetUrl = id => `/${path.relative(ROOT, findAsset(ROOT, 'andreas-resort', id)).split(path.sep).join('/')}`;
const ASSESSMENT = JSON.parse(fs.readFileSync(path.join(ROOT, 'clients', 'andreas-resort', 'assessment.json'), 'utf8'));
const render = (content = CONTENT, assessment = ASSESSMENT.assessment_data) => renderDashboard(content, { template: TEMPLATE, assetUrl, assessment });
const copy = () => JSON.parse(JSON.stringify(CONTENT));

let page;
beforeAll(() => { page = render(); });

describe('the sandbox page', () => {
  test('clients/andreas-resort/index.html is what the generator builds from content.json', () => {
    expect(fs.readFileSync(path.join(ROOT, 'clients', 'andreas-resort', 'index.html'), 'utf8')).toBe(page.html);
  });

  test('builds with no problems and passes the structural checks', () => {
    expect(page.problems).toEqual([]);
    expect(validateDashboardV2(page.html, CONTENT)).toEqual([]);
  });

  test('uses the shared stylesheet and scripts, not copies', () => {
    expect(page.html).toContain('<link rel="stylesheet" href="/assets/v2/tokens.css">');
    expect(page.html).toContain('<link rel="stylesheet" href="/assets/v2/accelerator.css">');
    expect(page.html).toContain('<script src="/assets/v2/accelerator.js"></script>');
    expect(page.html).not.toMatch(/<style[\s>]/);
    // The only inline script is the page data
    const inline = [...page.html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)].map(m => m[1]);
    expect(inline).toEqual([' type="application/json" id="accelerator-data"']);
  });

  test('every media file it uses exists', () => {
    const srcs = [...page.html.matchAll(/<img src="(\/clients\/[^"]+)"/g)].map(m => m[1]);
    expect(srcs.length).toBe(22);
    srcs.forEach(src => expect(fs.existsSync(path.join(ROOT, src))).toBe(true));
  });
});

describe('what the shared scripts need', () => {
  test('the Supabase SDK, the client slug and the shared scripts in order', () => {
    expect(page.html).toMatch(/<head>[\s\S]*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>[\s\S]*<\/head>/);
    expect(page.html).toContain('data-client-slug="andreas-resort"');
    const order = ['/assets/v2/accelerator.js', '/shared/supabase-client.js', '/shared/auth.js', '/shared/analytics.js', '/shared/user-menu.js', '/shared/content-editor.js', '/shared/progress.js', '/shared/milestone.js', '/shared/share-modal.js', '/assets/v2/accelerator-after.js']
      .map(src => page.html.indexOf(`<script src="${src}"></script>`));
    order.forEach(i => expect(i).toBeGreaterThan(0));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test('progress keys are checklist item IDs, inside their week', () => {
    for (const week of CONTENT.roadmap.weeks) {
      const start = page.html.indexOf(`data-week="${week.number}"`);
      const end = page.html.indexOf('class="week-note-section"', start);
      const card = page.html.slice(start, end);
      expect([...card.matchAll(/data-key="([^"]+)"/g)].map(m => m[1])).toEqual(week.checklist.map(c => c.id));
      week.checklist.forEach(c => expect(card).toContain(`<label class="check-label" for="${c.id}" data-editable-key="${c.id}.text">`));
    }
    expect([...page.html.matchAll(/data-key="([^"]+)"/g)].every(m => /^chk_/.test(m[1]))).toBe(true);
  });

  test('edit keys are item IDs and fields, never positions, and each appears once', () => {
    const keys = [...page.html.matchAll(/data-editable-key="([^"]+)"/g)].map(m => m[1]);
    expect(new Set(keys).size).toBe(keys.length);
    keys.forEach(k => expect(k).toMatch(/^((tac|prt|stp|blt|wk|act|chk|qw|obj)_[a-z0-9]{6}\.[a-z_.0-9]+|strategy\.(goal|positioning)|quick_wins\.intro|roadmap\.closing|assessment\.[a-z_.0-9]+)$/));
    expect(keys.some(k => /week-\d|t\d-bullet|tactic-\d/.test(k))).toBe(false);
  });

  test('step bullets are one flat list per block, with sub-bullets marked for Edit Mode', () => {
    const step = allSteps(CONTENT).find(s => s.step.title.startsWith('Fix both profiles')).step;
    const parent = step.body[0].items[2];
    expect(page.html).toContain(`<li data-editable-key="${parent.id}.text">Add four story highlights:</li>`);
    parent.children.forEach(c => expect(page.html).toContain(`<li class="tactic-step-sub" data-editable-key="${c.id}.text">`));
  });

  test('"how to" links go to the step by its ID', () => {
    const w1 = CONTENT.roadmap.weeks[0];
    expect(page.html).toContain(`onclick="howToLink('tactic1','${w1.actions[0].how_to}')"`);
    expect(page.html).toContain(`id="${w1.actions[0].how_to}"`);
    expect(page.html).toMatch(/<button class="howto-link" onclick="navigate\('gbp'\)">how to<\/button>/);
    const links = [...page.html.matchAll(/howToLink\('tactic\d+','(stp_[a-z0-9]{6})'\)/g)];
    expect(links.length).toBe(CONTENT.roadmap.weeks.flatMap(w => w.actions).filter(a => a.how_to && a.how_to !== 'quick_wins').length);
  });

  test('the tour targets exist on the page', () => {
    const ids = new Set([...page.html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    for (const step of page.data.tour) {
      expect(ids.has(step.targetId)).toBe(true);
      if (step.mobileTargetId) expect(ids.has(step.mobileTargetId)).toBe(true);
    }
  });

  test('the tour calls the tactic cards cards, not pills', () => {
    const stop = page.data.tour.find(s => s.targetId === 'tactic-cards-section');
    expect(stop.desc).toMatch(/^These cards show progress/);
    expect(stop.mobileDesc).toMatch(/^These cards show progress/);
    expect(JSON.stringify(page.data.tour)).not.toMatch(/\bpills?\b/i);
  });

  test('tall tour stops have a tighter target on small screens', () => {
    const ids = new Set([...page.html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    expect(page.data.tour.find(s => s.targetId === 'objectives-section').mobileTargetId).toBe('next-step-main');
    expect(page.data.tour.find(s => s.targetId === 'wc-1').mobileTargetId).toBe('w1-checklist');
    expect(ids.has('next-step-main') && ids.has('w1-checklist')).toBe(true);
  });

  test('Quick Wins ticks and notes stay in this browser for now (no data-key), keyed by quick win ID', () => {
    CONTENT.quick_wins.groups.flatMap(g => g.items).forEach(q => {
      expect(page.html).toContain(`<input type="checkbox" class="check-input" id="${q.id}" onchange="onCheck(this)">`);
      expect(page.html).toContain(`oninput="saveNote('${q.id}',this.value)"`);
    });
  });

  test('week notes are keyed by week ID', () => {
    CONTENT.roadmap.weeks.forEach(w => expect(page.html).toContain(`oninput="saveNote('${w.id}',this.value)"`));
  });
});

describe('navigation (DESIGN-BRIEF.md section 4)', () => {
  const navOf = html => html.slice(html.indexOf('<nav class="nav-panel"'), html.indexOf('</nav>', html.indexOf('<nav class="nav-panel"')));
  const labels = (html, cls) => [...navOf(html).matchAll(new RegExp(`<div class="nav-group${cls}"[^>]*>([\\s\\S]*?)\\n    </div>`, 'g'))]
    .map(m => [...m[1].matchAll(/<(?:button|span) type="button" class="nav-item[^"]*"[^>]*>(?:<span class="nav-ring"[^>]*><\/span><span class="nav-label">)?([^<]+)|<span class="nav-item nav-item--coming"[^>]*>([^<]+)/g)].map(x => x[1] || x[2]));

  test('once the plan exists: Dashboard, Assessment, Strategy; Tactics; Your plan', () => {
    const nav = navOf(page.html);
    const order = ['data-page="dashboard"', 'data-page="assessment"', 'data-page="strategy"', '>Tactics<', 'data-page="tactic1"', '>Your plan<', 'data-page="roadmap"', 'class="nav-item" data-page="materials"'];
    const at = order.map(s => nav.indexOf(s));
    at.forEach((i, k) => { expect(i).toBeGreaterThan(-1); if (k) expect(i).toBeGreaterThan(at[k - 1]); });
    expect(nav).toContain('>90-day roadmap</button>');
  });

  test('one link per tactic, each with a progress ring and no status words', () => {
    const items = [...navOf(page.html).matchAll(/<button type="button" class="nav-item" data-page="tactic(\d)"[\s\S]*?<\/button>/g)];
    expect(items.map(m => Number(m[1]))).toEqual(CONTENT.tactics.map((_, i) => i + 1));
    items.forEach((m, i) => {
      expect(m[0]).toContain(`<span class="nav-ring" id="nav-ring-${i + 1}" aria-hidden="true"></span>`);
      expect(m[0]).toContain(`<span class="nav-label">${C.plain(CONTENT.tactics[i].short_label || CONTENT.tactics[i].title)}</span>`);
      expect(m[0]).not.toMatch(/Not Started|In Progress|Complete/);
    });
  });

  test('there is no Quick wins item, even when the plan has quick wins', () => {
    expect(CONTENT.quick_wins.groups.length).toBeGreaterThan(0);
    expect(navOf(page.html)).not.toMatch(/data-page="gbp"|Quick wins/i);
  });

  test('before the plan, Strategy, Tactics and the roadmap are listed under "Coming with your plan", not clickable', () => {
    const nav = navOf(page.html);
    const coming = nav.slice(nav.indexOf('<div class="nav-group plan-coming-only">'));
    expect(coming).toContain('Coming with your plan');
    ['Strategy', 'Tactics', '90-day roadmap'].forEach(l => expect(coming).toContain(`<span class="nav-item nav-item--coming" aria-disabled="true">${l}</span>`));
    expect(coming.slice(0, coming.indexOf('nav-activity-group'))).not.toContain('onclick');
    // Which set shows is decided by body[data-plan]
    expect(page.html).toContain('data-template-version="v2" data-plan="ready">');
    expect(nav).toContain('<button type="button" class="nav-item plan-coming-only" data-page="materials"');
  });

  test('wordmark above the panel, "Email your coach" below it', () => {
    const aside = page.html.slice(page.html.indexOf('<aside id="sidebar"'), page.html.indexOf('</aside>'));
    expect(aside.indexOf('junction-wordmark-solid.png')).toBeLessThan(aside.indexOf('<nav class="nav-panel"'));
    expect(aside.indexOf(`<a class="nav-coach" href="mailto:${CONTENT.client.coach_email}">Email your coach</a>`)).toBeGreaterThan(aside.indexOf('</nav>'));
  });

  test('no eLearningU reference is left in the page (the coach email is content, not design)', () => {
    expect(page.html.split(CONTENT.client.coach_email).join('')).not.toMatch(/e-?learning\s*-?u|elearningu/i);
  });
});

describe('computed, not typed', () => {
  test('totals and counts come from the content', () => {
    const total = CONTENT.roadmap.weeks.reduce((n, w) => n + w.checklist.length, 0);
    expect(page.data.checks.all).toHaveLength(total);
    expect(page.html).toContain(`<span id="dash-total-count">${total}</span>`);
    expect(page.html).toContain(`<div class="wm-step-lbl">${CONTENT.tactics.length} Tactics</div>`);
    expect(page.html).toContain(`id="tactic-cards-section" data-columns="${CONTENT.tactics.length}"`);
    // Every tactic card grid uses the shared rule, sized by the number of tactics
    expect(page.html).toContain(`<div class="dash-tactics-grid tactic-grid" id="tactic-cards-section" data-columns="${CONTENT.tactics.length}">`);
    expect(page.html).toContain(`<div class="tactics-overview-grid tactic-grid" data-columns="${CONTENT.tactics.length}">`);
    expect(page.html).toContain(`style="--columns:${CONTENT.phases.length}"`);
    expect((page.html.match(/class="nav-item" data-page="tactic\d"/g) || []).length).toBe(CONTENT.tactics.length);
    // Each tactic's navigation ring states its own total for screen readers
    Object.entries(page.data.checks.byTactic).forEach(([n, ids]) => expect(page.html).toContain(`<span class="sr-only" id="nav-ring-${n}-text">, 0 of ${ids.length} done</span>`));
    expect((page.html.match(/<section id="page-tactic\d"/g) || []).length).toBe(CONTENT.tactics.length);
  });

  test('phase blocks, totals and dashboard phases come from the phases', () => {
    CONTENT.phases.forEach((p, i) => {
      const ids = page.data.checks.byPhase[i + 1];
      expect(page.html).toContain(`<span class="month-title">${p.name}</span>`);
      expect(page.html).toContain(`<span>0</span> of ${ids.length} done`);
      expect(page.html).toContain(`WEEKS ${p.weeks[0]}-${p.weeks[1]}`);
    });
  });

  test('tactic progress counts each checklist item once, towards its own tactic', () => {
    const { byTactic } = mapProgress(CONTENT);
    const all = Object.values(byTactic).flat();
    expect(all.sort()).toEqual(CONTENT.roadmap.weeks.flatMap(w => w.checklist.map(c => c.id)).sort());
    CONTENT.tactics.forEach((t, i) => {
      expect(byTactic[i + 1]).toEqual(CONTENT.roadmap.weeks.flatMap(w => w.checklist.filter(c => c.tactic === t.id).map(c => c.id)));
      expect(page.html).toContain(`id="tc${i + 1}-stat">0 of ${byTactic[i + 1].length} done`);
    });
  });

  test('the program length is computed, never typed', () => {
    expect(programDays(12)).toBe(90);
    expect(programDays(8)).toBe(56);
    const c = copy();
    c.program.weeks = 8;
    c.roadmap.weeks = c.roadmap.weeks.slice(0, 8);
    c.phases = [{ ...c.phases[0], weeks: [1, 3] }, { ...c.phases[1], weeks: [4, 6] }, { ...c.phases[2], weeks: [7, 8] }];
    c.roadmap.weeks.forEach(w => w.actions.forEach(a => { a.how_to = null; }));
    const html = render(c).html;
    expect(html).toContain('56-Day Roadmap');
    expect(html).not.toContain('90-Day');
    expect(html).toContain('data-total-weeks="8"');
  });

  test('three tactics give three of everything', () => {
    const c = copy();
    c.tactics = c.tactics.slice(0, 3);
    c.objectives = c.objectives.slice(0, 3);
    const tacticIds = new Set(allSteps(c).map(s => s.step.id));
    c.roadmap.weeks.forEach(w => w.actions.forEach(a => { if (a.how_to && a.how_to !== 'quick_wins' && !tacticIds.has(a.how_to)) a.how_to = null; }));
    const html = render(c).html;
    expect(html).not.toContain('page-tactic4');
    expect(html).toContain('<div class="wm-step-lbl">3 Tactics</div>');
    expect(html).toContain('id="tactic-cards-section" data-columns="3"');
    expect(html).toContain('<div class="tactics-overview-grid tactic-grid" data-columns="3">');
    expect(validateDashboardV2(html, c)).toEqual([]);
  });
});

describe('missing means hidden', () => {
  test('no Next Step time or who, no phase description, no time commitment, no part card description', () => {
    expect(page.html).toContain('id="dash-next-time-wrap" hidden');
    expect(page.html).toContain('id="dash-next-who-wrap" hidden');
    expect(page.html).not.toContain('dash-phase-desc');
    expect(page.html).not.toContain('Time Commitment');
    expect(page.html).not.toContain('tactic-breakdown-desc');
    expect(page.html).not.toMatch(/2-3 hours this week|You \+ your team|Implementation steps will be added|Metrics will be added|Tips will be added|Resources will be added/);
  });

  test('filled optional content is shown', () => {
    const c = copy();
    c.phases[0].description = 'Profiles and first content';
    c.tactics[0].time_commitment = { amount: '2 hrs', detail: 'per week' };
    c.tactics[0].parts[0].card = { title: 'Content System', description: 'Fix both profiles and set a weekly pattern' };
    c.roadmap.weeks[0].next_step = { time_needed: '1 to 2 hours', who: 'You' };
    c.roadmap.closing = 'Keep going.';
    c.quick_wins.note = { title: 'One Thing Worth Watching', text: 'Watch this.' };
    const r = render(c);
    expect(r.html).toContain('<div class="dash-phase-desc">Profiles and first content</div>');
    expect(r.html).toContain('<span class="tactic-time-value">2 hrs</span>');
    expect(r.html).toContain('Content System</div>');
    expect(r.html).toContain('Fix both profiles and set a weekly pattern</div>');
    expect(r.data.weeks[1]).toMatchObject({ timeNeeded: '1 to 2 hours', who: 'You' });
    expect(r.html).toContain('data-editable-key="roadmap.closing">Keep going.</div>');
    expect(r.html).toContain('<strong>One Thing Worth Watching.</strong> Watch this.');
  });

  test('no welcome message, no Quick Wins, no coach email: those parts are left out', () => {
    const c = copy();
    c.strategy.welcome_message = null;
    c.quick_wins = { intro: null, groups: [], note: null };
    c.roadmap.weeks.forEach(w => w.actions.forEach(a => { if (a.how_to === 'quick_wins') a.how_to = null; }));
    c.client.coach_email = null;
    const html = render(c).html;
    expect(html).not.toContain('wm-subline');
    expect(html).not.toContain('page-gbp');
    expect(html).not.toContain('data-page="gbp"');
    expect(html).not.toContain('print-footer-contact');
    expect(html).not.toContain('Email your coach');
    expect(render(c).data.tour[0].desc).not.toContain('quick wins');
  });

  test('no assessment record: no Assessment page and no nav item', () => {
    const html = render(CONTENT, null).html;
    expect(html).not.toContain('page-assessment');
    expect(html).not.toContain('data-page="assessment"');
    expect(render(CONTENT, {}).html).not.toContain('page-assessment');
  });

  test('there are no projections, because content.json has none', () => {
    expect(page.html).not.toContain('projections');
  });
});

describe('components', () => {
  test('[CONFIRM: ...] is a light highlight inside the sentence', () => {
    expect(C.md('Add the drive time. [CONFIRM: drive time from Kelowna]')).toBe('Add the drive time. <mark class="confirm-note">drive time from Kelowna</mark>');
    expect(page.html).toContain('<mark class="confirm-note">drive time from Kelowna</mark>');
  });

  test('inline Markdown is shown as formatting and HTML is escaped', () => {
    expect(C.md('Tap **Edit** in `code` and [help](https://example.com/a) <b>x</b>')).toBe('Tap <strong>Edit</strong> in <code>code</code> and <a href="https://example.com/a" target="_blank" rel="noopener">help</a> &lt;b&gt;x&lt;/b&gt;');
  });

  test('step labels show time, cost, Contractor and Critical', () => {
    expect(C.stepLabels({ time: 'about 20 minutes', cost: '$200 to $400', tags: ['contractor', 'critical'] })).toBe('<div class="tactic-step-tags"><span class="tactic-step-tag muted">about 20 minutes</span><span class="tactic-step-tag info">$200 to $400</span><span class="tactic-step-tag warning">Contractor</span><span class="tactic-step-tag danger">Critical</span></div>');
    expect(C.stepLabels({ time: null, cost: null, tags: [] })).toBe('');
  });

  test('a table in a step uses the metrics table look', () => {
    expect(page.html).toContain('<div class="tactic-metrics-table tactic-step-table">');
    expect(page.html).toContain('<td>Apple Maps</td><td>Default on every iPhone</td><td>15 minutes</td>');
  });

  test('every media type and frame has its component', () => {
    const html = page.html;
    expect(html).toContain('class="tactic-phone"');
    expect(html).toContain('class="tactic-mockup tactic-mockup--document"');
    expect(html).toContain('<div class="tactic-mockup-title">Weekly posting pattern</div>');
    expect(html).toContain('class="tactic-mockup tactic-mockup--email"');
    expect(html).toContain('class="tactic-mockup tactic-mockup--page"');
    expect(html).toContain('class="tactic-media-plain"');
    expect(html).toMatch(/<a href="https:\/\/business\.facebook\.com\/" class="tactic-mockup-link"/);
    expect(html).toContain('<span class="tactic-mockup-open-text">Open site </span>');
    expect(html).toMatch(/<div class="tactic-reel-row">\s*<div class="tactic-reel" data-media-id="med_[a-z0-9]{6}">[\s\S]*?<div class="tactic-reel" data-media-id/);
    expect(html).toContain('<iframe src="https://www.youtube.com/embed/aqz-KE-bpKQ" title="How to shoot a 30-second Reel"');
    expect(html).toContain('<div class="tactic-gallery-title">Photos to upload</div>');
    expect(html).toContain('class="tactic-mockup-pair"');
    expect(html).toContain('class="tactic-mockup-pair tactic-mockup-four"');
    expect(html).toContain('<div class="tactic-link-card-title">Google Search Console</div>');
    expect((html.match(/tactic-step-media-badge tactic-mockup-badge">Mockup</g) || []).length).toBe(5);
    expect((html.match(/tactic-mockup-badge">Example</g) || []).length).toBe(1);
  });

  test('media sits below the step text', () => {
    const step = allSteps(CONTENT).find(s => s.step.media.length).step;
    const start = page.html.indexOf(`id="${step.id}"`);
    const item = page.html.slice(start, page.html.indexOf('</li>\n        <li class="tactic-step-item"', start));
    expect(item.indexOf('tactic-step-bullets')).toBeLessThan(item.indexOf('tactic-step-media-list'));
  });

  test('every content image opens in the lightbox, except images that are links', () => {
    const imgs = [...page.html.matchAll(/<img src="\/clients[^>]+>/g)].map(m => m[0]);
    const linked = imgs.filter(i => !i.includes('openLightbox'));
    expect(linked).toHaveLength(1); // the Meta Business Suite frame links to the site
    imgs.forEach(i => expect(i).toMatch(/alt="[^"]+"/));
  });
});

describe('the Assessment page', () => {
  const data = ASSESSMENT.assessment_data;

  test('the sandbox assessment is a client_assessments record for Andrea\'s Resort', () => {
    expect(ASSESSMENT).toMatchObject({ client_slug: 'andreas-resort', business_name: "Andrea's Resort", client_type: 'accelerator' });
    expect(JSON.stringify(data)).not.toMatch(/Conner/);
  });

  test('is in the nav and on the page, after the Dashboard and before Strategy', () => {
    const nav = page.html.indexOf('data-page="assessment"');
    expect(nav).toBeGreaterThan(page.html.indexOf('data-page="dashboard"'));
    expect(nav).toBeLessThan(page.html.indexOf('data-page="strategy"'));
    expect(page.html).toContain('<section id="page-assessment" class="page">');
  });

  test('shows the overall grade, every category score, the summary, quick wins, priorities and category cards', () => {
    expect(page.html).toContain(`<div class="grade-circle" id="overallGrade">${data.overall.grade}</div>`);
    expect(page.html).toContain(`<span id="overallScore">${data.overall.score}</span>/100`);
    expect(page.html).toContain('Assessment Date: October 15, 2026');
    Object.values(data.categories).forEach(cat => expect(page.html).toContain(`<span class="grade-breakdown-number">${Math.round(cat.score)}</span>`));
    expect((page.html.match(/class="grade-breakdown-item"/g) || []).length).toBe(6);
    expect((page.html.match(/class="category-card"/g) || []).length).toBe(6);
    expect((page.html.match(/class="quick-win-item"/g) || []).length).toBe(Math.min(6, data.quick_wins.length));
    expect((page.html.match(/class="priority-item"/g) || []).length).toBe(Math.min(4, data.priority_recommendations.length));
    data.executive_summary.key_strengths.forEach((s, i) => expect(page.html).toContain(`data-editable-key="assessment.executive_summary.key_strengths.${i}"`));
  });

  test('missing parts are hidden, not filled', () => {
    const slim = { overall: { score: 60, grade: 'C' }, categories: { social_media: { score: 60, grade: 'C' } } };
    const html = render(CONTENT, slim).html;
    expect((html.match(/class="grade-breakdown-item"/g) || []).length).toBe(1);
    expect(html).not.toContain('executive-summary');
    expect(html).not.toContain('quick-wins-grid');
    expect(html).not.toContain('priority-list');
    expect(html).not.toContain('Assessment data will be populated');
  });
});

describe('every real plan builds', () => {
  const slugs = fs.readdirSync(path.join(ROOT, 'clients')).filter(slug => {
    const p = path.join(ROOT, 'clients', slug, 'plan.md');
    return fs.existsSync(p) && /^## Tactic \d+:/m.test(fs.readFileSync(p, 'utf8'));
  });
  test.each(slugs)('%s converts and builds a structurally valid page (in memory)', slug => {
    const { content } = convertPlan(fs.readFileSync(path.join(ROOT, 'clients', slug, 'plan.md'), 'utf8'), { slug });
    const r = renderDashboard(content, { template: TEMPLATE });
    expect(r.problems).toEqual([]);
    expect(validateDashboardV2(r.html, content)).toEqual([]);
    expect(Object.values(pageData(content).checks.byTactic).every(ids => ids.length > 0)).toBe(true);
  });
});
