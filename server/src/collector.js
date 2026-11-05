/* 酒GO!!伝説 — the play-count collector, served at POST /v1/p by the Worker (src/index.js). D1 binding "DB".
   The app sends two small reports per game: when it starts, and when it ends (or is put away mid-game).
   Only counts are accepted: no names, no card text, no device IDs. IP addresses are never stored — they are only
   held in memory for a minute to stop one sender flooding the counts.
   Anything that doesn't look exactly like a report from the app is dropped. */

const ORIGINS = ['https://shugodensetsu.github.io'];   // where the app lives
const MAX_BODY = 4096;                                    // bytes; a real report is well under 1 KB
const PER_MINUTE = 120;                                   // reports per sender per minute (phone carriers put many people behind one address)
const KEY = /^[a-z_]{1,16}$/, CARD = /^\d{1,4}$/, SID = /^[a-z0-9]{8,24}$/;

const seen = new Map();   // sender -> [minute, count], memory only (gone when this instance stops)
function flooded(ip) {
  const m = Math.floor(Date.now() / 60000), s = seen.get(ip);
  if (!s || s[0] !== m) { seen.set(ip, [m, 1]); if (seen.size > 5000) seen.clear(); return false; }
  return ++s[1] > PER_MINUTE;
}
const int = (v, lo, hi) => (Number.isInteger(v) && v >= lo && v <= hi ? v : null);
function counts(o, keyRe, maxKeys) {
  if (o == null) return {};
  if (typeof o !== 'object' || Array.isArray(o)) return null;
  const out = {}, ks = Object.keys(o);
  if (ks.length > maxKeys) return null;
  for (const k of ks) { const n = int(o[k], 1, 999); if (!keyRe.test(k) || n == null) return null; out[k] = n; }
  return out;
}
const jstDay = t => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
const reply = (status, origin) => new Response(null, {
  status,
  headers: Object.assign({ 'cache-control': 'no-store' }, origin ? { 'access-control-allow-origin': origin, 'vary': 'Origin' } : {}),
});

export default {
  async fetch(request, env) {
    const url = new URL(request.url), origin = request.headers.get('origin') || '';
    const okOrigin = ORIGINS.includes(origin) || (env.EXTRA_ORIGIN && origin === env.EXTRA_ORIGIN);
    if (request.method === 'OPTIONS') {
      return okOrigin ? new Response(null, { status: 204, headers: { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', 'vary': 'Origin' } }) : reply(403);
    }
    if (url.pathname !== '/v1/p') return reply(404);
    if (request.method !== 'POST' || !okOrigin) return reply(403);
    if (flooded(request.headers.get('cf-connecting-ip') || 'unknown')) return reply(429, origin);

    const text = await request.text();
    if (!text || text.length > MAX_BODY) return reply(400, origin);
    let r;
    try { r = JSON.parse(text); } catch (_) { return reply(400, origin); }
    if (!r || typeof r !== 'object') return reply(400, origin);
    /* when the report was made: reports kept on a phone without signal arrive later, but count on the day they were made.
       A time that is in the future or more than 8 days old (a wrong clock) is replaced by now */
    const recv = Date.now();
    const now = Number.isInteger(r.at) && r.at <= recv + 5 * 60e3 && r.at >= recv - 8 * 86400e3 ? r.at : recv, day = jstDay(now);
    const dev = r.dev === 1 ? 1 : null;   // 「自分の端末」（開発・テスト用）から: 集計ページでは別枠

    try {
      if (r.k === 'ev') {
        if (!['share', 'install', 'plus'].includes(r.kind)) return reply(400, origin);   // plus: プレミアム画面を開いた・プランを選んだ
        const detail = typeof r.detail === 'string' && KEY.test(r.detail) ? r.detail : null;
        await env.DB.prepare('INSERT INTO events (day, at, kind, detail, dev) VALUES (?, ?, ?, ?, ?)').bind(day, now, r.kind, detail, dev).run();
        return reply(204, origin);
      }
      if (r.k !== 'start' && r.k !== 'end') return reply(400, origin);
      const sid = typeof r.sid === 'string' && SID.test(r.sid) ? r.sid : null;
      const mode = ['card', 'mini', 'king', 'koi'].includes(r.mode) ? r.mode : null;   // カード・ミニゲーム・王様ゲーム・恋バナ/暴露
      const players = int(r.players, 2, 8), rounds = int(r.rounds ?? 0, 0, 99);
      const form = r.form === 'tablet' ? 'tablet' : 'phone', installed = r.inst ? 1 : 0, nth = int(r.nth ?? 1, 1, 99999);
      const MIXES = { card: ['even', 'lively'], king: ['mild', 'hot'], koi: ['mix', 'koi', 'bare'] };   // カードの出かた・命令のレベル・質問のジャンル
      const mix = MIXES[mode] && MIXES[mode].includes(r.mix) ? r.mix : null;
      const unit = ['one', 'half', 'cup', 'none'].includes(r.unit) ? r.unit : null;            // 1杯の量
      if (!sid || !mode || players == null || rounds == null || nth == null) return reply(400, origin);
      if (r.k === 'start') {
        await env.DB.prepare('INSERT INTO games (sid, day, started, mode, mix, unit, players, rounds, form, installed, nth, done, dev) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?) ON CONFLICT(sid) DO NOTHING')
          .bind(sid, day, now, mode, mix, unit, players, rounds, form, installed, nth, dev).run();
        return reply(204, origin);
      }
      const seq = int(r.seq ?? 1, 1, 99999), turns = int(r.turns ?? 0, 0, 9999), ms = int(r.ms ?? 0, 0, 24 * 3600e3), cups = int(r.cups ?? 0, 0, 99999), own = int(r.own ?? 0, 0, 9999), done = r.done ? 1 : 0;
      const data = { cards: counts(r.cards, CARD, 200), fx: counts(r.fx, KEY, 40), mini: counts(r.mini, KEY, 40), sp: counts(r.sp, KEY, 20), q: counts(r.q, CARD, 200) };   // q: 王様の命令・恋バナの質問の番号
      if (seq == null || turns == null || ms == null || cups == null || own == null || Object.values(data).some(v => v === null)) return reply(400, origin);
      data.own = own;   // cards the players added or rewrote: how many were drawn, nothing more
      await env.DB.prepare(
        'INSERT INTO games (sid, day, started, mode, mix, unit, players, rounds, form, installed, nth, seq, ended, turns, done, ms, cups, data, dev) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(sid) DO UPDATE SET mix = COALESCE(games.mix, excluded.mix), unit = COALESCE(games.unit, excluded.unit), dev = COALESCE(games.dev, excluded.dev), seq = excluded.seq, ended = excluded.ended, turns = excluded.turns, done = MAX(COALESCE(games.done, 0), excluded.done), ms = excluded.ms, cups = excluded.cups, data = excluded.data ' +
        'WHERE excluded.seq >= COALESCE(games.seq, 0)')   // a late-arriving older report never overwrites a newer one
        .bind(sid, day, now - ms, mode, mix, unit, players, rounds, form, installed, nth, seq, now, turns, done, ms, cups, JSON.stringify(data), dev).run();
      return reply(204, origin);
    } catch (_) {
      return reply(500, origin);   // e.g. the free plan's daily limit: the game itself is unaffected
    }
  },
};
