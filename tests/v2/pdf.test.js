/**
 * Accelerator v2 PDFs (DESIGN-BRIEF.md section 8): the 90-day plan and the
 * assessment report, built from content.json and the assessment record.
 */

const fs = require('fs');
const path = require('path');

const { renderPlanPdf, renderAssessmentPdf } = require('../../shared/accelerator-v2/pdf.js');
const { renderDashboard } = require('../../shared/accelerator-v2/render.js');
const { convertPlan } = require('../../shared/accelerator-v2/convert.js');
const { allSteps } = require('../../shared/accelerator-v2/checks.js');
const { findAsset } = require('../../shared/accelerator-v2/repo.js');
const C = require('../../shared/accelerator-v2/components.js');

const ROOT = path.join(__dirname, '..', '..');
const PDF_TEMPLATE = fs.readFileSync(path.join(ROOT, 'template', 'v2', 'pdf.html'), 'utf8');
const PAGE_TEMPLATE = fs.readFileSync(path.join(ROOT, 'template', 'v2', 'accelerator.html'), 'utf8');
const PRINT_CSS = fs.readFileSync(path.join(ROOT, 'assets', 'v2', 'print.css'), 'utf8');
const TOKENS = fs.readFileSync(path.join(ROOT, 'assets', 'v2', 'tokens.css'), 'utf8');
const CONTENT = JSON.parse(fs.readFileSync(path.join(ROOT, 'clients', 'andreas-resort', 'content.json'), 'utf8'));
const ASSESSMENT = JSON.parse(fs.readFileSync(path.join(ROOT, 'clients', 'andreas-resort', 'assessment.json'), 'utf8')).assessment_data;
const assetUrl = id => `/${path.relative(ROOT, findAsset(ROOT, 'andreas-resort', id)).split(path.sep).join('/')}`;
const plan = (content = CONTENT) => renderPlanPdf(content, { template: PDF_TEMPLATE, assetUrl });
const report = (assessment = ASSESSMENT, content = CONTENT) => renderAssessmentPdf(content, { template: PDF_TEMPLATE, assessment });
const copy = () => JSON.parse(JSON.stringify(CONTENT));
const token = name => (new RegExp(`--${name}:\\s*([^;]+);`).exec(TOKENS) || [])[1];

describe('the sandbox PDFs', () => {
  test('clients/andreas-resort/pdf/ holds what the generator builds', () => {
    expect(fs.readFileSync(path.join(ROOT, 'clients', 'andreas-resort', 'pdf', 'plan.html'), 'utf8')).toBe(plan());
    expect(fs.readFileSync(path.join(ROOT, 'clients', 'andreas-resort', 'pdf', 'assessment.html'), 'utf8')).toBe(report());
  });

  test('a complete page: no unfilled slot, the client slug, login, the print stylesheet', () => {
    [plan(), report()].forEach(html => {
      expect(html).not.toMatch(/\{\{[A-Z_]+\}\}/);
      expect(html).toContain('data-client-slug="andreas-resort"');
      expect(html).toContain('<script src="/shared/auth.js"></script>');
      expect(html).toContain('<link rel="stylesheet" href="/assets/v2/print.css">');
      expect(html).not.toMatch(/<style[\s>]|<input|<button|onclick=/);
    });
  });

  test('a running header per client and document', () => {
    expect(plan()).toContain('style="--pdf-header:&quot;Andrea&#039;s Resort · 90-day plan&quot;"');
    expect(report()).toContain('style="--pdf-header:&quot;Andrea&#039;s Resort · Assessment&quot;"');
  });
});

