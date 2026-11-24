#!/usr/bin/env node
/**
 * Accelerator v2 converter, from the command line.
 *
 *   node shared/accelerator-v2/cli.mjs convert <slug>           report only, writes nothing
 *   node shared/accelerator-v2/cli.mjs convert <slug> --save    write content.json and plan.json
 *   node shared/accelerator-v2/cli.mjs check <slug>             run the publishing checks on content.json
 *   node shared/accelerator-v2/cli.mjs build <slug>             build the dashboard from content.json (report only)
 *   node shared/accelerator-v2/cli.mjs build <slug> --save      write clients/<slug>/index.html
 *
 * Options for convert (used on the first conversion; later runs keep the
 * values already in content.json unless given again):
 *   --name "Client Name"  --coach coach@example.com  --cohort-start YYYY-MM-DD  --sandbox
 *
 * Saving:
 *   - only into a client folder that is already on v2 (has content.json) or
 *     is listed in V2_CLIENTS below. Live v1 clients cannot be written to.
 *   - never when the conversion or the checks report an error.
 *   - when items were matched by similarity rather than identical text, or
 *     removed items had media, the matches are listed and --confirm-matches
 *     is needed to save.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { convertPlan } from './convert.js';
import { checkContent, formatCheckIssue } from './checks.js';
import { generatePlanJsonV2 } from './plan-json.js';
import { loadOtherClients, assetChecker, readContent, toJson, findAsset } from './repo.js';
import { renderDashboard, validateDashboardV2 } from './render.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const V2_CLIENTS = ['andreas-resort'];

function arg(args, name) {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
}

const line = issue => (issue.line ? `line ${issue.line}: ` : '');

function printConversion(result) {
  console.log(`Counts: ${Object.entries(result.counts).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  for (const e of result.errors) console.log(`  ERROR ${line(e)}${e.message} ${e.fix || ''}`);
  for (const w of result.warnings) console.log(`  warning ${line(w)}${w.message} ${w.fix || ''}`);
  if (result.matches.length) {
    console.log(`\nMatched by similarity (${result.matches.length}). Check these kept the right ID:`);
    for (const m of result.matches) console.log(`  ${m.kind} ${m.id} (${m.how}): "${m.previous}" -> "${m.text}"`);
  }
  if (result.removed.length) {
    console.log(`\nNo longer in the plan (${result.removed.length}):`);
    for (const r of result.removed) console.log(`  ${r.kind} ${r.id}: "${r.text}"${r.media ? ` (had ${r.media} media)` : ''}`);
  }
}

function printChecks(checks) {
  console.log(`\nChecks: ${checks.errors.length} error(s), ${checks.warnings.length} warning(s)`);
  for (const e of [...checks.errors, ...checks.warnings]) console.log(`  ${formatCheckIssue(e)}`);
}

/** Build a v2 dashboard page from content.json, with assets from the media library. */
export function buildPage(slug, content) {
  const template = fs.readFileSync(path.join(ROOT, 'template', 'v2', 'accelerator.html'), 'utf8');
  const assetUrl = id => {
    const file = findAsset(ROOT, slug, id);
    return file ? `/${path.relative(ROOT, file).split(path.sep).join('/')}` : '';
  };
  const { html, problems } = renderDashboard(content, { template, assetUrl });
  return { html, problems: [...problems, ...validateDashboardV2(html, content)] };
}

async function main() {
  const [command, slug, ...rest] = process.argv.slice(2);
  if (!['convert', 'check', 'build'].includes(command) || !slug) {
    console.log('Usage: node shared/accelerator-v2/cli.mjs convert|check|build <client-slug> [--save] [--confirm-matches]');
    process.exit(1);
  }
  const dir = path.join(ROOT, 'clients', slug);
  const existing = readContent(ROOT, slug);
  const checkOptions = { otherClients: loadOtherClients(ROOT, slug), assetExists: assetChecker(ROOT, slug) };

  if (command === 'check') {
    if (!existing) { console.log(`clients/${slug}/content.json does not exist.`); process.exit(1); }
    const checks = checkContent(existing, checkOptions);
    printChecks(checks);
    process.exit(checks.ok ? 0 : 1);
  }

  if (command === 'build') {
    if (!existing) { console.log(`clients/${slug}/content.json does not exist.`); process.exit(1); }
    const checks = checkContent(existing, checkOptions);
    printChecks(checks);
    const result = buildPage(slug, existing);
    result.problems.forEach(p => console.log(`  ERROR ${p}`));
    if (!checks.ok || result.problems.length) { console.log('\nNot built: fix the errors above first.'); process.exit(1); }
    if (!rest.includes('--save')) { console.log(`\nBuilt ${result.html.length} characters. Nothing written (add --save to write index.html).`); return; }
    if (!V2_CLIENTS.includes(slug)) { console.log(`\nNot saved: clients/${slug} is not a v2 client.`); process.exit(1); }
    fs.writeFileSync(path.join(dir, 'index.html'), result.html);
    console.log(`\nSaved clients/${slug}/index.html.`);
    return;
  }

  const planPath = path.join(dir, 'plan.md');
  if (!fs.existsSync(planPath)) { console.log(`clients/${slug}/plan.md does not exist.`); process.exit(1); }
  const client = {};
  if (arg(rest, '--name')) client.name = arg(rest, '--name');
  if (arg(rest, '--coach')) client.coach_email = arg(rest, '--coach');
  if (arg(rest, '--cohort-start')) client.cohort_start = arg(rest, '--cohort-start');
  if (rest.includes('--sandbox')) client.flags = { sandbox: true, send_emails: false };

  const result = convertPlan(fs.readFileSync(planPath, 'utf8'), { slug, client, existing });
  printConversion(result);
  const checks = checkContent(result.content, { ...checkOptions, previous: existing });
  printChecks(checks);

  if (!rest.includes('--save')) {
    console.log('\nNothing written (add --save to write content.json and plan.json).');
    return;
  }
  if (!existing && !V2_CLIENTS.includes(slug)) {
    console.log(`\nNot saved: clients/${slug} is not a v2 client. Live v1 clients are not converted as part of v2 work.`);
    process.exit(1);
  }
  if (!result.ok || !checks.ok) {
    console.log('\nNot saved: fix the errors above first.');
    process.exit(1);
  }
  const needsConfirm = result.matches.length > 0 || result.removed.some(r => r.media);
  if (needsConfirm && !rest.includes('--confirm-matches')) {
    console.log('\nNot saved: check the matches above, then run again with --confirm-matches.');
    process.exit(1);
  }
  fs.writeFileSync(path.join(dir, 'content.json'), toJson(result.content));
  fs.writeFileSync(path.join(dir, 'plan.json'), toJson(generatePlanJsonV2(result.content)));
  console.log(`\nSaved clients/${slug}/content.json and clients/${slug}/plan.json.`);
}

if (process.argv[1] && process.argv[1].endsWith('cli.mjs')) main().catch(e => { console.error(e); process.exit(1); });
