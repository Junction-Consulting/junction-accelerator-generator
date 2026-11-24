/*
 * Accelerator v2: runs after the shared scripts in /shared/, as the v1
 * template's closing inline scripts did.
 */

// Editor mode: loaded in the WYSIWYG editor's iframe
(function () {
  if (new URLSearchParams(window.location.search).get('editor') === 'true') {
    const script = document.createElement('script');
    script.src = '/shared/editor-bridge.js';
    script.async = true;
    document.body.appendChild(script);
    window.__editorMode = true;
  }
})();

// User menu, once login is confirmed
if (window.__authReady) {
  window.__authReady.then(function (user) {
    window.initUserMenu('#sidebarUserMenu', user.email, user.role || 'client');
    window.initUserMenu('#mobileUserMenu', user.email, user.role || 'client');
  }).catch(function (err) {
    console.error('Auth not ready for user menu:', err);
  });

  // Activity page data loads when it is opened
  window.__authReady.then(function () {
    const activityNav = document.getElementById('nav-activity');
    if (activityNav) activityNav.addEventListener('click', function () { setTimeout(loadActivityData, 100); });
  });
}
