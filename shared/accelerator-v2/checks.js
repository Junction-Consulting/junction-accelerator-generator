/**
 * The v2 publishing checks (SCHEMA.md, "Checks that block publishing").
 *
 *   checkContent(content, { previous, otherClients, assetExists })
 *     -> { ok, errors, warnings, hidden }
 *
 * - errors block the build. warnings do not.
 * - hidden lists the optional content that is empty and will therefore not
 *   be shown (the coach sees this in the upload report and in Edit Mode).
 * - previous: the content.json this one replaces, to catch changed IDs.
 * - otherClients: [{ slug, name, domains, shingles }] for every other client.
 *   Another client's name or website blocks. Wording shared with another
 *   client's plan (a run of 12 words in one field) is a warning, because
 *   real plans share instruction wording legitimately. See repo.js.
 * - assetExists(assetId): whether the media library can find an asset.
 *   Without it, assets are only checked for being present.
 *
 * Every issue: { severity, where, id, message, fix }.
 *
 * Pure: no filesystem, network or environment.
 */

import { ID_PATTERN, PREFIXES } from './ids.js';

export const STEP_TAGS = ['critical', 'contractor'];
export const FRAMES = ['website', 'document', 'phone', 'email', 'none'];
export const BADGES = ['mockup', 'example'];
export const FITS = ['crop', 'full'];
export const VIDEO_PROVIDERS = ['youtube', 'vimeo'];
export const GROUP_LAYOUTS = { pair: 2, four: 4 };
export const SHORT_LABEL_MAX = 28;

// The placeholders written in the PLAN_FORMAT.md skeleton.
const SKELETON = /\[(Client Name|client-slug|Full Tactic Title|Phase name|2-4 words|One sentence[^\]]*|Part Name|Step title|Specific instruction|Instruction[^\]]*|Item that belongs[^\]]*|Metric name|Target|Practical tip|Resource name|short description|Short title[^\]]*|1-2 sentences[^\]]*|2-[34] sentences[^\]]*|Week title|Verifiable outcome|Quick win title|What to do[^\]]*|Month name|One or more paragraphs[^\]]*|A 2-3 sentence[^\]]*|Link text|Tip text|Section Name|Action bullet|Checklist item)\]/i;
const TEMPLATE_TOKEN = /\{\{[^}]*\}\}/;

// American spellings the house style writes the Canadian way.
const US_SPELLINGS = [
  ['color', 'colour'], ['colors', 'colours'], ['colorful', 'colourful'], ['favorite', 'favourite'], ['favorites', 'favourites'],
  ['behavior', 'behaviour'], ['honor', 'honour'], ['neighbor', 'neighbour'], ['neighborhood', 'neighbourhood'], ['labor', 'labour'],
  ['center', 'centre'], ['centers', 'centres'], ['theater', 'theatre'], ['traveler', 'traveller'], ['travelers', 'travellers'],
  ['traveling', 'travelling'], ['canceled', 'cancelled'], ['canceling', 'cancelling'], ['catalog', 'catalogue'], ['gray', 'grey'],
  ['jewelry', 'jewellery'], ['optimize', 'optimise'], ['optimized', 'optimised'], ['optimizing', 'optimising'], ['programme', 'program'],
  ['analyze', 'analyse'], ['organize', 'organise'], ['prioritize', 'prioritise'], ['customize', 'customise'], ['personalize', 'personalise'],
  ['maximize', 'maximise'], ['minimize', 'minimise'], ['summarize', 'summarise'], ['recognize', 'recognise'], ['utilize', 'utilise']
];

const isEmpty = text => typeof text !== 'string' || !text.trim() || /^-+$/.test(text.trim());
const emptyList = list => !Array.isArray(list) || list.length === 0;

