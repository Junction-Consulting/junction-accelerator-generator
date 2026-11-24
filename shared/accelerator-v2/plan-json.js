/**
 * plan.json (the weekly email feed) generated from content.json, in the same
 * shape as v1's generatePlanJson() in shared/plan-generator.js.
 *
 * One difference from v1: actions are the action text only. v1 leaves the
 * "→ links to: Tactic N / Step M" note on the end of each action, and it
 * shows in the emails. In v2 that link is `how_to`, not text.
 *
 * Pure: no filesystem, network or environment.
 */

import { stripMarkdown } from '../plan-generator.js';

export const DASHBOARD_ORIGIN = 'https://accelerator.elearningu.com';

export function generatePlanJsonV2(content) {
  const { client, strategy, phases, roadmap } = content;
  const monthOf = number => {
    const index = (phases || []).findIndex(p => number >= p.weeks[0] && number <= p.weeks[1]);
    return index === -1 ? Math.ceil(number / 4) : index + 1;
  };
  return {
    client_name: client.name,
    client_slug: client.slug,
    goal: (strategy.goal || []).join('\n\n'),
    coach_email: client.coach_email,
    weeks: roadmap.weeks.map(week => ({
      week: week.number,
      month: monthOf(week.number),
      title: `Week ${week.number}: ${week.title}`,
      actions: week.actions.map(a => stripMarkdown(a.text)),
      checklist: week.checklist.map(c => stripMarkdown(c.text)),
      deep_link: `${DASHBOARD_ORIGIN}/${client.slug}/#week-${week.number}`
    }))
  };
}
