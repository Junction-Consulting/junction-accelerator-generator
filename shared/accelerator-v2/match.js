/**
 * Matching new items to the items of an existing content.json, so a
 * re-upload keeps every ID it can (SCHEMA.md, "IDs").
 *
 * Items are matched by text and by previous position:
 *   1. identical text under the same parent
 *   2. identical text anywhere in the pool
 *   3. the most similar text, if similar enough (a bonus for the same
 *      position and the same parent)
 *   4. the same position under the same parent, if the text is still
 *      recognisably related (a reworded item that has not moved)
 * Anything left over is new (gets a new ID) or removed.
 */

const words = text => (String(text || '').toLowerCase().match(/[a-z0-9$%']+/g) || []);

/** Dice coefficient on the two texts' word sets: 1 for the same words, 0 for none shared. */
export function similarity(a, b) {
  const A = new Set(words(a));
  const B = new Set(words(b));
  if (!A.size && !B.size) return 1;
  if (!A.size || !B.size) return 0;
  let shared = 0;
  A.forEach(w => { if (B.has(w)) shared += 1; });
  return (2 * shared) / (A.size + B.size);
}

const norm = text => words(text).join(' ');

/**
 * @param {Array<{key, text, parent, index}>} olds  existing items (key = ID)
 * @param {Array<{text, parent, index}>} news       new items, in order
 * @returns {Array<{key, how}|null>}                one entry per new item
 */
export function matchItems(olds, news) {
  const result = news.map(() => null);
  const free = new Set(olds.map((_, i) => i));
  const take = (n, o, how) => { result[n] = { key: olds[o].key, how, previous: olds[o].text }; free.delete(o); };

  // 1 and 2: identical text
  for (const sameParent of [true, false]) {
    news.forEach((n, ni) => {
      if (result[ni]) return;
      const o = [...free].find(oi => norm(olds[oi].text) === norm(n.text) && (!sameParent || olds[oi].parent === n.parent));
      if (o !== undefined) take(ni, o, 'same');
    });
  }

  // 3: most similar first
  const pairs = [];
  news.forEach((n, ni) => {
    if (result[ni]) return;
    free.forEach(oi => {
      const o = olds[oi];
      const sim = similarity(o.text, n.text);
      const sameParent = o.parent === n.parent;
      const samePos = sameParent && o.index === n.index;
      const score = sim + (sameParent ? 0.1 : 0) + (samePos ? 0.15 : 0);
      if (sim >= 0.6 || (sameParent && sim >= 0.5)) pairs.push({ ni, oi, score });
    });
  });
  pairs.sort((a, b) => b.score - a.score || a.ni - b.ni || a.oi - b.oi);
  for (const p of pairs) {
    if (result[p.ni] || !free.has(p.oi)) continue;
    take(p.ni, p.oi, 'similar');
  }

  // 4: same slot, reworded
  news.forEach((n, ni) => {
    if (result[ni]) return;
    const o = [...free].find(oi => olds[oi].parent === n.parent && olds[oi].index === n.index && similarity(olds[oi].text, n.text) >= 0.25);
    if (o !== undefined) take(ni, o, 'same position');
  });

  return result;
}
