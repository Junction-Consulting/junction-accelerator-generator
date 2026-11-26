/*
 * Accelerator v2 dashboard behaviour. Shared by every v2 client page.
 *
 * This is the v1 template's inline script, driven by the page data the
 * generator embeds (<script id="accelerator-data">) instead of arrays typed
 * into each page. Function names are the v1 names, because the shared scripts
 * (analytics.js wraps navigate(), progress.js calls updateProgress()) and the
 * inline handlers in the markup use them.
 *
 * Loaded before the shared scripts in /shared/. It must stay a classic script
 * (not a module) so its functions are globals.
 */

// ── Page data ──────────────────────────────────────────────
const PAGE = JSON.parse(document.getElementById('accelerator-data').textContent);
const MODEL = window.AcceleratorModel;
// Tasks are the roadmap's actions (DESIGN-BRIEF.md section 7)
const ALL_TASK_IDS = PAGE.tasks.all;
const WEEK_TASKS = PAGE.tasks.byWeek;
const PHASE_TASKS = PAGE.tasks.byPhase;
const TACTIC_TASKS = PAGE.tasks.byTactic;
const TACTIC_COUNT = PAGE.tactics.length;
const TOTAL_WEEKS = PAGE.totalWeeks;
const TOTAL_DAYS = PAGE.totalDays;
const TOUR_STEPS = PAGE.tour;

// ── State (this browser only: notes and Quick Wins ticks) ──
const STATE_KEY = PAGE.slug + '_accelerator_v2';
const OB_KEY = PAGE.slug + '_onboarded_v1';
let state = { checks: {}, notes: {} };

// Read state (stage 2a) and the last step opened: this browser only for now
// (CUTOVER.md item 12).
const READ_KEY = PAGE.slug + '_read_v2';
const LAST_STEP_KEY = PAGE.slug + '_last_step_v2';
const PREVIEW_KEY = PAGE.slug + '_preview_stage';
function readStore(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
}
function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

// ── Sandbox stage preview (client.flags.sandbox only) ──────
// A preview stage shows sample state and never writes saved progress.
// "During the plan" uses the real ticks.
const PREVIEW = (function () {
  if (!PAGE.sandbox) return null;
  const fromUrl = new URLSearchParams(window.location.search).get('stage');
  if (MODEL.STAGES.indexOf(fromUrl) !== -1) { writeStore(PREVIEW_KEY, fromUrl); return fromUrl; }
  const stored = readStore(PREVIEW_KEY, null);
  return MODEL.STAGES.indexOf(stored) !== -1 ? stored : null;
})();
const IS_SAMPLE = !!PREVIEW && PREVIEW !== 'during';
let sampleRead = {};

function choosePreviewStage(stage) {
  writeStore(PREVIEW_KEY, stage);
  const url = new URL(window.location.href);
  url.searchParams.set('stage', stage);
  window.location.href = url.toString();
}

// In a sample stage, saved tick boxes cannot be changed
if (IS_SAMPLE) {
  document.addEventListener('click', function (e) {
    const t = e.target;
    if (t && t.matches && t.matches('input[data-key], input[data-mirror]')) { e.preventDefault(); e.stopPropagation(); }
  }, true);
}

function loadState() {
  try {
    const s = localStorage.getItem(STATE_KEY);
    if (s) state = JSON.parse(s);
  } catch (e) {}
}
function saveState() {
  try { localStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch (e) {}
}

// ── Navigation ─────────────────────────────────────────────
function navigate(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => { n.classList.remove('active'); n.removeAttribute('aria-current'); });
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  document.querySelectorAll(`.nav-item[data-page="${pageId}"]`).forEach(n => { n.classList.add('active'); n.setAttribute('aria-current', 'page'); });
  document.getElementById('main').scrollTop = 0;
  if (window.innerWidth <= 768) closeMobileDrawer();
  markRead(pageId);
}

// ── PDF ────────────────────────────────────────────────────
function printRoadmap() {
  navigate('roadmap');
  setTimeout(function () { window.print(); }, 100);
}

function downloadPDF() {
  navigate('assessment');
  setTimeout(function () { window.print(); }, 100);
}

// ── Mobile navigation ──────────────────────────────────────
function openMobileDrawer() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
  document.body.classList.add('drawer-open');
  setHamburger(true);
}
function closeMobileDrawer() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
  document.body.classList.remove('drawer-open');
  setHamburger(false);
}
function setHamburger(open) {
  const btn = document.getElementById('nav-hamburger');
  if (!btn) return;
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}
function toggleMobileDrawer() {
  if (document.getElementById('sidebar').classList.contains('open')) closeMobileDrawer();
  else openMobileDrawer();
}

const SWIPE_THRESHOLD = 50;
const EDGE_ZONE = 30;
let touchStartX = 0;
let touchStartY = 0;
let touchCurrentX = 0;
let isSwiping = false;
let isEdgeSwipe = false;