describe('the 90-day plan', () => {
  const html = plan();

  test('a Carbon cover with the reversed wordmark, the title, the client and the size of the plan', () => {
    const cover = html.slice(html.indexOf('<section class="pdf-cover">'), html.indexOf('</section>', html.indexOf('<section class="pdf-cover">')));
    expect(cover).toContain('junction-wordmark-reverse.png');
    expect(cover).toContain('<h1 class="pdf-cover-title">Your 90-day plan</h1>');
    expect(cover).toContain("Andrea&#039;s Resort");
    expect(cover).toContain('Four tactics · twelve weeks · 34 tasks');
  });

  test('strategy, then every tactic, then the roadmap, then the wins', () => {
    const order = ['Your 90-day strategy', ...CONTENT.tactics.map(t => C.plain(t.title)), '90-day roadmap', 'Google profile and website wins'].map(t => html.indexOf(t));
    order.forEach((i, k) => { expect(i).toBeGreaterThan(-1); if (k) expect(i).toBeGreaterThan(order[k - 1]); });
  });

  test('every step is open: its title, every bullet and every media item', () => {
    allSteps(CONTENT).forEach(({ step }) => {
      expect(html).toContain(`id="pdf-${step.id}"`);
      expect(html).toContain(C.plain(step.title));
      step.body.filter(b => b.type === 'bullets').forEach(b => b.items.forEach(i => expect(html).toContain(C.md(i.text))));
      (step.media || []).forEach(m => {
        if (m.type === 'video') expect(html).toContain(`Video: ${C.plain(m.title)}`);
        else expect(html).toContain(`data-media-id="${m.id}"`);
      });
    });
  });

  test('the pull quote and the resources with their descriptions', () => {
    CONTENT.tactics.forEach(t => expect(html).toContain(`<p class="pdf-quote">“${t.heard_quote}”</p>`));
    expect(html).toContain('free scheduling for both accounts');
  });

  test('the roadmap and the wins have one empty tick box per item', () => {
    const actions = CONTENT.roadmap.weeks.reduce((n, w) => n + w.actions.length, 0);
    const wins = CONTENT.quick_wins.groups.reduce((n, g) => n + g.items.length, 0);
    expect((html.match(/<div class="pdf-tick"><i><\/i>/g) || []).length).toBe(actions + wins);
    expect(html).toContain('<span class="pdf-muted">· Social Media, step 1</span>');
    expect(html).toContain(CONTENT.quick_wins.intro.slice(0, 40));
  });

  test('shows nothing the dashboard does not', () => {
    const c = copy();
    c.tactics[0].time_commitment = { amount: 'Zqx hours', detail: '' };
    c.roadmap.closing = 'Zqx closing';
    c.phases[0].description = 'Zqx phase';
    expect(plan(c)).not.toMatch(/Zqx/);
  });
});

describe('the assessment report', () => {
  const html = report();

  test('a cover with the score and the grade, then the summary', () => {
    expect(html).toContain(`<div class="pdf-cover-score"><b>${ASSESSMENT.overall.score}</b>`);
    expect(html).toContain('Overall grade C Fair');
    expect(html).toContain(C.attr(ASSESSMENT.executive_summary.bottom_line));
  });

  test('every area open: numbers, every finding, every recommendation, sources, and its tactic', () => {
    Object.entries(ASSESSMENT.categories).forEach(([key, cat]) => {
      (cat.metrics || []).forEach(m => expect(html).toContain(`<b>${C.attr(m.value)}</b><small>${C.attr(m.label)}</small>`));
      (cat.findings || []).forEach(f => expect(html).toContain(C.attr(f.text)));
      (cat.recommendations || []).forEach(r => expect(html).toContain(C.attr(typeof r === 'string' ? r : r.text)));
    });
    expect(html).toContain('In your plan, this area is covered by <strong>Social Media Activation</strong>.');
    expect(html).toContain('This area counts for 20% of the overall score.');
  });

  test('quick wins with tick boxes, the priority table and the market notes', () => {
    expect((html.match(/<div class="pdf-tick"><i><\/i>/g) || []).length).toBe(ASSESSMENT.quick_wins.length);
    expect(html).toContain('<th scope="col">Recommendation</th><th scope="col">Area</th><th scope="col">Time</th><th scope="col">Impact</th><th scope="col">Expected result</th>');
    Object.values(ASSESSMENT.tourism_context).forEach(t => expect(html).toContain(C.attr(t)));
  });

  test('no confidence and no score breakdown', () => {
    expect(html).not.toMatch(/confidence/i);
    expect(html).not.toContain('Posting frequency</th>');
  });

  test('no assessment record, no report', () => {
    expect(report(null)).toBe('');
    expect(report({})).toBe('');
  });
});

