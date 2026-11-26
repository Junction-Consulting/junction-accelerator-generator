/**
 * Accelerator v2 components. Each recurring piece of the dashboard is one
 * function here, returning an HTML string built from content.json.
 *
 * The markup and class names are the v1 template's, so the v1 look and the
 * shared scripts (progress, Edit Mode, analytics, the tour) keep working.
 *
 * Rules (SCHEMA.md, Principles):
 *   - Content gives words and facts. Labels and layout live here.
 *   - Missing means hidden: a component with no content returns ''.
 *   - Progress keys and edit keys are item IDs, never positions.
 *
 * Pure: no filesystem, network or environment.
 */

import { escapeHtml, inlineMarkdown, stripMarkdown } from '../plan-generator.js';

// ── Text ───────────────────────────────────────────────────────────────────

const CONFIRM = /\[CONFIRM: ([^\]]*)\]/g;
const confirmMark = html => html.replace(CONFIRM, (m, text) => `<mark class="confirm-note">${text}</mark>`);

/** Inline Markdown to safe HTML, with [CONFIRM: ...] as a light highlight. */
export function md(text) {
  return confirmMark(inlineMarkdown(text));
}

/** Plain text for titles and labels (Markdown markers removed), with [CONFIRM] highlighted. */
export function plain(text) {
  return confirmMark(escapeHtml(stripMarkdown(String(text || ''))));
}

/** Paragraphs in one block, as v1 shows them: separated by a blank line. */
export function paragraphs(list) {
  return (list || []).map(md).join('<br><br>');
}

export const attr = text => escapeHtml(String(text ?? ''));
const editKey = key => (key ? ` data-editable-key="${attr(key)}"` : '');
const has = text => typeof text === 'string' && text.trim() !== '';

// ── Icons (drawings, not style values) ─────────────────────────────────────

export const ICONS = {
  chevronPart: '<svg class="tactic-part-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"></path></svg>',
  chevronWeek: '<svg class="week-chevron" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>',
  check: '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>',
  checkSmall: '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  note: '<svg viewBox="0 0 20 20" fill="currentColor"><path d="M13 2.5H3a.5.5 0 00-.5.5v14a.5.5 0 00.5.5h10a.5.5 0 00.5-.5V3a.5.5 0 00-.5-.5zM3 0h10a3 3 0 013 3v14a3 3 0 01-3 3H3a3 3 0 01-3-3V3a3 3 0 013-3zm2 5h6v2H5V5zm0 4h6v2H5V9z"/></svg>',
  noteOutline: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 2.5H3C2.17157 2.5 1.5 3.17157 1.5 4V12C1.5 12.8284 2.17157 13.5 3 13.5H13C13.8284 13.5 14.5 12.8284 14.5 12V4C14.5 3.17157 13.8284 2.5 13 2.5Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 5.5H11.5M4.5 8H9.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  arrowRight: '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd"/></svg>',
  document: '<svg class="tactic-mockup-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg>',
  email: '<svg class="tactic-mockup-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/></svg>',
  // Sidebar icons, one per tactic position (they cycle)
  tactics: [
    '<path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>',
    '<path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>',
    '<path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"/>',
    '<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>'
  ]
};

const cycle = (n, size = 4) => ((n - 1) % size) + 1;

// ── Navigation ─────────────────────────────────────────────────────────────

export function navTactic(tactic, n, total) {
  return `<button type="button" class="nav-item" data-page="tactic${n}" onclick="navigate('tactic${n}')"><span class="nav-ring" id="nav-ring-${n}" aria-hidden="true"></span><span class="nav-label">${plain(tactic.short_label || tactic.title)}</span><span class="sr-only" id="nav-ring-${n}-text">, 0 of ${total} done</span></button>`;
}

