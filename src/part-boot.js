/* =====================================================================
   BOOT
   ===================================================================== */
let booted = false;
function boot(data) {
  if (booted) return;
  booted = true;
  data = data || {};
  try {
    const u = data.ui;
    if (u) {
      if (typeof u.players === 'number') ui.players = Math.min(8, Math.max(2, u.players));
      if (u.mode === 'tag' || u.mode === 'name') ui.mode = u.mode;
      if (typeof u.filter === 'string') ui.filter = u.filter;
    }
    const s = data.setup;
    if (s && Array.isArray(s.names)) {
      setup.names = s.names.slice(0, 8).map(String); setup.loaded = true;
      if (s.count >= 2 && s.count <= 8) setup.count = s.count;
      if (ROUND_OPTS.includes(s.rounds)) setup.rounds = s.rounds;
    }
  } catch (_) { /* ignore */ }
  if (ui.filter !== ANY_CAT && !catOf(ui.filter)) ui.filter = ANY_CAT;
  /* iOS ignores user-scalable=no: stop its pinch zoom too (two people tapping at once must not zoom the table) */
  ['gesturestart', 'gesturechange'].forEach(ev => document.addEventListener(ev, e => e.preventDefault(), { passive: false }));
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  SE.init(); BGM.init(); renderSE();
  wireEditor(); wireGame();
  checkDraft();
  G = normalizeGame(validGame(data.G) ? data.G : loadGame());
  stCur = (G && G.st) || null;
  setTimeout(statFlush, 4000);
  if (statDev() && lsGet(STAT_CLAIM_KEY) !== '1') setTimeout(statClaim, 5000);   /* 「自分の端末」 from before the past games could be moved too */
  let ret = null;
  try { ret = sessionStorage.getItem(RETURN_KEY); sessionStorage.removeItem(RETURN_KEY); } catch (_) { /* ignore */ }
  const want = data.screen || ret || 'title';
  if (want === 'game' && G && !G.done) showScreen('game');
  else if (want === 'result' && G && G.done) showScreen('result');
  else if (want === 'editor' || want === 'setup') showScreen(want);
  else showScreen('title');
  installSync();
  if (!ageOk()) ageAsk(false);
  FXC.size();
}
const hot = window.claude && window.claude.hot;
try {
  if (hot && typeof hot.snapshot === 'function') {
    hot.snapshot(() => ({ ui: Object.assign({}, ui), setup: { count: setup.count, names: setup.names.slice(), rounds: setup.rounds }, screen, G }));
  }
} catch (_) { /* ignore */ }
if (hot && typeof hot.ready === 'function') {
  try { hot.ready(boot); } catch (_) { boot({}); }
  setTimeout(() => boot({}), 1500);
} else boot((hot && hot.data) || {});
})();
