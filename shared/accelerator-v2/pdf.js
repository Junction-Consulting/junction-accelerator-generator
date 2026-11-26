/**
 * Accelerator v2 PDFs (DESIGN-BRIEF.md section 8): the 90-day plan and the
 * assessment report, built from the same content.json, assessment record,
 * components and tokens as the dashboard.
 *
 *   renderPlanPdf(content, { template, assetUrl, assetBase, assessment })      -> html
 *   renderAssessmentPdf(content, { template, assetBase, assessment, date })   -> html | ''
 *
 * The result is a complete HTML page in template/v2/pdf.html, styled by
 * assets/v2/print.css. The dashboard's "Download as PDF" opens it with the
 * browser's print dialog; a PDF service can render the same HTML later.
 *
 * Shows what the dashboard shows, laid out for paper: every step open with
 * its media, empty tick boxes, every assessment area open. Nothing the
 * dashboard does not show.
 *
 * Pure: no filesystem, network or environment.
 */

import * as C from './components.js';
import { programDays, formatDate, mapProgress } from './render.js';
import Model from '../../assets/v2/progress-model.js';

const { scoreLevel } = Model;
const has = text => typeof text === 'string' && text.trim() !== '';
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n, one, many = `${one}s`) => `${NUMBER_WORDS[n] || n} ${n === 1 ? one : many}`;
const levelKey = grade => { const l = scoreLevel(grade); return l ? l.key : 'none'; };
const cssString = text => `"${String(text).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

function fill(template, values) {
  return template.replace(/\{\{([A-Z0-9_]+)\}\}/g, (m, name) => (name in values ? values[name] : ''));
}

function page(template, { kind, title, header, slug, assetBase, body }) {
  return fill(template, {
    TITLE: C.attr(title),
    HEADER: C.attr(cssString(header)),
    CLIENT_SLUG: C.attr(slug),
    ASSET_BASE: C.attr(assetBase),
    DOCUMENT: kind,
    BODY: body
  });
}

function cover({ assetBase, title, client, lines, foot }) {
  return `<section class="pdf-cover">
  <img class="pdf-cover-wordmark" src="${C.attr(assetBase)}/junction-wordmark-reverse.png" alt="Junction">
  <div class="pdf-cover-main">
    <div class="pdf-cover-label">Accelerator</div>
    <h1 class="pdf-cover-title">${title}</h1>
    <div class="pdf-cover-client">${C.attr(client)}</div>
    ${lines.map(l => `<div class="pdf-cover-meta">${l}</div>`).join('\n    ')}
  </div>
  <div class="pdf-cover-foot">${foot}</div>
</section>`;
}

const list = (items, tag = 'ul') => (items.length ? `<${tag} class="pdf-list">${items.map(i => `<li>${i}</li>`).join('')}</${tag}>` : '');

// ── The 90-day plan ────────────────────────────────────────────────────────

/** A step's media for paper: everything as on the dashboard, but a video is its title and address. */
function printMedia(media, assetUrl) {
  const out = [];
  let run = [];
  const flush = () => { if (run.length) out.push(C.mediaList(run, assetUrl)); run = []; };
  (media || []).forEach(entry => {
    if (entry.type !== 'video') { run.push(entry); return; }
    flush();
    const url = entry.provider === 'vimeo' ? `https://vimeo.com/${entry.video_id}` : `https://www.youtube.com/watch?v=${entry.video_id}`;
    out.push(`<figure class="media media--video"><div class="media-frame"><div class="media-bar"><span class="media-bar-text">${entry.provider === 'vimeo' ? 'vimeo.com' : 'youtube.com'}</span></div><div class="pdf-video"><strong>Video: ${C.plain(entry.title)}</strong><span class="pdf-url">${C.attr(url)}</span></div></div>${has(entry.caption) ? `<figcaption class="media-caption">${C.plain(entry.caption)}</figcaption>` : ''}</figure>`);
  });
  flush();
  // Paper has no lightbox, and every image must load before printing
  return out.length ? `<div class="pdf-media">${out.join('\n').replace(/ class="lightbox-trigger" onclick="openLightbox\(this\.src, this\.alt\)"/g, '').replace(/ loading="lazy"/g, '')}</div>` : '';
}

function bulletItems(block) {
  const items = [];
  (block.items || []).forEach(item => {
    items.push(`<li>${C.md(item.text)}</li>`);
    (item.children || []).forEach(child => items.push(`<li class="tactic-step-sub">${C.md(child.text)}</li>`));
  });
  return `<ul class="pdf-list">${items.join('')}</ul>`;
}

