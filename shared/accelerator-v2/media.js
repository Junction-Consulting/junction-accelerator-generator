/**
 * Media entries (SCHEMA.md, "Media").
 *
 * Until the media library is agreed (SCHEMA.md, open decision 2), an asset
 * ID is the `med_` ID of the image it belongs to, and the file is stored as
 * clients/[slug]/assets/[asset ID].[ext]. Renumbering or moving a step never
 * touches the file name.
 *
 *   addMedia(content, stepId, spec, newId) -> the stored entry
 *
 * `spec` is an entry without IDs or assets. Every image-bearing item (an
 * image, a social post, each gallery item and each image in a group) gets
 * its own `med_` ID, and its `asset` is set to that ID.
 *
 * Pure: no filesystem, network or environment.
 */

import { PREFIXES } from './ids.js';
import { allSteps } from './checks.js';

const IMAGE_FIELDS = ['frame', 'bar', 'badge', 'fit', 'caption', 'link'];

function image(spec, newId) {
  const id = newId(PREFIXES.media);
  const out = { id, type: 'image', asset: id, alt: spec.alt };
  for (const f of IMAGE_FIELDS) out[f] = spec[f] ?? (f === 'fit' ? 'crop' : f === 'frame' ? 'none' : null);
  return out;
}

export function buildMedia(spec, newId) {
  switch (spec.type) {
    case 'image':
      return image(spec, newId);
    case 'video':
      return { id: newId(PREFIXES.media), type: 'video', provider: spec.provider, video_id: spec.video_id, title: spec.title, caption: spec.caption ?? null };
    case 'social_post': {
      const id = newId(PREFIXES.media);
      return { id, type: 'social_post', asset: id, alt: spec.alt, post_type: spec.post_type ?? null, handle: spec.handle ?? null, url: spec.url ?? null };
    }
    case 'gallery':
      return {
        id: newId(PREFIXES.media),
        type: 'gallery',
        title: spec.title ?? null,
        items: spec.items.map(item => { const id = newId(PREFIXES.media); return { id, asset: id, alt: item.alt, caption: item.caption ?? null }; })
      };
    case 'group':
      return { id: newId(PREFIXES.media), type: 'group', layout: spec.layout, items: spec.items.map(item => image({ ...item, type: 'image' }, newId)) };
    case 'link_card':
      return { id: newId(PREFIXES.media), type: 'link_card', title: spec.title, subtitle: spec.subtitle ?? null, url: spec.url };
    default:
      throw new Error(`Unknown media type "${spec.type}"`);
  }
}

export function addMedia(content, stepId, spec, newId) {
  const found = allSteps(content).find(s => s.step.id === stepId);
  if (!found) throw new Error(`No step ${stepId}`);
  const entry = buildMedia(spec, newId);
  found.step.media.push(entry);
  return entry;
}

/** Every asset ID used by a media entry, with the frame it is shown in. */
export function assetsOf(entry) {
  const out = [];
  const visit = (m, frame) => {
    if (m.asset) out.push({ asset: m.asset, frame: m.type === 'social_post' ? 'phone' : (m.frame || frame || 'none'), alt: m.alt });
    (m.items || []).forEach(item => visit(item, entry.type === 'gallery' ? 'gallery' : null));
  };
  visit(entry, null);
  return out;
}

const SIZES = { website: [1600, 1000], document: [1200, 1600], phone: [1080, 1920], email: [1000, 1250], none: [1200, 800], gallery: [1200, 900] };

/**
 * A neutral placeholder image: grey panel, a simple picture glyph and no
 * words, in the proportions of the frame it is shown in.
 */
export function placeholderSvg(frame = 'none') {
  const [w, h] = SIZES[frame] || SIZES.none;
  const s = Math.min(w, h) / 5;
  const cx = w / 2;
  const cy = h / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <rect width="${w}" height="${h}" fill="#e9ebef"/>
  <rect x="${cx - s}" y="${cy - s * 0.75}" width="${s * 2}" height="${s * 1.5}" rx="${s * 0.12}" fill="none" stroke="#b7bcc6" stroke-width="${s * 0.08}"/>
  <circle cx="${cx - s * 0.45}" cy="${cy - s * 0.3}" r="${s * 0.17}" fill="#b7bcc6"/>
  <path d="M${cx - s * 0.85} ${cy + s * 0.6} L${cx - s * 0.2} ${cy - s * 0.05} L${cx + s * 0.2} ${cy + s * 0.3} L${cx + s * 0.45} ${cy + s * 0.1} L${cx + s * 0.85} ${cy + s * 0.6} Z" fill="#b7bcc6"/>
</svg>
`;
}