/** "Email your coach" under the navigation panel. Left out when there is no coach email. */
export function navCoach(email) {
  if (!has(email)) return '';
  return `<a class="nav-coach" href="mailto:${attr(email)}">Email your coach</a>`;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export function phaseCard(phase, n) {
  const desc = has(phase.description) ? `\n            <div class="dash-phase-desc">${plain(phase.description)}</div>` : '';
  return `<div class="dash-phase" data-phase="${n}">
            <div class="dash-phase-range">WEEKS ${phase.weeks[0]}-${phase.weeks[1]}</div>
            <div class="dash-phase-name">${plain(phase.name)}</div>${desc}
          </div>`;
}

export function tacticPill(tactic, n, total) {
  return `<div class="dash-tactic-pill" onclick="navigate('tactic${n}')">
        <svg class="dash-tactic-ring" width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill="none" stroke="var(--surface-sunken)" stroke-width="5"></circle>
          <circle id="tactic${n}-ring" class="dash-tactic-ring-bar" cx="22" cy="22" r="18" fill="none" stroke="var(--tactic-ring-${cycle(n)})" stroke-width="5" stroke-linecap="round" stroke-dasharray="113.1" stroke-dashoffset="113.1"></circle>
        </svg>
        <div class="dash-tactic-info">
          <div class="dash-tactic-name">${plain(tactic.short_label || tactic.title)}</div>
          <div class="dash-tactic-label" id="tc${n}-stat">0 of ${total} done</div>
        </div>
      </div>`;
}

// ── Strategy ───────────────────────────────────────────────────────────────

export function objectiveCard(objective, n, tacticNumber) {
  const pill = tacticNumber ? `Tactic ${tacticNumber} · Weeks ${objective.weeks[0]}-${objective.weeks[1]}` : '';
  return `<div class="strategy-objective-card" style="--obj-color:var(--objective-color-${cycle(n)})">
          <div class="strategy-objective-num">${String(n).padStart(2, '0')}</div>
          <div class="strategy-objective-content">
            <h3 class="strategy-objective-title"${editKey(`${objective.id}.title`)}>${plain(objective.title)}</h3>
            <p class="strategy-objective-desc"${editKey(`${objective.id}.description`)}>${md(objective.description)}</p>
            ${pill ? `<span class="strategy-objective-pill">${pill}</span>` : ''}
          </div>
        </div>`;
}

export function tacticOverviewCard(tactic, n) {
  const label = has(tactic.phase_label) ? `<div class="tactic-overview-phase">${plain(tactic.phase_label)}</div>` : '';
  return `<div class="tactic-overview-card" style="--color:var(--tactic-color-${cycle(n)})">
          ${label}
          <h3 class="tactic-overview-title">${plain(tactic.title)}</h3>
          <p class="tactic-overview-desc">${md(tactic.subtitle)}</p>
          <button class="tactic-overview-link" onclick="navigate('tactic${n}')">View full guide ${ICONS.arrowRight}</button>
        </div>`;
}

// ── Tactic page ────────────────────────────────────────────────────────────

export function tacticHeader(tactic, n) {
  const label = has(tactic.phase_label) ? `Tactic ${n} · ${plain(tactic.phase_label)}` : `Tactic ${n}`;
  const tabs = [['overview', 'Overview'], ['steps', 'Implementation Steps'], ['metrics', 'Success Metrics'], ['tips', 'Tips &amp; Resources']];
  return `<div class="tactic-hero" data-tactic="${n}">
      <div class="tactic-hero-top">
        <div class="tactic-hero-meta">
          <span class="tactic-hero-label">${label}</span>
          <span class="tactic-hero-status" id="t${n}-status">Not Started</span>
        </div>
        <div class="tactic-hero-progress">
          <svg class="tactic-hero-ring" viewBox="0 0 80 80">
            <circle class="tactic-hero-ring-bg" cx="40" cy="40" r="31"></circle>
            <circle class="tactic-hero-ring-bar" id="t${n}-ring" cx="40" cy="40" r="31" transform="rotate(-90 40 40)"></circle>
          </svg>
          <div>
            <div class="tactic-hero-pct" id="t${n}-pct">0%</div>
            <div class="tactic-hero-pct-label">of this tactic</div>
          </div>
        </div>
      </div>
      <h1${editKey(`${tactic.id}.title`)}>${plain(tactic.title)}</h1>
      <p${editKey(`${tactic.id}.subtitle`)}>${md(tactic.subtitle)}</p>
      <div class="tactic-tabs" role="tablist" aria-label="Tactic ${n} sections">
        ${tabs.map(([tab, name], i) => `<button class="tactic-tab${i === 0 ? ' active' : ''}" id="tab-t${n}-${tab}" role="tab" aria-selected="${i === 0}" aria-controls="panel-t${n}-${tab}" data-tactic-tab="${n}" data-tab="${tab}" onclick="switchTacticTab(${n}, '${tab}')">${name}</button>`).join('\n        ')}
      </div>
    </div>`;
}

function cardBlock(label, inner, extraClass = '') {
  return `<div class="tactic-card-block${extraClass}">
          <div class="tactic-card-label">${label}</div>
          ${inner}
        </div>`;
}

export function partCard(part, isLastOdd) {
  const title = part.card && has(part.card.title) ? part.card.title : part.name;
  const titleKey = part.card && has(part.card.title) ? `${part.id}.card.title` : null; // the name is edited in the part header
  const desc = part.card && has(part.card.description)
    ? `\n              <div class="tactic-breakdown-desc"${editKey(`${part.id}.card.description`)}>${plain(part.card.description)}</div>` : '';
  return `<div class="tactic-breakdown-item${isLastOdd ? ' full-width' : ''}">
              <div class="tactic-breakdown-title"${editKey(titleKey)}>${plain(title)}</div>${desc}
            </div>`;
}

export function tacticOverview(tactic) {
  const parts = tactic.parts || [];
  const breakdown = parts.length
    ? cardBlock('What This Breaks Into', `<div class="tactic-breakdown-grid">
            ${parts.map((p, i) => partCard(p, parts.length % 2 === 1 && i === parts.length - 1)).join('\n            ')}
          </div>`)
    : '';
  const tc = tactic.time_commitment;
  const time = tc && has(tc.amount)
    ? cardBlock('Time Commitment', `<div>
            <span class="tactic-time-value">${plain(tc.amount)}</span>${has(tc.detail) ? `\n            <span class="tactic-time-context">${plain(tc.detail)}</span>` : ''}
          </div>`)
    : '';
  const prose = (key, label, extra = '') => ((tactic[key] || []).length
    ? cardBlock(label, `<p${editKey(`${tactic.id}.${key}`)}>${paragraphs(tactic[key])}</p>`, extra) : '');
  return `<div class="tactic-overview-grid">
      <div class="tactic-overview-col">
        ${prose('what_this_is', 'What This Is')}
        ${breakdown}
      </div>
      <div class="tactic-overview-col">
        ${prose('what_we_heard', 'What We Heard From You', ' navy')}
        ${prose('why_it_matters', 'Why It Matters')}
        ${time}
      </div>
    </div>`;
}

// Step labels: time, cost, Contractor, Critical (the v1 .tactic-step-tag pills)
const TAG_LABELS = { contractor: ['Contractor', 'warning'], critical: ['Critical', 'danger'] };

export function stepLabels(step) {
  const labels = [];
  if (has(step.time)) labels.push(`<span class="tactic-step-tag muted">${plain(step.time)}</span>`);
  if (has(step.cost)) labels.push(`<span class="tactic-step-tag info">${plain(step.cost)}</span>`);
  (step.tags || []).forEach(tag => {
    const [label, tone] = TAG_LABELS[tag] || [tag, 'muted'];
    labels.push(`<span class="tactic-step-tag ${tone}">${label}</span>`);
  });
  return labels.length ? `<div class="tactic-step-tags">${labels.join('')}</div>` : '';
}

/** A bullets block: one flat list, sub-bullets marked, as Edit Mode expects. */
export function bullets(block) {
  const items = [];
  (block.items || []).forEach(item => {
    items.push(`<li${editKey(`${item.id}.text`)}>${md(item.text)}</li>`);
    (item.children || []).forEach(child => items.push(`<li class="tactic-step-sub"${editKey(`${child.id}.text`)}>${md(child.text)}</li>`));
  });
  return `<ul class="tactic-step-bullets">
              ${items.join('\n              ')}
            </ul>`;
}

/** A table, in the Success Metrics table style. */
export function table(columns, rows, extraClass = '') {
  return `<div class="tactic-metrics-table${extraClass}">
            <table>
              <thead>
                <tr>${columns.map(c => `<th>${md(c)}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${rows.map(r => `<tr>${r.map(c => `<td>${md(c)}</td>`).join('')}</tr>`).join('\n                ')}
              </tbody>
            </table>
          </div>`;
}

export function stepLinks(step) {
  return (step.links || []).map(l => `<a href="${attr(l.url)}" class="tactic-step-resource" target="_blank" rel="noopener">${plain(l.title)}</a>`).join('\n');
}

export function step(stepData, number, tacticNumber, assetUrl) {
  const body = (stepData.body || []).map(block => (block.type === 'table' ? table(block.columns, block.rows, ' tactic-step-table') : bullets(block))).join('\n            ');
  const media = (stepData.media || []).length
    ? `\n            <div class="tactic-step-media-list">\n              ${mediaList(stepData.media, assetUrl)}\n            </div>` : '';
  const links = stepLinks(stepData);
  return `<li class="tactic-step-item" id="${attr(stepData.id)}" data-step-number="${number}">
          <span class="tactic-step-num">${number}</span>
          <div class="tactic-step-content">
            <div class="tactic-step-title"${editKey(`${stepData.id}.title`)}>${plain(stepData.title)}</div>
            ${stepLabels(stepData)}
            ${body}${links ? `\n            ${links}` : ''}${media}
          </div>
        </li>`;
}

export function part(partData, index, firstNumber, tacticNumber, assetUrl) {
  const count = partData.steps.length;
  const letter = String.fromCharCode(65 + index);
  return `<div class="tactic-part${index === 0 ? ' open' : ''}">
    <button class="tactic-part-header" onclick="toggleTacticPart(this)">
      <span class="tactic-part-tag">Part ${letter}</span>
      <span class="tactic-part-title"${editKey(`${partData.id}.name`)}>${plain(partData.name)}</span>
      <span class="tactic-part-meta">${count} ${count === 1 ? 'step' : 'steps'}</span>
      ${ICONS.chevronPart}
    </button>
    <div class="tactic-part-body">
      <ol class="tactic-steps-list">
        ${partData.steps.map((s, i) => step(s, firstNumber + i, tacticNumber, assetUrl)).join('\n        ')}
      </ol>
    </div>
  </div>`;
}

export function implementationSteps(tactic, tacticNumber, assetUrl) {
  let number = 1;
  const parts = (tactic.parts || []).map((p, i) => {
    const html = part(p, i, number, tacticNumber, assetUrl);
    number += p.steps.length;
    return html;
  });
  return `<div class="tactic-parts-list">\n  ${parts.join('\n  ')}\n</div>`;
}

export function metricsTable(metrics) {
  if (!metrics || !(metrics.rows || []).length) return '';
  return cardBlock('Success Metrics', table(metrics.columns, metrics.rows));
}

export function tips(tactic) {
  if (!(tactic.tips || []).length) return '';
  return cardBlock('Tips', `<ul class="tactic-tips-list">
                ${tactic.tips.map((tip, i) => `<li${editKey(`${tactic.id}.tips.${i}`)}>${md(tip)}</li>`).join('\n                ')}
              </ul>`);
}

export function resources(tactic) {
  if (!(tactic.resources || []).length) return '';
  return cardBlock('Resources', `<ul class="tactic-resources-list">
                ${tactic.resources.map((r, i) => `<li><a href="${attr(r.url)}" data-editable-link="${attr(`${tactic.id}.resources.${i}`)}" target="_blank">${plain(r.title)}</a>${has(r.description) ? `: ${md(r.description)}` : ''}</li>`).join('\n                ')}
              </ul>`);
}

export function tacticPage(tactic, n, assetUrl) {
  const panel = (tab, inner, active = false) => `<div class="tactic-tab-content${active ? ' active' : ''}" id="panel-t${n}-${tab}" role="tabpanel" aria-labelledby="tab-t${n}-${tab}" data-tactic-content="${n}" data-content="${tab}">
        ${inner}
      </div>`;
  const tipsAndResources = `<div class="tactic-overview-grid">
          <div class="tactic-overview-col">
            ${tips(tactic)}
          </div>
          <div class="tactic-overview-col">
            ${resources(tactic)}
          </div>
        </div>`;
  return `<section id="page-tactic${n}" class="page" data-tactic-id="${attr(tactic.id)}">
  <div class="tactic-page-content">
    ${tacticHeader(tactic, n)}
    <div class="tactic-body">
      ${panel('overview', tacticOverview(tactic), true)}
      ${panel('steps', implementationSteps(tactic, n, assetUrl))}
      ${panel('metrics', metricsTable(tactic.metrics))}
      ${panel('tips', tipsAndResources)}
    </div>
  </div>
</section>`;
}

// ── Media ──────────────────────────────────────────────────────────────────

const lightbox = 'class="lightbox-trigger" onclick="openLightbox(this.src, this.alt)"';
const BADGES = { mockup: 'Mockup', example: 'Example' };
const badge = b => (BADGES[b] ? `<span class="tactic-step-media-badge tactic-mockup-badge">${BADGES[b]}</span>` : '');
const caption = c => (has(c) ? `<div class="tactic-mockup-label">${plain(c)}</div>` : '');
const dots = '<span class="tactic-mockup-dot red"></span>\n            <span class="tactic-mockup-dot yellow"></span>\n            <span class="tactic-mockup-dot green"></span>';

function img(entry, assetUrl, zoom = true) {
  return `<img src="${attr(assetUrl(entry.asset))}" alt="${attr(entry.alt)}"${zoom ? ` ${lightbox}` : ''} loading="lazy">`;
}

function chrome(frame, bar, open) {
  if (frame === 'document' || frame === 'email') {
    const label = has(bar) ? bar : (frame === 'email' ? 'Email' : '');
    return `<div class="tactic-mockup-chrome tactic-mockup-chrome--titled">
            ${ICONS[frame]}
            <div class="tactic-mockup-title">${plain(label)}</div>
          </div>`;
  }
  return `<div class="tactic-mockup-chrome">
            ${dots}
            <div class="tactic-mockup-url">${plain(bar)}</div>${open ? '\n            <span class="tactic-mockup-open" aria-hidden="true"><span class="tactic-mockup-open-text">Open site </span>↗</span>' : ''}
          </div>`;
}

export function imageMedia(entry, assetUrl) {
  const frame = entry.frame || 'none';
  const linked = entry.link && entry.link.url;
  if (frame === 'none') {
    return `<figure class="tactic-media-plain" data-media-id="${attr(entry.id)}">
            <div class="tactic-media-plain-body">${badge(entry.badge)}${img(entry, assetUrl)}</div>
            ${caption(entry.caption)}
          </figure>`;
  }
  if (frame === 'phone') {
    return `<figure class="tactic-phone" data-media-id="${attr(entry.id)}">
            <div class="tactic-reel-phone">${badge(entry.badge)}${img(entry, assetUrl)}</div>
            ${has(entry.caption) ? `<figcaption class="tactic-reel-label">${plain(entry.caption)}</figcaption>` : ''}
          </figure>`;
  }
  const classes = ['tactic-mockup'];
  if (frame === 'document') classes.push('tactic-mockup--document');
  if (frame === 'email') classes.push('tactic-mockup--email');
  if (entry.fit === 'full') classes.push('tactic-mockup--page');
  const frameHtml = `<div class="${classes.join(' ')}" data-media-id="${attr(entry.id)}">
          ${chrome(frame, entry.bar, linked)}
          <div class="tactic-mockup-body">
            ${badge(entry.badge)}${img(entry, assetUrl, !linked)}
          </div>
          ${caption(entry.caption)}
        </div>`;
  if (!linked) return frameHtml;
  const label = has(entry.link.label) ? entry.link.label : 'Open site';
  return `<a href="${attr(entry.link.url)}" class="tactic-mockup-link" target="_blank" rel="noopener" aria-label="${attr(`${label}: ${entry.alt} (opens in a new tab)`)}">
        ${frameHtml}
      </a>`;
}

export function videoMedia(entry) {
  const src = entry.provider === 'vimeo'
    ? `https://player.vimeo.com/video/${encodeURIComponent(entry.video_id)}`
    : `https://www.youtube.com/embed/${encodeURIComponent(entry.video_id)}`;
  const host = entry.provider === 'vimeo' ? 'vimeo.com' : 'youtube.com';
  return `<div class="tactic-mockup tactic-embed" data-media-id="${attr(entry.id)}">
          ${chrome('website', host, false)}
          <div class="tactic-mockup-body">
            <iframe src="${src}" title="${attr(entry.title)}" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
          </div>
          ${caption(entry.caption)}
        </div>`;
}

function socialPost(entry, assetUrl) {
  const label = `${has(entry.handle) ? `<strong>${plain(entry.handle)}</strong>` : ''}${plain(entry.post_type)}${entry.url ? ' · <span class="tactic-reel-open">Open post ↗</span>' : ''}`;
  const inner = `<div class="tactic-reel-phone">${img(entry, assetUrl, !entry.url)}</div>
          <div class="tactic-reel-label">${label}</div>`;
  return entry.url
    ? `<a href="${attr(entry.url)}" class="tactic-reel" target="_blank" rel="noopener" aria-label="${attr(`Open post: ${entry.alt} (opens in a new tab)`)}" data-media-id="${attr(entry.id)}">
          ${inner}
        </a>`
    : `<div class="tactic-reel" data-media-id="${attr(entry.id)}">
          ${inner}
        </div>`;
}

export function galleryMedia(entry, assetUrl) {
  return `<div class="tactic-gallery" data-media-id="${attr(entry.id)}">
          ${has(entry.title) ? `<div class="tactic-gallery-title">${plain(entry.title)}</div>` : ''}
          <div class="tactic-gallery-grid">
            ${(entry.items || []).map(item => `<figure class="tactic-gallery-item">${img(item, assetUrl)}${has(item.caption) ? `<figcaption class="tactic-gallery-caption">${plain(item.caption)}</figcaption>` : ''}</figure>`).join('\n            ')}
          </div>
        </div>`;
}

export function groupMedia(entry, assetUrl) {
  return `<div class="tactic-mockup-pair${entry.layout === 'four' ? ' tactic-mockup-four' : ''}" data-media-id="${attr(entry.id)}">
          ${(entry.items || []).map(item => imageMedia(item, assetUrl)).join('\n          ')}
        </div>`;
}

export function linkCardMedia(entry) {
  let host = '';
  try { host = new URL(entry.url).hostname.replace(/^www\./, ''); } catch (e) { host = entry.url; }
  return `<a href="${attr(entry.url)}" class="tactic-mockup-link" target="_blank" rel="noopener" aria-label="${attr(`Open ${entry.title} (opens in a new tab)`)}" data-media-id="${attr(entry.id)}">
        <div class="tactic-mockup">
          ${chrome('website', host, true)}
          <div class="tactic-link-card-body">
            <div class="tactic-link-card-title">${plain(entry.title)}</div>
            ${has(entry.subtitle) ? `<div class="tactic-link-card-subtitle">${plain(entry.subtitle)}</div>` : ''}
          </div>
        </div>
      </a>`;
}

/** Any media entry. Consecutive social posts are grouped in one row by the step. */
export function mediaEntry(entry, assetUrl) {
  switch (entry.type) {
    case 'image': return imageMedia(entry, assetUrl);
    case 'video': return videoMedia(entry);
    case 'social_post': return `<div class="tactic-reel-row">${socialPost(entry, assetUrl)}</div>`;
    case 'gallery': return galleryMedia(entry, assetUrl);
    case 'group': return groupMedia(entry, assetUrl);
    case 'link_card': return linkCardMedia(entry);
    default: return '';
  }
}

/** A step's media, in order. Social posts next to each other share one row. */
export function mediaList(list, assetUrl) {
  const out = [];
  let row = null;
  for (const entry of list) {
    if (entry.type === 'social_post') {
      if (!row) { row = []; out.push(row); }
      row.push(socialPost(entry, assetUrl));
    } else {
      row = null;
      out.push(mediaEntry(entry, assetUrl));
    }
  }
  return out.map(x => (Array.isArray(x) ? `<div class="tactic-reel-row">\n          ${x.join('\n          ')}\n        </div>` : x)).join('\n              ');
}

// ── Roadmap ────────────────────────────────────────────────────────────────

export function checklistItem(item, { noteButtonId } = {}) {
  const id = attr(item.id);
  return `<div class="check-item">
  <div class="check-row">
    <input type="checkbox" class="check-input" id="${id}" data-key="${id}" onchange="onCheck(this)">
    <label class="check-box" for="${id}">${ICONS.check}</label>
    <label class="check-label" for="${id}"${editKey(`${item.id}.text`)}>${md(item.text)}</label>
    <button class="note-toggle-btn"${noteButtonId ? ` id="${noteButtonId}"` : ''} onclick="toggleNote('${id}')" title="Add note">${ICONS.note}</button>
  </div>
  <div class="note-area" id="note-area-${id}">
    <textarea class="note-textarea" id="note-${id}" placeholder="Add a note…" oninput="saveNote('${id}',this.value)"></textarea>
  </div>
</div>`;
}

/**
 * howTo(action) -> { page, stepId } | 'quick_wins' | null, resolved by the
 * page builder from the action's how_to.
 */
export function weekAction(action, link, { howtoId } = {}) {
  let button = '';
  const idAttr = howtoId ? ` id="${howtoId}"` : '';
  if (link === 'quick_wins') button = ` <button class="howto-link"${idAttr} onclick="navigate('gbp')">how to</button>`;
  else if (link) button = ` <button class="howto-link"${idAttr} onclick="howToLink('tactic${link.tactic}','${attr(link.stepId)}')">how to</button>`;
  return `<li class="week-task-item"><div class="week-task-dot"></div><span class="week-task-text"${editKey(`${action.id}.text`)}>${md(action.text)}</span>${button}</li>`;
}

export function weekCard(week, links, { first = false } = {}) {
  let howtoMarked = false;
  const actions = week.actions.map((a, i) => {
    const mark = first && !howtoMarked && links[i];
    if (mark) howtoMarked = true;
    return weekAction(a, links[i], { howtoId: mark ? 'w1-howto-example' : null });
  });
  const checks = week.checklist.map((c, i) => checklistItem(c, { noteButtonId: first && i === 0 ? 'w1-note-example' : null }));
  return `<div class="week-card" id="wc-${week.number}" data-week="${week.number}" data-week-id="${attr(week.id)}">
  <div class="week-card-header" onclick="toggleWeek(${week.number})">
    <div class="week-num">W${week.number}</div>
    <div class="week-title"${editKey(`${week.id}.title`)}>${plain(week.title)}</div>
    <div class="week-progress-pill" id="wp-${week.number}">0 / ${week.checklist.length}</div>
    ${ICONS.chevronWeek}
  </div>
  <div class="week-card-body">
    <div class="week-cols">
      <div>
        <div class="week-col-label">This Week's Actions</div>
        <ul class="week-tasks-list">
          ${actions.join('\n          ')}
        </ul>
      </div>
      <div>
        <div class="week-col-label">Completion Checklist</div>
        <div class="check-list"${first ? ' id="w1-checklist"' : ''}>
          ${checks.join('\n          ')}
        </div>
      </div>
    </div>
    <div class="week-note-section"><div class="week-note-label">Week Notes</div><textarea class="note-textarea week-note-textarea" id="note-${attr(week.id)}" placeholder="Add general notes for this week…" oninput="saveNote('${attr(week.id)}',this.value)"></textarea></div>
  </div>
</div>`;
}

export function phaseBlock(phase, n, weeksHtml, total) {
  return `<div class="month-block">
      <div class="month-header">
        <span class="month-badge">Month ${n}</span>
        <span class="month-title">${plain(phase.name)}</span>
        <span class="month-progress" id="m${n}-prog"><span>0</span> of ${total} done</span>
      </div>
      ${weeksHtml}
    </div>`;
}

// ── Quick Wins ─────────────────────────────────────────────────────────────

export function quickWin(item) {
  const id = attr(item.id);
  const label = has(item.title) ? `<strong>${plain(item.title)}.</strong> ${md(item.text)}` : md(item.text);
  return `<div class="check-item">
        <div class="check-row">
          <input type="checkbox" class="check-input" id="${id}" onchange="onCheck(this)">
          <label class="check-box" for="${id}">${ICONS.checkSmall}</label>
          <label class="check-label" for="${id}"${editKey(`${item.id}.label`)}>${label}</label>
          <button class="note-toggle-btn" onclick="toggleNote('${id}')">${ICONS.noteOutline}</button>
        </div>
        <div class="note-area" id="note-area-${id}">
          <textarea class="note-textarea" id="note-${id}" placeholder="Add a note…" oninput="saveNote('${id}',this.value)"></textarea>
        </div>
      </div>`;
}

export function quickWinGroup(group) {
  return `<div class="section-label">${plain(group.title)}</div>
<div class="card qw-card">
  <div class="card-body">
    <div class="check-list qw-check-list">
      ${group.items.map(quickWin).join('\n      ')}
    </div>
  </div>
</div>`;
}

export function quickWinsNote(note) {
  if (!note || !has(note.text)) return '';
  return `<div class="callout">${has(note.title) ? `<strong>${plain(note.title)}.</strong> ` : ''}${md(note.text)}</div>`;
}

// ── Assessment ─────────────────────────────────────────────────────────────
// Built from a client_assessments record's assessment_data (Supabase in
// production). Assessment items have no IDs, so their edit keys are their
// path in that record, for example assessment.executive_summary.key_strengths.0.

export const ASSESSMENT_CATEGORIES = [
  { key: 'website_technical', title: 'Website & Technical', iconClass: 'website', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' },
  { key: 'reviews_reputation', title: 'Reviews & Reputation', iconClass: 'reviews', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
  { key: 'booking_conversion', title: 'Online Booking & Conversion', iconClass: 'booking', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' },
  { key: 'social_media', title: 'Social Media & Content', iconClass: 'social', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>' },
  { key: 'guest_experience', title: 'Digital Guest Experience', iconClass: 'experience', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' },
  { key: 'local_visibility', title: 'Local Visibility', iconClass: 'local', icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>' }
];

const FINDING_ICONS = {
  positive: '<svg class="finding-icon positive" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>',
  negative: '<svg class="finding-icon negative" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>'
};

const text = value => attr(value == null ? '' : value);
const score = value => (value != null && value !== '' ? String(Math.round(Number(value))) : '--');
export function gradeClass(grade) {
  const letter = String(grade || '').trim().charAt(0).toLowerCase();
  return letter && 'abcdf'.includes(letter) ? `grade-${letter}` : '';
}

/** True when the record has real assessment content, not an empty object. */
export function hasAssessment(data) {
  return !!(data && data.overall && data.categories && Object.keys(data.categories).length > 0);
}

export function assessmentGradeCard(data) {
  const summary = data.overall.summary || (data.executive_summary || {}).headline || '';
  return `<div class="assessment-grade-card">
      <div class="grade-circle" id="overallGrade">${text(data.overall.grade || '--')}</div>
      <div class="grade-details">
        <h3>Overall Score: <span id="overallScore">${score(data.overall.score)}</span>/100</h3>
        ${has(summary) ? `<p id="overallSummary"${editKey(data.overall.summary ? 'assessment.overall.summary' : 'assessment.executive_summary.headline.card')}>${text(summary)}</p>` : ''}
      </div>
    </div>`;
}

export function categoryScore(category, cat) {
  return `<div class="grade-breakdown-item">
          <div class="grade-breakdown-category">
            ${category.icon}
            <span>${category.title}</span>
          </div>
          <div class="grade-breakdown-score">
            <span class="grade-breakdown-number">${score(cat.score)}</span>
            <span class="grade-breakdown-letter ${gradeClass(cat.grade)}">${text(cat.grade || '--')}</span>
          </div>
        </div>`;
}

export function executiveSummary(summary) {
  if (!summary || !(has(summary.headline) || (summary.key_strengths || []).length || (summary.critical_gaps || []).length)) return '';
  const list = (items, key) => (items || []).map((item, i) => `<li${editKey(`assessment.executive_summary.${key}.${i}`)}>${text(item)}</li>`).join('\n            ');
  return `<div class="executive-summary" id="executiveSummary">
      <h2>Executive Summary</h2>
      ${has(summary.headline) ? `<p class="executive-headline"${editKey('assessment.executive_summary.headline')}>${text(summary.headline)}</p>` : ''}
      <div class="executive-columns">
        <div class="executive-column strengths">
          <h4>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            Key Strengths
          </h4>
          <ul>
            ${list(summary.key_strengths, 'key_strengths')}
          </ul>
        </div>
        <div class="executive-column gaps">
          <h4>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Critical Gaps
          </h4>
          <ul>
            ${list(summary.critical_gaps, 'critical_gaps')}
          </ul>
        </div>
      </div>
      ${has(summary.bottom_line) ? `<div class="executive-bottom-line">
        <strong>Bottom Line:</strong> <span${editKey('assessment.executive_summary.bottom_line')}>${text(summary.bottom_line)}</span>
      </div>` : ''}
    </div>`;
}

export function assessmentQuickWin(win, i) {
  return `<div class="quick-win-item">
          <div class="quick-win-number">${i + 1}</div>
          <div class="quick-win-content">
            <div class="quick-win-task"${editKey(`assessment.quick_wins.${i}.task`)}>${text(win.task)}</div>
            ${has(win.impact) ? `<div class="quick-win-impact"${editKey(`assessment.quick_wins.${i}.impact`)}>${text(win.impact)}</div>` : ''}
          </div>
          ${has(win.time_estimate) ? `<div class="quick-win-time">${text(win.time_estimate)}</div>` : ''}
        </div>`;
}

export function priorityRecommendation(rec, i) {
  const tags = [
    has(rec.category) ? `<span class="priority-item-tag">${text(rec.category)}</span>` : '',
    has(rec.time_estimate) ? `<span class="priority-item-tag time">${text(rec.time_estimate)}</span>` : '',
    has(rec.impact) ? `<span class="priority-item-tag impact-${text(String(rec.impact).toLowerCase())}">${text(rec.impact)} Impact</span>` : ''
  ].filter(Boolean).join('\n              ');
  return `<div class="priority-item">
          <div class="priority-item-number">${i + 1}</div>
          <div class="priority-item-content">
            <h4${editKey(`assessment.priority_recommendations.${i}.text`)}>${text(rec.text || rec.title)}</h4>
            ${tags ? `<div class="priority-item-meta">
              ${tags}
            </div>` : ''}
            ${has(rec.expected_result) ? `<p class="priority-item-result"${editKey(`assessment.priority_recommendations.${i}.expected_result`)}>${text(rec.expected_result)}</p>` : ''}
          </div>
        </div>`;
}

export function categoryCard(category, cat) {
  const metrics = (cat.metrics || []).slice(0, 4).map(metric => {
    const status = ['good', 'warning', 'critical'].includes(metric.status) ? metric.status : 'good';
    return `<div class="metric-item">
                <div class="metric-label">${text(metric.label)}</div>
                <div class="metric-value"><span class="metric-status ${status}"></span>${text(metric.value)}</div>
              </div>`;
  }).join('\n              ');
  const findings = (cat.findings || []).slice(0, 4).map((finding, i) => `<div class="finding-item">
                ${finding.type === 'positive' ? FINDING_ICONS.positive : FINDING_ICONS.negative}
                <span${editKey(`assessment.categories.${category.key}.findings.${i}`)}>${text(finding.text)}</span>
              </div>`).join('\n              ');
  return `<div class="category-card">
          <div class="category-header" onclick="this.parentElement.classList.toggle('open')">
            <div class="category-icon ${category.iconClass}">
              ${category.icon}
            </div>
            <div class="category-title-wrap">
              <h3 class="category-title">${category.title}</h3>
              <span class="category-grade ${gradeClass(cat.grade)}">${text(cat.grade || 'N/A')}</span>
            </div>
            <svg class="category-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div class="category-body">
            ${has(cat.summary) ? `<p class="category-summary"${editKey(`assessment.categories.${category.key}.summary`)}>${text(cat.summary)}</p>` : ''}
            ${metrics ? `<div class="category-metrics">
              ${metrics}
            </div>` : ''}
            ${findings ? `<div class="category-findings">
              <h4>Key Findings</h4>
              ${findings}
            </div>` : ''}
          </div>
        </div>`;
}

/** The whole Assessment page, or '' when there is no assessment. */
export function assessmentPage(data, { date } = {}) {
  if (!hasAssessment(data)) return '';
  const categories = ASSESSMENT_CATEGORIES.filter(c => data.categories[c.key]);
  const wins = (data.quick_wins || []).slice(0, 6);
  const recs = (data.priority_recommendations || []).slice(0, 4);
  return `<section id="page-assessment" class="page">
  <div class="assessment-hero">
    <div class="assessment-hero-top">
      <div>
        <h1 class="assessment-hero-title">Your Digital Marketing Assessment</h1>
        ${has(date) ? `<p class="assessment-hero-date">Assessment Date: ${text(date)}</p>` : ''}
      </div>
      <div class="assessment-hero-actions">
        <button class="download-pdf-btn" onclick="downloadPDF()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Download PDF
        </button>
      </div>
    </div>
    ${assessmentGradeCard(data)}
  </div>

  <div class="content-area">
    <div class="grade-breakdown">
      <h2>Score Breakdown by Category</h2>
      <div class="grade-breakdown-grid">
        ${categories.map(c => categoryScore(c, data.categories[c.key])).join('\n        ')}
      </div>
    </div>

    ${executiveSummary(data.executive_summary)}

    ${wins.length ? `<div class="quick-wins" id="quickWins">
      <h2>Quick Wins</h2>
      <p class="quick-wins-intro">Immediate actions you can complete today:</p>
      <div class="quick-wins-grid">
        ${wins.map(assessmentQuickWin).join('\n        ')}
      </div>
    </div>` : ''}

    ${recs.length ? `<div class="priority-section">
      <h2>Priority Recommendations</h2>
      <p class="priority-intro">The changes that will make the biggest difference, in priority order:</p>
      <div class="priority-list" id="priorityList">
        ${recs.map(priorityRecommendation).join('\n        ')}
      </div>
    </div>` : ''}

    <div class="categories-section">
      <h2>Detailed Category Analysis</h2>
      <div class="categories-grid">
        ${categories.map(c => categoryCard(c, data.categories[c.key])).join('\n        ')}
      </div>
    </div>
  </div>
</section>`;
}

export function navAssessment() {
  return `<button type="button" class="nav-item" data-page="assessment" onclick="navigate('assessment')">Assessment</button>`;
}