function printStep(step, number, weeks, assetUrl) {
  const meta = [step.time, step.cost].filter(has).map(C.plain);
  if (weeks && weeks.length) meta.push(weeks.length === 1 ? `week ${weeks[0]}` : `weeks ${weeks.join(', ')}`);
  const chips = (step.tags || []).map(t => `<span class="pdf-chip pdf-chip--${C.attr(t)}">${t === 'contractor' ? 'Contractor' : t === 'critical' ? 'Critical' : C.plain(t)}</span>`).join(' ');
  const blocks = (step.body || []).map(b => (b.type === 'table' ? C.plainTable(b.columns, b.rows) : bulletItems(b)));
  const links = (step.links || []).map(l => `<span><a href="${C.attr(l.url)}">${C.plain(l.title)}</a> <span class="pdf-url">${C.attr(l.url)}</span></span>`);
  // The title and the first block are kept together on one page
  // The number sits inside the opening block, so it always moves with the title
  return `<div class="pdf-step" id="pdf-${C.attr(step.id)}">
      <div class="pdf-step-main">
        <div class="pdf-step-start">
          <div class="pdf-step-num">${number}</div>
          <div class="pdf-step-title"><span class="pdf-h3">${C.plain(step.title)}</span>${meta.length ? `<span class="pdf-muted"> · ${meta.join(' · ')}</span>` : ''}${chips ? ` ${chips}` : ''}</div>
          ${blocks[0] || ''}
        </div>
        ${blocks.slice(1).join('\n        ')}
        ${links.length ? `<div class="pdf-block">${links.join('')}</div>` : ''}
        ${printMedia(step.media, assetUrl)}
      </div>
    </div>`;
}

function printTactic(tactic, n, stepWeeks, assetUrl) {
  let number = 0;
  const prose = (key, title) => ((tactic[key] || []).length ? `<div class="pdf-block"><h2 class="pdf-h3">${title}</h2><p>${C.paragraphs(tactic[key])}</p></div>` : '');
  const heard = (tactic.what_we_heard || []).length
    ? `<div class="pdf-box pdf-box--sage pdf-block"><h2 class="pdf-h3">What we heard from you</h2><p>${C.paragraphs(tactic.what_we_heard)}</p>${has(tactic.heard_quote) ? `<p class="pdf-quote">“${C.plain(tactic.heard_quote)}”</p>` : ''}</div>` : '';
  const metrics = tactic.metrics && (tactic.metrics.rows || []).length ? `<div class="pdf-block"><h2 class="pdf-h3">Success metrics</h2>${C.plainTable(tactic.metrics.columns, tactic.metrics.rows)}</div>` : '';
  const tips = (tactic.tips || []).length ? `<div class="pdf-box pdf-box--sage25 pdf-block"><h2 class="pdf-h3">Tips</h2>${list(tactic.tips.map(C.md))}</div>` : '';
  const resources = (tactic.resources || []).length
    ? `<div class="pdf-block"><h2 class="pdf-h3">Resources</h2>${list(tactic.resources.map(r => `<a href="${C.attr(r.url)}">${C.plain(r.title)}</a>${has(r.description) ? `: ${C.md(r.description)}` : ''} <span class="pdf-url">${C.attr(r.url)}</span>`))}</div>` : '';
  const parts = (tactic.parts || []).map((p, i) => `<div class="pdf-part pdf-block">
      <h2 class="pdf-h2 pdf-rule">Part ${String.fromCharCode(65 + i)}: ${C.plain(p.name)}</h2>
      ${p.steps.map(s => { number += 1; return printStep(s, number, stepWeeks.get(s.id), assetUrl); }).join('\n')}
    </div>`).join('\n');
  return `<section class="pdf-section">
    <div class="pdf-tactic-head pdf-keep-next">
      <div class="pdf-label">Tactic ${n}${has(tactic.phase_label) ? ` · ${C.plain(tactic.phase_label)}` : ''}</div>
      <h1 class="pdf-h1">${C.plain(tactic.title)}</h1>
      ${has(tactic.subtitle) ? `<p class="pdf-muted">${C.md(tactic.subtitle)}</p>` : ''}
    </div>
    ${prose('what_this_is', 'What this is')}
    ${heard}
    ${prose('why_it_matters', 'Why it matters')}
    ${metrics}
    ${tips}
    ${resources}
    ${parts}
  </section>`;
}

