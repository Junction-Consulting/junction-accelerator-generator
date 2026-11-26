/**
 * Reads an accelerator plan.md into a draft v2 content tree (no IDs yet).
 *
 * The draft has the shape of content.json (SCHEMA.md) except that:
 *   - items carry no `id`;
 *   - items carry `_line` (their line in plan.md) for reports;
 *   - a week action's link is `_link: { tactic, step }` or `_link: 'quick_wins'`,
 *     resolved to a step ID once IDs exist;
 *
 * The plan is first normalised with the v1 normaliser, so every variation
 * the v1 upload tolerates is read the same way here.
 *
 * Pure: no filesystem, network or environment.
 */

import { normalisePlanMd, readFields } from '../plan-generator.js';

const isRule = line => /^\s*-{3,}\s*$/.test(line);
const BULLET = /^(\s*)-\s+(\S.*)$/;
const STEP = /^\s{0,3}(?:(\d+)\.\s+\*\*(.+?)\*\*|\*\*(\d+)\.\s+(.+?)\*\*)(.*)$/;
// "→ tactic: N" (or "-> tactic: N") at the end of a checklist item
const TACTIC_MARKER = /\s*(?:→|->|=>)\s*tactic\s*:?\s*(\S+?)\.?\s*$/i;
const TABLE_ROW = /^\s*\|.*\|\s*$/;
const TABLE_SEPARATOR = /^\s*\|[\s:|-]+\|\s*$/;
const CONFIRM = /`?\[CONFIRM\b:?\s*([^\]]*)\]`?/gi;

// ── Small text helpers ─────────────────────────────────────────────────────

function paragraphs(lines) {
  const out = [];
  let current = [];
  const flush = () => { if (current.length) out.push(current.join(' ')); current = []; };
  for (const line of lines) {
    const t = line.trim();
    if (!t || isRule(line) || t.startsWith('>')) flush();
    else current.push(t);
  }
  flush();
  return out;
}

function tableCells(line) {
  const t = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return t.split('|').map(c => c.trim());
}

function stripTrailingPunctuation(text) {
  return text.replace(/[\s.:]+$/, '').trim();
}

/**
 * [CONFIRM ...] markers are reminders for the client to adapt a step to
 * their own business. They stay inline, exactly where the coach wrote them,
 * in one tidy form a component can style: "[CONFIRM: which rooms]".
 *   "`[CONFIRM: page URL]`"  -> "[CONFIRM: page URL]"   (code backticks removed)
 *   "[CONFIRM WHICH ROOMS]"  -> "[CONFIRM: which rooms]" (shouting calmed)
 */
export function normaliseConfirms(text) {
  if (typeof text !== 'string' || !/\[CONFIRM\b/i.test(text)) return text;
  return text.replace(CONFIRM, (m, inner) => {
    let t = inner.replace(/^[:\s]+/, '').trim();
    if (t && t === t.toUpperCase() && /[A-Z]/.test(t)) t = t.toLowerCase();
    return `[CONFIRM: ${t || 'confirm'}]`;
  });
}

/** Every string in a draft or content tree, with [CONFIRM] markers tidied. */
export function normaliseConfirmsDeep(node) {
  if (typeof node === 'string') return normaliseConfirms(node);
  if (Array.isArray(node)) return node.map(normaliseConfirmsDeep);
  if (node && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      if (!key.startsWith('_')) node[key] = normaliseConfirmsDeep(node[key]);
    }
  }
  return node;
}

/**
 * Split a step's title note into time, cost and tags.
 *   "(about 20 minutes)"                         -> time
 *   "(contractor task, $200 to $400. Critical)"  -> tags contractor, critical; cost
 *   "(about 45 minutes, once verified)"          -> time "about 45 minutes, once verified"
 * A segment that is neither time, cost nor a tag stays with the segment
 * before it (or the one after, if it comes first), so nothing is dropped.
 */