describe('the page rules (print.css)', () => {
  test('letter size, margins that match the tokens, header and page numbers', () => {
    expect(PRINT_CSS).toMatch(/@page \{\s*size: letter;\s*margin: \.9in \.75in \.8in;/);
    expect([token('pdf-margin-top'), token('pdf-margin-side'), token('pdf-margin-bottom')]).toEqual(['.9in', '.75in', '.8in']);
    expect(PRINT_CSS).toContain('@top-right { content: var(--pdf-header);');
    expect(PRINT_CSS).toContain('@bottom-right { content: counter(page);');
    expect(PRINT_CSS).toMatch(/@page cover \{\s*margin: 0;/);
  });

  test('steps keep their title, media stays with its step, tables repeat their header, headings never end a page', () => {
    expect(PRINT_CSS).toContain('.pdf-step-start { position: relative; break-inside: avoid;');
    expect(PRINT_CSS).toContain('.pdf-step-main > .pdf-media { break-before: avoid;');
    expect(PRINT_CSS).toContain('.pdf .media { max-width: var(--pdf-media-max); display: flex; flex-direction: column; gap: var(--pdf-gap-xs); break-inside: avoid; }');
    expect(PRINT_CSS).toContain('.pdf .plain-table thead { display: table-header-group; }');
    expect(PRINT_CSS).toContain('.pdf-h1, .pdf-h2, .pdf-h3, .pdf-keep-next { break-after: avoid;');
    expect(PRINT_CSS).toContain('.pdf-h1, .pdf-h2, .pdf-h3, .pdf-step-title, .pdf-week { break-inside: avoid;');
  });

  test('body text is never below 11pt', () => {
    expect(token('pdf-body')).toBe('11pt');
    expect(token('pdf-small')).toBe('11pt');
    expect(PRINT_CSS).toMatch(/\.pdf \{[^}]*font-size: var\(--pdf-body\);/);
  });
});

describe('"Download as PDF"', () => {
  test('opens the PDF template with the print dialog', () => {
    const page = renderDashboard(CONTENT, { template: PAGE_TEMPLATE, assetUrl, assessment: ASSESSMENT });
    expect(page.data.pdfBase).toBe('/clients/andreas-resort/pdf');
    const js = fs.readFileSync(path.join(ROOT, 'assets', 'v2', 'accelerator.js'), 'utf8');
    expect(js).toContain("window.open(PAGE.pdfBase + '/' + file + '?print=1'");
    expect(js).toContain("function printRoadmap() { openPdf('plan.html'); }");
    expect(js).toContain("function downloadPDF() { openPdf('assessment.html'); }");
    expect(fs.readFileSync(path.join(ROOT, 'assets', 'v2', 'print.js'), 'utf8')).toContain("get('print') !== '1'");
  });
});

describe('every real plan has a plan PDF', () => {
  const slugs = fs.readdirSync(path.join(ROOT, 'clients')).filter(slug => {
    const p = path.join(ROOT, 'clients', slug, 'plan.md');
    return fs.existsSync(p) && /^## Tactic \d+:/m.test(fs.readFileSync(p, 'utf8'));
  });
  test.each(slugs)('%s: every step, every action as a tick box, no unfilled slot', slug => {
    const { content } = convertPlan(fs.readFileSync(path.join(ROOT, 'clients', slug, 'plan.md'), 'utf8'), { slug });
    const html = renderPlanPdf(content, { template: PDF_TEMPLATE });
    expect(html).not.toMatch(/\{\{[A-Z_]+\}\}|undefined|\[object Object\]/);
    allSteps(content).forEach(({ step }) => expect(html).toContain(`id="pdf-${step.id}"`));
    const actions = content.roadmap.weeks.reduce((n, w) => n + w.actions.length, 0);
    const wins = ((content.quick_wins || {}).groups || []).reduce((n, g) => n + g.items.length, 0);
    expect((html.match(/<div class="pdf-tick"><i><\/i>/g) || []).length).toBe(actions + wins);
  });
});
