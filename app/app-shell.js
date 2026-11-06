/* Match the system's page-color hint to the active header; never draw status UI. */
(() => {
 'use strict';
 const canvas = document.querySelector('.phone');
 const theme = document.querySelector('meta[name="theme-color"]');
 if (!canvas || !theme) return;
 function updateChrome() {
  const hasWhiteHeader = [...canvas.children].some(page =>
   page.classList.contains('visible') &&
   (page.classList.contains('income-page') || page.classList.contains('flow-page')));
  const color = hasWhiteHeader ? '#ffffff' :
   canvas.dataset.activeTab === 'profile' ? '#1685f7' : '#2788ef';
  if (theme.content !== color) theme.content = color;
  document.documentElement.style.setProperty('--app-chrome-color', color);
 }
 new MutationObserver(changes => {
  if (changes.some(change => change.target === canvas || change.target.parentElement === canvas)) updateChrome();
 }).observe(canvas, { attributes:true, attributeFilter:['class','data-active-tab'], subtree:true, childList:true });
 updateChrome();
})();
