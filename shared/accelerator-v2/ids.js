/**
 * Permanent item IDs for accelerator v2 content (see SCHEMA.md, "IDs").
 *
 * An ID is a type prefix, an underscore and six random characters, for
 * example `stp_k4m9qx`. IDs are assigned once by the converter and never
 * derived from position or wording.
 */

export const PREFIXES = {
  tactic: 'tac',
  part: 'prt',
  step: 'stp',
  bullet: 'blt',
  media: 'med',
  week: 'wk',
  action: 'act',
  check: 'chk',
  quickWin: 'qw',
  phase: 'phs',
  objective: 'obj'
};

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
export const ID_PATTERN = /^(tac|prt|stp|blt|med|wk|act|chk|qw|phs|obj)_[a-z0-9]{6}$/;

export function isId(value, prefix) {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) return false;
  return prefix ? value.startsWith(`${prefix}_`) : true;
}

// Uniform random integers below 36, from the platform's secure generator.
function defaultRandom(count) {
  const out = [];
  const buf = new Uint8Array(count * 2);
  while (out.length < count) {
    globalThis.crypto.getRandomValues(buf);
    for (const byte of buf) {
      if (byte < 252 && out.length < count) out.push(byte % 36); // 252 = 7 * 36, no bias
    }
  }
  return out;
}

/**
 * Returns a function that makes new IDs. `taken` holds every ID already in
 * use (and any known retired IDs); new IDs never collide with it.
 * `random(count)` may be injected for deterministic tests.
 */
export function makeIdFactory({ taken = new Set(), random = defaultRandom } = {}) {
  const used = new Set(taken);
  return function newId(prefix) {
    for (;;) {
      const id = `${prefix}_${random(6).map(n => ALPHABET[n]).join('')}`;
      if (!used.has(id)) {
        used.add(id);
        return id;
      }
    }
  };
}

/** Every `id` value found anywhere in a content tree. */
export function collectIds(node, out = []) {
  if (Array.isArray(node)) node.forEach(n => collectIds(n, out));
  else if (node && typeof node === 'object') {
    if (typeof node.id === 'string') out.push(node.id);
    Object.entries(node).forEach(([key, value]) => { if (key !== 'id') collectIds(value, out); });
  }
  return out;
}
