/**
 * Builds every file of an experience project from its inputs.
 *
 * An experience dashboard is always rebuilt from three things:
 *   - template/experience-template.html
 *   - the project record (name, coach, material links): clients/[slug]/project.json
 *   - the launch plan, once it exists: clients/[slug]/plan.md
 *
 * A project starts at the "onboarding" stage (no plan yet: Home, Guide and
 * Materials) and moves to the "plan" stage when a plan.md is added.
 *
 * Used by netlify/functions/create-experience-project.js,
 * netlify/functions/update-experience-project.js, scripts/build-experience.js
 * and the tests. Pure: no network, no filesystem, no environment variables.
 */

import {
  parseExperiencePlanMd,
  renderExperienceDashboard,
  generateExperiencePlanJson,
  validateExperienceHtml,
  buildExperienceProject,
  normaliseMaterials,
  MATERIAL_KEYS
} from './experience-generator.js';
import { validatePlan, formatReport } from './plan-validator.js';

/**
 * Returns { ok: true, stage, files: [{ path, content }], warnings, summary }
 * or { ok: false, step, error, issues, warnings } with nothing to commit.
 */
function buildExperienceFiles({ template, clientName, slug, coachEmail, planMd, materials, welcomeMessage }) {
  let planData = null;
  let report = { warnings: [], summary: null };

  if (planMd) {
    // Check the plan first. A plan with problems is rejected with a list of
    // the exact changes needed; nothing is generated.
    report = validatePlan(planMd, { type: 'experience', slug });
    if (!report.ok) {
      return { ok: false, step: 'validate', error: formatReport(report), issues: report.errors, warnings: report.warnings };
    }
    planData = parseExperiencePlanMd(planMd);
    if (planData.error) {
      return { ok: false, step: 'parse', error: planData.error, issues: [], warnings: report.warnings };
    }
  }

  const stage = planData ? 'plan' : 'onboarding';
  const project = buildExperienceProject({ clientName, slug, coachEmail, stage, materials, welcomeMessage });

  const { html, unfilledPlaceholders } = renderExperienceDashboard(template, {
    ...(planData || {}),
    clientName,
    slug,
    coachEmail,
    stage,
    materials: project.materials,
    // The plan's own welcome message wins once there is a plan
    welcomeMessage: (planData && planData.welcomeMessage) || project.welcome_message
  });

  // Never hand back a page that is not internally consistent
  const pageProblems = validateExperienceHtml(html);
  if (unfilledPlaceholders.length > 0 || pageProblems.length > 0) {
    const details = [
      ...unfilledPlaceholders.map(name => `Template placeholder with no data: ${name}`),
      ...pageProblems.map(problem => problem.message)
    ];
    return {
      ok: false,
      step: 'generate',
      error: `The dashboard could not be generated correctly, so nothing was changed. This is a problem with the generator or template, not with the plan.\n• ${details.slice(0, 8).join('\n• ')}`,
      issues: details.map(message => ({ severity: 'error', line: null, message, fix: '' })),
      warnings: report.warnings
    };
  }

  const files = [
    { path: `clients/${slug}/project.json`, content: JSON.stringify(project, null, 2) + '\n' },
    { path: `clients/${slug}/index.html`, content: html }
  ];
  if (planData) {
    files.push({ path: `clients/${slug}/plan.md`, content: planMd });
    files.push({ path: `clients/${slug}/plan.json`, content: JSON.stringify(generateExperiencePlanJson(clientName, slug, coachEmail, planData), null, 2) + '\n' });
  }

  return { ok: true, stage, project, files, warnings: report.warnings, summary: report.summary };
}

/**
 * Check material links typed into a form. Returns a list of plain-language
 * problems (empty when all is well). An empty value is fine: it means the
 * material is not ready yet.
 */
function materialLinkProblems(materials) {
  const labels = {
    guide: 'Experience Development Guide',
    questionnaire: 'Questionnaire Responses',
    session1: 'Coaching Call 1 Summary',
    session2: 'Coaching Call 2 Summary',
    calculator: 'Costing and Pricing Calculator'
  };
  const cleaned = normaliseMaterials(materials);
  return MATERIAL_KEYS
    .filter(key => String((materials && materials[key]) || '').trim() !== '' && !cleaned[key])
    .map(key => `The link for ${labels[key]} is not a web address. It must start with https:// and have no spaces.`);
}

export { buildExperienceFiles, materialLinkProblems };