/** Text a reader sees: Markdown link targets and code spans removed. */
export function visibleText(text) {
  return String(text || '')
    .replace(/`[^`]*`/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ');
}

// ── Walking the content ────────────────────────────────────────────────────

/**
 * Every client-visible text field: { where, id, field, text, required }.
 * `where` is a readable location such as "Tactic 2 / Step 5".
 */
export function textFields(content) {
  const out = [];
  const push = (where, id, field, text, required = true) => out.push({ where, id: id || null, field, text, required });
  const s = content.strategy || {};
  (s.goal || []).forEach((p, i) => push('Goal', null, `goal[${i}]`, p));
  (s.positioning || []).forEach((p, i) => push('Strategic Positioning', null, `positioning[${i}]`, p));
  if (s.positioning_statement != null) push('Strategic Positioning', null, 'positioning_statement', s.positioning_statement, false);
  if (s.welcome_message != null) push('Welcome Message', null, 'welcome_message', s.welcome_message, false);

  (content.phases || []).forEach((p, i) => {
    push(`Phase ${i + 1}`, p.id, 'name', p.name);
    if (p.description != null) push(`Phase ${i + 1}`, p.id, 'description', p.description, false);
  });
  (content.objectives || []).forEach((o, i) => {
    push(`Objective ${i + 1}`, o.id, 'title', o.title);
    push(`Objective ${i + 1}`, o.id, 'description', o.description);
  });

  (content.tactics || []).forEach((t, ti) => {
    const T = `Tactic ${ti + 1}`;
    push(T, t.id, 'title', t.title);
    push(T, t.id, 'short_label', t.short_label);
    push(T, t.id, 'subtitle', t.subtitle);
    if (t.phase_label != null) push(T, t.id, 'phase label', t.phase_label, false);
    for (const key of ['what_we_heard', 'what_this_is', 'why_it_matters']) (t[key] || []).forEach((p, i) => push(T, t.id, `${key}[${i}]`, p));
    if (t.heard_quote) push(T, t.id, 'heard_quote', t.heard_quote);
    if (t.time_commitment) {
      push(T, t.id, 'time_commitment.amount', t.time_commitment.amount, false);
      push(T, t.id, 'time_commitment.detail', t.time_commitment.detail, false);
    }
    let stepNumber = 0;
    (t.parts || []).forEach((p, pi) => {
      const P = `${T} / Part ${String.fromCharCode(65 + pi)}`;
      push(P, p.id, 'name', p.name);
      if (p.card) {
        push(P, p.id, 'card.title', p.card.title, false);
        push(P, p.id, 'card.description', p.card.description, false);
      }
      (p.steps || []).forEach(st => {
        stepNumber += 1;
        const S = `${T} / Step ${stepNumber}`;
        push(S, st.id, 'title', st.title);
        if (st.time != null) push(S, st.id, 'time', st.time);
        if (st.cost != null) push(S, st.id, 'cost', st.cost);
        (st.body || []).forEach(block => {
          if (block.type === 'bullets') {
            (block.items || []).forEach(b => {
              push(S, b.id, 'bullet', b.text);
              (b.children || []).forEach(c => push(S, c.id, 'bullet', c.text));
            });
          } else if (block.type === 'table') {
            (block.columns || []).forEach((c, i) => push(S, st.id, `table column ${i + 1}`, c));
            (block.rows || []).forEach((r, ri) => r.forEach((c, ci) => push(S, st.id, `table row ${ri + 1} cell ${ci + 1}`, c, false)));
          }
        });
        (st.links || []).forEach(l => push(S, st.id, 'link title', l.title));
        (st.media || []).forEach(m => mediaTexts(m).forEach(([field, text, required]) => push(S, m.id, `media ${field}`, text, required)));
      });
    });
    const metrics = t.metrics || {};
    (metrics.columns || []).forEach((c, i) => push(`${T} / Success Metrics`, t.id, `column ${i + 1}`, c));
    (metrics.rows || []).forEach((r, ri) => r.forEach((c, ci) => push(`${T} / Success Metrics`, t.id, `row ${ri + 1} cell ${ci + 1}`, c)));
    (t.tips || []).forEach((tip, i) => push(`${T} / Tips`, t.id, `tip ${i + 1}`, tip));
    (t.resources || []).forEach((r, i) => {
      push(`${T} / Resources`, t.id, `resource ${i + 1} title`, r.title);
      if (r.description != null) push(`${T} / Resources`, t.id, `resource ${i + 1} description`, r.description, false);
    });
  });

  const roadmap = content.roadmap || {};
  (roadmap.weeks || []).forEach(w => {
    const W = `Week ${w.number}`;
    push(W, w.id, 'title', w.title);
    if (w.next_step) {
      push(W, w.id, 'next_step.time_needed', w.next_step.time_needed, false);
      push(W, w.id, 'next_step.who', w.next_step.who, false);
    }
    (w.actions || []).forEach(a => push(W, a.id, 'action', a.text));
    (w.checklist || []).forEach(c => push(W, c.id, 'checklist item', c.text));
  });
  if (roadmap.closing != null) push('Roadmap', null, 'closing', roadmap.closing, false);

  const qw = content.quick_wins || {};
  if (qw.intro != null) push('Quick Wins intro', null, 'text', qw.intro, false);
  (qw.groups || []).forEach((g, gi) => {
    push(`Quick Wins group ${gi + 1}`, null, 'title', g.title);
    (g.items || []).forEach(q => {
      if (q.title != null) push(`Quick Wins group ${gi + 1}`, q.id, 'title', q.title);
      push(`Quick Wins group ${gi + 1}`, q.id, 'text', q.text);
    });
  });
  if (qw.note) {
    push('Quick Wins note', null, 'title', qw.note.title, false);
    push('Quick Wins note', null, 'text', qw.note.text);
  }
  const voice = content.voice || {};
  (voice.progress_headlines || []).forEach((h, i) => push('Voice', null, `progress_headlines[${i}]`, typeof h === 'string' ? h : JSON.stringify(h), false));
  (voice.tour || []).forEach((h, i) => push('Voice', null, `tour[${i}]`, typeof h === 'string' ? h : JSON.stringify(h), false));
  return out;
}

function mediaTexts(m) {
  const out = [];
  if (!m || typeof m !== 'object') return out;
  if (m.alt != null) out.push(['alt', m.alt, true]);
  if (m.caption != null) out.push(['caption', m.caption, false]);
  if (m.title != null) out.push(['title', m.title, false]);
  if (m.subtitle != null) out.push(['subtitle', m.subtitle, false]);
  if (m.post_type != null) out.push(['post type', m.post_type, false]);
  if (m.link && m.link.label != null) out.push(['link label', m.link.label, false]);
  (m.items || []).forEach(item => mediaTexts(item).forEach(([f, t, r]) => out.push([`item ${f}`, t, r])));
  return out;
}

/** Every step, with its readable location. */
export function allSteps(content) {
  const out = [];
  (content.tactics || []).forEach((t, ti) => {
    let n = 0;
    (t.parts || []).forEach(p => (p.steps || []).forEach(s => { n += 1; out.push({ step: s, tactic: t, where: `Tactic ${ti + 1} / Step ${n}` }); }));
  });
  return out;
}

/** Every item that carries an ID, with the kind its position says it is. */
function idItems(content) {
  const out = [];
  const add = (kind, node, where, text) => out.push({ kind, id: node.id, where, text, node });
  (content.phases || []).forEach((p, i) => add('phase', p, `Phase ${i + 1}`, p.name));
  (content.objectives || []).forEach((o, i) => add('objective', o, `Objective ${i + 1}`, o.title));
  (content.tactics || []).forEach((t, ti) => {
    add('tactic', t, `Tactic ${ti + 1}`, t.title);
    (t.parts || []).forEach((p, pi) => add('part', p, `Tactic ${ti + 1} / Part ${String.fromCharCode(65 + pi)}`, p.name));
  });
  allSteps(content).forEach(({ step, where }) => {
    add('step', step, where, step.title);
    (step.body || []).filter(b => b.type === 'bullets').forEach(b => (b.items || []).forEach(item => {
      add('bullet', item, where, item.text);
      (item.children || []).forEach(c => add('bullet', c, where, c.text));
    }));
    const media = m => {
      add('media', m, where, m.caption || m.title || m.alt || '');
      (m.items || []).forEach(item => { if (item && item.id) media(item); });
    };
    (step.media || []).forEach(media);
  });
  ((content.roadmap || {}).weeks || []).forEach(w => {
    add('week', w, `Week ${w.number}`, `${w.number}`);
    (w.actions || []).forEach(a => add('action', a, `Week ${w.number}`, a.text));
    (w.checklist || []).forEach(c => add('check', c, `Week ${w.number}`, c.text));
  });
  ((content.quick_wins || {}).groups || []).forEach(g => (g.items || []).forEach(q => add('quickWin', q, 'Quick Wins', [q.title, q.text].filter(Boolean).join(' '))));
  return out;
}

// ── Media ──────────────────────────────────────────────────────────────────

function checkImage(m, where, err, warn, assetExists, label = 'image', framed = true) {
  const A = /^[aeiou]/i.test(label) ? 'An' : 'A';
  if (isEmpty(m.alt)) err(where, m.id, `${A} ${label} has no alt text.`, 'Add a short description of the image in "alt".');
  if (isEmpty(m.asset)) err(where, m.id, `${A} ${label} has no asset.`, 'Choose an image in the media tool.');
  else if (assetExists && !assetExists(m.asset)) err(where, m.id, `The media library cannot find the asset "${m.asset}".`, 'Upload the image again, or choose another.');
  if (framed) {
    if (!FRAMES.includes(m.frame)) err(where, m.id, `"${m.frame}" is not a frame.`, `Use one of: ${FRAMES.join(', ')}.`);
    if (m.bar != null && !['website', 'document'].includes(m.frame)) warn(where, m.id, `A "${m.frame}" frame has no bar, so "${m.bar}" is not shown.`, 'Remove "bar", or use a website or document frame.');
    if (['website', 'document'].includes(m.frame) && isEmpty(m.bar)) warn(where, m.id, `This ${m.frame} frame has no ${m.frame === 'website' ? 'address' : 'title'} in its bar.`, 'The bar is shown empty.');
    if (m.badge != null && !BADGES.includes(m.badge)) err(where, m.id, `"${m.badge}" is not a badge.`, `Use one of: ${BADGES.join(', ')}, or none.`);
    if (m.fit != null && !FITS.includes(m.fit)) err(where, m.id, `"${m.fit}" is not a fit.`, `Use one of: ${FITS.join(', ')}.`);
    if (m.link != null && (!m.link.url || !/^https:\/\//.test(m.link.url))) err(where, m.id, 'The image link has no https:// address.', 'Correct the link, or remove it.');
  }
}

function checkMedia(m, where, err, warn, assetExists) {
  if (!m || typeof m !== 'object') { err(where, null, 'A media entry is not an object.', ''); return; }
  switch (m.type) {
    case 'image':
      checkImage(m, where, err, warn, assetExists);
      break;
    case 'video':
      if (!VIDEO_PROVIDERS.includes(m.provider)) err(where, m.id, `"${m.provider}" is not a video provider.`, `Use one of: ${VIDEO_PROVIDERS.join(', ')}.`);
      if (isEmpty(m.video_id)) err(where, m.id, 'A video has no video ID.', 'Add the video ID.');
      if (isEmpty(m.title)) err(where, m.id, 'A video has no title.', 'Add a title, which is also what screen readers announce.');
      break;
    case 'social_post':
      checkImage(m, where, err, warn, assetExists, 'social post', false);
      if (m.url != null && !/^https:\/\//.test(m.url)) err(where, m.id, 'The social post link has no https:// address.', 'Correct it, or remove it.');
      break;
    case 'gallery':
      if (emptyList(m.items)) err(where, m.id, 'A gallery has no items.', 'Add images, or remove the gallery.');
      (m.items || []).forEach(item => checkImage(item, where, err, warn, assetExists, 'gallery image', false));
      break;
    case 'group': {
      const size = GROUP_LAYOUTS[m.layout];
      if (!size) err(where, m.id, `"${m.layout}" is not a group layout.`, `Use one of: ${Object.keys(GROUP_LAYOUTS).join(', ')}.`);
      else if ((m.items || []).length !== size) err(where, m.id, `A "${m.layout}" group needs ${size} images and has ${(m.items || []).length}.`, 'Add or remove images.');
      (m.items || []).forEach(item => {
        if (!item || item.type !== 'image') err(where, m.id, 'A group can hold images only.', 'Remove the other entry.');
        else checkImage(item, where, err, warn, assetExists);
      });
      break;
    }
    case 'link_card':
      if (isEmpty(m.title)) err(where, m.id, 'A link card has no title.', 'Add a title.');
      if (!m.url || !/^https:\/\//.test(m.url)) err(where, m.id, 'A link card has no https:// address.', 'Add the address.');
      break;
    default:
      err(where, m.id, `"${m.type}" is not a media type.`, 'Use image, video, social_post, gallery, group or link_card.');
  }
}

// ── Other clients ──────────────────────────────────────────────────────────

const normWords = text => String(text || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9$%]+/g, ' ').trim();
const WORDING_SHINGLE = 12;

export function shingles(text, size = WORDING_SHINGLE) {
  const words = normWords(visibleText(text)).split(' ').filter(Boolean);
  const out = new Set();
  for (let i = 0; i + size <= words.length; i++) out.add(words.slice(i, i + size).join(' '));
  return out;
}

function hostsIn(text) {
  const out = new Set();
  for (const m of String(text || '').toLowerCase().matchAll(/\b((?:[a-z0-9-]+\.)+(?:ca|com|org|net|travel|info|co))\b/g)) out.add(m[1].replace(/^www\./, ''));
  return out;
}

// ── The checks ─────────────────────────────────────────────────────────────

export function checkContent(content, options = {}) {
  const errors = [];
  const warnings = [];
  const err = (where, id, message, fix = '') => errors.push({ severity: 'error', where, id: id || null, message, fix });
  const warn = (where, id, message, fix = '') => warnings.push({ severity: 'warning', where, id: id || null, message, fix });

  if (!content || content.schema_version !== 2) {
    err('content.json', null, 'This is not a v2 content file (schema_version is not 2).', 'Convert the plan with the v2 converter.');
    return { ok: false, errors, warnings, hidden: [] };
  }

  const texts = textFields(content);

  // Empty items, placeholders, unfinished drafts, house style
  for (const f of texts) {
    if (typeof f.text !== 'string') {
      if (f.required || f.text != null) err(f.where, f.id, `The ${f.field} is missing.`, 'Add the text.');
      continue;
    }
    if (isEmpty(f.text)) {
      if (f.required) err(f.where, f.id, `The ${f.field} is empty${/^-+$/.test(f.text.trim()) ? ' (only "---")' : ''}.`, 'Add the text, or remove the item.');
      continue;
    }
    const shown = visibleText(f.text);
    if (TEMPLATE_TOKEN.test(shown)) err(f.where, f.id, `The ${f.field} contains a template token: "${shown.match(TEMPLATE_TOKEN)[0]}".`, 'Replace it with the real text.');
    if (SKELETON.test(shown)) err(f.where, f.id, `The ${f.field} still has placeholder text from the plan template: "${shown.match(SKELETON)[0]}".`, 'Replace it with the real content.');
    const unfinished = shown.match(/\[(INSERT|ADD)\b[^\]]*\]/i);
    if (unfinished) warn(f.where, f.id, `The ${f.field} contains "${unfinished[0]}", which usually means an unfinished draft.`, 'Fill it in before the client sees it.');
    const bracket = shown.match(/\[(?!(?:INSERT|ADD|CONFIRM)\b)[^\]]+\](?!\()/i);
    if (bracket && !SKELETON.test(shown)) warn(f.where, f.id, `The ${f.field} contains "${bracket[0]}" in square brackets.`, 'If it is a blank to fill in, fill it in.');
    if (/—/.test(shown)) warn(f.where, f.id, `The ${f.field} has an em dash.`, 'Use a colon, a comma or a new sentence.');
    if (/(^|[^-])--([^-]|$)/.test(shown)) warn(f.where, f.id, `The ${f.field} has "--".`, 'Use a colon, a comma or a new sentence.');
    if (/→|->|=>/.test(shown)) warn(f.where, f.id, `The ${f.field} has an arrow.`, 'Write "then" in place of the arrow.');
    for (const [us, ca] of US_SPELLINGS) {
      if (new RegExp(`\\b${us}\\b`, 'i').test(shown)) warn(f.where, f.id, `The ${f.field} uses "${us}".`, `Use the Canadian spelling, "${ca}".`);
    }
  }

  // Required lists
  const s = content.strategy || {};
  if (emptyList(s.goal)) err('Goal', null, 'The goal is empty.', 'Add the goal.');
  if (emptyList(s.positioning)) err('Strategic Positioning', null, 'The strategic positioning is empty.', 'Add it.');
  if (emptyList(content.tactics)) err('Tactics', null, 'There are no tactics.', 'Add the tactics.');
  (content.tactics || []).forEach((t, ti) => {
    const T = `Tactic ${ti + 1}`;
    for (const key of ['what_we_heard', 'what_this_is', 'why_it_matters']) if (emptyList(t[key])) err(T, t.id, `"${key}" is empty.`, 'Add the text.');
    if (emptyList(t.parts)) err(T, t.id, 'The tactic has no parts.', 'Add its implementation steps.');
    (t.parts || []).forEach((p, pi) => { if (emptyList(p.steps)) err(`${T} / Part ${String.fromCharCode(65 + pi)}`, p.id, 'The part has no steps.', 'Add a step, or remove the part.'); });
    if (!t.metrics || emptyList(t.metrics.rows)) err(T, t.id, 'The tactic has no success metrics.', 'Add the metrics table.');
    else t.metrics.rows.forEach((r, i) => { if (r.length !== (t.metrics.columns || []).length) err(`${T} / Success Metrics`, t.id, `Row ${i + 1} has ${r.length} cells for ${(t.metrics.columns || []).length} columns.`, 'Fill every column. Write n/a where there is no target.'); });
    if (emptyList(t.tips)) err(T, t.id, 'The tactic has no tips.', 'Add at least one tip.');
    if (emptyList(t.resources)) err(T, t.id, 'The tactic has no resources.', 'Add at least one resource.');
    (t.resources || []).forEach((r, i) => {
      const where = `${T} / Resources`;
      if (!r.url || !/^https?:\/\//.test(r.url)) err(where, t.id, `Resource ${i + 1} has no full web address.`, 'Use an address starting with https://.');
      if (r.title && /^(https?:\/\/|www\.)\S+$/i.test(r.title.trim())) err(where, t.id, `Resource ${i + 1}'s title is a bare web address: ${r.title}.`, 'Give it a readable title, such as the page name.');
    });
    if (t.short_label && t.short_label.length > SHORT_LABEL_MAX) warn(T, t.id, `The short label "${t.short_label}" is ${t.short_label.length} characters, over ${SHORT_LABEL_MAX}.`, 'It may not fit the sidebar.');
  });

  // Steps: tags, links, media
  const stepIds = new Set();
  for (const { step, where } of allSteps(content)) {
    stepIds.add(step.id);
    (step.tags || []).forEach(tag => { if (!STEP_TAGS.includes(tag)) err(where, step.id, `"${tag}" is not a step tag.`, `Use ${STEP_TAGS.join(' or ')}.`); });
    (step.links || []).forEach(l => { if (!l.url || !/^https?:\/\//.test(l.url)) err(where, step.id, `The step link "${l.title}" has no full web address.`, 'Use an address starting with https://.'); });
    (step.media || []).forEach(m => checkMedia(m, where, err, warn, options.assetExists));
    (step.body || []).forEach(b => {
      if (b.type === 'bullets') { if (emptyList(b.items)) err(where, step.id, 'A bullet list is empty.', 'Remove it.'); }
      else if (b.type === 'table') { if (emptyList(b.columns)) err(where, step.id, 'A table has no columns.', 'Remove it.'); }
      else err(where, step.id, `"${b.type}" is not a body block type.`, 'Use bullets or table.');
    });
  }

  // Roadmap: weeks and "how to" links
  const weeks = (content.roadmap && content.roadmap.weeks) || [];
  const weekCount = (content.program && content.program.weeks) || 0;
  if (weeks.length !== weekCount) err('Roadmap', null, `program.weeks is ${weekCount}, but the roadmap has ${weeks.length} weeks.`, 'Make them match.');
  weeks.forEach((w, i) => {
    if (w.number !== i + 1) err(`Week ${w.number}`, w.id, `Week ${w.number} is in position ${i + 1}.`, 'Number weeks 1, 2, 3 in order, with none skipped.');
    if (emptyList(w.actions)) err(`Week ${w.number}`, w.id, 'The week has no actions.', 'Add at least one.');
    if (emptyList(w.checklist)) err(`Week ${w.number}`, w.id, 'The week has no checklist items.', 'Add at least one.');
    (w.actions || []).forEach(a => {
      if (a.how_to == null || a.how_to === '') return;
      if (a.how_to === 'quick_wins') {
        if (!((content.quick_wins || {}).groups || []).length) err(`Week ${w.number}`, a.id, '"how to" points at Quick Wins, but there are none.', 'Remove the link, or add Quick Wins.');
      } else if (!stepIds.has(a.how_to)) {
        err(`Week ${w.number}`, a.id, `"how to" points at ${a.how_to}, which is not a step.`, 'Point it at an existing step, or remove it.');
      }
    });
  });

  // Every checklist item counts towards exactly one existing tactic
  const tacticIdSet = new Set((content.tactics || []).map(t => t.id));
  const guesses = [];
  weeks.forEach(w => (w.checklist || []).forEach(c => {
    if (!c.tactic) err(`Week ${w.number}`, c.id, 'This checklist item counts towards no tactic.', 'Add "→ tactic: N" to it in the plan, and convert again.');
    else if (!tacticIdSet.has(c.tactic)) err(`Week ${w.number}`, c.id, `This checklist item counts towards ${c.tactic}, which is not a tactic.`, 'Add "→ tactic: N" to it in the plan, and convert again.');
    else if (c.tactic_source === 'guess') guesses.push(`Week ${w.number}: "${c.text}" (Tactic ${(content.tactics || []).findIndex(t => t.id === c.tactic) + 1})`);
  }));
  if (guesses.length) warn(guesses.join('; '), null, `${guesses.length} checklist item(s) count towards a tactic worked out from the week's "how to" links.`, 'Check each one. To set it, add "→ tactic: N" to the item in the plan.');

  // Phases cover every week exactly once
  const covered = new Map();
  (content.phases || []).forEach((p, i) => {
    if (!Array.isArray(p.weeks) || p.weeks.length !== 2 || p.weeks[0] > p.weeks[1]) { err(`Phase ${i + 1}`, p.id, 'The phase has no valid week range.', 'Use [first week, last week].'); return; }
    for (let n = p.weeks[0]; n <= p.weeks[1]; n++) covered.set(n, (covered.get(n) || 0) + 1);
  });
  for (let n = 1; n <= weekCount; n++) {
    if (!covered.get(n)) err('Phases', null, `Week ${n} is in no phase.`, 'Adjust the phase ranges.');
    else if (covered.get(n) > 1) err('Phases', null, `Week ${n} is in ${covered.get(n)} phases.`, 'Adjust the phase ranges so they do not overlap.');
  }
  [...covered.keys()].filter(n => n < 1 || n > weekCount).forEach(n => err('Phases', null, `A phase covers week ${n}, which is outside the program.`, 'Adjust the phase ranges.'));

  // Objectives and tactics pair up
  const tacticIds = new Set((content.tactics || []).map(t => t.id));
  const withObjective = new Set();
  (content.objectives || []).forEach((o, i) => {
    if (!o.tactic || !tacticIds.has(o.tactic)) err(`Objective ${i + 1}`, o.id, 'The objective has no tactic.', 'Point it at one of the tactics.');
    else withObjective.add(o.tactic);
    if (!Array.isArray(o.weeks) || o.weeks.length !== 2 || o.weeks[0] < 1 || o.weeks[1] > weekCount || o.weeks[0] > o.weeks[1]) err(`Objective ${i + 1}`, o.id, 'The objective has no valid week range.', `Use weeks within 1 to ${weekCount}.`);
  });
  (content.tactics || []).forEach((t, i) => { if (!withObjective.has(t.id)) err(`Tactic ${i + 1}`, t.id, 'The tactic has no objective.', 'Add an objective for it.'); });

  // IDs: well formed, of the right kind, unique, and unchanged
  const items = idItems(content);
  const seen = new Map();
  for (const item of items) {
    if (!ID_PATTERN.test(item.id || '')) err(item.where, item.id, `"${item.id}" is not a valid ID.`, 'IDs are assigned by the converter. Do not edit them.');
    else if (!item.id.startsWith(`${PREFIXES[item.kind]}_`)) err(item.where, item.id, `"${item.id}" is on a ${item.kind}, which needs the prefix "${PREFIXES[item.kind]}_".`, 'IDs are assigned by the converter. Do not edit them.');
    if (seen.has(item.id)) err(item.where, item.id, `The ID ${item.id} is used twice (also at ${seen.get(item.id)}).`, 'IDs are assigned by the converter. Do not copy them.');
    else seen.set(item.id, item.where);
  }
  if (options.previous) {
    const nowIds = new Set(items.map(i => i.id));
    const norm = t => normWords(t);
    const nowByText = new Map();
    items.forEach(i => nowByText.set(`${i.kind}|${i.where}|${norm(i.text)}`, i));
    for (const old of idItems(options.previous)) {
      if (nowIds.has(old.id)) continue;
      const same = nowByText.get(`${old.kind}|${old.where}|${norm(old.text)}`);
      if (same) err(same.where, same.id, `This ${old.kind} was ${old.id} and is now ${same.id}, with the same text.`, 'IDs never change. Convert again from the previous content.json.');
    }
  }

  // Other clients' names, domains and wording
  if (options.otherClients && options.otherClients.length) {
    const ownSlug = (content.client && content.client.slug) || '';
    const ownName = normWords((content.client && content.client.name) || ownSlug.replace(/-/g, ' '));
    const allText = texts.filter(f => typeof f.text === 'string').map(f => ({ ...f, norm: ` ${normWords(f.text)} ` }));
    const wordingFlagged = new Set();
    for (const other of options.otherClients) {
      if (other.slug === ownSlug) continue;
      const name = normWords(other.name || other.slug.replace(/-/g, ' '));
      const related = ownName.startsWith(name) || name.startsWith(ownName);
      if (name.split(' ').length >= 2 && !related) {
        const hit = allText.find(f => f.norm.includes(` ${name} `));
        if (hit) err(hit.where, hit.id, `The ${hit.field} names another client: "${other.name || other.slug}".`, 'Remove it, unless this client really works with them.');
      }
      for (const host of other.domains || []) {
        const hit = texts.find(f => typeof f.text === 'string' && hostsIn(f.text).has(host));
        if (hit) err(hit.where, hit.id, `The ${hit.field} links to another client's website: ${host}.`, 'Remove it, unless this client really works with them.');
      }
      if (other.shingles) {
        for (const f of allText) {
          if (wordingFlagged.has(f)) continue;
          const shared = [...shingles(f.text)].find(sh => other.shingles.has(sh));
          if (shared) {
            wordingFlagged.add(f);
            warn(f.where, f.id, `The ${f.field} repeats wording from another client's plan (${other.slug}): "${shared}".`, 'Check it is right for this client. Shared instructions are fine; another client\'s details are not.');
          }
        }
      }
    }
  }

  const hidden = hiddenContent(content);
  hidden.forEach(h => warn(h.where.join(', '), null, `${h.label} is empty, so it is hidden.`, `Add ${h.field} to show it.`));
  return { ok: errors.length === 0, errors, warnings, hidden };
}

/** Optional content that is empty, so its component is hidden. Grouped by field. */
export function hiddenContent(content) {
  const groups = [];
  const group = (field, label, where) => { if (where.length) groups.push({ field, label, where }); };
  // Phase descriptions, the Next Step time and who, part cards, time
  // commitment, the roadmap closing note and the quick wins introduction are
  // kept in content.json, but the redesign (DESIGN-BRIEF.md) does not show
  // them, so an empty one hides nothing.
  group('tactics[].heard_quote', 'Pull quote', (content.tactics || []).map((t, i) => ({ t, where: `Tactic ${i + 1}` })).filter(({ t }) => isEmpty(t.heard_quote)).map(x => x.where));
  const s = content.strategy || {};
  group('strategy.welcome_message', 'Welcome message', isEmpty(s.welcome_message) ? ['Welcome screen'] : []);
  group('strategy.positioning_statement', 'Positioning statement', isEmpty(s.positioning_statement) ? ['Strategy page'] : []);
  group('tactics[].phase_label', 'Tactic phase label', (content.tactics || []).map((t, i) => ({ t, where: `Tactic ${i + 1}` })).filter(({ t }) => isEmpty(t.phase_label)).map(x => x.where));
  group('quick_wins.note', 'Quick Wins closing note', (content.quick_wins || {}).note ? [] : ['Google profile and website wins (roadmap)']);
  return groups;
}

/** One line per issue, for reports. */
export function formatCheckIssue(issue) {
  const id = issue.id ? ` [${issue.id}]` : '';
  return `${issue.severity === 'error' ? 'ERROR' : 'warning'} ${issue.where}${id}: ${issue.message}${issue.fix ? ` ${issue.fix}` : ''}`;
}
