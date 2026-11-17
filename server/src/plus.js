/* DON!!でんプレミアム — payments through Stripe, served by the Worker at /v1/plus/* (D1 binding "DB", secret STRIPE_SECRET_KEY).
   The app has no accounts. A purchase is reached with its restore code (復元コード, e.g. DON-7KQ4-M2XP-9HTA), made before
   checkout and kept on the phone that pays. Premium is on for ONE device at a time:
   - the device that paid, or the latest device that entered the code (引き継ぎ), holds a device key (a random number made
     here, kept only on that device; the database keeps its SHA-256 hash). Every other device that used the code is off
     the next time it asks.
   - there is no limit on 引き継ぎ: one purchase is one device at a time, so a code cannot give premium to several phones
     at once. Keeping the code private is the buyer's part (the terms say so).
   - cancelling or changing the card (Stripe's page) needs the device key too, so a leaked code cannot cancel anyone.
   - the owner can issue a new code from the dashboard after checking the buyer in Stripe (stats.js, /plus-reset).
   Codes are kept as SHA-256 hashes too ('h:' + hex; rows made before that keep the plain code until the owner reissues it).

   POST /v1/plus/checkout {plan}                          -> {url, code}
   POST /v1/plus/check    {code, dev?, claim?, restore?}  -> {paid, plan, until, cancel, test, dev?, took?} | 409 {error:'moved'}
   POST /v1/plus/portal   {code, dev}                     -> {url}

   Prices are made in Stripe by this Worker the first time they are needed (looked up by lookup_key). No card details ever
   pass through here: Stripe's pages take them. A restricted key with only the permissions used here is recommended. */

const ORIGINS = ['https://shugodensetsu.github.io'];
const APP = 'https://shugodensetsu.github.io/';
const PLANS = {
  year: { key: 'don_plus_year', amount: 2980, name: 'DON!!でんプレミアム 年額プラン', interval: 'year' },
  month: { key: 'don_plus_month', amount: 480, name: 'DON!!でんプレミアム 月額プラン', interval: 'month' },
  pass: { key: 'don_plus_pass', amount: 240, name: 'DON!!でんプレミアム 24時間パス' },
};
const isLive = env => /^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY || '');
const PASS_MS = 24 * 3600e3;
const GRACE_MS = 3 * 86400e3;          // a renewal that failed: Stripe tries the card again for a few days, premium stays meanwhile
const RECHECK_MS = 10 * 60e3;          // Stripe is asked about a subscription again at most every 10 minutes
const CODE_ABC = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';   // no 0/O, 1/I/L
const CODE = /^DON-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/;
const DEV = /^[A-Za-z0-9_-]{43}$/;     // 32 random bytes, base64url
const MAX_BODY = 512;
const PER_MINUTE = 20;                 // per sender: enough for a person, far too few to guess codes (31^12 of them)

