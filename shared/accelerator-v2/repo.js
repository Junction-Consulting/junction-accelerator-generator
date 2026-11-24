/**
 * Node-only helpers that read the repository for the v2 tools: other
 * clients (for the "another client's content" check) and the media library.
 * The converter and the checks themselves stay pure.
 */

import fs from 'fs';
import path from 'path';
import { shingles } from './checks.js';

// Folders in clients/ that are not clients.
export const NOT_CLIENTS = new Set(['sample-demo', 'sample-experience', 'junction']);

const compact = text => String(text || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** A domain belongs to a client when its name is the client's name, or part of it. */
function clientDomains(slug, text) {
  const own = compact(slug);
  const words = slug.split('-');
  const short = words.length > 1 ? compact(words.slice(0, 2).join('')) : own;
  const out = new Set();
  for (const m of String(text).toLowerCase().matchAll(/\b((?:[a-z0-9-]+\.)+(?:ca|com|org|net|travel|info|co))\b/g)) {
    const host = m[1].replace(/^www\./, '');
    const label = compact(host.split('.').slice(-2, -1)[0]);
    if (label.length >= 5 && (own.includes(label) || label.includes(short))) out.add(host);
  }
  return [...out];
}

/**
 * Every other client in clients/: { slug, name, domains, shingles }.
 * The wording comes from each client's plan.md and content.json.
 */
export function loadOtherClients(root, exceptSlug) {
  const dir = path.join(root, 'clients');
  return fs.readdirSync(dir)
    .filter(slug => slug !== exceptSlug && !NOT_CLIENTS.has(slug) && fs.statSync(path.join(dir, slug)).isDirectory())
    .map(slug => {
      const read = file => (fs.existsSync(path.join(dir, slug, file)) ? fs.readFileSync(path.join(dir, slug, file), 'utf8') : '');
      const plan = read('plan.md');
      const contentJson = read('content.json');
      let name = null;
      const h1 = plan.match(/^#\s+(.+?)(?::\s*Accelerator.*)?$/m);
      if (h1) name = h1[1].trim();
      if (contentJson) { try { name = JSON.parse(contentJson).client.name || name; } catch (e) { /* ignore */ } }
      const text = `${plan}\n${contentJson}`;
      return { slug, name, domains: clientDomains(slug, text), shingles: shingles(plan) };
    });
}

/** The media library, for now: clients/[slug]/assets/[asset ID].[ext] */
export function assetDir(root, slug) {
  return path.join(root, 'clients', slug, 'assets');
}

export function findAsset(root, slug, assetId) {
  const dir = assetDir(root, slug);
  if (!fs.existsSync(dir)) return null;
  const file = fs.readdirSync(dir).find(f => f.slice(0, f.lastIndexOf('.')) === assetId);
  return file ? path.join(dir, file) : null;
}

export function assetChecker(root, slug) {
  return assetId => !!findAsset(root, slug, assetId);
}

export function readContent(root, slug) {
  const p = path.join(root, 'clients', slug, 'content.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null;
}

export const toJson = value => `${JSON.stringify(value, null, 2)}\n`;