export function renderPlanPdf(content, options = {}) {
  const { template } = options;
  if (!template) throw new Error('renderPlanPdf needs the template text');
  const assetBase = options.assetBase || '/assets/v2';
  const assetUrl = options.assetUrl || (id => `/clients/${content.client.slug}/assets/${id}`);
  const { client, strategy, objectives, tactics, phases, roadmap, program } = content;
  const days = programDays(program.weeks);
  const { stepTactic } = mapProgress(content);
  const stepNumber = {};
  tactics.forEach(t => { let n = 0; t.parts.forEach(p => p.steps.forEach(s => { n += 1; stepNumber[s.id] = n; })); });
  const stepWeeks = new Map();
  roadmap.weeks.forEach(w => w.actions.forEach(a => {
    if (!stepTactic.has(a.how_to)) return;
    const l = stepWeeks.get(a.how_to) || [];
    if (!l.includes(w.number)) l.push(w.number);
    stepWeeks.set(a.how_to, l);
  }));
  const tasks = roadmap.weeks.reduce((n, w) => n + w.actions.length, 0);
  const qw = content.quick_wins || { groups: [] };
  const hasWins = (qw.groups || []).length > 0;
  const tacticNumber = new Map(tactics.map((t, i) => [t.id, i + 1]));

  const strategyPage = `<section class="pdf-section">
    <h1 class="pdf-h1">Your ${days}-day strategy</h1>
    <div class="pdf-box pdf-box--dark pdf-block"><h2 class="pdf-h3 pdf-gold">Your goal</h2><p>${C.paragraphs(strategy.goal)}</p></div>
    ${(strategy.positioning || []).length ? `<div class="pdf-block"><h2 class="pdf-h2">Your positioning</h2><p>${C.paragraphs(strategy.positioning)}</p></div>` : ''}
    ${has(strategy.positioning_statement) ? `<div class="pdf-box pdf-box--sage"><p class="pdf-quote">“${C.md(strategy.positioning_statement)}”</p></div>` : ''}
    <div class="pdf-block">
      <h2 class="pdf-h2 pdf-rule">Your ${NUMBER_WORDS[objectives.length] || objectives.length} objective${objectives.length === 1 ? '' : 's'}</h2>
      ${objectives.map(o => {
        const t = tactics[(tacticNumber.get(o.tactic) || 0) - 1];
        const weeks = o.weeks && o.weeks.length === 2 ? ` · weeks ${o.weeks[0]} to ${o.weeks[1]}` : '';
        return `<div class="pdf-block pdf-keep-together"><h3 class="pdf-h3">${C.plain(o.title)}</h3><p>${C.md(o.description)}</p>${t ? `<p class="pdf-meta">${C.plain(t.short_label || t.title)}${weeks}</p>` : ''}</div>`;
      }).join('\n      ')}
    </div>
  </section>`;

  const suffix = a => {
    if (a.how_to === 'quick_wins') return hasWins ? ' <span class="pdf-muted">· Google profile and website wins</span>' : '';
    const t = stepTactic.get(a.how_to);
    return t ? ` <span class="pdf-muted">· ${C.plain(tactics[t - 1].short_label || tactics[t - 1].title)}, step ${stepNumber[a.how_to]}</span>` : '';
  };
  const roadmapPage = `<section class="pdf-section">
    <h1 class="pdf-h1">${days}-day roadmap</h1>
    <p class="pdf-muted">Tick each action as you finish it.</p>
    ${phases.map((p, i) => `<div class="pdf-block">
      <h2 class="pdf-h2">Month ${i + 1} · ${C.plain(p.name)}</h2>
      ${roadmap.weeks.filter(w => w.number >= p.weeks[0] && w.number <= p.weeks[1]).map(w => `<div class="pdf-week-block">
        <div class="pdf-week"><b>${w.number}</b><span class="pdf-h3">${C.plain(w.title)}</span></div>
        ${w.actions.map(a => `<div class="pdf-tick"><i></i><span>${C.md(a.text)}${suffix(a)}</span></div>`).join('\n        ')}
      </div>`).join('\n      ')}
      <div class="pdf-notes">Notes</div>
    </div>`).join('\n    ')}
  </section>`;

  const winsPage = hasWins ? `<section class="pdf-section">
    <h1 class="pdf-h1">Google profile and website wins</h1>
    ${has(qw.intro) ? `<p class="pdf-muted">${C.md(qw.intro)}</p>` : ''}
    ${qw.groups.map(g => `<div class="pdf-block"><h2 class="pdf-h3">${C.plain(g.title)}</h2>${g.items.map(it => `<div class="pdf-tick"><i></i><span>${has(it.title) ? `<strong>${C.plain(it.title)}.</strong> ` : ''}${C.md(it.text)}</span></div>`).join('')}</div>`).join('\n    ')}
    ${qw.note && has(qw.note.text) ? `<div class="pdf-box pdf-box--sage25">${has(qw.note.title) ? `<strong>${C.plain(qw.note.title)}.</strong> ` : ''}${C.md(qw.note.text)}</div>` : ''}
  </section>` : '';

  const body = `${cover({
    assetBase,
    title: `Your ${days}-day plan`,
    client: client.name,
    lines: [],
    // The goal opens the strategy page; a plan's goal can be several paragraphs, too long for a cover
    foot: `<div class="pdf-cover-meta">${count(tactics.length, 'tactic').replace(/^./, ch => ch.toUpperCase())} · ${count(program.weeks, 'week')} · ${tasks} tasks</div>`
  })}
<main class="pdf-sheet">
  ${strategyPage}
  ${tactics.map((t, i) => printTactic(t, i + 1, stepWeeks, assetUrl)).join('\n  ')}
  ${roadmapPage}
  ${winsPage}
</main>`;
  return page(template, { kind: 'plan', title: `${days}-day plan: ${client.name}`, header: `${client.name} · ${days}-day plan`, slug: client.slug, assetBase, body });
}

