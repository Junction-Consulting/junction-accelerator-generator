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
const ALL_CHECK_IDS = PAGE.checks.all;
const WEEK_CHECKS = PAGE.checks.byWeek;
const MONTH_CHECKS = PAGE.checks.byPhase;
const TACTIC_CHECKS = PAGE.checks.byTactic;
const TACTIC_COUNT = PAGE.tactics.length;
const TOTAL_WEEKS = PAGE.totalWeeks;
const TOTAL_DAYS = PAGE.totalDays;
const PHASES = PAGE.phases;
const PROGRESS_HEADLINES = PAGE.headlines;
const TOUR_STEPS = PAGE.tour;

// ── State (this browser only: notes and Quick Wins ticks) ──
const STATE_KEY = PAGE.slug + '_accelerator_v2';
const OB_KEY = PAGE.slug + '_onboarded_v1';
let state = { checks: {}, notes: {} };

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
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + pageId);
  if (page) page.classList.add('active');
  document.querySelectorAll(`[data-page="${pageId}"]`).forEach(n => n.classList.add('active'));
  document.getElementById('main').scrollTop = 0;
  if (window.innerWidth <= 768) closeMobileDrawer();
}

// ── PDF ────────────────────────────────────────────────────
function printRoadmap() {
  navigate('roadmap');
  setTimeout(function () { window.print(); }, 100);
}

// ── Mobile navigation ──────────────────────────────────────
function openMobileDrawer() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
  document.body.classList.add('drawer-open');
}
function closeMobileDrawer() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
  document.body.classList.remove('drawer-open');
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

