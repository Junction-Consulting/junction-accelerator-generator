# Experience Dashboard: Coach Guide
### Junction Internal

**What this is:** How to create, fill and coach with an operator's Experience Design dashboard.

---

## Overview

Each operator has one dashboard for the whole program. It grows in two stages.

| Stage | When | What the operator sees |
|-------|------|------------------------|
| **Onboarding** | Created before the onboarding call | Home (the program step by step), Experience Development Guide, Materials |
| **Launch plan** | After coaching call 2, when the plan is added | Everything above, plus Strategy, Launch Roadmap, three Tracks and the Bookability Checklist |

The dashboard address is `https://accelerator.elearningu.com/[slug]/`. The operator signs in with the email they were invited with.

---

## Setting Up a Dashboard

### 1. Create it before the onboarding call

1. Go to **My Clients** and click **Create Experience Dashboard**.
2. Enter the operator's business name, check the URL slug, and choose the coach.
3. Paste the link to their Experience Development Guide and their questionnaire responses if you have them. Both are optional and can be added later.
4. Leave the launch plan file empty and click **Create Experience Dashboard**.

The dashboard is live about a minute later. To invite the operator, open their dashboard and use the **Share** button.

### 2. Add materials as they are ready

On My Clients, click the pencil on the operator's card to open **Manage**. Paste a link for any of these and click **Save materials**:

- Experience Development Guide
- Questionnaire responses
- Coaching Call 1 summary
- Coaching Call 2 summary
- Costing and pricing calculator

Each card on the operator's Materials page says "Coming soon" until its link is saved, then becomes a button. Clear a link and save to hide it again. Before saving, open each link in a private window to check the operator will be able to open it.

### 3. Add the launch plan after coaching call 2

1. Write the plan to `PLAN_FORMAT_EXPERIENCE.md`. A launch roadmap is 8 to 12 weeks. Eight is the usual length.
2. On the **Manage** page, choose the plan.md file. It is checked straight away, and anything that needs fixing is listed line by line.
3. Click **Add launch plan**.

The dashboard moves to the launch plan stage about a minute later. Guide and Materials stay exactly as they were. To correct a plan later, upload the fixed file on the same page with **Replace launch plan**.

---

## Walking the Operator Through It

### At the onboarding call

Open the dashboard together. Show them:
- **Home**: the six steps of the program, from questionnaire to launch plan
- **Experience Development Guide**: where their guide opens, and the five sections they tick off as they work through it
- **Materials**: where their answers and call summaries will appear

### When the launch plan is delivered

1. **Choose the start date.** On Home, the operator picks the Monday they want Week 1 to begin and clicks **Set my start date**. Every week of the roadmap is dated from it, the current week is highlighted, and the weekly emails begin. The operator can set this once. Staff (admin or PSM) can change it afterwards with the **Change** link beside the date.
2. **Strategy.** Their experience in one sentence, the goal, the positioning and the three objectives.
3. **The three Tracks.** Each has an Overview, Implementation Steps, Success Metrics, and Tips & Resources.
4. **Launch Roadmap.** Each week has actions on the left and a completion checklist on the right. A "how to" button beside an action jumps to the step that explains it. Checkboxes and notes save automatically.
5. **Bookability Checklist.** Its own page in the sidebar: the items that must be true before the first booking.

Until a start date is chosen, the roadmap shows no dates and no weekly emails are sent.

---

## Ongoing Coaching

1. Open the Launch Roadmap and expand the current week (it has a green edge).
2. Review which checklist items are ticked, and read any notes.
3. Use a "how to" button to walk through a step they are stuck on.
4. Preview next week.

Progress shows on each week, on each phase heading, on Home and in the sidebar ring. Guide section ticks are counted separately on the Guide page and do not affect the ring.

Staff and coaches also see an **Activity** page with visits and recent ticks.

---

## Common Questions

**Can they use it on a phone?**
Yes. On a phone the sidebar opens from the menu icon.

**Does progress carry across devices?**
Yes. Ticks and notes are saved to their account.

**Can they change the start date after setting it?**
No. Ask an admin or PSM to change it from the operator's dashboard.

**What happens to ticks if I replace the plan?**
A tick stays with its position: Week 3, item 2 stays ticked. If you reorder checklist items, check the ticks still make sense.

**Can they add their own tasks?**
No. They can add a note to any checklist item, and each week has a notes box.

**Can I change wording on the dashboard without re-uploading?**
Yes, for small text edits use Edit Mode on the dashboard. For structural changes, fix the plan.md and replace the plan.

---

## Troubleshooting

| Issue | What to do |
|-------|------------|
| New dashboard or change is not showing | Wait a minute and reload. Changes take about a minute to go live. |
| A material still says "Coming soon" | Open Manage, check the link was saved, and that it starts with `https://` |
| Operator cannot open a material | The document's sharing does not include them. Fix the sharing on the document itself. |
| "Your start date could not be saved" | Note the message shown and tell the technical team. |
| Roadmap has no dates | No start date has been chosen yet. See "Choose the start date" above. |
| The plan upload lists problems | Fix each line listed in the plan.md, then choose the file again. Nothing is changed until the plan passes. |

---

## Where Things Are

The coach portal:
```
https://accelerator.elearningu.com/my-clients/
```

A sample dashboard anyone can open without signing in:
```
https://accelerator.elearningu.com/sample-experience/
```

Each dashboard's files are in `/clients/[slug]/`: `project.json` (name, coach, material links), `plan.md` and `plan.json` (once the plan is added) and `index.html` (the page, rebuilt from the others).

---

*Junction Internal*