export function splitStepNote(note) {
  const result = { time: null, cost: null, tags: [], unrecognised: null };
  const segments = note.split(/\s*;\s+|\s*,\s+|\.\s+/).map(s => s.trim().replace(/\.$/, '')).filter(Boolean);
  const TIME = /\b(minutes?|mins?|hours?|hrs?|days?|weeks?|months?|an? (hour|afternoon|morning|evening|day))\b/i;
  const COST = /\$|\bcost|\bfree\b|\bbudget\b/i;
  let last = null;
  let pending = [];
  const append = (field, text) => { result[field] = result[field] ? `${result[field]}, ${text}` : text; };
  const place = (field, text) => {
    append(field, [...pending, text].join(', '));
    pending = [];
    last = field;
  };
  for (const seg of segments) {
    if (/^contractor( task)?$/i.test(seg)) { if (!result.tags.includes('contractor')) result.tags.push('contractor'); continue; }
    if (/^critical$/i.test(seg)) { if (!result.tags.includes('critical')) result.tags.push('critical'); continue; }
    if (/\bcontractor\b/i.test(seg) && !result.tags.includes('contractor')) result.tags.push('contractor');
    if (COST.test(seg)) place('cost', seg);
    else if (TIME.test(seg)) place('time', seg);
    else if (/\bcontractor\b/i.test(seg)) pending.push(seg);
    else if (last) append(last, seg);
    else pending.push(seg);
  }
  if (pending.length) {
    // Nothing to attach to: the note is kept as the step's time, and reported.
    result.unrecognised = pending.join(', ');
    append('time', result.unrecognised);
  }
  return result;
}

const isUrl = text => /^(https?:\/\/|www\.)\S+$/i.test(text.trim());

/**
 * A resource line. The plan format is "[Title](url)" or "[Title](url): description".
 * Also read: "[Title](url) -- description" and "Title: [url](url)" or "Title: url",
 * where the words before the colon are the title.
 */
export function parseResource(text) {
  const t = text.trim();
  let m = t.match(/^\[(.+?)\]\((\S+?)\)\s*(?:(:|--|–|—|-)\s*(.+))?$/);
  if (m && !isUrl(m[1])) return { title: m[1].trim(), url: m[2], description: m[4] ? m[4].trim() : null, reformatted: !!m[3] && m[3] !== ':' };
  m = t.match(/^(.+?):\s*\[(.+?)\]\((\S+?)\)\s*$/) || t.match(/^(.+?):\s*<?(https?:\/\/\S+?)>?\s*$/);
  if (m) return { title: m[1].trim(), url: (m[3] || m[2]).trim(), description: null, reformatted: true };
  m = t.match(/\[(.+?)\]\((\S+?)\)/);
  if (m) {
    const rest = t.replace(m[0], '').replace(/^[\s:–—-]+|[\s:–—-]+$/g, '');
    return { title: m[1].trim(), url: m[2], description: rest || null, reformatted: true };
  }
  return null;
}

// ── Sections ───────────────────────────────────────────────────────────────

function splitByHeading(lines, level, startLine = 0) {
  const marker = `${'#'.repeat(level)} `;
  const sections = [];
  let current = null;
  lines.forEach((line, i) => {
    if (line.startsWith(marker)) {
      current = { title: line.slice(marker.length).trim(), line: startLine + i + 1, body: [], bodyStart: startLine + i + 1 };
      sections.push(current);
    } else if (current) {
      current.body.push(line);
    }
  });
  return sections;
}

