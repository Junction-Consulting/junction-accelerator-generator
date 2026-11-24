#!/usr/bin/env node
/**
 * Moves every colour, font, size, spacing, radius and shadow in a stylesheet
 * into design tokens (CSS custom properties).
 *
 *   node shared/accelerator-v2/tools/tokenise-css.mjs <in.css> <tokens-out.css> <css-out.css>
 *
 * Used once to turn the v1 accelerator stylesheet into assets/v2/tokens.css
 * and assets/v2/accelerator.css. From then on those two files are edited
 * directly. tests/v2/styles.test.js checks no raw value creeps back in.
 *
 * What stays raw, because CSS or the value's nature requires it:
 *   - media query breakpoints (custom properties do not work in @media)
 *   - 0, auto, percentages, viewport units, fr, keywords
 *   - motion: transforms, transitions, animation timings, opacity, z-index
 *   - custom property definitions in :root blocks (they are the tokens)
 */

import fs from 'fs';

// ── Names for values ───────────────────────────────────────────────────────

const PALETTE = {
  '#11154b': 'navy-900', '#1a1f6b': 'navy-800', '#aadab6': 'mint-500', '#7bc490': 'mint-dark',
  '#fcf5ec': 'cream-100', '#708090': 'slate-600', '#067cbc': 'link-blue', '#181c2d': 'dark',
  '#ffffff': 'white', '#000000': 'black', '#2e7d32': 'state-success', '#ed6c02': 'state-warning',
  '#d32f2f': 'state-danger', '#f0ece5': 'page-bg', '#f5f1ea': 'surface-sunken'
};
const NAMED_COLOURS = { white: '#ffffff', black: '#000000', red: '#ff0000', green: '#008000', blue: '#0000ff', gray: '#808080', grey: '#808080', orange: '#ffa500', yellow: '#ffff00' };
const FONTS = { "'raleway',sans-serif": 'font-display', "'opensans',sans-serif": 'font-body' };
const RADII = { '8px': 'radius-sm', '12px': 'radius-md', '16px': 'radius-lg', '24px': 'radius-xl', '999px': 'radius-pill' };

