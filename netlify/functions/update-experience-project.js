// Netlify Function: Update Experience Project
//
// Changes an existing Experience Design dashboard:
//   - add or replace the launch plan (plan.md, experience format). Adding the
//     first plan moves the dashboard from the onboarding stage to the plan stage.
//   - add, change or remove the links on the Guide and Materials pages.
//
// The dashboard is rebuilt from the template, the project record and the plan
// each time, so nothing is edited by hand. Text edits made in Edit Mode are
// stored separately and are not affected.

import { createClient } from '@supabase/supabase-js';
import { buildExperienceFiles, materialLinkProblems } from '../../shared/experience-project.js';
import { readRepoFile, commitToGitHub } from '../../shared/github-repo.js';

const reply = (statusCode, payload) => ({ statusCode, body: JSON.stringify(payload) });

export async function handler(event) {
  if (event.httpMethod !== 'POST') return reply(405, { error: 'Method not allowed' });

  try {
    const { slug, planMd, materials, welcomeMessage } = JSON.parse(event.body);

    if (!slug || !/^[a-z0-9-]+$/.test(slug)) return reply(400, { error: 'Invalid slug format' });
    if (!planMd && !materials && welcomeMessage === undefined) {
      return reply(400, { error: 'Nothing to update. Choose a plan file or change a material link.' });
    }

    const linkProblems = materialLinkProblems(materials);
    if (linkProblems.length) return reply(400, { error: linkProblems.join('\n'), step: 'materials' });

    // ─────────────────────────────────────────────────────────────────────────
    // 1. VERIFY AUTH: staff, or the coach assigned to this operator
    // ─────────────────────────────────────────────────────────────────────────
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return reply(401, { error: 'Authentication required' });

    const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authError || !user) return reply(401, { error: 'Invalid token' });

    const { data: rows } = await supabaseAdmin
      .from('user_plans')
      .select('role, client_slug')
      .eq('email', user.email)
      .eq('active', true)
      .in('role', ['admin', 'psm', 'coach']);

    const allowed = (rows || []).some(row => row.role === 'admin' || row.role === 'psm' || (row.role === 'coach' && row.client_slug === slug));
    if (!allowed) return reply(403, { error: 'Only staff and the assigned coach can change this dashboard.' });

    // ─────────────────────────────────────────────────────────────────────────
    // 2. READ WHAT EXISTS
    // ─────────────────────────────────────────────────────────────────────────
    let template, projectText, existingPlanMd, planJsonText;
    try {
      [template, projectText, existingPlanMd, planJsonText] = await Promise.all([
        readRepoFile('template/experience-template.html'),
        readRepoFile(`clients/${slug}/project.json`),
        readRepoFile(`clients/${slug}/plan.md`),
        readRepoFile(`clients/${slug}/plan.json`)
      ]);
    } catch (err) {
      return reply(500, { error: err.message, step: 'github' });
    }
    if (template === null) return reply(500, { error: 'The dashboard template was not found on GitHub. Nothing was changed.', step: 'github' });

    // Dashboards created before project records existed have only a plan.json
    let project = null;
    try { project = projectText ? JSON.parse(projectText) : null; } catch (e) { project = null; }
    if (!project && planJsonText) {
      try {
        const planJson = JSON.parse(planJsonText);
        project = { type: 'experience', client_name: planJson.client_name, client_slug: slug, coach_email: planJson.coach_email, materials: {}, welcome_message: '' };
      } catch (e) { /* fall through to not found */ }
    }
    if (!project) return reply(404, { error: `No experience project was found at "${slug}".`, step: 'github' });
    if (project.type && project.type !== 'experience') return reply(400, { error: 'This is not an Experience Design dashboard.' });

    // ─────────────────────────────────────────────────────────────────────────
    // 3. APPLY THE CHANGES AND REBUILD
    // ─────────────────────────────────────────────────────────────────────────
    // Only the material links that were sent are changed. A link sent as an
    // empty string is removed (the card goes back to "Coming soon").
    const built = buildExperienceFiles({
      template,
      clientName: project.client_name,
      slug,
      coachEmail: project.coach_email,
      planMd: planMd || existingPlanMd || null,
      materials: { ...(project.materials || {}), ...(materials || {}) },
      welcomeMessage: welcomeMessage !== undefined ? welcomeMessage : project.welcome_message
    });
    if (!built.ok) {
      return reply(built.step === 'generate' ? 500 : 400, { error: built.error, step: built.step, issues: built.issues, warnings: built.warnings });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. COMMIT
    // ─────────────────────────────────────────────────────────────────────────
    const what = [
      planMd ? (existingPlanMd ? 'launch plan replaced' : 'launch plan added') : null,
      materials ? 'materials updated' : null,
      welcomeMessage !== undefined && !planMd && !materials ? 'welcome message updated' : null
    ].filter(Boolean).join(', ');

    const commitResult = await commitToGitHub(built.files, `Update experience project: ${project.client_name} (${what})`);
    if (commitResult.error) return reply(500, { error: commitResult.error, step: 'github' });

    return reply(200, {
      success: true,
      slug,
      projectUrl: `/${slug}/`,
      stage: built.stage,
      planAdded: !!planMd && !existingPlanMd,
      materials: built.project.materials,
      warnings: built.warnings,
      summary: built.summary,
      commitUrl: commitResult.commitUrl
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return reply(500, { error: err.message || 'Internal server error' });
  }
}