function parseImplementationSteps(lines, firstLine, issue) {
  const parts = [];
  let part = null;
  let step = null;
  let block = null;       // current body block of the step
  let lastTop = null;     // last top-level bullet in the step
  let baseIndent = null;
  let childIndent = null;
  let stepNumber = 0;
  let lastBullet = null; // { item, indent, line } of the bullet on the previous line

  const ensurePart = line => {
    if (!part) {
      part = { name: '', card: null, steps: [], _line: line, _implicit: true };
      parts.push(part);
      issue('error', line, 'A step comes before the first Part heading.', 'Add a "#### Part A: Name" heading above the first step.');
    }
  };

  lines.forEach((raw, i) => {
    const line = firstLine + i;
    const partMatch = raw.match(/^#### Part ([A-Z]):\s*(.*)$/);
    if (partMatch) {
      part = { name: partMatch[2].trim(), card: null, steps: [], _line: line, _letter: partMatch[1] };
      parts.push(part);
      step = null;
      block = null;
      return;
    }
    const stepMatch = raw.match(STEP);
    if (stepMatch) {
      ensurePart(line);
      stepNumber += 1;
      const written = Number(stepMatch[1] || stepMatch[3]);
      const boldTitle = (stepMatch[2] || stepMatch[4]).trim();
      const rest = (stepMatch[5] || '').trim();
      step = {
        title: stripTrailingPunctuation(boldTitle),
        time: null,
        cost: null,
        tags: [],
        body: [],
        links: [],
        media: [],
        _line: line,
        _number: stepNumber,
        _written: written
      };
      if (written !== stepNumber) {
        issue('warning', line, `This step is numbered ${written} but is step ${stepNumber} of the tactic.`, 'Number steps 1, 2, 3 across the whole tactic. "How to" links use the position, not the written number.');
      }
      if (rest) {
        const noteMatch = rest.match(/^\*?\(\s*(.*?)\s*\)\*?\.?$/);
        if (noteMatch) {
          const split = splitStepNote(noteMatch[1]);
          step.time = split.time;
          step.cost = split.cost;
          step.tags = split.tags;
          if (split.unrecognised) {
            issue('warning', line, `The step note "${split.unrecognised}" is not a time, cost or tag.`, 'It is kept as the step\'s time. Check it reads correctly.');
          }
        } else {
          step.title = stripTrailingPunctuation(`${step.title} ${rest.replace(/\*/g, '')}`);
          issue('warning', line, 'Text after the bold step title is not a note in brackets.', 'It has been added to the title.');
        }
      }
      part.steps.push(step);
      block = null;
      lastTop = null;
      baseIndent = null;
      childIndent = null;
      return;
    }
    if (!raw.trim() || isRule(raw)) {
      if (block && block.type === 'table') block = null;
      return;
    }
    if (!step) {
      issue('warning', line, 'This line is not inside a step, so it is not shown.', 'Move it under a step as a bullet, or remove it.');
      return;
    }
    const bullet = raw.match(BULLET);
    if (bullet) {
      const indent = bullet[1].length;
      const item = { text: bullet[2].trim(), children: [], _line: line };
      lastBullet = { item, indent, line };
      if (!block || block.type !== 'bullets') {
        block = { type: 'bullets', items: [] };
        step.body.push(block);
        lastTop = null;
      }
      if (baseIndent === null) baseIndent = indent;
      if (indent > baseIndent && lastTop) {
        if (childIndent === null) childIndent = indent;
        if (indent > childIndent) {
          issue('warning', line, 'This bullet is nested more than one level deep.', 'It is shown as a sub-bullet, one level in.');
        }
        delete item.children;
        lastTop.children.push(item);
      } else {
        if (indent > baseIndent) {
          issue('warning', line, 'The first bullet of this list is indented as a sub-bullet.', 'It is shown as a main bullet.');
        }
        block.items.push(item);
        lastTop = item;
      }
      return;
    }
    if (TABLE_ROW.test(raw)) {
      if (!block || block.type !== 'table') {
        block = { type: 'table', columns: tableCells(raw), rows: [], _line: line };
        step.body.push(block);
        return;
      }
      if (TABLE_SEPARATOR.test(raw) && block.rows.length === 0) return;
      block.rows.push(tableCells(raw));
      return;
    }
    // An indented line straight after a bullet continues that bullet.
    const prev = lastBullet && lastBullet.line === line - 1 ? lastBullet : null;
    if (prev && raw.match(/^\s*/)[0].length > prev.indent) {
      prev.item.text = `${prev.item.text} ${raw.trim()}`;
      lastBullet = { ...prev, line };
      issue('warning', line, 'This line continues the bullet above it.', 'It is joined to that bullet. Check it reads correctly.');
      return;
    }
    issue('warning', line, 'This line under a step is not a bullet or a table row, so it is not shown.', 'Start it with "- " to make it a bullet.');
  });

  // Strip empty children arrays on sub-bullets is done above; top-level bullets
  // keep `children: []` so the shape is the same for every bullet.
  return parts;
}

// The six assessment areas, by key, and the words a coach may use for each
export const ASSESSMENT_AREAS = {
  website_technical: ['website and technical', 'website & technical', 'website', 'technical'],
  reviews_reputation: ['reviews and reputation', 'reviews & reputation', 'reviews', 'reputation'],
  booking_conversion: ['online booking and conversion', 'online booking & conversion', 'booking and conversion', 'booking'],
  social_media: ['social media and content', 'social media & content', 'social media', 'social'],
  guest_experience: ['digital guest experience', 'guest experience'],
  local_visibility: ['local visibility', 'local search']
};

/** "Assessment Areas: Social media, Local visibility" -> ['social_media', 'local_visibility'] */
function parseAreas(value, issue, line) {
  const out = [];
  String(value || '').split(/[,;]/).map(v => v.trim().toLowerCase().replace(/\.$/, '')).filter(Boolean).forEach(word => {
    const key = Object.keys(ASSESSMENT_AREAS).find(k => k === word.replace(/ /g, '_') || ASSESSMENT_AREAS[k].includes(word));
    if (!key) issue('warning', line, `"${word}" is not one of the six assessment areas, so it is ignored.`, 'Use: website and technical, reviews and reputation, online booking and conversion, social media and content, digital guest experience, local visibility.');
    else if (!out.includes(key)) out.push(key);
  });
  return out;
}

function parseTactic(section, issue) {
  const m = section.title.match(/^Tactic (\d+):\s*(.*)$/);
  const number = Number(m[1]);
  const subs = splitByHeading(section.body, 3, section.bodyStart);
  const headerEnd = section.body.findIndex(l => l.startsWith('### '));
  const header = readFields(section.body.slice(0, headerEnd === -1 ? undefined : headerEnd).join('\n'), ['Quote', 'Assessment Areas', 'Phase', 'Short Label', 'Subtitle']);
  // Optional pull quote for "What we heard from you", written by the coach. Quote marks around it are dropped.
  const quote = (header['Quote'] || '').trim().replace(/^["“”']+|["“”']+$/g, '').trim();
  const find = title => subs.find(s => s.title.toLowerCase() === title.toLowerCase());

  const tactic = {
    title: m[2].trim(),
    short_label: header['Short Label'],
    subtitle: header['Subtitle'],
    phase_label: header['Phase'] || null,
    heard_quote: quote || null,
    assessment_areas: parseAreas(header['Assessment Areas'], issue, section.line),
    what_we_heard: [],
    what_this_is: [],
    why_it_matters: [],
    time_commitment: null,
    parts: [],
    metrics: { columns: [], rows: [] },
    tips: [],
    resources: [],
    _line: section.line,
    _number: number
  };

  const textSection = (title, key) => {
    const s = find(title);
    if (!s) return;
    tactic[key] = paragraphs(s.body);
  };
  textSection('What We Heard From You', 'what_we_heard');
  textSection('What This Is', 'what_this_is');
  textSection('Why It Matters', 'why_it_matters');

  const steps = find('Implementation Steps');
  if (steps) tactic.parts = parseImplementationSteps(steps.body, steps.bodyStart + 1, issue);

  const metrics = find('Success Metrics');
  if (metrics) {
    const rows = metrics.body.filter(l => TABLE_ROW.test(l));
    if (rows.length) {
      tactic.metrics.columns = tableCells(rows[0]);
      tactic.metrics.rows = rows.slice(1).filter(r => !TABLE_SEPARATOR.test(r)).map(tableCells);
    }
  }

  const tips = find('Tips');
  if (tips) {
    tips.body.forEach((l, i) => {
      const b = l.match(BULLET);
      if (b) tactic.tips.push(b[2].trim());
      else if (l.trim() && !isRule(l)) issue('warning', tips.bodyStart + i + 1, 'This line under Tips is not a bullet, so it is not shown.', 'Start it with "- ".');
    });
  }

  const resources = find('Resources');
  if (resources) {
    resources.body.forEach((l, i) => {
      const b = l.match(BULLET);
      const line = resources.bodyStart + i + 1;
      if (!b) {
        if (l.trim() && !isRule(l)) issue('warning', line, 'This line under Resources is not a bullet, so it is not shown.', 'Write it as "- [Title](https://...)".');
        return;
      }
      const resource = parseResource(b[2]);
      if (!resource) {
        issue('error', line, 'This resource has no link.', 'Write it as "- [Title](https://...)", optionally followed by ": description".');
        return;
      }
      if (resource.reformatted) issue('warning', line, 'This resource is not written as "- [Title](https://...): description".', `It is read as the title "${resource.title}". Check it reads correctly.`);
      tactic.resources.push({ title: resource.title, url: resource.url, description: resource.description, _line: line });
    });
  }

  return tactic;
}

function parseWeeks(section, issue) {
  const weeks = [];
  const subs = splitByHeading(section.body, 3, section.bodyStart);
  for (const sub of subs) {
    const m = sub.title.match(/^Week (\d+):\s*(.*)$/);
    if (!m) continue;
    const week = { number: Number(m[1]), title: m[2].trim(), next_step: null, actions: [], checklist: [], _line: sub.line };
    let mode = null;
    sub.body.forEach((l, i) => {
      const line = sub.bodyStart + i + 1;
      if (/^\*\*Actions:\*\*$/.test(l.trim())) { mode = 'actions'; return; }
      if (/^\*\*Checklist:\*\*$/.test(l.trim())) { mode = 'checklist'; return; }
      if (!l.trim() || isRule(l)) return;
      const b = l.match(BULLET);
      if (!b || !mode) {
        issue('warning', line, 'This line in the roadmap is not a bullet under Actions or Checklist, so it is not shown.', 'Start it with "- " under the right heading.');
        return;
      }
      let text = b[2].trim();
      let link = null;
      const linkMatch = text.match(/\s*→ links to:\s*(.+)$/);
      if (linkMatch) {
        text = text.slice(0, linkMatch.index).trim();
        const target = linkMatch[1].trim();
        const step = target.match(/^Tactic (\d+)\s*\/\s*Step (\d+)\.?$/i);
        if (step) link = { tactic: Number(step[1]), step: Number(step[2]) };
        else if (/^(GBP )?Quick Wins\.?$/i.test(target)) link = 'quick_wins';
        else issue('error', line, `The "how to" link "${target}" is not "Tactic N / Step M" or "GBP Quick Wins".`, 'Correct the link.');
      }
      // "→ tactic: N" at the end of a checklist item says which tactic it counts towards
      let tacticMarker = null;
      const marker = text.match(TACTIC_MARKER);
      if (marker) {
        text = text.slice(0, marker.index).trim();
        if (mode === 'actions') {
          issue('warning', line, 'A "→ tactic:" marker is on an action.', 'It is removed. Put it on checklist items only; actions use "→ links to:".');
        } else if (!/^\d+$/.test(marker[1])) {
          issue('error', line, `"→ tactic: ${marker[1]}" is not a tactic number.`, 'Write the tactic number, for example "→ tactic: 2".');
        } else {
          tacticMarker = Number(marker[1]);
        }
      }
      if (mode === 'actions') {
        week.actions.push({ text, how_to: null, _link: link, _line: line });
      } else {
        text = text.replace(/^\[.?\]\s*/, '');
        if (linkMatch) issue('warning', line, 'A "how to" link is on a checklist item.', 'It is removed. Put "how to" links on actions only.');
        week.checklist.push({ text, _tacticMarker: tacticMarker, _line: line });
      }
    });
    weeks.push(week);
  }
  return weeks;
}

function parseQuickWins(section, issue) {
  // Text above the first "### Heading" is the intro. "### Heading" blocks with
  // bullets are groups. A block with paragraphs and no bullets (such as
  // "### One Thing Worth Watching") is the closing note.
  const groups = [];
  let note = null;
  let intro = null;
  const blocks = [];
  let block = { title: null, lines: [], line: section.line };
  section.body.forEach((l, i) => {
    const line = section.bodyStart + i + 1;
    if (l.startsWith('### ')) {
      blocks.push(block);
      block = { title: l.slice(4).trim(), lines: [], line };
    } else {
      block.lines.push({ text: l, line });
    }
  });
  blocks.push(block);

  for (const b of blocks) {
    const bullets = b.lines.filter(l => BULLET.test(l.text));
    const prose = b.lines.filter(l => l.text.trim() && !isRule(l.text) && !BULLET.test(l.text));
    if (b.title === null) {
      if (bullets.length) issue('error', bullets[0].line, 'This quick win is not under a group heading.', 'Add a heading such as "### On the Google Business Profile" above it.');
      if (prose.length) intro = paragraphs(b.lines.map(l => l.text)).join('\n\n') || null;
      if (!bullets.length) continue;
    }
    if (!bullets.length) {
      const text = paragraphs(b.lines.map(l => l.text)).join('\n\n');
      if (!text) continue;
      if (note) issue('warning', b.line, `Quick Wins has more than one closing note ("${note.title}" and "${b.title}").`, 'Only the first is kept.');
      else note = { title: b.title, text };
      continue;
    }
    prose.forEach(p => issue('warning', p.line, 'This line in Quick Wins is not a bullet, so it is not shown.', 'Write it as "- **Title.** What to do and why."'));
    const group = { title: b.title || '', items: [], _line: b.line };
    for (const l of bullets) {
      const text = l.text.match(BULLET)[2].trim();
      const bold = text.match(/^\*\*(.+?)\*\*\s*(.*)$/);
      group.items.push(bold
        ? { title: stripTrailingPunctuation(bold[1]), text: bold[2].trim(), _line: l.line }
        : { title: null, text, _line: l.line });
    }
    groups.push(group);
  }
  return { groups, note, intro };
}

// ── Whole plan ─────────────────────────────────────────────────────────────

export function parsePlan(rawContent) {
  const issues = [];
  const issue = (severity, line, message, fix = '') => issues.push({ severity, line: line || null, message, fix });
  const text = normalisePlanMd(rawContent);
  const lines = text.split('\n');

  const h1 = lines.find(l => /^# (?!#)/.test(l));
  const nameMatch = h1 && h1.match(/^#\s+(.+?)(?::\s*Accelerator.*)?$/i);

  const sections = splitByHeading(lines, 2);
  const find = re => sections.find(s => re.test(s.title));

  const draft = {
    client: { name: nameMatch ? nameMatch[1].trim() : null },
    meta: {},
    strategy: { goal: [], positioning: [], positioning_statement: null, welcome_message: null },
    monthNames: [],
    tactics: [],
    objectives: [],
    weeks: [],
    quickWinGroups: [],
    quickWinNote: null,
    quickWinIntro: null,
    hasQuickWins: false
  };

  const meta = find(/^Meta$/i);
  if (meta) {
    const f = readFields(meta.body.join('\n'), ['Client Slug', 'Has GBP Quick Wins', 'Has Projections', 'Grant Budget', 'Target Milestone']);
    draft.meta = f;
    draft.hasQuickWins = f['Has GBP Quick Wins'].toLowerCase() === 'yes';
    if (f['Has Projections'].toLowerCase() === 'yes') issue('warning', meta.line, 'Has Projections is not part of the v2 content model.', 'Projections are not carried into content.json.');
    if (f['Grant Budget']) issue('warning', meta.line, 'Grant Budget is not part of the v2 content model.', 'It is not carried into content.json (v1 does not show it either).');
    if (f['Target Milestone']) issue('warning', meta.line, 'Target Milestone is not part of the v2 content model.', 'It is not carried into content.json (v1 does not show it either).');
  }

  const goal = find(/^Goal$/i);
  if (goal) draft.strategy.goal = paragraphs(goal.body);

  const pos = find(/^Strategic Positioning$/i);
  if (pos) {
    draft.strategy.positioning = paragraphs(pos.body);
    const quote = pos.body.filter(l => l.trim().startsWith('>')).map(l => l.trim().replace(/^>\s?/, ''));
    const statement = quote.filter(l => !/^\*\*.+\*\*$/.test(l.trim())).join(' ').trim();
    if (statement) draft.strategy.positioning_statement = statement;
  }

  const welcome = find(/^Welcome Message$/i);
  if (welcome) {
    const w = paragraphs(welcome.body).join(' ');
    if (w) draft.strategy.welcome_message = w;
  }

  for (const s of sections.filter(sec => /^Tactic \d+:/.test(sec.title))) {
    draft.tactics.push(parseTactic(s, issue));
  }

  const objectives = find(/^Objectives$/i);
  if (objectives) {
    for (const sub of splitByHeading(objectives.body, 3, objectives.bodyStart)) {
      const n = sub.title.match(/^Objective (\d+)$/);
      if (!n) continue;
      const f = readFields(sub.body.join('\n'), ['Title', 'Description', 'Tactic Pill']);
      const pill = f['Tactic Pill'].match(/Tactic\s+(\d+)\D+?Weeks?\s+(\d+)(?:\s*[-–—]\s*(\d+))?/i);
      if (!pill) issue('error', sub.line, `The Tactic Pill "${f['Tactic Pill']}" is not in the form "Tactic 1 · Weeks 1-4".`, 'Correct the Tactic Pill line.');
      draft.objectives.push({
        title: f['Title'],
        description: f['Description'],
        tactic: pill ? Number(pill[1]) : null,
        weeks: pill ? [Number(pill[2]), Number(pill[3] || pill[2])] : null,
        _line: sub.line,
        _number: Number(n[1])
      });
    }
  }

  const roadmap = sections.find(s => s.body.some(l => /^### Week \d+:/.test(l)));
  if (roadmap) {
    for (const n of [1, 2, 3]) {
      const m = text.match(new RegExp(`^Month ${n} Name:[ \\t]*(.+)$`, 'm'));
      draft.monthNames.push(m ? m[1].trim() : null);
    }
    draft.weeks = parseWeeks(roadmap, issue);
  }

  const qw = find(/^(GBP )?Quick Wins$/i);
  if (qw) {
    if (draft.hasQuickWins) {
      const parsed = parseQuickWins(qw, issue);
      draft.quickWinGroups = parsed.groups;
      draft.quickWinNote = parsed.note;
      draft.quickWinIntro = parsed.intro;
    }
    else issue('warning', qw.line, 'The plan has a Quick Wins section but Meta does not say "Has GBP Quick Wins: yes".', 'The section is left out.');
  }

  return { draft, issues };
}
