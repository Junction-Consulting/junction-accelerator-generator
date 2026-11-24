#!/usr/bin/env node
/**
 * Adds the media listed in sandbox-media.md to this sandbox's content.json,
 * with neutral placeholder images in assets/, each named by its media ID.
 *
 *   node clients/andreas-resort/add-sandbox-media.mjs
 *
 * A stand-in for the media tool (SCHEMA.md, open decision 2). Safe to run
 * again: a step that already has media is left alone, and placeholder files
 * are only written when missing, so no ID or file ever changes.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { makeIdFactory, collectIds } from '../../shared/accelerator-v2/ids.js';
import { addMedia, assetsOf, placeholderSvg } from '../../shared/accelerator-v2/media.js';
import { checkContent, allSteps } from '../../shared/accelerator-v2/checks.js';
import { assetChecker, toJson } from '../../shared/accelerator-v2/repo.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..', '..');
const SLUG = 'andreas-resort';

const web = (bar, alt, extra = {}) => ({ type: 'image', frame: 'website', bar, alt, ...extra });

// Tactic / Step (positions in plan.md, as in sandbox-media.md) -> media
const MEDIA = [
  ['1/1', [{ type: 'image', frame: 'phone', badge: 'mockup', alt: 'Instagram profile with the new bio, location and booking link', caption: 'Updated bio with location and booking link' }]],
  ['1/2', [{ type: 'image', frame: 'document', bar: 'Weekly posting pattern', badge: 'example', alt: 'A one-page weekly posting pattern: cabin feature Monday, local activity Wednesday, guest experience Friday' }]],
  ['1/4', [web('business.facebook.com', 'The Meta Business Suite planner with scheduled posts', { link: { url: 'https://business.facebook.com/', label: 'Open site' } })]],
  ['1/5', [
    { type: 'social_post', post_type: 'Cabin walkthrough', handle: '@andreasresort', alt: 'Vertical Reel walking through a cabin interior' },
    { type: 'social_post', post_type: 'Dock at sunrise', handle: '@andreasresort', alt: 'Vertical Reel of the dock and the lake at sunrise' },
    { type: 'video', provider: 'youtube', video_id: 'aqz-KE-bpKQ', title: 'How to shoot a 30-second Reel' }
  ]],
  ['2/2', [{ type: 'image', frame: 'email', badge: 'mockup', alt: 'A three-sentence review request email with a Google review link', caption: 'Review request: sent three days after checkout' }]],
  ['2/3', [{ type: 'image', frame: 'none', alt: 'A printed QR code card on a table beside the checkout instructions', caption: 'QR card beside the checkout instructions' }]],
  ['3/1', [{ type: 'group', layout: 'pair', items: [
    web('google.com/maps', 'The Google Business Profile before: no hours, no booking link', { caption: 'Before' }),
    web('google.com/maps', 'The Google Business Profile after: hours, amenities and booking link filled in', { caption: 'After' })
  ] }]],
  ['3/2', [{ type: 'gallery', title: 'Photos to upload', items: [
    { alt: 'Cabin exterior from the lakeside path', caption: 'Exterior' },
    { alt: 'Cabin living room with the fireplace lit', caption: 'Interior' },
    { alt: 'The dock reaching out over calm water', caption: 'Dock' },
    { alt: 'The fire pit at dusk with chairs around it', caption: 'Fire pit' },
    { alt: 'Cabins under snow in winter', caption: 'Winter' },
    { alt: 'The driveway and sign guests see on arrival', caption: 'Arrival' }
  ] }]],
  ['3/3', [web('andreasresort.example', 'The homepage with the shorter title and section headings', { fit: 'full', badge: 'mockup' })]],
  ['3/6', [{ type: 'group', layout: 'four', items: [
    { frame: 'none', alt: 'The resort listing in Apple Maps', caption: 'Apple Maps' },
    { frame: 'none', alt: 'The resort listing in Bing Places', caption: 'Bing Places' },
    { frame: 'none', alt: 'The resort listing on Tripadvisor', caption: 'Tripadvisor' },
    { frame: 'none', alt: 'The resort listing on the regional tourism office website', caption: 'Regional tourism office' }
  ] }]],
  ['3/9', [{ type: 'link_card', title: 'Google Search Console', subtitle: 'Performance report', url: 'https://search.google.com/search-console' }]],
  ['4/1', [web('andreasresort.example', 'The site header with a Book Now button', { badge: 'mockup', caption: 'Book Now in the header on every page' })]],
  ['4/5', [{ type: 'image', frame: 'email', badge: 'mockup', alt: 'A pre-arrival email with directions, check-in details and what to bring', caption: 'Pre-arrival email: sent five days before check-in' }]]
];

const contentPath = path.join(DIR, 'content.json');
const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
const newId = makeIdFactory({ taken: new Set(collectIds(content)) });
const steps = allSteps(content);
const stepAt = ref => {
  const [t, s] = ref.split('/').map(Number);
  const found = steps.filter(x => x.tactic === content.tactics[t - 1])[s - 1];
  if (!found) throw new Error(`No step ${ref}`);
  return found.step;
};

let added = 0;
for (const [ref, entries] of MEDIA) {
  const step = stepAt(ref);
  if (step.media.length) continue;
  entries.forEach(spec => { addMedia(content, step.id, spec, newId); added += 1; });
}

// A placeholder file for every asset that has none, in the proportions of its frame
const assetDir = path.join(DIR, 'assets');
const onDisk = assetChecker(ROOT, SLUG);
const toWrite = new Map();
for (const { step } of allSteps(content)) {
  for (const entry of step.media) {
    for (const { asset, frame } of assetsOf(entry)) if (!onDisk(asset)) toWrite.set(asset, placeholderSvg(frame));
  }
}

const checks = checkContent(content, { assetExists: id => onDisk(id) || toWrite.has(id) });
if (!checks.ok) {
  checks.errors.forEach(e => console.log(`ERROR ${e.where}: ${e.message}`));
  console.log('Nothing written.');
  process.exit(1);
}
fs.mkdirSync(assetDir, { recursive: true });
toWrite.forEach((svg, asset) => fs.writeFileSync(path.join(assetDir, `${asset}.svg`), svg));
fs.writeFileSync(contentPath, toJson(content));
console.log(`Added ${added} media entries and ${toWrite.size} placeholder images.`);
