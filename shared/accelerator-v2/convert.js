/**
 * The v2 converter: plan.md in, content.json out (SCHEMA.md).
 *
 *   convertPlan(planMd, { slug, client, existing, random })
 *     -> { ok, content, errors, warnings, matches, removed, counts }
 *
 * - `existing` is the client's current content.json, if there is one. Every
 *   item that matches an existing item keeps its ID, and the fields that do
 *   not come from plan.md (media, step links, part cards, Next Step, phase
 *   descriptions, time commitment, roadmap closing, Quick Wins note, voice,
 *   legacy_keys, client details) are carried over. Re-running on the same
 *   plan returns identical content.
 * - `matches` lists the items that were matched by similarity rather than
 *   identical text, so the coach can confirm them before saving.
 * - `removed` lists existing items with no match in the new plan.
 *
 * The result has not been through the publishing checks. Run checkContent()
 * (checks.js) on it before saving.
 *
 * Pure: no filesystem, network or environment.
 */

import { validatePlan } from '../plan-validator.js';
import { parsePlan, normaliseConfirmsDeep } from './parse-plan.js';
import { matchItems } from './match.js';
import { makeIdFactory, collectIds, PREFIXES } from './ids.js';

export const SCHEMA_VERSION = 2;
export const TEMPLATE_VERSION = 'v2';

const clone = value => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

/** Week ranges for the phases: the weeks shared out as evenly as possible, earlier phases first. */
export function phaseRanges(weekCount, phaseCount) {
  const ranges = [];
  let start = 1;
  for (let i = 0; i < phaseCount; i++) {
    const size = Math.floor(weekCount / phaseCount) + (i < weekCount % phaseCount ? 1 : 0);
    ranges.push([start, start + size - 1]);
    start += size;
  }
  return ranges;
}

function withLegacy(node, old) {
  if (old && Array.isArray(old.legacy_keys)) node.legacy_keys = clone(old.legacy_keys);
  return node;
}