const seen = new Map();
function flooded(ip) {
  const m = Math.floor(Date.now() / 60000), s = seen.get(ip);
  if (!s || s[0] !== m) { seen.set(ip, [m, 1]); if (seen.size > 5000) seen.clear(); return false; }
  return ++s[1] > PER_MINUTE;
}
export function newCode() {
  const b = crypto.getRandomValues(new Uint8Array(12));
  let s = '';
  for (let i = 0; i < 12; i++) { s += CODE_ABC[b[i] % CODE_ABC.length]; if (i === 3 || i === 7) s += '-'; }
  return 'DON-' + s;
}
const b64url = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const newDev = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
const hex = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))].map(b => b.toString(16).padStart(2, '0')).join('');
export const codeKey = async code => 'h:' + await hex('don-plus-code:' + code);
const devKey = dev => hex('don-plus-device:' + dev);
const json = (status, body, origin) => new Response(body == null ? null : JSON.stringify(body), {
  status,
  headers: Object.assign({ 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' }, origin ? { 'access-control-allow-origin': origin, 'vary': 'Origin' } : {}),
});

/* ---------- Stripe's REST API, form-encoded (no SDK needed) ---------- */
function form(o, pre, out) {
  out = out || [];
  for (const [k, v] of Object.entries(o)) {
    if (v == null) continue;
    const key = pre ? pre + '[' + k + ']' : k;
    if (typeof v === 'object') form(v, key, out);
    else out.push(encodeURIComponent(key) + '=' + encodeURIComponent(String(v)));
  }
  return out.join('&');
}
async function stripe(env, method, path, params) {
  const q = params ? form(params) : '';
  const r = await fetch('https://api.stripe.com/v1/' + path + (method === 'GET' && q ? '?' + q : ''), {
    method,
    headers: { authorization: 'Bearer ' + env.STRIPE_SECRET_KEY, 'content-type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : q,
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error('stripe ' + r.status + ' ' + ((body.error && body.error.message) || '')); e.status = r.status; throw e; }
  return body;
}
const prices = new Map();   // lookup_key -> price id, for as long as this instance lives
async function priceOf(env, plan) {
  const p = PLANS[plan], ck = (isLive(env) ? 'live' : 'test') + ':' + p.key;
  if (prices.has(ck)) return prices.get(ck);
  const found = await stripe(env, 'GET', 'prices', { 'lookup_keys[]': p.key, active: 'true', limit: 1 });
  let id = found.data && found.data[0] && found.data[0].id;
  if (!id) {
    const made = await stripe(env, 'POST', 'prices', {
      currency: 'jpy', unit_amount: p.amount, lookup_key: p.key, nickname: p.name,
      product_data: { name: p.name },
      recurring: p.interval ? { interval: p.interval } : undefined,
    });
    id = made.id;
  }
  prices.set(ck, id);
  return id;
}
/* the page where a subscriber cancels or changes the card: made once, with cancelling at the end of the paid period */
let portalConf = null;
async function portalConfig(env) {
  if (portalConf) return portalConf;
  const list = await stripe(env, 'GET', 'billing_portal/configurations', { is_default: 'true', limit: 1 });
  if (list.data && list.data[0]) return (portalConf = list.data[0].id);
  const made = await stripe(env, 'POST', 'billing_portal/configurations', {
    business_profile: { headline: 'DON!!でんプレミアム', privacy_policy_url: APP + 'privacy.html', terms_of_service_url: APP + 'terms.html' },
    default_return_url: APP,
    features: {
      subscription_cancel: { enabled: 'true', mode: 'at_period_end' },
      payment_method_update: { enabled: 'true' },
      invoice_history: { enabled: 'true' },
    },
  });
  return (portalConf = made.id);
}

/* ---------- what a purchase is worth now ---------- */
const sec = t => (Number.isFinite(t) ? t * 1000 : 0);
function subUntil(sub) {
  const item = sub.items && sub.items.data && sub.items.data[0];
  let end = sec((item && item.current_period_end) || sub.current_period_end);
  if (sub.cancel_at) end = Math.min(end || Infinity, sec(sub.cancel_at));   // a cancel already booked ends it then
  if (['active', 'trialing'].includes(sub.status)) return end;
  if (sub.status === 'past_due') return end + GRACE_MS;
  return Math.min(end || Infinity, sec(sub.ended_at) || Infinity) || 0;   // canceled, unpaid, incomplete…
}
async function refresh(env, row) {
  const now = Date.now();
  if (row.until && row.checked && now - row.checked < RECHECK_MS) return row;
  if (!row.sub && !row.until) {
    /* not confirmed yet: has the checkout been paid? */
    if (!row.session) return row;
    const s = await stripe(env, 'GET', 'checkout/sessions/' + row.session, { 'expand[]': 'payment_intent' });
    if (s.status !== 'complete' || !['paid', 'no_payment_required'].includes(s.payment_status)) return row;
    row.customer = s.customer || null;
    if (s.mode === 'subscription') row.sub = s.subscription;
    else row.until = sec((s.payment_intent && s.payment_intent.created) || s.created) + PASS_MS;
  }
  if (row.sub) {
    const sub = await stripe(env, 'GET', 'subscriptions/' + row.sub);
    row.until = subUntil(sub);
    /* newer Stripe API versions book a cancel as cancel_at (the end of the period) rather than cancel_at_period_end */
    row.cancel = sub.cancel_at_period_end || sub.cancel_at || sub.status === 'canceled' ? 1 : 0;
    row.customer = row.customer || sub.customer || null;
  }
  row.checked = now;
  await env.DB.prepare('UPDATE plus SET customer = ?, sub = ?, until = ?, cancel = ?, checked = ? WHERE code = ?')
    .bind(row.customer, row.sub, row.until, row.cancel || 0, row.checked, row.code).run();
  return row;
}
const answer = (row, env, code, extra) => Object.assign({ code, plan: row.plan, until: row.until || 0, cancel: !!row.cancel, paid: !!row.until, test: !isLive(env) }, extra || {});
async function findRow(env, code) {
  return env.DB.prepare('SELECT code, plan, session, customer, sub, until, cancel, checked, devh FROM plus WHERE code = ? OR code = ?')
    .bind(await codeKey(code), code).first();
}
/* this device holds the key? */
const holds = async (row, dev) => !!(row.devh && typeof dev === 'string' && DEV.test(dev) && await devKey(dev) === row.devh);

export default {
  async fetch(request, env) {
    const url = new URL(request.url), origin = request.headers.get('origin') || '';
    const okOrigin = ORIGINS.includes(origin) || (env.EXTRA_ORIGIN && origin === env.EXTRA_ORIGIN);
    if (request.method === 'OPTIONS') {
      return okOrigin ? new Response(null, { status: 204, headers: { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', 'vary': 'Origin' } }) : json(403);
    }
    if (request.method !== 'POST' || !okOrigin) return json(403);
    if (!env.STRIPE_SECRET_KEY) return json(503, { error: 'not_ready' }, origin);
    if (flooded(request.headers.get('cf-connecting-ip') || 'unknown')) return json(429, { error: 'busy' }, origin);
    const text = await request.text();
    if (!text || text.length > MAX_BODY) return json(400, null, origin);
    let r;
    try { r = JSON.parse(text); } catch (_) { return json(400, null, origin); }
    if (!r || typeof r !== 'object') return json(400, null, origin);
    const what = url.pathname.slice('/v1/plus/'.length);

    try {
      if (what === 'checkout') {
        const plan = Object.prototype.hasOwnProperty.call(PLANS, r.plan) ? r.plan : null;
        if (!plan) return json(400, null, origin);
        const price = await priceOf(env, plan), code = newCode(), sub = !!PLANS[plan].interval;
        /* the code itself goes nowhere but back to this phone: not to Stripe, not into the return address */
        const s = await stripe(env, 'POST', 'checkout/sessions', {
          mode: sub ? 'subscription' : 'payment',
          line_items: { 0: { price, quantity: 1 } },
          success_url: APP + '?plus=paid',
          cancel_url: APP + '?plus=cancel',
          locale: 'ja',
          metadata: { plan },
          subscription_data: sub ? { metadata: { plan } } : undefined,
          payment_intent_data: sub ? undefined : { metadata: { plan }, description: PLANS[plan].name },
          customer_creation: sub ? undefined : 'always',
          custom_text: { submit: { message: sub ? (plan === 'year' ? '1年' : '1か月') + 'ごとに自動で更新され、同じ金額をお支払いいただきます。解約はアプリのプレミアム画面からいつでもでき、次の更新日まで使えます。'
            : '購入から24時間使えます。自動で更新されません。' } },
        });
        await env.DB.prepare('INSERT INTO plus (code, plan, session, created) VALUES (?, ?, ?, ?)').bind(await codeKey(code), plan, s.id, Date.now()).run();
        return json(200, { url: s.url, code }, origin);
      }
      const code = typeof r.code === 'string' ? r.code.trim().toUpperCase() : '';
      if (!CODE.test(code)) return json(400, { error: 'bad_code' }, origin);
      let row = await findRow(env, code);
      if (!row) return json(404, { error: 'no_code' }, origin);
      const mine = await holds(row, r.dev);

      if (what === 'check') {
        /* a device without the key may only take premium on purpose: paying (claim, when no device has it yet) or 引き継ぎ (restore) */
        if (!mine && !r.restore && (row.devh || !r.claim)) return json(409, { error: 'moved' }, origin);
        row = await refresh(env, row);
        if (!row.until) return json(200, answer(row, env, code), origin);   // not paid (yet)
        if (mine) return json(200, answer(row, env, code), origin);
        /* this device takes premium over: a new device key; whichever device had it is off from now on */
        const dev = newDev(), took = !!row.devh;
        await env.DB.prepare('UPDATE plus SET devh = ?, dev_at = ? WHERE code = ?').bind(await devKey(dev), Date.now(), row.code).run();
        return json(200, answer(row, env, code, { dev, took }), origin);
      }
      if (!mine) return json(409, { error: 'moved' }, origin);   // what follows needs the device that holds premium
      if (what === 'portal') {
        row = await refresh(env, row);
        if (!row.customer || !row.sub) return json(400, { error: 'no_sub' }, origin);
        const p = await stripe(env, 'POST', 'billing_portal/sessions', { customer: row.customer, return_url: APP + '?plus=back', locale: 'ja', configuration: await portalConfig(env) });
        /* the subscription may change on that page (cancel, card): the next check asks Stripe instead of using the saved answer */
        await env.DB.prepare('UPDATE plus SET checked = 0 WHERE code = ?').bind(row.code).run();
        return json(200, { url: p.url }, origin);
      }
      return json(404, null, origin);
    } catch (e) {
      return json(502, { error: 'stripe' }, origin);   // Stripe did not answer as expected: the app keeps what it had
    }
  },
};
