/*
 * Accelerator v2 PDF templates: opened from "Download as PDF" with ?print=1,
 * the page waits for login, fonts and images, then opens the browser's print
 * dialog. A PDF service can render the same page without this script.
 */
(function () {
  if (new URLSearchParams(window.location.search).get('print') !== '1') return;
  const images = () => Promise.race([
    Promise.all([...document.images].map(img => (img.complete ? null : new Promise(done => { img.onload = img.onerror = done; })))),
    new Promise(done => setTimeout(done, 5000)) // never wait for ever
  ]);
  const ready = (window.__authReady || Promise.resolve()).catch(function () {});
  window.addEventListener('load', function () {
    ready.then(() => (document.fonts ? document.fonts.ready : null)).then(images).then(function () {
      setTimeout(function () { window.print(); }, 200);
    });
  });
})();
