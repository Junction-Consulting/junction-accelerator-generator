#!/usr/bin/env node
/**
 * Rebuild an Experience Design dashboard on this computer.
 *
 * Builds clients/[slug]/index.html (and plan.json) from:
 *   - template/experience-template.html
 *   - clients/[slug]/project.json   (name, coach, stage, material links)
 *   - clients/[slug]/plan.md        (only once the launch plan exists)
 *
 * This is the same code the Create and Manage pages run on the server
 * (shared/experience-project.js). Use it after a template change, or to
 * rebuild the sample dashboard.
 *
 * Usage:
 *   node scripts/build-experience.js <client-slug>           (check only)
 *   node scripts/build-experience.js <client-slug> --write   (write the files)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const slugs = args.filter(a => !a.startsWith('--'));
  if (slugs.length === 0) {
    console.log('Usage: node scripts/build-experience.js <client-slug> [--write]');
    process.exit(1);
  }

  const { buildExperienceFiles, projectInputs } = await import('../shared/experience-project.js');
  const template = fs.readFileSync(path.join(ROOT, 'template', 'experience-template.html'), 'utf8');
  let failed = false;

  for (const slug of slugs) {
    const dir = path.join(ROOT, 'clients', slug);
    const projectPath = path.join(dir, 'project.json');
    const planPath = path.join(dir, 'plan.md');
    if (!fs.existsSync(projectPath)) {
      console.log(`${slug}: no project.json found at ${projectPath}`);
      failed = true;
      continue;
    }
    const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
    const planMd = fs.existsSync(planPath) ? fs.readFileSync(planPath, 'utf8') : null;

    const built = buildExperienceFiles({ ...projectInputs(project), template, slug, planMd });

    if (!built.ok) {
      console.log(`${slug}: NOT built (${built.step})\n${built.error}`);
      failed = true;
      continue;
    }
    (built.warnings || []).forEach(w => console.log(`${slug}: warning${w.line ? ` (line ${w.line})` : ''}: ${w.message}`));
    console.log(`${slug}: ${built.stage} stage${built.summary ? `, ${built.summary.weeks} weeks, ${built.summary.checklistItems} checklist items, ${built.summary.howToLinks} how-to links` : ''}`);

    if (write) {
      for (const file of built.files) {
        if (file.path.endsWith('plan.md')) continue; // the plan is the input, never rewritten
        fs.writeFileSync(path.join(ROOT, file.path), file.content);
        console.log(`  wrote ${file.path}`);
      }
    } else {
      console.log('  check only: nothing written. Add --write to write the files.');
    }
  }
  process.exit(failed ? 1 : 0);
}

main().catch(err => { console.error(err); process.exit(1); });
