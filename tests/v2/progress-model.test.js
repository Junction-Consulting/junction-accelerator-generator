/**
 * The progress model shared by the page script and the generator
 * (assets/v2/progress-model.js): stage selection, the current week, counting
 * and score levels. DESIGN-BRIEF.md sections 3, 5 and 7.
 */

const M = require('../../assets/v2/progress-model.js');

const ticked = list => id => list.includes(id);
const WEEKS = [
  { number: 1, actions: ['a1', 'a2'] },
  { number: 2, actions: ['b1'] },
  { number: 3, actions: [] },
  { number: 4, actions: ['d1', 'd2'] }
];
const ALL = WEEKS.flatMap(w => w.actions);

describe('stage selection', () => {
  const stage = (over = {}) => M.selectStage({ hasPlan: true, totalTasks: 5, doneTasks: 0, readCount: 0, readTotal: 5, ...over });

  test('no plan: before the plan, whatever else is true', () => {
    expect(stage({ hasPlan: false })).toBe('before');
    expect(stage({ hasPlan: false, doneTasks: 5 })).toBe('before');
  });

  test('a plan with nothing ticked: plan delivered, including while it is being read', () => {
    expect(stage()).toBe('delivered');
    expect(stage({ readCount: 1 })).toBe('delivered');
    expect(stage({ readCount: 4 })).toBe('delivered');
  });

  test('anything ticked, or every section read: during the plan', () => {
    expect(stage({ doneTasks: 1 })).toBe('during');
    expect(stage({ doneTasks: 4 })).toBe('during');
    expect(stage({ readCount: 5 })).toBe('during');
  });

  test('every action ticked: plan done', () => {
    expect(stage({ doneTasks: 5 })).toBe('done');
    expect(stage({ doneTasks: 5, readCount: 0 })).toBe('done');
  });

  test('a plan with no actions is never done', () => {
    expect(stage({ totalTasks: 0 })).toBe('delivered');
  });
});

describe('progress counting', () => {
  test('counts ticked actions and rounds the percentage', () => {
    expect(M.countTicked(ALL, ticked(['a1', 'd2']))).toBe(2);
    expect(M.percent(2, 5)).toBe(40);
    expect(M.percent(1, 3)).toBe(33);
    expect(M.percent(0, 0)).toBe(0);
  });
});

describe('the current week', () => {
  test('is the first week with an unticked action', () => {
    expect(M.currentWeek(WEEKS, ticked([]))).toBe(1);
    expect(M.currentWeek(WEEKS, ticked(['a1']))).toBe(1);
    expect(M.currentWeek(WEEKS, ticked(['a1', 'a2']))).toBe(2);
  });

  test('skips weeks with no actions, and does not depend on order of ticking', () => {
    expect(M.currentWeek(WEEKS, ticked(['a1', 'a2', 'b1']))).toBe(4);
    expect(M.currentWeek(WEEKS, ticked(['d1', 'd2', 'b1']))).toBe(1);
  });

  test('is the last week once everything is ticked', () => {
    expect(M.currentWeek(WEEKS, ticked(ALL))).toBe(4);
  });

  test('the next week is the next one with actions', () => {
    expect(M.nextWeek(WEEKS, 1)).toBe(2);
    expect(M.nextWeek(WEEKS, 2)).toBe(4);
    expect(M.nextWeek(WEEKS, 4)).toBeNull();
  });
});

describe('score levels follow the letter grade (brief section 3)', () => {
  test.each([
    ['A', 'strong', 'Strong'], ['A+', 'strong', 'Strong'], ['A-', 'strong', 'Strong'],
    ['B+', 'good', 'Good'], ['B', 'good', 'Good'], ['B-', 'good', 'Good'],
    ['C+', 'fair', 'Fair'], ['C', 'fair', 'Fair'], ['c-', 'fair', 'Fair'],
    ['D+', 'needs-work', 'Needs work'], ['D', 'needs-work', 'Needs work'], ['F', 'needs-work', 'Needs work']
  ])('%s is %s', (grade, key, word) => {
    expect(M.scoreLevel(grade)).toEqual({ key, word, letter: grade.toUpperCase() });
  });

  test('no grade, no level', () => {
    expect(M.scoreLevel('')).toBeNull();
    expect(M.scoreLevel(null)).toBeNull();
    expect(M.scoreLevel('N/A')).toBeNull();
  });
});

describe('the six-step strip', () => {
  const states = (stage, c) => M.stageSteps(stage, c).map(s => `${s.key}:${s.state}:${s.note}`);

  test('before the plan: the assessment is current', () => {
    expect(states('before')).toEqual([
      'onboarding:done:Done', 'assessment:current:You are here', 'coaching:later:Next',
      'plan:later:After your call', 'checkin:later:Later', 'review:later:Later'
    ]);
  });

  test('plan delivered and during the plan: the plan is current, the check-in is next', () => {
    ['delivered', 'during'].forEach(stage => expect(states(stage)).toEqual([
      'onboarding:done:Done', 'assessment:done:Done', 'coaching:done:Done',
      'plan:current:You are here', 'checkin:later:Next', 'review:later:Later'
    ]));
  });

  test('plan done: the check-in is current until its scores exist, then the review', () => {
    expect(states('done')).toEqual([
      'onboarding:done:Done', 'assessment:done:Done', 'coaching:done:Done',
      'plan:done:Done', 'checkin:current:You are here', 'review:later:Next'
    ]);
    expect(states('done', { checkin: true })).toEqual([
      'onboarding:done:Done', 'assessment:done:Done', 'coaching:done:Done',
      'plan:done:Done', 'checkin:done:Done', 'review:current:You are here'
    ]);
  });

  test('exactly one step is current', () => {
    M.STAGES.forEach(stage => expect(M.stageSteps(stage).filter(s => s.state === 'current')).toHaveLength(1));
  });
});

describe('sample check-in scores (sandbox preview only)', () => {
  const assessment = { overall: { score: 74, grade: 'C' }, areas: { a: { score: 62, grade: 'D' }, b: { score: 97, grade: 'A' } } };

  test('are marked as sample, go up, never past 100, and carry a letter', () => {
    const s = M.sampleCheckins(assessment);
    ['checkin', 'review'].forEach(k => {
      expect(s[k].sample).toBe(true);
      expect(s[k].overall.score).toBeGreaterThan(74);
      Object.values(s[k].areas).forEach(a => { expect(a.score).toBeLessThanOrEqual(100); expect(a.grade).toMatch(/^[ABCD]$/); });
    });
    expect(s.review.overall.score).toBeGreaterThan(s.checkin.overall.score);
  });

  test('without an assessment there is nothing to sample', () => {
    expect(M.sampleCheckins(null)).toBeNull();
  });
});
