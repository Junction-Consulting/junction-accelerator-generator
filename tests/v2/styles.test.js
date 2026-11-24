/**
 * Accelerator v2 styles: every colour, font, size, spacing, radius and
 * shadow lives in assets/v2/tokens.css. Nothing else may hold a raw value.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CSS = fs.readFileSync(path.join(ROOT, 'assets', 'v2', 'accelerator.css'), 'utf8');
const TOKENS = fs.readFileSync(path.join(ROOT, 'assets', 'v2', 'tokens.css'), 'utf8');
const JS = ['accelerator.js', 'accelerator-after.js'].map(f => fs.readFileSync(path.join(ROOT, 'assets', 'v2', f), 'utf8')).join('\n');
const TEMPLATE = fs.readFileSync(path.join(ROOT, 'template', 'v2', 'accelerator.html'), 'utf8');
const COMPONENTS = fs.readFileSync(path.join(ROOT, 'shared', 'accelerator-v2', 'components.js'), 'utf8');

// Declarations with the media query preludes, comments and motion removed
function declarations(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@media[^{]*\{/g, '{')
    .replace(/@keyframes[^{]*\{/g, '{')
    .match(/[\w-]+\s*:[^;{}]+/g)
    .map(d => d.trim())
    .filter(d => !/^(transform|transition|animation|backdrop-filter|-webkit-backdrop-filter|opacity|z-index|content)\b/.test(d) && !/^transition-|^animation-/.test(d));
}

const RAW_COLOUR = /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|(?<![\w-])(white|black)(?![\w-])/i;
const RAW_LENGTH = /(^|[\s,(/:])-?\d*\.?\d+(px|rem|em)\b/;

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
  // Set on the element by the markup (--columns, --color, --obj-color), or
  // used but never defined in v1 either (kept so the look does not change)
  const allowed = new Set(['--columns', '--color', '--obj-color', '--coral-500', '--coral-600', '--cream-200', '--cream-50', '--danger', '--navy-200', '--navy-600', '--navy-700', '--r-full', '--success']);
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
