/** Injected before first paint so the page never flashes the wrong theme.
 *  Reads localStorage and falls back to prefers-color-scheme. Runs
 *  synchronously, so the <html> class is set before the browser paints. */
export const noFlashScript = `
(function(){
  try {
    var stored = localStorage.getItem('kalend-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || (stored !== 'light' && prefersDark);
    if (dark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch(e) {}
})();
`;
