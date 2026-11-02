/* 酒GO!!伝説 — the play-count Worker "sakego" (Cloudflare Workers + D1, binding "DB").
   POST /v1/p  the app's reports (src/collector.js): open to the app's own site only
   GET  /      the dashboard (src/stats.js): behind the STATS_PASSWORD secret or Cloudflare Access */
import collector from './collector.js';
import stats from './stats.js';

export default {
  fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);
    return (pathname === '/v1/p' ? collector : stats).fetch(request, env, ctx);
  },
};