export function convertPlan(planMd, options = {}) {
  const errors = [];
  const warnings = [];
  const matches = [];
  const removed = [];
  const add = issue => (issue.severity === 'error' ? errors : warnings).push(issue);

  // Structure first, with the same check (and line numbers) as the v1 upload.
  const v1 = validatePlan(planMd, { type: 'accelerator' });
  v1.errors.forEach(e => add({ ...e, source: 'structure' }));

  const { draft, issues } = parsePlan(planMd);
  normaliseConfirmsDeep(draft);
  issues.forEach(i => add({ ...i, source: 'converter' }));

  const existing = options.existing || null;
  const newId = makeIdFactory({ taken: new Set(collectIds(existing || {})), random: options.random });

  // Generic: match a list of new items against a pool of old ones and give
  // every new item an ID (kept or new). Returns [{ id, old }].
  const assign = (kind, prefix, pool, items) => {
    const result = matchItems(pool, items);
    return items.map((item, i) => {
      const m = result[i];
      if (!m) return { id: newId(prefix), old: null };
      const old = pool.find(p => p.key === m.key);
      old.used = true;
      if (m.how !== 'same') matches.push({ kind, id: m.key, how: m.how, previous: m.previous, text: item.text, line: item.line || null });
      return { id: m.key, old: old.node };
    });
  };
  const reportUnused = (kind, pool, extra = () => ({})) => pool.filter(p => !p.used).forEach(p => removed.push({ kind, id: p.key, text: p.text, ...extra(p.node) }));

  const ex = existing || {};
  const exTactics = ex.tactics || [];

  // ── Phases ───────────────────────────────────────────────────────────────
  const weekCount = draft.weeks.length;
  const phaseNames = draft.monthNames.length ? draft.monthNames : [];
  const ranges = phaseRanges(weekCount, phaseNames.length);
  const phasePool = (ex.phases || []).map((p, index) => ({ key: p.id, text: p.name || `#${index}`, parent: 'root', index, node: p }));
  const phaseIds = assign('phase', PREFIXES.phase, phasePool, phaseNames.map((name, index) => ({ text: name || `#${index}`, parent: 'root', index })));
  const phases = phaseNames.map((name, i) => withLegacy({
    id: phaseIds[i].id,
    name: name || null,
    description: phaseIds[i].old ? (phaseIds[i].old.description ?? null) : null,
    weeks: ranges[i]
  }, phaseIds[i].old));
  reportUnused('phase', phasePool);

  // ── Tactics, parts, steps, bullets ───────────────────────────────────────
  const tacticPool = exTactics.map((t, index) => ({ key: t.id, text: t.title, parent: 'root', index, node: t }));
  const tacticIds = assign('tactic', PREFIXES.tactic, tacticPool, draft.tactics.map((t, index) => ({ text: t.title, parent: 'root', index, line: t._line })));
  reportUnused('tactic', tacticPool);

  const partPool = [];
  const stepPool = [];
  exTactics.forEach(t => (t.parts || []).forEach((p, pi) => {
    partPool.push({ key: p.id, text: p.name, parent: t.id, index: pi, node: p });
    (p.steps || []).forEach((s, si) => stepPool.push({ key: s.id, text: s.title, parent: p.id, index: si, node: s }));
  }));

  const stepsByTactic = []; // [tacticIndex][stepIndex] -> step
  const tactics = draft.tactics.map((t, ti) => {
    const { id: tacticId, old: oldTactic } = tacticIds[ti];
    const partIds = assign('part', PREFIXES.part, partPool, t.parts.map((p, index) => ({ text: p.name, parent: tacticId, index, line: p._line })));
    const flatSteps = [];

    const parts = t.parts.map((p, pi) => {
      const { id: partId, old: oldPart } = partIds[pi];
      const stepIds = assign('step', PREFIXES.step, stepPool, p.steps.map((s, index) => ({ text: s.title, parent: partId, index, line: s._line })));

      const steps = p.steps.map((s, si) => {
        const { id: stepId, old: oldStep } = stepIds[si];
        const oldBullets = [];
        (oldStep ? oldStep.body || [] : []).forEach(block => {
          if (block.type !== 'bullets') return;
          block.items.forEach(b => {
            oldBullets.push({ key: b.id, text: b.text, parent: stepId, level: 0, node: b });
            (b.children || []).forEach(c => oldBullets.push({ key: c.id, text: c.text, parent: b.id, level: 1, node: c }));
          });
        });
        oldBullets.forEach((b, index) => { b.index = index; });

        // Bullets: top level first, so their IDs are known as the children's parent.
        const bulletIds = new Map();
        const flat = [];
        s.body.forEach(block => {
          if (block.type !== 'bullets') return;
          block.items.forEach(b => {
            flat.push({ node: b, level: 0 });
            (b.children || []).forEach(c => flat.push({ node: c, level: 1, parentNode: b }));
          });
        });
        flat.forEach((f, index) => { f.index = index; });
        for (const level of [0, 1]) {
          const items = flat.filter(f => f.level === level);
          const pool = oldBullets.filter(b => b.level === level);
          const ids = assign('bullet', PREFIXES.bullet, pool, items.map(f => ({
            text: f.node.text,
            parent: level === 0 ? stepId : bulletIds.get(f.parentNode),
            index: f.index,
            line: f.node._line
          })));
          items.forEach((f, i) => bulletIds.set(f.node, ids[i].id));
          items.forEach((f, i) => { f.old = ids[i].old; });
        }
        const oldOf = new Map(flat.map(f => [f.node, f.old]));
        reportUnused('bullet', oldBullets);

        const body = s.body.map(block => {
          if (block.type === 'table') return { type: 'table', columns: block.columns, rows: block.rows };
          return {
            type: 'bullets',
            items: block.items.map(b => withLegacy({
              id: bulletIds.get(b),
              text: b.text,
              children: (b.children || []).map(c => withLegacy({ id: bulletIds.get(c), text: c.text }, oldOf.get(c)))
            }, oldOf.get(b)))
          };
        });

        const step = withLegacy({
          id: stepId,
          title: s.title,
          time: s.time,
          cost: s.cost,
          tags: s.tags,
          body,
          links: oldStep ? clone(oldStep.links || []) : [],
          media: oldStep ? clone(oldStep.media || []) : []
        }, oldStep);
        flatSteps.push(step);
        return step;
      });

      return withLegacy({
        id: partId,
        name: p.name,
        card: oldPart ? clone(oldPart.card ?? null) : null,
        steps
      }, oldPart);
    });
    stepsByTactic.push(flatSteps);

    return withLegacy({
      id: tacticId,
      title: t.title,
      short_label: t.short_label,
      subtitle: t.subtitle,
      phase_label: t.phase_label,
      what_we_heard: t.what_we_heard,
      what_this_is: t.what_this_is,
      why_it_matters: t.why_it_matters,
      time_commitment: oldTactic ? clone(oldTactic.time_commitment ?? null) : null,
      parts,
      metrics: t.metrics,
      tips: t.tips,
      resources: t.resources.map(r => ({ title: r.title, url: r.url, description: r.description }))
    }, oldTactic);
  });
  reportUnused('part', partPool);
  reportUnused('step', stepPool, node => ((node.media || []).length ? { media: node.media.length } : {}));
  removed.filter(r => r.kind === 'step' && r.media).forEach(r => warnings.push({
    severity: 'warning', line: null, source: 'converter',
    message: `The step "${r.text}" is no longer in the plan, and it had ${r.media} media item(s).`,
    fix: 'Its media is not carried over. Add the media to the step that replaces it.'
  }));

  // ── Objectives ───────────────────────────────────────────────────────────
  const objectivePool = (ex.objectives || []).map((o, index) => ({ key: o.id, text: o.title, parent: 'root', index, node: o }));
  const objectiveIds = assign('objective', PREFIXES.objective, objectivePool, draft.objectives.map((o, index) => ({ text: o.title, parent: 'root', index, line: o._line })));
  reportUnused('objective', objectivePool);
  const objectives = draft.objectives.map((o, i) => {
    const tactic = o.tactic ? tactics[o.tactic - 1] : null;
    if (o.tactic && !tactic) add({ severity: 'error', line: o._line, source: 'converter', message: `Objective ${o._number} points at Tactic ${o.tactic}, which does not exist.`, fix: 'Correct its Tactic Pill.' });
    return withLegacy({
      id: objectiveIds[i].id,
      title: o.title,
      description: o.description,
      tactic: tactic ? tactic.id : null,
      weeks: o.weeks
    }, objectiveIds[i].old);
  });

  // ── Roadmap ──────────────────────────────────────────────────────────────
  const exWeeks = (ex.roadmap && ex.roadmap.weeks) || [];
  const actionPool = [];
  const checkPool = [];
  exWeeks.forEach(w => {
    (w.actions || []).forEach((a, index) => actionPool.push({ key: a.id, text: a.text, parent: w.id, index, node: a }));
    (w.checklist || []).forEach((c, index) => checkPool.push({ key: c.id, text: c.text, parent: w.id, index, node: c }));
  });
  const usedWeeks = new Set();
  const weeks = draft.weeks.map(w => {
    const oldWeek = exWeeks.find(o => o.number === w.number && !usedWeeks.has(o.id));
    if (oldWeek) usedWeeks.add(oldWeek.id);
    const weekId = oldWeek ? oldWeek.id : newId(PREFIXES.week);
    const actionIds = assign('action', PREFIXES.action, actionPool, w.actions.map((a, index) => ({ text: a.text, parent: weekId, index, line: a._line })));
    const checkIds = assign('check', PREFIXES.check, checkPool, w.checklist.map((c, index) => ({ text: c.text, parent: weekId, index, line: c._line })));
    return withLegacy({
      id: weekId,
      number: w.number,
      title: w.title,
      next_step: oldWeek ? clone(oldWeek.next_step ?? null) : null,
      actions: w.actions.map((a, i) => {
        let howTo = null;
        if (a._link === 'quick_wins') {
          howTo = 'quick_wins';
        } else if (a._link) {
          const step = (stepsByTactic[a._link.tactic - 1] || [])[a._link.step - 1];
          if (step) howTo = step.id;
          else add({ severity: 'error', line: a._line, source: 'converter', message: `"how to" points at Tactic ${a._link.tactic} / Step ${a._link.step}, which does not exist.`, fix: 'Correct the step number.' });
        }
        return withLegacy({ id: actionIds[i].id, text: a.text, how_to: howTo }, actionIds[i].old);
      }),
      checklist: w.checklist.map((c, i) => withLegacy({ id: checkIds[i].id, text: c.text, tactic: null, tactic_source: null }, checkIds[i].old)),
      _draft: w,
      _oldChecks: checkIds.map(x => x.old)
    }, oldWeek);
  });
  const guessed = assignChecklistTactics(weeks, tactics, stepsByTactic, add);
  weeks.forEach(w => { delete w._draft; delete w._oldChecks; });
  exWeeks.filter(w => !usedWeeks.has(w.id)).forEach(w => removed.push({ kind: 'week', id: w.id, text: `Week ${w.number}: ${w.title}` }));
  reportUnused('action', actionPool);
  reportUnused('check', checkPool);

  // ── Quick Wins ───────────────────────────────────────────────────────────
  const qwText = q => [q.title, q.text].filter(Boolean).join(' ');
  const qwPool = [];
  ((ex.quick_wins && ex.quick_wins.groups) || []).forEach((g, gi) => g.items.forEach((q, index) => qwPool.push({ key: q.id, text: qwText(q), parent: gi, index, node: q })));
  const groups = draft.quickWinGroups.map((g, gi) => {
    const ids = assign('quick win', PREFIXES.quickWin, qwPool, g.items.map((q, index) => ({ text: qwText(q), parent: gi, index, line: q._line })));
    return { title: g.title, items: g.items.map((q, i) => withLegacy({ id: ids[i].id, title: q.title, text: q.text }, ids[i].old)) };
  });
  reportUnused('quick win', qwPool);

  // ── Client ───────────────────────────────────────────────────────────────
  const exClient = ex.client || {};
  const optClient = options.client || {};
  const slug = options.slug || exClient.slug || draft.meta['Client Slug'] || null;
  if (draft.meta['Client Slug'] && slug && draft.meta['Client Slug'] !== slug) {
    warnings.push({ severity: 'warning', line: null, source: 'converter', message: `Meta says "Client Slug: ${draft.meta['Client Slug']}", but this is being saved for "${slug}".`, fix: `"${slug}" is used.` });
  }
  const pick = key => (optClient[key] !== undefined ? optClient[key] : exClient[key]);
  const client = {
    slug,
    name: pick('name') ?? draft.client.name,
    coach_email: pick('coach_email') ?? null,
    cohort_start: pick('cohort_start') ?? null,
    flags: { sandbox: false, send_emails: false, ...(clone(exClient.flags) || {}), ...(optClient.flags || {}) }
  };

  const content = {
    schema_version: SCHEMA_VERSION,
    template_version: ex.template_version || TEMPLATE_VERSION,
    client,
    program: { weeks: weekCount },
    strategy: draft.strategy,
    phases,
    objectives,
    tactics,
    roadmap: { weeks, closing: ex.roadmap ? ex.roadmap.closing ?? null : null },
    quick_wins: { intro: draft.quickWinIntro || (ex.quick_wins ? ex.quick_wins.intro ?? null : null), groups, note: draft.quickWinNote || (ex.quick_wins ? clone(ex.quick_wins.note ?? null) : null) },
    voice: clone(ex.voice) || { progress_headlines: [], tour: [] }
  };

  return { ok: errors.length === 0, content, errors, warnings, matches, removed, guessed, counts: countContent(content) };
}