function hex6(h) {
  h = h.toLowerCase();
  if (h.length === 4) return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
  if (h.length === 5) return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}${h[4]}${h[4]}`;
  return h;
}
const toHex = n => Math.round(Number(n)).toString(16).padStart(2, '0');
const slug = v => String(v).replace(/^-/, 'n').replace(/^(n?)\./, '$10.').replace(/\./g, '_').replace(/%/g, 'pc').replace(/[^a-z0-9_n]/gi, '');

// ── Collected tokens ───────────────────────────────────────────────────────

const tokens = new Map(); // name -> value
const groups = new Map(); // name -> group
function token(group, name, value) {
  const existing = tokens.get(name);
  if (existing && existing !== value) {
    let i = 2;
    while (tokens.has(`${name}-${i}`) && tokens.get(`${name}-${i}`) !== value) i += 1;
    name = `${name}-${i}`;
  }
  tokens.set(name, value);
  groups.set(name, group);
  return `var(--${name})`;
}

function colourToken(raw) {
  let r; let g; let b; let a = null;
  const lower = raw.toLowerCase().replace(/\s+/g, '');
  if (lower.startsWith('#')) {
    const h = hex6(lower);
    if (h.length === 9) { a = parseInt(h.slice(7), 16) / 255; }
    const base = h.slice(0, 7);
    if (a === null && PALETTE[base]) return token('colour', PALETTE[base], base);
    if (a === null) return token('colour', `color-${base.slice(1)}`, base);
    r = parseInt(base.slice(1, 3), 16); g = parseInt(base.slice(3, 5), 16); b = parseInt(base.slice(5, 7), 16);
  } else if (NAMED_COLOURS[lower]) {
    const base = NAMED_COLOURS[lower];
    return token('colour', PALETTE[base] || `color-${base.slice(1)}`, base);
  } else {
    const m = lower.match(/^rgba?\(([\d.]+),([\d.]+),([\d.]+)(?:,([\d.]+%?))?\)$/);
    if (!m) return token('colour', `color-${slug(lower)}`, raw);
    [r, g, b] = [m[1], m[2], m[3]].map(Number);
    if (m[4] !== undefined) a = m[4].endsWith('%') ? Number(m[4].slice(0, -1)) / 100 : Number(m[4]);
  }
  const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  const name = PALETTE[base] || `color-${base.slice(1)}`;
  if (a === null || a === 1) return token('colour', name, base);
  const alpha = Math.round(a * 1000) / 10;
  return token('colour', `${name}-a${slug(alpha)}`, raw.replace(/\s+/g, ''));
}

const COLOUR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|(?<![\w-])(?:white|black|red|green|blue|gray|grey|orange|yellow)(?![\w-])/g;
const LENGTH = /(^|[\s,(/])(-?\d*\.?\d+)(px|rem|em)\b/g;

function replaceColours(value) {
  return value.replace(COLOUR, m => colourToken(m));
}

function replaceLengths(value, group, prefix) {
  return value.replace(LENGTH, (m, before, num, unit) => {
    if (Number(num) === 0) return `${before}0`;
    const v = `${num}${unit}`;
    if (prefix === 'radius' && RADII[v]) return `${before}${token(group, RADII[v], v)}`;
    return `${before}${token(group, `${prefix}-${slug(num)}${unit === 'px' ? '' : unit}`, v)}`;
  });
}

const SPACING = /^(margin|padding|gap|row-gap|column-gap|top|right|bottom|left|inset|scroll-margin|scroll-padding|text-indent|outline-offset|grid-gap|margin-[a-z-]+|padding-[a-z-]+|inset-[a-z-]+|scroll-margin-[a-z-]+|scroll-padding-[a-z-]+)$/;
const SIZE = /^(width|height|min-width|max-width|min-height|max-height|flex-basis|flex|grid-template-columns|grid-template-rows|grid-auto-columns|grid-auto-rows|block-size|inline-size|stroke-dasharray|background-size|columns|stroke-width)$/;
const BORDER = /^(border|border-top|border-right|border-bottom|border-left|border-width|border-[a-z]+-width|outline|outline-width|column-rule|text-decoration-thickness|text-underline-offset)$/;

function tokeniseDeclaration(prop, value) {
  const p = prop.trim().toLowerCase();
  if (p.startsWith('--')) return replaceColours(replaceLengths(value, 'size', 'size'));
  if (p === 'box-shadow' || p === 'text-shadow' || p === 'filter') {
    if (p === 'filter' && !/drop-shadow/.test(value)) return value;
    const v = value.trim();
    if (/^(none|inherit|initial|unset)$/i.test(v) || /^var\(--[\w-]+\)$/.test(v)) return value;
    // A shadow that uses a variable set on the element itself cannot move to
    // :root (it would resolve there), so only its parts become tokens.
    if (/var\(--(?!shadow)/.test(v)) return replaceColours(replaceLengths(value, 'line', 'line'));
    const important = /!important/.test(v) ? ' !important' : '';
    const clean = v.replace(/\s*!important/, '').replace(/\s+/g, ' ');
    const existing = [...tokens.entries()].find(([n, val]) => groups.get(n) === 'shadow' && val === clean);
    if (existing) return ` var(--${existing[0]})${important}`;
    const known = { '0 1px 4px rgba(17,21,75,.07)': 'shadow-sm', '0 4px 20px rgba(17,21,75,.11)': 'shadow-md', '0 8px 40px rgba(17,21,75,.16)': 'shadow-lg' };
    const count = [...groups.values()].filter(gr => gr === 'shadow').length;
    return ` ${token('shadow', known[clean] || `${p === 'text-shadow' ? 'text-shadow' : p === 'filter' ? 'drop-shadow' : 'shadow'}-${count + 1}`, clean)}${important}`;
  }
  if (p === 'font-family') {
    const key = value.trim().toLowerCase().replace(/["\s]/g, '').replace(/'/g, "'").replace("'opensans'", "'opensans'");
    const norm = value.trim().replace(/"/g, "'").replace(/\s*,\s*/g, ',');
    const k = norm.toLowerCase().replace(/\s/g, '');
    if (/^var\(/.test(norm)) return value;
    if (FONTS[k]) return ` ${token('font', FONTS[k], norm)}`;
    return ` ${token('font', `font-${slug(k.split(',')[0].replace(/'/g, ''))}`, norm)}`;
  }
  if (p === 'font') {
    // font: [style] [weight] size[/line-height] family
    return value.replace(/(\d*\.?\d+(?:px|rem|em))(?:\/(\d*\.?\d+(?:px|rem|em)?))?\s+(.+)$/, (m, size, lh, family) => {
      const s = replaceLengths(` ${size}`, 'text', 'text').trim();
      const l = lh ? `/${/[a-z]/.test(lh) ? replaceLengths(` ${lh}`, 'leading', 'leading').trim() : token('leading', `leading-${slug(lh)}`, lh)}` : '';
      const f = tokeniseDeclaration('font-family', ` ${family}`).trim();
      return `${s}${l} ${f}`;
    });
  }
  if (p === 'font-size') return replaceLengths(value, 'text', 'text');
  if (p === 'font-weight') return value.replace(/\b([1-9]00)\b/, (m, w) => token('weight', `weight-${w}`, w));
  if (p === 'line-height') {
    const v = value.trim();
    if (/^-?\d*\.?\d+$/.test(v)) return ` ${token('leading', `leading-${slug(v)}`, v)}`;
    return replaceLengths(value, 'leading', 'leading');
  }
  if (p === 'letter-spacing') {
    const v = value.trim();
    if (/^-?\d*\.?\d+(px|rem|em)$/.test(v)) return ` ${token('tracking', `tracking-${slug(v)}`, v)}`;
    return value;
  }
  if (p === 'border-radius' || /^border-(top|bottom)-(left|right)-radius$/.test(p)) return replaceLengths(value, 'radius', 'radius');
  if (SPACING.test(p)) return replaceColours(replaceLengths(value, 'space', 'space'));
  if (SIZE.test(p)) return replaceColours(replaceLengths(value, 'size', 'size'));
  if (BORDER.test(p)) return replaceColours(replaceLengths(value, 'line', 'line'));
  if (/^(transform|transition|animation|opacity|z-index|backdrop-filter|-webkit-backdrop-filter|content)$/.test(p) || p.startsWith('transition') || p.startsWith('animation')) return value;
  return replaceColours(value);
}

// ── Walking the stylesheet ─────────────────────────────────────────────────

/** Tokenise every declaration in a block body (text between { and }). */
function walk(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    const close = css.indexOf('}', i);
    if (open === -1 || (close !== -1 && close < open)) {
      // declarations up to the closing brace of the current block
      const end = close === -1 ? css.length : close;
      out += declarations(css.slice(i, end));
      if (close === -1) break;
      out += '}';
      i = close + 1;
      continue;
    }
    // Text before "{" may hold declarations (inside a block) and then a selector
    const chunk = css.slice(i, open);
    const lastSemi = chunk.lastIndexOf(';');
    const lastComment = chunk.lastIndexOf('*/');
    const split = Math.max(lastSemi, lastComment + 1);
    if (split > 0) {
      out += declarations(chunk.slice(0, lastSemi >= lastComment ? lastSemi + 1 : lastComment + 2));
      out += chunk.slice(lastSemi >= lastComment ? lastSemi + 1 : lastComment + 2);
    } else {
      out += chunk;
    }
    out += '{';
    i = open + 1;
  }
  return out;
}

function declarations(text) {
  // Keep comments as they are, tokenise "prop:value" pairs
  return text.replace(/(\/\*[\s\S]*?\*\/)|([^;:{}/]+(?:\/(?!\*)[^;:{}/]*)*):([^;{}]+)/g, (m, comment, prop, value) => {
    if (comment) return comment;
    if (!prop.trim() || /^\s*(@|\.|#|\[|:)/.test(prop) && !prop.trim().startsWith('--')) return m;
    return `${prop}:${tokeniseDeclaration(prop, value)}`;
  });
}

// ── :root blocks become the seed of the tokens file ───────────────────────

function liftRoot(css) {
  const seeds = [];
  const rest = css.replace(/(^|\n):root\s*\{([^}]*)\}/g, (m, lead, body) => {
    body.replace(/(--[\w-]+)\s*:\s*([^;]+);?/g, (d, name, value) => { seeds.push([name.slice(2), value.trim()]); return d; });
    return lead;
  });
  return { seeds, rest };
}

export function tokeniseCss(input) {
  tokens.clear();
  groups.clear();
  const { seeds, rest } = liftRoot(input);
  const css = walk(rest);
  return { seeds, tokens: new Map(tokens), groups: new Map(groups), css };
}

const GROUP_TITLES = { colour: 'Colours', font: 'Fonts', text: 'Font sizes', weight: 'Font weights', leading: 'Line heights', tracking: 'Letter spacing', space: 'Spacing', size: 'Sizes', line: 'Border and line widths', radius: 'Radii', shadow: 'Shadows' };

export function tokensFile(result) {
  const lines = ['/*', ' * Accelerator v2 design tokens.', ' * Every colour, font, size, spacing, radius and shadow used by the dashboard', ' * is defined here and nowhere else. accelerator.css only uses var(--...).', ' */', ':root {', '  /* Brand palette and named values carried over from v1 */'];
  result.seeds.forEach(([n, v]) => lines.push(`  --${n}: ${v};`));
  const byGroup = {};
  result.tokens.forEach((value, name) => {
    if (result.seeds.some(([n]) => n === name)) return;
    (byGroup[result.groups.get(name)] = byGroup[result.groups.get(name)] || []).push([name, value]);
  });
  for (const group of Object.keys(GROUP_TITLES)) {
    if (!byGroup[group]) continue;
    lines.push('', `  /* ${GROUP_TITLES[group]} */`);
    byGroup[group].sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true })).forEach(([n, v]) => lines.push(`  --${n}: ${v};`));
  }
  lines.push('}', '');
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('tokenise-css.mjs')) {
  const [input, tokensOut, cssOut] = process.argv.slice(2);
  const result = tokeniseCss(fs.readFileSync(input, 'utf8'));
  fs.writeFileSync(tokensOut, tokensFile(result));
  fs.writeFileSync(cssOut, result.css);
  console.log(`${result.tokens.size} tokens, ${result.seeds.length} carried over from :root`);
}