function handleTouchStart(e) {
  if (window.innerWidth > 768) return;
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchCurrentX = touchStartX;
  isSwiping = false;
  isEdgeSwipe = touchStartX < EDGE_ZONE && !document.getElementById('sidebar').classList.contains('open');
}
function handleTouchMove(e) {
  if (window.innerWidth > 768) return;
  const touch = e.touches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
    isSwiping = true;
    touchCurrentX = touch.clientX;
    const sidebar = document.getElementById('sidebar');
    const isOpen = sidebar.classList.contains('open');
    if (isEdgeSwipe && deltaX > 0) {
      sidebar.style.transform = `translateX(${-100 + Math.min(deltaX / 268, 1) * 100}%)`;
      sidebar.style.transition = 'none';
    } else if (isOpen && deltaX < 0) {
      sidebar.style.transform = `translateX(${Math.max(deltaX / 268, -1) * 100}%)`;
      sidebar.style.transition = 'none';
    }
  }
}
function handleTouchEnd() {
  if (window.innerWidth > 768 || !isSwiping) return;
  const sidebar = document.getElementById('sidebar');
  const isOpen = sidebar.classList.contains('open');
  const deltaX = touchCurrentX - touchStartX;
  sidebar.style.transform = '';
  sidebar.style.transition = '';
  if (isEdgeSwipe && deltaX > SWIPE_THRESHOLD) { openMobileDrawer(); return; }
  if (isOpen && deltaX < -SWIPE_THRESHOLD) { closeMobileDrawer(); return; }
  if (isEdgeSwipe && deltaX > 0) closeMobileDrawer();
}
document.addEventListener('touchstart', handleTouchStart, { passive: true });
document.addEventListener('touchmove', handleTouchMove, { passive: true });
document.addEventListener('touchend', handleTouchEnd, { passive: true });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMobileDrawer(); });