/**
 * Every checklist item counts towards exactly one tactic.
 *   1. "→ tactic: N" in the plan sets it (source "plan"). A tactic that does
 *      not exist is an error.
 *   2. Otherwise an assignment already stored in content.json is kept, so a
 *      coach's correction is never replaced by a guess.
 *   3. Otherwise it is guessed with v1's rule (source "guess"): the tactic of
 *      the action in the matching position, or else the week's main tactic
 *      (the one most of its actions link to; a week with no links keeps the
 *      previous week's, and before any link the tactic whose share of the
 *      weeks it falls in).
 * Returns the items whose tactic is a guess, for the coach to check.
 */
export function assignChecklistTactics(weeks, tactics, stepsByTactic, add) {
  const stepTactic = new Map();
  stepsByTactic.forEach((steps, ti) => steps.forEach(st => stepTactic.set(st.id, ti + 1)));
  const tacticCount = tactics.length;
  const totalWeeks = weeks.length;
  const blockTactic = n => Math.min(tacticCount, Math.max(1, Math.ceil(n / (totalWeeks / tacticCount))));
  const tacticIds = new Set(tactics.map(t => t.id));
  const guessed = [];
  let previous = null;
  for (const week of weeks) {
    const links = week.actions.map(a => stepTactic.get(a.how_to) || null);
    const counts = {};
    links.filter(Boolean).forEach(t => { counts[t] = (counts[t] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    const primary = top ? Number(top[0]) : (previous || blockTactic(week.number));
    if (top) previous = primary;
    week.checklist.forEach((item, i) => {
      const draft = week._draft.checklist[i];
      const old = week._oldChecks[i];
      if (draft._tacticMarker) {
        const tactic = tactics[draft._tacticMarker - 1];
        if (!tactic) {
          add({ severity: 'error', line: draft._line, source: 'converter', message: `"→ tactic: ${draft._tacticMarker}" points at Tactic ${draft._tacticMarker}, which does not exist.`, fix: `Use a tactic number from 1 to ${tacticCount}.` });
          return;
        }
        item.tactic = tactic.id;
        item.tactic_source = 'plan';
        return;
      }
      if (old && old.tactic && tacticIds.has(old.tactic)) {
        item.tactic = old.tactic;
        item.tactic_source = old.tactic_source || 'plan';
      } else {
        const actionIndex = links.length ? Math.min(links.length - 1, Math.floor(i * links.length / week.checklist.length)) : -1;
        const n = (actionIndex >= 0 && links[actionIndex]) || primary;
        item.tactic = tactics[n - 1].id;
        item.tactic_source = 'guess';
      }
      if (item.tactic_source === 'guess') {
        guessed.push({ id: item.id, week: week.number, text: item.text, tactic: tactics.findIndex(t => t.id === item.tactic) + 1, line: draft._line });
      }
    });
  }
  return guessed;
}

/** Item counts, for reports and for the "nothing lost" tests. */
export function countContent(content) {
  const steps = content.tactics.flatMap(t => t.parts.flatMap(p => p.steps));
  const bulletItems = steps.flatMap(s => s.body.filter(b => b.type === 'bullets').flatMap(b => b.items));
  return {
    tactics: content.tactics.length,
    parts: content.tactics.reduce((n, t) => n + t.parts.length, 0),
    steps: steps.length,
    bullets: bulletItems.reduce((n, b) => n + 1 + (b.children || []).length, 0),
    tables: steps.reduce((n, s) => n + s.body.filter(b => b.type === 'table').length, 0),
    weeks: content.roadmap.weeks.length,
    actions: content.roadmap.weeks.reduce((n, w) => n + w.actions.length, 0),
    how_to: content.roadmap.weeks.reduce((n, w) => n + w.actions.filter(a => a.how_to).length, 0),
    checklist: content.roadmap.weeks.reduce((n, w) => n + w.checklist.length, 0),
    quick_wins: content.quick_wins.groups.reduce((n, g) => n + g.items.length, 0),
    media: steps.reduce((n, s) => n + s.media.length, 0)
  };
}