// ── The assessment report ──────────────────────────────────────────────────

const MARKET_TITLES = { visitor_profile: 'Who visits', discovery_journey: 'How they find you', seasonal_considerations: 'Your seasons', trip_integration: 'Where you fit in a trip' };

export function renderAssessmentPdf(content, options = {}) {
  const { template, assessment: data } = options;
  if (!template) throw new Error('renderAssessmentPdf needs the template text');
  if (!C.hasAssessment(data)) return '';
  const assetBase = options.assetBase || '/assets/v2';
  const client = content.client;
  const date = options.date !== undefined ? options.date : formatDate(client.cohort_start);
  const days = programDays(content.program.weeks);
  const o = data.overall;
  const s = data.executive_summary || {};
  const categories = C.ASSESSMENT_CATEGORIES.filter(c => data.categories[c.key]);
  const areaTactic = {};
  content.tactics.forEach(t => (t.assessment_areas || []).forEach(k => { if (!areaTactic[k]) areaTactic[k] = t; }));
  const text = v => C.attr(v == null ? '' : v);
  const score = v => (v != null && v !== '' ? String(Math.round(Number(v))) : '');
  const share = cat => (typeof cat.weight === 'number' ? `${Math.round(cat.weight * 100)}%` : '');
  const grade = g => `${text(g)}${scoreLevel(g) ? ` ${scoreLevel(g).word}` : ''}`;

  const summary = `<section class="pdf-section">
    <h1 class="pdf-h1">Summary</h1>
    <div class="pdf-summary-top">
      <div class="pdf-donut pdf-level--${levelKey(o.grade)}" style="--pct:${Number(o.score) || 0}"><span>${score(o.score)}</span></div>
      <div class="pdf-block">
        <h2 class="pdf-h2">Overall grade ${grade(o.grade)}</h2>
        ${has(s.headline) ? `<p>${text(s.headline)}</p>` : ''}
      </div>
    </div>
    ${(s.key_strengths || []).length || (s.critical_gaps || []).length ? `<div class="pdf-columns">
      ${(s.key_strengths || []).length ? `<div><h2 class="pdf-h3">Key strengths</h2>${list(s.key_strengths.map(text))}</div>` : ''}
      ${(s.critical_gaps || []).length ? `<div><h2 class="pdf-h3">Critical gaps</h2>${list(s.critical_gaps.map(text))}</div>` : ''}
    </div>` : ''}
    ${has(s.bottom_line) ? `<div class="pdf-box pdf-box--dark"><span class="pdf-gold">Bottom line.</span> ${text(s.bottom_line)}</div>` : ''}
    <div class="pdf-block">
      <h2 class="pdf-h3">Scores by area</h2>
      <div class="pdf-areas">
        <div class="pdf-area-row pdf-area-row--head"><span>Area</span><span>Score</span><span>Grade</span><span></span><span>Share</span></div>
        ${categories.map(c => { const cat = data.categories[c.key]; return `<div class="pdf-area-row pdf-level--${levelKey(cat.grade)}"><span>${text(c.title)}</span><span class="pdf-score">${score(cat.score)}</span><span>${text(cat.grade || '')}</span><span class="pdf-bar"><i style="--pct:${Number(cat.score) || 0}"></i></span><span>${share(cat)}</span></div>`; }).join('\n        ')}
      </div>
    </div>
  </section>`;

  const areas = categories.map(c => {
    const cat = data.categories[c.key];
    const t = areaTactic[c.key];
    const sources = [...new Set([...(cat.dataSources || []), ...(cat.data_sources || [])])];
    const metrics = (cat.metrics || []).map(m => `<div class="pdf-num"><b>${text(m.value)}</b><small>${text(m.label)}</small></div>`).join('');
    const found = (cat.findings || []).map(f => text(f.text));
    const recs = (cat.recommendations || []).map(r => text(typeof r === 'string' ? r : r.text));
    return `<section class="pdf-section">
    <div class="pdf-area-head pdf-level--${levelKey(cat.grade)}"><h1 class="pdf-h1">${text(c.title)}</h1><div class="pdf-area-score"><b>${score(cat.score)}</b><span>Grade ${grade(cat.grade)}</span></div></div>
    ${has(cat.summary) || share(cat) ? `<p>${has(cat.summary) ? text(cat.summary.trim()) + (/[.!?]$/.test(cat.summary.trim()) ? '' : '.') : ''}${share(cat) ? ` This area counts for ${share(cat)} of the overall score.` : ''}</p>` : ''}
    ${metrics ? `<div class="pdf-nums">${metrics}</div>` : ''}
    ${found.length || recs.length ? `<div class="pdf-columns">
      ${found.length ? `<div><h2 class="pdf-h3">What we found</h2>${list(found)}</div>` : ''}
      ${recs.length ? `<div><h2 class="pdf-h3">What we recommend</h2>${list(recs, 'ol')}</div>` : ''}
    </div>` : ''}
    ${t ? `<div class="pdf-box pdf-box--sage">In your plan, this area is covered by <strong>${C.plain(t.title)}</strong>.</div>` : ''}
    ${sources.length ? `<p class="pdf-meta">Sources: ${text(sources.join(', '))}.</p>` : ''}
  </section>`;
  }).join('\n  ');

  const wins = (data.quick_wins || []).length ? `<section class="pdf-section">
    <h1 class="pdf-h1">Quick wins</h1>
    <p class="pdf-muted">Immediate actions you can complete today.</p>
    ${data.quick_wins.map(w => `<div class="pdf-tick"><i></i><span><strong>${text(w.task)}</strong>${has(w.impact) ? `<br>${text(w.impact)}` : ''}${has(w.time_estimate) ? ` <span class="pdf-muted">· ${text(w.time_estimate)}</span>` : ''}</span></div>`).join('\n    ')}
  </section>` : '';

  const recs = data.priority_recommendations || [];
  const words = v => String(v || '').replace(/^./, ch => ch.toUpperCase());
  const priorities = recs.length ? `<section class="pdf-section">
    <h1 class="pdf-h1">Priority recommendations</h1>
    <p class="pdf-muted">The changes that will make the biggest difference, in order.</p>
    ${C.plainTable(['Recommendation', 'Area', 'Time', 'Impact', 'Expected result'], recs.map((r, i) => [`${i + 1}. ${r.text || r.title || ''}`, r.category || '', r.time_estimate || '', words(r.impact), r.expected_result || '']), '', text)}
  </section>` : '';

  const ctx = data.tourism_context || {};
  const market = Object.keys(MARKET_TITLES).filter(k => has(ctx[k]));
  const marketPage = market.length ? `<section class="pdf-section">
    <h1 class="pdf-h1">Your visitors and market</h1>
    <div class="pdf-market">${market.map(k => `<div class="pdf-box pdf-box--sunken pdf-block"><h2 class="pdf-h3">${MARKET_TITLES[k]}</h2><p>${text(ctx[k])}</p></div>`).join('')}</div>
  </section>` : '';

  const body = `${cover({
    assetBase,
    title: 'Digital marketing assessment',
    client: client.name,
    lines: has(date) ? [text(date)] : [],
    foot: `<div class="pdf-cover-score"><b>${score(o.score)}</b><div>out of 100<br><span class="pdf-cover-meta">Overall grade ${grade(o.grade)}</span></div></div>`
  })}
<main class="pdf-sheet">
  ${summary}
  ${areas}
  ${wins}
  ${priorities}
  ${marketPage}
</main>`;
  return page(template, { kind: 'assessment', title: `Assessment: ${client.name}`, header: `${client.name} · Assessment`, slug: client.slug, assetBase, body });
}

