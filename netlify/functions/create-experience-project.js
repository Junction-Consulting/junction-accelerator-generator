// Netlify Function: Create Experience Project
//
// Creates a new Experience Design dashboard. It can be created at either stage:
//   - onboarding: no plan yet. The dashboard has Home, Guide and Materials, so
//     it is live for the operator's onboarding call.
//   - plan: a plan.md (experience format) is uploaded with it.
// The launch plan and material links are added later with
// netlify/functions/update-experience-project.js.

import { createClient } from '@supabase/supabase-js';
// Parsing, checking and rendering live in shared, tested modules.
import { buildExperienceFiles, materialLinkProblems } from '../../shared/experience-project.js';
import { readRepoFile, repoPathExists, commitToGitHub } from '../../shared/github-repo.js';
import { ensureCoachAccess } from '../../shared/coach-access.js';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════════════

export async function handler(event, context) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { clientName, slug, coachEmail, planMd, materials, welcomeMessage } = body;

    // The plan is optional: without one the dashboard starts at the onboarding stage
    if (!clientName || !slug || !coachEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid slug format' })
      };
    }

    const linkProblems = materialLinkProblems(materials);
    if (linkProblems.length) {
      return { statusCode: 400, body: JSON.stringify({ error: linkProblems.join('\n'), step: 'materials' }) };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. VERIFY AUTH
    // ─────────────────────────────────────────────────────────────────────────
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required' }) };
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Verify token and get user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    // Check user role
    const { data: roleRows } = await supabaseAdmin
      .from('user_plans')
      .select('role')
      .eq('email', user.email)
      .eq('active', true)
      .in('role', ['admin', 'psm']);

    if (!roleRows || roleRows.length === 0) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Admin or PSM role required' }) };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. CHECK IF PROJECT EXISTS, AND READ THE TEMPLATE
    // ─────────────────────────────────────────────────────────────────────────
    // The template is read from the same branch the result is committed to, so
    // the function code and the template always come from the same place.
    let template;
    try {
      if (await repoPathExists(`clients/${slug}`)) {
        return {
          statusCode: 409,
          body: JSON.stringify({ error: 'A project with this URL slug already exists. To add a launch plan or materials to it, open it from My Clients and choose Manage.', step: 'github' })
        };
      }
      template = await readRepoFile('template/experience-template.html');
      if (template === null) throw new Error('The dashboard template was not found on GitHub. Nothing was created.');
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message, step: 'github' }) };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. CHECK THE PLAN (IF ANY) AND BUILD THE FILES
    // ─────────────────────────────────────────────────────────────────────────
    // A plan with problems is rejected with a list of the exact changes
    // needed. The generated page is checked too. Nothing is committed unless
    // both pass.
    const built = buildExperienceFiles({ template, clientName, slug, coachEmail, planMd, materials, welcomeMessage });
    if (!built.ok) {
      return {
        statusCode: built.step === 'generate' ? 500 : 400,
        body: JSON.stringify({ error: built.error, step: built.step, issues: built.issues, warnings: built.warnings })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 4. COMMIT TO GITHUB (all files in a single commit)
    // ─────────────────────────────────────────────────────────────────────────
    const commitResult = await commitToGitHub(built.files, `Add experience project: ${clientName}`);

    if (commitResult.error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: commitResult.error, step: 'github' })
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 5. GIVE THE COACH ACCESS
    // ─────────────────────────────────────────────────────────────────────────
    // The coach's own user_plans row is what lists this project in My Clients
    // and lets the coach open it. The table requires a start date, so the row
    // carries today's date. That date is never shown as the operator's start:
    // the roadmap starts only when a start date is confirmed on the dashboard
    // (see supabase/migrations/015_experience_launch_start.sql).
    // Files are already committed, so a failure is reported, not thrown.
    const coachAccess = await ensureCoachAccess(supabaseAdmin, {
      coachEmail,
      slug,
      dashboardState: 'experience'
    });

    if (!coachAccess.ok) {
      console.error('[create-experience-project] Coach access not granted:', coachAccess.error);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 6. NOTIFY COACH OF ASSIGNMENT
    // ─────────────────────────────────────────────────────────────────────────
    try {
      if (coachEmail && process.env.RESEND_API_KEY) {
        const dashboardUrl = `https://accelerator.elearningu.com/${encodeURIComponent(slug)}/`;
        const myClientsUrl = 'https://accelerator.elearningu.com/my-clients/';

        const safeClientName = clientName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeSenderEmail = user.email.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #fcf5ec; font-family: 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fcf5ec; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(17,21,75,0.08);">
          <tr>
            <td style="background-color: #11154b; padding: 32px; text-align: center;">
              <span style="font-size: 18px; font-weight: 800; color: #aadab6; letter-spacing: 0.06em; text-transform: uppercase;">Junction</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px 32px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #11154b;">You've Been Assigned a New Client</h1>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #6b6b8a;">
                Great news! You have been assigned as the coach for <strong style="color: #11154b;">${safeClientName}</strong>.
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #6b6b8a;">
                Their Experience Design dashboard has been created. You can open it to add their guide and materials, and to follow their progress once their launch plan is added.
              </p>
              <div style="background-color: #f5ede0; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #11154b;">Project Details</p>
                <p style="margin: 0; font-size: 14px; color: #6b6b8a;">
                  <strong>Client:</strong> ${safeClientName}<br>
                  <strong>Dashboard Type:</strong> Experience Design
                </p>
              </div>
              <table cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="background-color: #11154b; border-radius: 10px;">
                    <a href="${dashboardUrl}" target="_blank" style="display: inline-block; padding: 16px 28px; font-size: 15px; font-weight: 700; color: #aadab6; text-decoration: none;">
                      View Client Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #6b6b8a; text-align: center;">
                <a href="${myClientsUrl}" style="color: #11154b; text-decoration: underline;">View all your clients</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background-color: #f5ede0; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #6b6b8a;">
                Assigned by ${safeSenderEmail}<br>
                Junction Experience Design Program<br>
                <a href="https://accelerator.elearningu.com" style="color: #11154b;">accelerator.elearningu.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `.trim();

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'eLearningU <noreply@elearningu.com>',
            to: [coachEmail],
            subject: `New Client Assignment: ${safeClientName}`,
            html: emailHtml
          })
        });

        if (resendRes.ok) {
          console.log(`Coach notification sent to ${coachEmail} for ${slug}`);
        } else {
          const resendError = await resendRes.json();
          console.warn('Coach notification failed (non-fatal):', resendError);
        }
      }
    } catch (notifyErr) {
      console.warn('Failed to notify coach (non-fatal):', notifyErr.message);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 7. SUCCESS
    // ─────────────────────────────────────────────────────────────────────────
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        slug,
        projectUrl: `/${slug}/`,
        stage: built.stage,
        warnings: built.warnings,
        summary: built.summary,
        commitUrl: commitResult.commitUrl,
        coachAccessGranted: coachAccess.ok
      })
    };

  } catch (err) {
    console.error('Unexpected error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Internal server error' })
    };
  }
}