// ── Accordions and tabs ────────────────────────────────────
function toggleTacticPart(btn) {
  const part = btn.closest('.tactic-part');
  part.classList.toggle('open');
  btn.setAttribute('aria-expanded', part.classList.contains('open') ? 'true' : 'false');
}
function switchTacticTab(tacticNum, tabName) {
  document.querySelectorAll(`[data-tactic-tab="${tacticNum}"]`).forEach(t => {
    const isActive = t.dataset.tab === tabName;
    t.classList.toggle('active', isActive);
    t.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
  document.querySelectorAll(`[data-tactic-content="${tacticNum}"]`).forEach(content => {
    content.classList.toggle('active', content.dataset.content === tabName);
  });
}
function toggleWeek(n) {
  const weekCard = document.getElementById('wc-' + n);
  weekCard.classList.toggle('open');
  const header = weekCard.querySelector('.week-card-header');
  if (header) header.setAttribute('aria-expanded', weekCard.classList.contains('open') ? 'true' : 'false');
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

// ── Progress ───────────────────────────────────────────────
// Read from the DOM so ticks loaded by progress.js are counted
function countChecked(ids) {
  return (ids || []).filter(id => {
    const el = document.querySelector(`input[data-key="${id}"]`);
    return el && el.checked;
  }).length;
}

function setRing(el, radius, pct) {
  if (!el) return;
  const circ = 2 * Math.PI * radius;
  el.style.strokeDasharray = circ;
  el.style.strokeDashoffset = circ - (circ * pct / 100);
}

function updateProgress() {
  const done = countChecked(ALL_CHECK_IDS);
  const total = ALL_CHECK_IDS.length;
  const pct = total > 0 ? Math.round(done / total * 100) : 0;

  setRing(document.getElementById('sidebar-ring'), 23, pct);
  document.getElementById('sidebar-done').textContent = done;
  document.getElementById('sidebar-total').textContent = total;
  document.getElementById('roadmap-badge').textContent = pct + '%';

  setRing(document.getElementById('dash-ring'), 85, pct);
  const dashPct = document.getElementById('dash-pct');
  if (dashPct) dashPct.textContent = pct + '%';
  const dashDone = document.getElementById('dash-done-count');
  if (dashDone) dashDone.textContent = done;
  const dashTotal = document.getElementById('dash-total-count');
  if (dashTotal) dashTotal.textContent = total;

  for (let t = 1; t <= TACTIC_COUNT; t++) {
    const ids = TACTIC_CHECKS[t] || [];
    const d = countChecked(ids);
    const tot = ids.length;
    const p = tot > 0 ? Math.round(d / tot * 100) : 0;
    setRing(document.getElementById('tactic' + t + '-ring'), 18, p);
    const stat = document.getElementById('tc' + t + '-stat');
    if (stat) stat.textContent = d + ' of ' + tot + ' done';
    setRing(document.getElementById('t' + t + '-ring'), 31, p);
    const heroPct = document.getElementById('t' + t + '-pct');
    if (heroPct) heroPct.textContent = p + '%';
    const heroStatus = document.getElementById('t' + t + '-status');
    if (heroStatus) {
      if (p === 0) { heroStatus.textContent = 'Not Started'; heroStatus.className = 'tactic-hero-status'; }
      else if (p === 100) { heroStatus.textContent = 'Complete'; heroStatus.className = 'tactic-hero-status complete'; }
      else { heroStatus.textContent = 'In Progress'; heroStatus.className = 'tactic-hero-status in-progress'; }
    }
  }

  updateNextStepWeekProgress();
  updateNextStepTasks();

  Object.keys(WEEK_CHECKS).forEach(w => {
    const ids = WEEK_CHECKS[w];
    const d = countChecked(ids);
    const pill = document.getElementById('wp-' + w);
    if (pill) {
      pill.textContent = d + ' / ' + ids.length;
      pill.classList.toggle('done', d === ids.length);
    }
  });

  Object.keys(MONTH_CHECKS).forEach(m => {
    const ids = MONTH_CHECKS[m];
    const el = document.getElementById('m' + m + '-prog');
    if (el) el.innerHTML = '<span>' + countChecked(ids) + '</span> of ' + ids.length + ' done';
  });
}

// ── Dashboard ──────────────────────────────────────────────
function cohortStart() { return document.body.getAttribute('data-cohort-start'); }

function getDayInfo() {
  const start = cohortStart();
  if (!start) return { currentDay: 1, currentWeek: 1, daysRemaining: TOTAL_DAYS };
  const diffDays = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(start + 'T00:00:00')) / 86400000);
  if (diffDays < 0) return { currentDay: 0, currentWeek: 0, daysRemaining: TOTAL_DAYS, beforeStart: true, daysUntilStart: -diffDays };
  if (diffDays >= TOTAL_DAYS) return { currentDay: TOTAL_DAYS, currentWeek: TOTAL_WEEKS, daysRemaining: 0, completed: true };
  const currentDay = diffDays + 1;
  return { currentDay, currentWeek: Math.min(Math.ceil(currentDay / 7), TOTAL_WEEKS), daysRemaining: TOTAL_DAYS - diffDays };
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getCurrentPhase(week) {
  for (const phase of PHASES) if (phase.weeks.includes(week)) return phase.num;
  return 1;
}

function weekNumbers() { return Object.keys(WEEK_CHECKS).map(Number).sort((a, b) => a - b); }

function getFirstIncompleteWeek() {
  const weeks = weekNumbers();
  for (const w of weeks) {
    const ids = WEEK_CHECKS[w];
    if (countChecked(ids) < ids.length) return w;
  }
  return weeks[weeks.length - 1];
}

function getProgressHeadline(pct) {
  for (const h of PROGRESS_HEADLINES) if (pct <= h.max) return h;
  return PROGRESS_HEADLINES[PROGRESS_HEADLINES.length - 1];
}

function updateNextStepWeekProgress() {
  const focusWeek = getFirstIncompleteWeek();
  const ids = WEEK_CHECKS[focusWeek] || [];
  const done = countChecked(ids);
  const pct = ids.length > 0 ? Math.round(done / ids.length * 100) : 0;
  const title = document.getElementById('dash-week-progress-title');
  if (title) title.textContent = 'Week ' + focusWeek + ' tasks';
  const label = document.getElementById('dash-week-progress-label');
  if (label) label.textContent = done + '/' + ids.length;
  const bar = document.getElementById('dash-week-bar');
  if (bar) bar.style.width = pct + '%';
}

function updateNextStepTasks() {
  const container = document.getElementById('dash-next-tasks');
  if (!container) return;
  container.querySelectorAll('.dash-next-task').forEach(taskEl => {
    const checkbox = document.querySelector(`input[data-key="${taskEl.getAttribute('data-key')}"]`);
    if (!checkbox) return;
    const box = taskEl.querySelector('.dash-next-task-box');
    const text = taskEl.querySelector('.dash-next-task-text');
    if (box) box.classList.toggle('done', checkbox.checked);
    if (text) text.classList.toggle('done', checkbox.checked);
  });
}

function labelFor(id) {
  const checkbox = document.querySelector(`input[data-key="${id}"]`);
  const label = checkbox && checkbox.closest('.check-row') && checkbox.closest('.check-row').querySelector('.check-label');
  return label ? label.textContent : null;
}

function getFirstIncompleteTaskLabel(week) {
  for (const id of WEEK_CHECKS[week] || []) {
    const checkbox = document.querySelector(`input[data-key="${id}"]`);
    if (checkbox && !checkbox.checked) return labelFor(id);
  }
  return null;
}

function populateNextStepTasks(week) {
  const container = document.getElementById('dash-next-tasks');
  if (!container) return;
  container.innerHTML = '';
  const ids = (WEEK_CHECKS[week] || []).slice(0, 4);
  ids.forEach(id => {
    const checkbox = document.querySelector(`input[data-key="${id}"]`);
    if (!checkbox) return;
    const taskEl = document.createElement('div');
    taskEl.className = 'dash-next-task';
    taskEl.setAttribute('data-key', id);
    taskEl.onclick = function () {
      navigate('roadmap');
      setTimeout(function () {
        const weekCard = document.getElementById('wc-' + week);
        if (weekCard && !weekCard.classList.contains('open')) weekCard.classList.add('open');
        checkbox.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    };
    const box = document.createElement('div');
    box.className = 'dash-next-task-box' + (checkbox.checked ? ' done' : '');
    box.innerHTML = '<svg width="14" height="14" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>';
    const text = document.createElement('span');
    text.className = 'dash-next-task-text' + (checkbox.checked ? ' done' : '');
    text.textContent = labelFor(id) || '';
    taskEl.appendChild(box);
    taskEl.appendChild(text);
    container.appendChild(taskEl);
  });
}

function setMeta(wrapId, valueId, value) {
  const wrap = document.getElementById(wrapId);
  const el = document.getElementById(valueId);
  if (!wrap || !el) return;
  wrap.hidden = !value;
  el.textContent = value || '';
}

function initDashboard() {
  const dayInfo = getDayInfo();
  const greeting = document.getElementById('dash-greeting');
  if (greeting) greeting.textContent = getTimeGreeting() + ', ' + (document.body.getAttribute('data-client-name') || 'there');

  const currentPhase = getCurrentPhase(dayInfo.currentWeek || 1);
  document.querySelectorAll('.dash-phase').forEach(el => {
    el.setAttribute('data-active', parseInt(el.getAttribute('data-phase'), 10) === currentPhase ? 'true' : 'false');
  });

  const done = countChecked(ALL_CHECK_IDS);
  const pct = ALL_CHECK_IDS.length > 0 ? Math.round(done / ALL_CHECK_IDS.length * 100) : 0;
  const headline = getProgressHeadline(pct);
  document.getElementById('dash-headline').textContent = headline.headline;
  document.getElementById('dash-subcopy').textContent = headline.subcopy;

  const focusWeek = getFirstIncompleteWeek();
  const week = PAGE.weeks[focusWeek] || {};
  const tactic = PAGE.tactics[(week.tactic || 1) - 1] || PAGE.tactics[0];
  document.getElementById('dash-next-eyebrow').textContent = 'YOUR NEXT STEP · WEEK ' + focusWeek + ' OF ' + TOTAL_WEEKS + ' · ' + (week.title || '');
  document.getElementById('dash-next-title').textContent = getFirstIncompleteTaskLabel(focusWeek) || 'Complete your tasks for this week';
  document.getElementById('dash-next-tactic').textContent = tactic ? tactic.name : '';
  const link = document.getElementById('dash-next-link');
  if (link && tactic) link.setAttribute('onclick', "navigate('tactic" + tactic.num + "')");
  setMeta('dash-next-time-wrap', 'dash-next-time', week.timeNeeded);
  setMeta('dash-next-who-wrap', 'dash-next-who', week.who);

  populateNextStepTasks(focusWeek);
  updateNextStepWeekProgress();
}
window.addEventListener('cohortDateUpdated', initDashboard);

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
function nextTourStep() { goToTourStep(tourStep + 1); }
function prevTourStep() { goToTourStep(Math.max(0, tourStep - 1)); }
function advanceTour() { if (tourActive) nextTourStep(); }

function goToTourStep(n) {
  if (n >= TOUR_STEPS.length) { endTour(); return; }
  tourStep = n;
  const step = TOUR_STEPS[n];
  const isMob = window.innerWidth <= 768;
  const targetId = (isMob && step.mobileTargetId) ? step.mobileTargetId : step.targetId;
  const page = (isMob && step.mobilePage) ? step.mobilePage : step.page;
  if (page) navigate(page);
  if (step.weekToOpen !== undefined) {
    const wc = document.getElementById('wc-' + step.weekToOpen);
    if (wc && !wc.classList.contains('open')) wc.classList.add('open');
  }
  setTimeout(function () {
    const el = document.getElementById(targetId);
    if (!el) { endTour(); return; }
    if (isMob) {
      if (targetId !== 'nav-hamburger') {
        const elTop = el.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: Math.max(0, elTop - 80), behavior: 'auto' });
      }
      setTimeout(function () { positionTour(el, step, n, targetId, isMob); }, 260);
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      setTimeout(function () { positionTour(el, step, n, targetId, isMob); }, 80);
    }
  }, page === 'roadmap' ? 200 : 80);
}

function positionTour(el, step, n, usedId, isMob) {
  const rect = el.getBoundingClientRect();
  const pad = step.pad || 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pos = (isMob && step.mobilePos) ? step.mobilePos : step.pos;
  const desc = (isMob && step.mobileDesc) ? step.mobileDesc : step.desc;

  const spTop = Math.max(0, rect.top - pad);
  const spLeft = Math.max(0, rect.left - pad);
  const sp = document.getElementById('tour-spotlight-box');
  sp.style.top = spTop + 'px';
  sp.style.left = spLeft + 'px';
  sp.style.width = Math.min(rect.width + pad * 2, vw - spLeft) + 'px';
  sp.style.height = Math.min(rect.height + pad * 2, vh - spTop) + 'px';
  sp.classList.toggle('tour-spotlight-box--edge', usedId === 'sidebar');

  const tt = document.getElementById('tour-tooltip-box');
  tt.classList.remove('active');
  const ttW = 290;
  const ttH = 190;
  const gap = 16;
  let left;
  let top;
  if (pos === 'right') {
    left = rect.right + gap;
    top = rect.top + rect.height / 2 - ttH / 2;
    if (left + ttW > vw - 12) left = rect.left - ttW - gap;
  } else {
    left = rect.left + rect.width / 2 - ttW / 2;
    top = rect.bottom + gap;
    if (top + ttH > vh - 12) top = rect.top - ttH - gap;
  }
  tt.style.left = Math.max(12, Math.min(vw - ttW - 12, left)) + 'px';
  tt.style.top = Math.max(12, Math.min(vh - ttH - 12, top)) + 'px';

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
  requestAnimationFrame(() => tt.classList.add('active'));
}

function endTour() {
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
  navigate(page);
  setTimeout(function () {
    switchTacticTab(parseInt(page.replace('tactic', ''), 10), 'steps');
    setTimeout(function () {
      const stepEl = document.getElementById(stepId);
      if (!stepEl) return;
      const part = stepEl.closest('.tactic-part');
      if (part && !part.classList.contains('open')) {
        const hdr = part.querySelector('.tactic-part-header');
        if (hdr) hdr.click();
      }
      setTimeout(function () {
        stepEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        stepEl.classList.remove('step-highlight');
        void stepEl.offsetWidth;
        stepEl.classList.add('step-highlight');
      }, 150);
    }, 100);
  }, 300);
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
  initDashboard();
  checkOnboarding();

  const firstWeek = document.querySelector('.week-card');
  if (firstWeek) firstWeek.classList.add('open');

  document.querySelectorAll('.tactic-part').forEach(part => {
    const header = part.querySelector('.tactic-part-header');
    if (header) header.setAttribute('aria-expanded', part.classList.contains('open') ? 'true' : 'false');
  });
  document.querySelectorAll('.week-card').forEach(card => {
    const header = card.querySelector('.week-card-header');
    if (header) {
      header.setAttribute('aria-expanded', card.classList.contains('open') ? 'true' : 'false');
      header.setAttribute('role', 'button');
      header.setAttribute('tabindex', '0');
      header.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); header.click(); }
      });
    }
  });
});