// ── Tactic tabs and steps ──────────────────────────────────
function switchTacticTab(tacticNum, tabName) {
  document.querySelectorAll(`[data-tactic-tab="${tacticNum}"]`).forEach(t => {
    const isActive = t.dataset.tab === tabName;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  document.querySelectorAll(`[data-tactic-content="${tacticNum}"]`).forEach(panel => {
    const isActive = panel.dataset.content === tabName;
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });
  const main = document.getElementById('main');
  if (main) main.scrollTop = 0;
  window.scrollTo(0, 0);
}

// Steps open collapsed and remember nothing (brief section 7)
function setStepOpen(card, open) {
  if (!card) return;
  card.classList.toggle('open', open);
  const head = card.querySelector('.step-head');
  const body = card.querySelector('.step-body');
  if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (body) body.hidden = !open;
  if (open) rememberStep(card.id);
}
function toggleStep(btn) {
  const card = btn.closest('.step-card');
  setStepOpen(card, !card.classList.contains('open'));
}

// ── Roadmap weeks: one open at a time, on a white panel ────
function setWeekOpen(n, open) {
  const card = document.getElementById('wc-' + n);
  if (!card) return;
  card.classList.toggle('open', open);
  const head = card.querySelector('.rm-week-head');
  const body = card.querySelector('.rm-week-body');
  if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (body) body.hidden = !open;
}
function toggleWeek(n) {
  const card = document.getElementById('wc-' + n);
  if (!card) return;
  const opening = !card.classList.contains('open');
  document.querySelectorAll('.rm-week.open').forEach(w => setWeekOpen(w.getAttribute('data-week'), false));
  if (opening) setWeekOpen(n, true);
}
function toggleHowTo(id, btn) {
  const box = document.getElementById('howto-' + id);
  if (!box) return;
  box.hidden = !box.hidden;
  btn.setAttribute('aria-expanded', box.hidden ? 'false' : 'true');
  btn.textContent = box.hidden ? 'How to' : 'Hide how to';
}
function openGbpWins() {
  navigate('roadmap');
  const section = document.getElementById('gbp-wins');
  if (section) setTimeout(function () { section.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
}

// ── Checkboxes and notes ───────────────────────────────────
function onCheck(el) {
  state.checks[el.id] = el.checked;
  saveState();
  updateProgress();
  updateNoteBtn(el.id);
}
function toggleNote(id) {
  const area = document.getElementById('note-area-' + id);
  if (!area) return;
  area.classList.toggle('open');
  document.querySelectorAll(`[onclick="toggleNote('${id}')"]`).forEach(b => b.setAttribute('aria-expanded', area.classList.contains('open') ? 'true' : 'false'));
  if (area.classList.contains('open')) {
    const ta = document.getElementById('note-' + id);
    if (ta) ta.focus();
  }
}
function saveNote(id, val) {
  state.notes[id] = val;
  saveState();
  updateNoteBtn(id);
}
function updateNoteBtn(id) {
  const btn = document.querySelector(`[onclick="toggleNote('${id}')"]`);
  if (!btn) return;
  const hasNote = state.notes[id] && state.notes[id].trim().length > 0;
  btn.classList.toggle('has-note', !!hasNote);
}

// ── Ticks ──────────────────────────────────────────────────
// The saved tick for an action is the roadmap's input[data-key]. Read from
// the DOM so ticks loaded by progress.js are counted. The dashboard's tick
// boxes (data-mirror) pass changes through to it.
function realInput(id) { return document.querySelector(`input[data-key="${id}"]`); }

function isTicked(id) {
  if (IS_SAMPLE) return PREVIEW === 'done';
  const el = realInput(id);
  return !!(el && el.checked);
}
function countChecked(ids) { return MODEL.countTicked(ids, isTicked); }

let tickedThisVisit = false;
function onMirrorTick(el) {
  const real = realInput(el.getAttribute('data-mirror'));
  if (!real || IS_SAMPLE || real.disabled) { el.checked = !el.checked; return; }
  real.checked = el.checked;
  tickedThisVisit = true;
  // Fires the roadmap box's own handlers: onCheck() and progress.js's save
  real.dispatchEvent(new Event('change', { bubbles: true }));
}

function onQuickWinTick(el) {
  state.checks[el.id] = el.checked;
  saveState();
  updateProgress();
}

function applySampleTicks() {
  ALL_TASK_IDS.forEach(id => {
    const el = realInput(id);
    if (el) { el.checked = PREVIEW === 'done'; el.disabled = true; }
  });
}

// ── Live values (data-live attributes on the page) ─────────
function setLive(name, value) {
  document.querySelectorAll(`[data-live="${name}"]`).forEach(el => { el.textContent = value; });
}
function setPct(selector, pct) {
  document.querySelectorAll(selector).forEach(el => el.style.setProperty('--pct', pct));
}

// ── Progress ───────────────────────────────────────────────
// Called by progress.js after it loads or saves a tick, so it must stay global.
function updateProgress() {
  if (IS_SAMPLE) applySampleTicks();
  const done = countChecked(ALL_TASK_IDS);
  const total = ALL_TASK_IDS.length;
  const pct = MODEL.percent(done, total);

  setLive('plan-done', done);
  setLive('plan-pct', pct + '%');
  setPct('[data-live-donut="plan"]', pct);

  Object.keys(PHASE_TASKS).forEach(p => setPct(`[data-live-bar="phase-${p}"]`, MODEL.percent(countChecked(PHASE_TASKS[p]), PHASE_TASKS[p].length)));

  for (let t = 1; t <= TACTIC_COUNT; t++) {
    const ids = TACTIC_TASKS[t] || [];
    const d = countChecked(ids);
    const tot = ids.length;
    const p = MODEL.percent(d, tot);
    setPct(`[data-live-ring="tactic-${t}"]`, p);
    setLive(`tactic-${t}-done`, d);
    const navRing = document.getElementById('nav-ring-' + t);
    if (navRing) navRing.style.setProperty('--pct', p + '%');
    const navText = document.getElementById('nav-ring-' + t + '-text');
    if (navText) navText.textContent = ', ' + d + ' of ' + tot + ' done';
    // The tactic page's donut
    setPct(`[data-live-donut="tactic-${t}"]`, p);
    setLive(`tactic-${t}-pct`, p + '%');
  }

  // Roadmap: each week's count and pie, and each month's count
  Object.keys(WEEK_TASKS).forEach(w => {
    const ids = WEEK_TASKS[w];
    const d = countChecked(ids);
    setLive(`week-${w}-done`, d);
    setPct(`[data-live-pie="week-${w}"]`, MODEL.percent(d, ids.length));
    const card = document.getElementById('wc-' + w);
    if (card) card.classList.toggle('is-done', ids.length > 0 && d === ids.length);
  });
  Object.keys(PHASE_TASKS).forEach(m => setLive(`phase-${m}-done`, countChecked(PHASE_TASKS[m])));
  const gbp = [...document.querySelectorAll('#gbp-wins input[type="checkbox"]')];
  setLive('gbp-done', gbp.filter(b => b.checked).length);

  // Dashboard tick boxes follow the saved ones; a ticked sentence fades
  document.querySelectorAll('input[data-mirror]').forEach(m => {
    const id = m.getAttribute('data-mirror');
    const real = realInput(id);
    m.checked = isTicked(id);
    m.disabled = IS_SAMPLE || !!(real && real.disabled);
  });
  document.querySelectorAll('.task-row, .check-item').forEach(row => {
    const box = row.querySelector('input[type="checkbox"]');
    if (box) row.classList.toggle('is-ticked', box.checked);
  });

  // The assessment's quick wins (this browser; not plan progress)
  const wins = [...document.querySelectorAll('input[id^="aqw-"]')];
  const winsTotal = PAGE.assessment ? PAGE.assessment.quickWins : 0;
  const winsDone = [...new Set(wins.filter(w => w.checked).map(w => w.id))].length;
  setLive('wins-done', winsDone);
  setPct('[data-live-ring="wins"]', MODEL.percent(winsDone, winsTotal));

  renderDashboard();
}

// ── Read state and the last step opened ────────────────────
function readKeyFor(pageId) {
  if (pageId === 'strategy') return 'strategy';
  const m = /^tactic(\d+)$/.exec(pageId || '');
  return m && PAGE.tactics[m[1] - 1] ? PAGE.tactics[m[1] - 1].id : null;
}
function readSet() { return IS_SAMPLE ? sampleRead : readStore(READ_KEY, {}); }
function readOrder() { return ['strategy'].concat(PAGE.tactics.map(t => t.id)); }
function readCount() { const r = readSet(); return readOrder().filter(k => r[k]).length; }
function markRead(pageId) {
  const key = readKeyFor(pageId);
  if (!key) return;
  const r = readSet();
  if (r[key]) return;
  r[key] = true;
  if (!IS_SAMPLE) writeStore(READ_KEY, r);
  renderDashboard();
}
function pageForReadKey(key) {
  if (key === 'strategy') return 'strategy';
  const t = PAGE.tactics.find(x => x.id === key);
  return t ? 'tactic' + t.num : 'dashboard';
}
function openToRead(key) { navigate(pageForReadKey(key)); }
function continueReading() {
  const r = readSet();
  const next = readOrder().find(k => !r[k]);
  navigate(next ? pageForReadKey(next) : 'roadmap');
}
function rememberStep(stepId) { if (PAGE.steps[stepId]) writeStore(LAST_STEP_KEY, stepId); }
function resumeLastStep() {
  const stepId = readStore(LAST_STEP_KEY, null);
  if (stepId && PAGE.steps[stepId]) howToLink('tactic' + PAGE.steps[stepId], stepId);
}

// ── Dashboard: which stage, and what it shows ─────────────
let shownWeek = null;          // the week on the "This week" card
let resultsRequested = false;  // "See your results" after the last tick of the plan
let lastStage = null;

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function currentStage() {
  if (PREVIEW) return PREVIEW;
  const stage = MODEL.selectStage({
    hasPlan: PAGE.hasPlan,
    totalTasks: ALL_TASK_IDS.length,
    doneTasks: countChecked(ALL_TASK_IDS),
    readCount: readCount(),
    readTotal: readOrder().length
  });
  // Ticking the plan's last action here keeps the week card in view until
  // the client asks for their results
  if (stage === 'done' && lastStage === 'during' && tickedThisVisit && !resultsRequested) return 'during';
  return stage;
}

function checkinScores() {
  if (PAGE.checkins) return PAGE.checkins;
  if (PREVIEW === 'done') return MODEL.sampleCheckins(PAGE.assessment);
  return null;
}

function setStageAttributes(stage) {
  document.body.setAttribute('data-stage', stage);
  document.body.setAttribute('data-plan', stage === 'before' ? 'coming' : 'ready');
}

function renderDashboard() {
  const root = document.querySelector('[data-dashboard]');
  if (!root) return;
  const stage = currentStage();
  if (stage !== lastStage) setStageAttributes(stage);
  root.querySelectorAll('[data-stage-panel]').forEach(p => { p.hidden = p.getAttribute('data-stage-panel') !== stage; });

  const name = PAGE.name;
  const total = ALL_TASK_IDS.length;
  const heads = {
    before: ['Welcome, ' + name, PAGE.assessment ? 'Your assessment is ready. Your ' + TOTAL_DAYS + '-day plan comes after your coaching call.' : 'Your ' + TOTAL_DAYS + '-day plan comes after your coaching call.'],
    delivered: ['Your plan is ready, ' + name, PAGE.welcome],
    during: [getTimeGreeting() + ', ' + name, null],
    done: ['You finished your ' + TOTAL_DAYS + '-day plan', 'All ' + total + ' tasks are checked off. Here is what changed and what comes next.']
  }[stage];
  document.getElementById('dash-greeting').textContent = heads[0];
  const sub = document.getElementById('dash-sub');
  sub.textContent = heads[1] || '';
  sub.hidden = !heads[1];

  const scores = checkinScores();
  MODEL.stageSteps(stage, { checkin: !!(scores && scores.checkin), review: !!(scores && scores.review) }).forEach(step => {
    const li = root.querySelector(`[data-step="${step.key}"]`);
    if (!li) return;
    li.setAttribute('data-state', step.state);
    if (step.state === 'current') li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    li.querySelector('[data-step-note]').textContent = step.note;
  });

  if (stage === 'delivered') renderReadList();
  if (stage === 'during') renderThisWeek();
  if (stage === 'done') renderResults(scores);
  lastStage = stage;
}

function renderReadList() {
  const r = readSet();
  const order = readOrder();
  const next = order.find(k => !r[k]);
  setLive('read-done', order.filter(k => r[k]).length);
  document.querySelectorAll('[data-read]').forEach(row => {
    const key = row.getAttribute('data-read');
    row.classList.toggle('is-read', !!r[key]);
    row.classList.toggle('is-next', key === next);
    row.querySelector('[data-read-state]').textContent = r[key] ? 'Read' : (key === next ? 'Read next' : '');
  });
  const btn = document.querySelector('[data-continue-reading]');
  if (btn) {
    const label = next === 'strategy' ? 'Strategy' : (PAGE.tactics.find(t => t.id === next) || {}).name;
    btn.textContent = next ? (readCount() ? 'Continue reading: ' : 'Start reading: ') + label : 'Open the roadmap';
  }
}

function weekTitle(n) { return (PAGE.weeks[n] || {}).title || ''; }

function renderThisWeek() {
  const weeks = PAGE.weekList;
  if (shownWeek === null || !WEEK_TASKS[shownWeek]) shownWeek = MODEL.currentWeek(weeks, isTicked);
  if (shownWeek === null) return;
  document.querySelectorAll('[data-week-panel]').forEach(p => { p.hidden = Number(p.getAttribute('data-week-panel')) !== shownWeek; });
  const ids = WEEK_TASKS[shownWeek] || [];
  const done = countChecked(ids);
  setLive('week-title', weekTitle(shownWeek));
  setLive('week-number', shownWeek);
  setLive('week-done', done);
  setLive('week-total', ids.length);

  const complete = ids.length > 0 && done === ids.length;
  const next = MODEL.nextWeek(weeks, shownWeek);
  document.querySelector('[data-week-foot="open"]').hidden = complete;
  document.querySelector('[data-week-foot="done"]').hidden = !complete;
  const advance = document.querySelector('[data-week-advance]');
  if (next) {
    setLive('week-up-next', 'Up next is week ' + next + ': ' + weekTitle(next) + '.');
    advance.textContent = 'Start week ' + next;
  } else {
    setLive('week-up-next', countChecked(ALL_TASK_IDS) === ALL_TASK_IDS.length ? 'Every task in your plan is done.' : 'That is the last week of your plan.');
    advance.textContent = countChecked(ALL_TASK_IDS) === ALL_TASK_IDS.length ? 'See your results' : 'Open the roadmap';
  }

  const resume = document.querySelector('[data-resume]');
  const stepId = readStore(LAST_STEP_KEY, null);
  if (resume) {
    const t = stepId && PAGE.steps[stepId] ? PAGE.tactics[PAGE.steps[stepId] - 1] : null;
    resume.hidden = !t;
    if (t) resume.textContent = 'Pick up where you left off: ' + t.name + ', step ' + PAGE.stepNumbers[stepId];
  }

  const coming = document.querySelector('[data-coming-up]');
  const lookAhead = document.querySelector('[data-live-next]');
  if (coming && lookAhead) {
    setLive('next-title', next ? 'Week ' + next + ': ' + weekTitle(next) : 'This is the last week of your plan.');
    setLive('next-summary', next ? PAGE.weeks[next].summary : '');
    lookAhead.hidden = !next;
    lookAhead.dataset.week = next || '';
  }
}

function advanceWeek() {
  const next = MODEL.nextWeek(PAGE.weekList, shownWeek);
  if (next) shownWeek = next;
  else if (countChecked(ALL_TASK_IDS) === ALL_TASK_IDS.length) resultsRequested = true;
  else { openRoadmapWeek(shownWeek); return; }
  renderDashboard();
}

function openRoadmapWeek(n) {
  n = Number(n);
  navigate('roadmap');
  const card = document.getElementById('wc-' + n);
  if (!card) return;
  if (!card.classList.contains('open')) toggleWeek(n);
  setTimeout(function () { card.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
}

function scoreHtml(entry, size) {
  const level = MODEL.scoreLevel(entry.grade);
  const tone = level ? 'score-' + level.key : 'light';
  return '<div class="donut donut--' + size + ' donut--' + tone + '" style="--pct:' + Number(entry.score) + '" role="img" aria-label="Score ' + Number(entry.score) + ', grade ' + escapeText(entry.grade) + '"><div class="donut-hole"><span class="donut-num">' + Number(entry.score) + '</span><span class="donut-sub">Grade ' + escapeText(entry.grade) + '</span></div></div>';
}
function cellHtml(entry) {
  if (!entry) return '<span class="slot-empty">Not yet</span>';
  const level = MODEL.scoreLevel(entry.grade);
  return '<span class="score score--' + (level ? level.key : 'none') + '">' + Number(entry.score) + ' <span class="score-letter">' + escapeText(entry.grade) + '</span></span>';
}
function changeText(from, to) {
  const d = to - from;
  return d > 0 ? 'Up ' + d : (d < 0 ? 'Down ' + (-d) : 'No change');
}

function renderResults(scores) {
  const a = PAGE.assessment;
  const sampleBadge = document.querySelector('[data-sample-only]');
  if (sampleBadge) sampleBadge.hidden = !(scores && ((scores.review && scores.review.sample) || (scores.checkin && scores.checkin.sample)));
  if (a) {
    const review = scores && scores.review;
    const donutSlot = document.querySelector('[data-review-donut]');
    if (donutSlot && review) donutSlot.firstElementChild.outerHTML = scoreHtml(review.overall, 'lg');
    let line = 'Your ' + TOTAL_DAYS + '-day review scores your six areas again so you can see what changed.';
    if (review) {
      const d = review.overall.score - a.overall.score;
      line = d > 0 ? 'Your overall score went up ' + d + ' points.' : (d < 0 ? 'Your overall score went down ' + (-d) + ' points.' : 'Your overall score stayed the same.');
      let best = null;
      Object.keys(a.areas).forEach(k => {
        const r = review.areas[k];
        if (r && (!best || r.score - a.areas[k].score > best.d)) best = { k: k, d: r.score - a.areas[k].score };
      });
      if (best && best.d > 0) line += ' The biggest move was ' + a.areas[best.k].name + '.';
    }
    setLive('results-line', line);
    document.querySelectorAll('.results-table tr[data-area]').forEach(tr => {
      const k = tr.getAttribute('data-area');
      const c = scores && scores.checkin && scores.checkin.areas[k];
      const r = scores && scores.review && scores.review.areas[k];
      tr.querySelector('[data-slot="checkin"]').innerHTML = cellHtml(c);
      tr.querySelector('[data-slot="review"]').innerHTML = cellHtml(r);
      const latest = r || c;
      tr.querySelector('[data-slot="change"]').innerHTML = latest ? '<strong>' + changeText(a.areas[k].score, latest.score) + '</strong>' : '<span class="slot-empty">Not yet</span>';
    });
  }

  // "What to keep doing": the content does not exist yet (brief section 11).
  // The sandbox preview fills it with a sample built from the plan: the last
  // action of each tactic.
  const keep = document.querySelector('[data-keep-doing]');
  if (keep) {
    keep.hidden = PREVIEW !== 'done';
    const list = keep.querySelector('[data-keep-list]');
    if (!keep.hidden && list && !list.children.length) {
      PAGE.tactics.forEach(t => {
        const last = ALL_TASK_IDS.filter(id => PAGE.actions[id].tactic === t.num).pop();
        if (!last) return;
        const row = document.createElement('div');
        row.className = 'task-row';
        row.innerHTML = '<input type="checkbox" class="tick" id="keep-' + t.num + '"><label class="task-label" for="keep-' + t.num + '">' + escapeText(PAGE.actions[last].text) + '</label><button type="button" class="link-btn" onclick="navigate(\'tactic' + t.num + '\')">' + escapeText(t.name) + '</button>';
        list.appendChild(row);
      });
    }
  }
}

// ── Restore this browser's state ───────────────────────────
function restoreState() {
  Object.keys(state.checks).forEach(id => {
    const el = document.getElementById(id);
    if (el && state.checks[id]) el.checked = true;
  });
  Object.keys(state.notes).forEach(id => {
    const ta = document.getElementById('note-' + id);
    if (ta && state.notes[id]) {
      ta.value = state.notes[id];
      updateNoteBtn(id);
    }
  });
}

// ── Welcome and tour ───────────────────────────────────────
let tourStep = -1;
let tourActive = false;

function startWelcome() {
  const overlay = document.getElementById('wm-overlay');
  overlay.hidden = false;
  overlay.style.display = 'flex';
  overlay.classList.remove('wm-hiding');
  navigate('dashboard');
}
function handleOverlayClick(e) {
  if (e.target === document.getElementById('wm-overlay')) closeWelcome();
}
function closeWelcome() {
  const overlay = document.getElementById('wm-overlay');
  overlay.classList.add('wm-hiding');
  setTimeout(() => { overlay.style.display = 'none'; overlay.hidden = true; }, 300);
  try { localStorage.setItem(OB_KEY, '1'); } catch (e) {}
}
function closeWelcomeStartTour() {
  closeWelcome();
  setTimeout(() => startTour(), 350);
}

function startTour() {
  tourActive = true;
  tourStep = -1;
  const dotsEl = document.getElementById('tt-dots');
  dotsEl.innerHTML = '';
  TOUR_STEPS.forEach((_, i) => {
    const d = document.createElement('div');
    d.className = 'tour-dot';
    d.id = 'tt-dot-' + i;
    dotsEl.appendChild(d);
  });
  document.getElementById('tour-backdrop').classList.add('active');
  document.getElementById('tour-spotlight-box').classList.add('active');
  nextTourStep();
}
let tourDirection = 1;
function nextTourStep() { tourDirection = 1; goToTourStep(tourStep + 1); }
function prevTourStep() { tourDirection = -1; goToTourStep(Math.max(0, tourStep - 1)); }
function advanceTour() { if (tourActive) nextTourStep(); }

// The tour places a spotlight around each target and a tooltip beside it.
// Measurements are taken only after any scrolling has finished, so the
// spotlight and the tooltip match where the target really is.
const TOUR_MARGIN = 16; // space kept between the target and the viewport edge
const TOUR_GAP = 16;    // space between the target and the tooltip

function isFixedOnScreen(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const position = getComputedStyle(n).position;
    if (position === 'fixed' || position === 'sticky') return true;
  }
  return false;
}

function scrollParentOf(el) {
  for (let n = el.parentElement; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
    const overflow = getComputedStyle(n).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && n.scrollHeight > n.clientHeight) return n;
  }
  return document.scrollingElement || document.documentElement;
}

// Scroll (instantly) so the target is in view with room for the tooltip
// below it when that is where the tooltip goes. A target and tooltip that
// fit together are centred; a taller target is shown from its top.
function bringIntoView(el, roomBelow) {
  if (isFixedOnScreen(el)) return;
  const scroller = scrollParentOf(el);
  const isPage = scroller === document.scrollingElement || scroller === document.documentElement;
  const viewTop = isPage ? 0 : scroller.getBoundingClientRect().top;
  const viewHeight = isPage ? window.innerHeight : scroller.clientHeight;
  const rect = el.getBoundingClientRect();
  const top = rect.top - viewTop;
  const block = rect.height + roomBelow;
  if (top >= TOUR_MARGIN && top + block <= viewHeight - TOUR_MARGIN) return;
  const delta = block + TOUR_MARGIN * 2 <= viewHeight ? top - (viewHeight - block) / 2 : top - TOUR_MARGIN;
  if (isPage) window.scrollBy({ top: delta, behavior: 'auto' });
  else scroller.scrollBy({ top: delta, behavior: 'auto' });
}

// The tooltip is hidden (display: none) between stops, so it is measured
// while laid out but invisible.
function tooltipSize() {
  const tt = document.getElementById('tour-tooltip-box');
  const shown = tt.classList.contains('active');
  if (!shown) { tt.style.visibility = 'hidden'; tt.style.display = 'block'; }
  const size = { width: tt.offsetWidth, height: tt.offsetHeight };
  if (!shown) { tt.style.display = ''; tt.style.visibility = ''; }
  return size;
}

// On small screens the tooltip is a sheet fixed along the lower edge of the screen
// (see .tour-tooltip-box in accelerator.css), so the target must sit above it.
// The page gets extra room at its end while the tour runs, so targets at the
// very bottom of a page can still be scrolled clear of the sheet.
function tooltipIsSheet() {
  return getComputedStyle(document.getElementById('tour-tooltip-box')).bottom !== 'auto' && window.innerWidth <= 768;
}

function sheetSpace() {
  const tt = document.getElementById('tour-tooltip-box');
  return tooltipSize().height + parseFloat(getComputedStyle(tt).bottom || '0') + TOUR_GAP;
}

// Extra room at the end of whatever scrolls, so a target at the bottom of
// a page can still be scrolled up far enough for the tooltip to fit below it.
// Added on top of the element's own padding, and removed when the tour ends.
let tourRoomHost = null;
function reserveRoom(el, px) {
  const scroller = scrollParentOf(el);
  const host = (scroller === document.scrollingElement || scroller === document.documentElement) ? document.body : scroller;
  if (tourRoomHost && tourRoomHost !== host) releaseRoom();
  if (!tourRoomHost) {
    host.style.paddingBottom = '';
    host.dataset.tourPadding = getComputedStyle(host).paddingBottom;
    tourRoomHost = host;
  }
  host.style.paddingBottom = (parseFloat(host.dataset.tourPadding) + px) + 'px';
}
function releaseRoom() {
  if (!tourRoomHost) return;
  tourRoomHost.style.paddingBottom = '';
  delete tourRoomHost.dataset.tourPadding;
  tourRoomHost = null;
}

function tourRoomBelow(el, target) {
  const room = tooltipIsSheet() ? sheetSpace() : (target.pos === 'below' ? tooltipSize().height + TOUR_GAP : 0);
  if (room && !isFixedOnScreen(el)) reserveRoom(el, room + TOUR_MARGIN);
  return room;
}

const afterLayout = fn => requestAnimationFrame(() => requestAnimationFrame(fn));

function tourTarget(step) {
  const isMob = window.innerWidth <= 768;
  return {
    isMob,
    id: (isMob && step.mobileTargetId) ? step.mobileTargetId : step.targetId,
    page: (isMob && step.mobilePage) ? step.mobilePage : step.page,
    pos: (isMob && step.mobilePos) ? step.mobilePos : step.pos,
    desc: (isMob && step.mobileDesc) ? step.mobileDesc : step.desc
  };
}

function goToTourStep(n) {
  if (n >= TOUR_STEPS.length) { endTour(); return; }
  tourStep = n;
  const step = TOUR_STEPS[n];
  const target = tourTarget(step);
  if (target.page) navigate(target.page);
  if (step.weekToOpen !== undefined) {
    const wc = document.getElementById('wc-' + step.weekToOpen);
    if (wc && !wc.classList.contains('open')) toggleWeek(step.weekToOpen);
  }
  // Wait for the page switch and any opening week card, then scroll and place
  setTimeout(function () {
    if (tourStep !== n) return;
    const el = document.getElementById(target.id);
    if (!el) { endTour(); return; }
    // A target this stage of the dashboard does not show is skipped
    if (!el.getClientRects().length) {
      if (tourDirection < 0 && n > 0) goToTourStep(n - 1);
      else { tourDirection = 1; goToTourStep(n + 1); }
      return;
    }
    document.getElementById('tour-tooltip-box').classList.remove('active');
    fillTourTooltip(step, n, target.desc);
    bringIntoView(el, tourRoomBelow(el, target));
    afterLayout(function () { if (tourStep === n) positionTour(el, step, n, target.id, target.isMob); });
  }, target.page === 'roadmap' ? 200 : 80);
}

function fillTourTooltip(step, n, desc) {
  document.getElementById('tt-step-label').textContent = 'Step ' + (n + 1) + ' of ' + TOUR_STEPS.length;
  document.getElementById('tt-title').textContent = step.title;
  document.getElementById('tt-desc').textContent = desc;
  TOUR_STEPS.forEach((_, i) => {
    const d = document.getElementById('tt-dot-' + i);
    if (d) d.classList.toggle('active', i === n);
  });
  const prevBtn = document.getElementById('tt-prev');
  const nextBtn = document.getElementById('tt-next');
  prevBtn.hidden = n === 0;
  const isLast = n === TOUR_STEPS.length - 1;
  nextBtn.textContent = isLast ? '✓  All done' : 'Next →';
  nextBtn.className = 'tour-btn ' + (isLast ? 'finish' : 'next');
}

const overlapArea = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));

// The tooltip goes on the first side (preferred side first) where it fits
// on screen without covering the spotlight. If no side fits, the side that
// covers the least is used.
function placeTooltip(spot, pos, width, height, vw, vh) {
  const order = pos === 'right' ? ['right', 'below', 'above', 'left'] : ['below', 'above', 'right', 'left'];
  const clampX = x => Math.max(TOUR_MARGIN, Math.min(vw - width - TOUR_MARGIN, x));
  const clampY = y => Math.max(TOUR_MARGIN, Math.min(vh - height - TOUR_MARGIN, y));
  const centreX = spot.left + spot.width / 2 - width / 2;
  const centreY = spot.top + spot.height / 2 - height / 2;
  const raw = {
    below: { left: centreX, top: spot.bottom + TOUR_GAP },
    above: { left: centreX, top: spot.top - TOUR_GAP - height },
    right: { left: spot.right + TOUR_GAP, top: centreY },
    left: { left: spot.left - TOUR_GAP - width, top: centreY }
  };
  let best = null;
  for (const side of order) {
    const fits = raw[side].left >= TOUR_MARGIN && raw[side].top >= TOUR_MARGIN && raw[side].left + width <= vw - TOUR_MARGIN && raw[side].top + height <= vh - TOUR_MARGIN;
    const box = { left: clampX(raw[side].left), top: clampY(raw[side].top) };
    box.right = box.left + width;
    box.bottom = box.top + height;
    const covered = overlapArea(box, spot);
    if (fits && covered === 0) return box;
    if (!best || covered < best.covered) best = { ...box, covered };
  }
  return best;
}

function positionTour(el, step, n, usedId, isMob) {
  const rect = el.getBoundingClientRect();
  const pad = step.pad === undefined ? 8 : step.pad;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const target = tourTarget(step);

  // Spotlight: the target plus padding, kept on screen
  const spot = { left: Math.max(0, rect.left - pad), top: Math.max(0, rect.top - pad), right: Math.min(vw, rect.right + pad), bottom: Math.min(vh, rect.bottom + pad) };
  spot.width = spot.right - spot.left;
  spot.height = spot.bottom - spot.top;
  const sp = document.getElementById('tour-spotlight-box');
  sp.style.top = spot.top + 'px';
  sp.style.left = spot.left + 'px';
  sp.style.width = spot.width + 'px';
  sp.style.height = spot.height + 'px';
  sp.classList.toggle('tour-spotlight-box--edge', usedId === 'sidebar');

  const tt = document.getElementById('tour-tooltip-box');
  tt.classList.remove('active');
  fillTourTooltip(step, n, target.desc);
  if (!tooltipIsSheet()) {
    const size = tooltipSize();
    const box = placeTooltip(spot, target.pos, size.width, size.height, vw, vh);
    tt.style.left = box.left + 'px';
    tt.style.top = box.top + 'px';
  }
  requestAnimationFrame(() => tt.classList.add('active'));
}

// Keep the spotlight and tooltip on their target when the window changes size
window.addEventListener('resize', function () {
  if (!tourActive || tourStep < 0) return;
  const step = TOUR_STEPS[tourStep];
  const target = tourTarget(step);
  const el = document.getElementById(target.id);
  if (el) afterLayout(() => positionTour(el, step, tourStep, target.id, target.isMob));
});

function endTour() {
  releaseRoom();
  tourActive = false;
  tourStep = -1;
  document.getElementById('tour-backdrop').classList.remove('active');
  document.getElementById('tour-spotlight-box').classList.remove('active');
  document.getElementById('tour-tooltip-box').classList.remove('active');
  navigate('dashboard');
  try { localStorage.setItem(OB_KEY, '1'); } catch (e) {}
}

function checkOnboarding() {
  let seen = false;
  try { seen = !!localStorage.getItem(OB_KEY); } catch (e) {}
  if (!seen) setTimeout(startWelcome, 600);
}

// ── "How to" deep link (the step ID is the element id) ─────
function howToLink(page, stepId) {
  rememberStep(stepId);
  navigate(page);
  switchTacticTab(parseInt(page.replace('tactic', ''), 10), 'steps');
  const stepEl = document.getElementById(stepId);
  if (!stepEl) return;
  setStepOpen(stepEl, true);
  setTimeout(function () {
    stepEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    stepEl.classList.remove('step-highlight');
    void stepEl.offsetWidth;
    stepEl.classList.add('step-highlight');
  }, 80);
}

// ── Lightbox ───────────────────────────────────────────────
function openLightbox(src, alt) {
  const img = document.getElementById('lightbox-img');
  img.src = src;
  img.alt = alt || '';
  document.getElementById('lightbox').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

// ── Activity page (admin, PSM and coach) ───────────────────
async function loadActivityData() {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data: events, error } = await window.supabaseClient
      .from('analytics_events')
      .select('*')
      .eq('client_slug', PAGE.slug)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    renderActivityStats(events || []);
    renderActivityTimeline(events || []);
    renderSessionHistory(events || []);
  } catch (err) {
    console.error('Error loading activity data:', err);
    document.getElementById('activity-timeline').innerHTML = '<div class="activity__empty">Unable to load activity data</div>';
  }
}

function formatDuration(ms) {
  if (ms === 0) return '-';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return '<1m';
  if (minutes < 60) return minutes + 'm';
  return Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'm';
}

function formatRelativeTime(dateStr) {
  const diffMs = new Date() - new Date(dateStr);
  const mins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + ' min ago';
  if (hours < 24) return hours + ' hour' + (hours === 1 ? '' : 's') + ' ago';
  if (days < 7) return days + ' day' + (days === 1 ? '' : 's') + ' ago';
  return new Date(dateStr).toLocaleDateString();
}

const escapeText = text => String(text == null ? '' : text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

function sessionSpans(events) {
  const spans = {};
  events.forEach(e => {
    const s = spans[e.session_id] || (spans[e.session_id] = { first: e.created_at, last: e.created_at, user: e.user_email || 'Anonymous', count: 0 });
    if (e.created_at < s.first) s.first = e.created_at;
    if (e.created_at > s.last) s.last = e.created_at;
    s.count += 1;
  });
  return spans;
}

function renderActivityStats(events) {
  const spans = Object.values(sessionSpans(events)).map(s => new Date(s.last) - new Date(s.first)).filter(d => d > 0);
  document.getElementById('stat-sessions').textContent = new Set(events.map(e => e.session_id)).size;
  document.getElementById('stat-users').textContent = new Set(events.map(e => e.user_id).filter(Boolean)).size;
  document.getElementById('stat-tasks').textContent = events.filter(e => e.event_type === 'task_complete').length;
  document.getElementById('stat-duration').textContent = formatDuration(spans.length ? spans.reduce((a, b) => a + b, 0) / spans.length : 0);
}

const EVENT_TYPES = {
  page_view: ['page', 'M10 12a2 2 0 100-4 2 2 0 000 4z M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z', e => 'Viewed ' + (e.page_name || 'page')],
  task_complete: ['check', 'M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z', e => 'Completed task' + (e.task_name ? ': ' + e.task_name : '')],
  session_start: ['session', 'M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z', () => 'Started new session'],
  tour_complete: ['tour', 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z', () => 'Completed onboarding tour']
};

function renderActivityTimeline(events) {
  const container = document.getElementById('activity-timeline');
  if (!events.length) { container.innerHTML = '<div class="activity__empty">No recent activity</div>'; return; }
  container.innerHTML = events.slice(0, 20).map(event => {
    const [kind, path, title] = EVENT_TYPES[event.event_type] || ['page', 'M18 10a8 8 0 11-16 0 8 8 0 0116 0z', e => e.event_type];
    return `<div class="activity__event"><div class="activity__event-icon activity__event-icon--${kind}"><svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="${path}" clip-rule="evenodd"/></svg></div><div class="activity__event-content"><div class="activity__event-title">${escapeText(title(event))}</div><div class="activity__event-meta">${formatRelativeTime(event.created_at)}</div></div></div>`;
  }).join('');
}

function renderSessionHistory(events) {
  const container = document.getElementById('activity-sessions');
  const list = Object.values(sessionSpans(events)).sort((a, b) => new Date(b.last) - new Date(a.last)).slice(0, 10);
  if (!list.length) { container.innerHTML = '<div class="activity__empty">No sessions recorded</div>'; return; }
  container.innerHTML = list.map(s => `<div class="activity__session-card"><div class="activity__session-user">${escapeText(s.user)}</div><div class="activity__session-details">${s.count} events &middot; ${formatDuration(new Date(s.last) - new Date(s.first))} &middot; ${formatRelativeTime(s.last)}</div></div>`).join('');
}

// ── Start ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function () {
  loadState();
  restoreState();
  updateProgress();
  document.querySelectorAll('[data-preview-stage]').forEach(b => b.setAttribute('aria-pressed', b.getAttribute('data-preview-stage') === (PREVIEW || 'during') ? 'true' : 'false'));
  checkOnboarding();

  // The roadmap opens on the current week
  const current = MODEL.currentWeek(PAGE.weekList, isTicked);
  if (current) setWeekOpen(current, true);
  document.querySelectorAll('.rm-week-head').forEach(header => {
    header.addEventListener('keydown', e => {
      if (e.target !== header) return; // typing in Edit Mode
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); header.click(); }
    });
  });
});
