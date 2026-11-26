/*
 * Accelerator v2 progress model. Pure: no DOM, storage or network.
 *
 * Loaded by every v2 page as a classic script (it defines the global
 * AcceleratorModel) and required by the generator and the tests through
 * module.exports, so the page and the tests run the same rules.
 *
 * DESIGN-BRIEF.md sections 3, 5 and 7:
 * - Tasks are the roadmap's actions. Progress counts ticked actions.
 * - The stage is chosen from whether a plan exists and what is ticked or read.
 * - The current week is the first week with an unticked action.
 * - A score's colour follows its letter grade.
 */
(function (root) {
  'use strict';

  // ── Score levels (brief section 3): the one place grades map to levels ──
  var LEVELS = {
    A: { key: 'strong', word: 'Strong' },
    B: { key: 'good', word: 'Good' },
    C: { key: 'fair', word: 'Fair' },
    D: { key: 'needs-work', word: 'Needs work' }
  };

  /** 'B-' -> { key: 'good', word: 'Good', letter: 'B-' }. D, E and F are Needs work. Unknown -> null. */
  function scoreLevel(grade) {
    var letter = String(grade == null ? '' : grade).trim().toUpperCase();
    var base = letter.charAt(0);
    if (!base) return null;
    var level = LEVELS[base] || ('EF'.indexOf(base) !== -1 ? LEVELS.D : null);
    return level ? { key: level.key, word: level.word, letter: letter } : null;
  }

  // ── Counting ──
  function countTicked(ids, isTicked) {
    var n = 0;
    (ids || []).forEach(function (id) { if (isTicked(id)) n += 1; });
    return n;
  }

  function percent(done, total) {
    return total > 0 ? Math.round(done / total * 100) : 0;
  }

  /**
   * weeks: [{ number, actions: [id] }] in order.
   * The first week with an unticked action. When every action is ticked,
   * the last week. Weeks with no actions are skipped.
   */
  function currentWeek(weeks, isTicked) {
    var withActions = (weeks || []).filter(function (w) { return w.actions && w.actions.length; });
    for (var i = 0; i < withActions.length; i++) {
      if (countTicked(withActions[i].actions, isTicked) < withActions[i].actions.length) return withActions[i].number;
    }
    return withActions.length ? withActions[withActions.length - 1].number : null;
  }

  /** The week after `number` that has actions, or null. */
  function nextWeek(weeks, number) {
    var later = (weeks || []).filter(function (w) { return w.number > number && w.actions && w.actions.length; });
    return later.length ? later[0].number : null;
  }

  /**
   * Brief section 5:
   *   before    : no plan yet
   *   delivered : a plan, nothing ticked, not every section read
   *   during    : something ticked, or every section read
   *   done      : every action ticked
   *
   * Reading keeps the client on "delivered" until every section is read
   * (readCount >= readTotal); any tick moves them on (brief section 5).
   */
  function selectStage(input) {
    if (!input.hasPlan) return 'before';
    if (input.totalTasks > 0 && input.doneTasks >= input.totalTasks) return 'done';
    if (input.doneTasks > 0) return 'during';
    if (input.readTotal > 0 && input.readCount >= input.readTotal) return 'during';
    return 'delivered';
  }

  var STAGES = ['before', 'delivered', 'during', 'done'];

  // ── The six-step strip under the greeting ──
  var STEPS = ['onboarding', 'assessment', 'coaching', 'plan', 'checkin', 'review'];

  /**
   * One entry per step: { key, state: 'done' | 'current' | 'later', note }.
   * Done steps say "Done", the current one "You are here", the one after it
   * "Next" and later ones "Later" (before the plan, the plan step says
   * "After your call").
   * checkins: { checkin: bool, review: bool } for scores that exist.
   */
  function stageSteps(stage, checkins) {
    checkins = checkins || {};
    var done = { onboarding: true, assessment: stage !== 'before' };
    done.coaching = stage !== 'before';
    done.plan = stage === 'done';
    done.checkin = !!checkins.checkin;
    done.review = !!checkins.review;
    var current = stage === 'before' ? 'assessment' : (stage === 'done' ? (done.checkin ? 'review' : 'checkin') : 'plan');
    var seenCurrent = false;
    var nextGiven = false;
    return STEPS.map(function (key) {
      if (key === current) { seenCurrent = true; return { key: key, state: 'current', note: 'You are here' }; }
      if (!seenCurrent || (done[key] && key !== 'review')) return { key: key, state: 'done', note: 'Done' };
      var note = 'Later';
      if (!nextGiven) { note = 'Next'; nextGiven = true; } else if (stage === 'before' && key === 'plan') note = 'After your call';
      return { key: key, state: 'later', note: note };
    });
  }

  /**
   * Sample check-in scores for the sandbox preview only (brief section 10:
   * "clearly labelled as sample"). Each area moves up a few points; the
   * letter is a plain 10-point scale, used for the sample and nothing else.
   */
  function sampleLetter(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    return 'D';
  }
  function sampleCheckins(assessment) {
    if (!assessment) return null;
    function lift(score, step) { return Math.min(100, Math.round(score + step)); }
    function build(step) {
      var areas = {};
      Object.keys(assessment.areas || {}).forEach(function (k, i) {
        var a = assessment.areas[k];
        var s = lift(a.score, step * (1 + (i % 3) / 2));
        areas[k] = { score: s, grade: sampleLetter(s) };
      });
      var overall = lift(assessment.overall.score, step);
      return { overall: { score: overall, grade: sampleLetter(overall) }, areas: areas, sample: true };
    }
    return { checkin: build(4), review: build(10) };
  }

  var api = {
    scoreLevel: scoreLevel,
    countTicked: countTicked,
    percent: percent,
    currentWeek: currentWeek,
    nextWeek: nextWeek,
    selectStage: selectStage,
    stageSteps: stageSteps,
    sampleCheckins: sampleCheckins,
    STAGES: STAGES,
    STEPS: STEPS
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AcceleratorModel = api;
})(this);
