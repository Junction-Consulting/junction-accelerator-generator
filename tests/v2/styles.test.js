/**
 * Accelerator v2 styles: every colour, font, size, spacing, radius and
 * shadow lives in assets/v2/tokens.css. Nothing else may hold a raw value.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CSS = fs.readFileSync(path.join(ROOT, 'assets', 'v2', 'accelerator.css'), 'utf8');
const TOKENS = fs.readFileSync(path.join(ROOT, 'assets', 'v2', 'tokens.css'), 'utf8');
const JS = ['accelerator.js', 'accelerator-after.js', 'progress-model.js'].map(f => fs.readFileSync(path.join(ROOT, 'assets', 'v2', f), 'utf8')).join('\n');
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'template', 'v2', 'accelerator.html'), 'utf8');
const COMPONENTS = fs.readFileSync(path.join(ROOT, 'shared', 'accelerator-v2', 'components.js'), 'utf8');

// Declarations with the media query preludes, comments and motion removed
function declarations(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@media[^{]*\{/g, '{')
    .replace(/@container[^{]*\{/g, '{')
    .replace(/@keyframes[^{]*\{/g, '{')
    .match(/[\w-]+\s*:[^;{}]+/g)
    .map(d => d.trim())
    .filter(d => !/^(transform|transition|animation|backdrop-filter|-webkit-backdrop-filter|opacity|z-index|content)\b/.test(d) && !/^transition-|^animation-/.test(d));
}

const RAW_COLOUR = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|(?<![\w-])(white|black)(?![\w-])/i;
const RAW_LENGTH = /(^|[\s,(/:])-?\d*\.?\d+(px|rem|em)\b/;

test('print.css has no raw colours, fonts, sizes, spacing, radii or shadows outside the page box', () => {
  const PRINT = fs.readFileSync(path.join(ROOT, 'assets', 'v2', 'print.css'), 'utf8');
  // @page rules cannot read custom properties in every renderer; pdf.test.js checks they match the tokens
  const body = PRINT.replace(/@page[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '');
  const offenders = declarations(body).filter(d => (/^font-family/.test(d) ? !/var\(/.test(d) : RAW_COLOUR.test(d) || RAW_LENGTH.test(d)));
  expect(offenders).toEqual([]);
  expect(body).not.toMatch(/\d(in|pt|cm|mm)\b/);
});

test('accelerator.css has no raw colours, fonts, sizes, spacing, radii or shadows', () => {
  const offenders = declarations(CSS).filter(d => {
    if (d.startsWith('--')) return RAW_COLOUR.test(d) || RAW_LENGTH.test(d);
    if (/^font-family/.test(d)) return !/var\(/.test(d);
    return RAW_COLOUR.test(d) || RAW_LENGTH.test(d);
  });
  expect(offenders).toEqual([]);
});

test('the tokens file is the one place that defines them', () => {
  expect(TOKENS).toMatch(/^\/\*[\s\S]*?\*\/\s*:root \{/);
  expect(TOKENS.trim().endsWith('}')).toBe(true);
  expect(TOKENS).not.toMatch(/\}\s*[.#a-z][^{]*\{/i); // only :root
});

test('every token the stylesheet uses is defined', () => {
  const defined = new Set([...(CSS + TOKENS).matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
  const used = new Set([...(CSS + TOKENS).matchAll(/var\((--[\w-]+)/g)].map(m => m[1]));
  // Set on the element by the markup (--columns, --color, --obj-color) or the
  // page script (--pct, a navigation ring's fill), or
  // used but never defined in v1 either (kept so the look does not change)
  const allowed = new Set(['--columns', '--pct', '--color', '--obj-color', '--coral-500', '--coral-600', '--cream-200', '--cream-50', '--danger', '--navy-200', '--navy-600', '--navy-700', '--r-full', '--success']);
  expect([...used].filter(t => !defined.has(t) && !allowed.has(t))).toEqual([]);
});

test('markup and scripts set no raw style values', () => {
  const styleAttrs = [...(TEMPLATE + COMPONENTS).matchAll(/style="([^"]*)"/g)].map(m => m[1]);
  styleAttrs.forEach(s => expect(s).toMatch(/^--[\w-]+:(var\(--[\w-]+(\$\{[^}]+\})?\)|\{\{[A-Z_]+\}\}|\$\{[^}]+\}|\d+)$/));
  expect(TEMPLATE + COMPONENTS).not.toMatch(/(fill|stroke)="#[0-9a-f]{3,6}"/i);
  expect(JS).not.toMatch(/#[0-9a-f]{6}\b|rgba?\(/i);
});

test('no stylesheet or script is copied into a page', () => {
  expect(TEMPLATE).not.toMatch(/<style[\s>]/);
  const inline = [...TEMPLATE.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)].map(m => m[1]);
  expect(inline).toEqual([' type="application/json" id="accelerator-data"']);
});

test('the dashboard and Strategy page tactic cards make an even grid: one row when there is room, never one card alone on a row', () => {
  // Four cards: 1, 2 or 4 columns. Three cards: 1 or 3 columns.
  const rules = [...CSS.matchAll(/@container \(min-width: (\d+)px\)\{([\s\S]*?)\n\}/g)].map(m => [Number(m[1]), m[2]]);
  const columnsAt = (count, width) => {
    let columns = 1;
    rules.filter(([min]) => width >= min).forEach(([, body]) => {
      for (const m of body.matchAll(/([^{}]+)\{grid-template-columns:repeat\((\d+),1fr\)\}/g)) {
        if (m[1].includes(`[data-columns="${count}"]`)) columns = Number(m[2]);
      }
    });
    return columns;
  };
  expect(CSS).toMatch(/\.dash-v2,\.tactics-overview\{container-type:inline-size\}/);
  for (let width = 300; width <= 1600; width += 20) {
    expect([1, 2, 4]).toContain(columnsAt(4, width));
    expect([1, 3]).toContain(columnsAt(3, width));
  }
  expect(columnsAt(4, 1100)).toBe(4);
  expect(columnsAt(4, 600)).toBe(2);
  expect(columnsAt(3, 1100)).toBe(3);
  expect(columnsAt(4, 400)).toBe(1);
});
