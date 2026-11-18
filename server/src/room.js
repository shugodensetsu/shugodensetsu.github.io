/* みんなのスマホで参加 — a room joins the phones at one table for a party mode (Durable Object "Room", one per room).
   The host's phone runs the game; the server only passes messages between it and the guests' phones and keeps nothing
   of what they say: no names, no replies, no drawings. A room is gone 6 hours after it was made, or when the host closes it.

   POST /v1/room/new  {code, dev}      -> {room, t}   only for a phone that holds premium (checked here with Stripe's
                                                      answer, not trusted from the app). t = the host's key
   GET  /v1/room/ws?r=ROOM[&t=KEY]     WebSocket. t = the host's key, or a guest's key from an earlier visit (reconnect).
                                       Without a key: a new guest, only while the host has the room open for joining.

   Messages are JSON text. Host -> server: {t:'to', g:[guest ids] (or none: all), m} {t:'open', v} {t:'kick', g} {t:'close'}
   Guest -> server: {t:'m', m}. Server -> host: {t:'hi', open, guests:[{g, on}]} {t:'join'|'on'|'off', g} {t:'m', g, m}
   Server -> guest: {t:'hi', g, k?, host} {t:'host', on} {t:'m', m} {t:'bye', why}
   What m holds is the app's business (src/part-room.js); the app checks every message it gets. */
import { premiumHere } from './plus.js';

const ORIGINS = ['https://shugodensetsu.github.io'];
const ROOM_ABC = '23456789ACDEFGHJKMNPQRTUVWXY';   // no 0/O, 1/I/L, B/8, S/5, Z/2 mix-ups
const ROOM = /^[2-9ACDEFGHJKMNPQRTUVWXY]{4}$/;
const KEY = /^[A-Za-z0-9_-]{43}$/;
const LIFE = 6 * 3600e3;
const GUESTS = 8;
const HOST_MAX = 64 * 1024, GUEST_MAX = 16 * 1024;
const BURST = 60, HOST_BURST = 600;  // messages per socket per 10 seconds (the host sends one to each phone on every change)
const NEW_PER_MIN = 6, JOIN_PER_MIN = 30;

const seen = new Map();   // sender -> {minute, new, join}, memory only
function flooded(ip, kind, max) {
  const m = Math.floor(Date.now() / 60000);
  let s = seen.get(ip);
  if (!s || s.m !== m) { s = { m }; seen.set(ip, s); if (seen.size > 5000) { seen.clear(); seen.set(ip, s); } }
  s[kind] = (s[kind] || 0) + 1;
  return s[kind] > max;
}
const b64url = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const newKey = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
const hash = async t => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('don-room:' + t)))].map(b => b.toString(16).padStart(2, '0')).join('');
function roomName() {
  const b = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(b, x => ROOM_ABC[x % ROOM_ABC.length]).join('');
}
const json = (status, body, origin) => new Response(body == null ? null : JSON.stringify(body), {
  status,
  headers: Object.assign({ 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' }, origin ? { 'access-control-allow-origin': origin, 'vary': 'Origin' } : {}),
});

/* ---------- the Worker side: checks, then hands over to the room ---------- */
export default {
  async fetch(request, env) {
    const url = new URL(request.url), origin = request.headers.get('origin') || '';
    const okOrigin = ORIGINS.includes(origin) || (env.EXTRA_ORIGIN && origin === env.EXTRA_ORIGIN);
    const ip = request.headers.get('cf-connecting-ip') || 'unknown';
    const what = url.pathname.slice('/v1/room/'.length);
    if (request.method === 'OPTIONS') {
      return okOrigin ? new Response(null, { status: 204, headers: { 'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', 'vary': 'Origin' } }) : json(403);
    }
    if (!okOrigin || !env.ROOMS) return json(403);

    if (what === 'new' && request.method === 'POST') {
      if (flooded(ip, 'new', NEW_PER_MIN)) return json(429, { error: 'busy' }, origin);
      const text = await request.text();
      if (!text || text.length > 512) return json(400, null, origin);
      let r;
      try { r = JSON.parse(text); } catch (_) { return json(400, null, origin); }
      if (!r || typeof r !== 'object') return json(400, null, origin);
      let ok = false;
      try { ok = await premiumHere(env, r.code, r.dev); } catch (_) { return json(502, { error: 'check' }, origin); }
      if (!ok) return json(403, { error: 'premium' }, origin);
      const t = newKey(), host = await hash(t);
      for (let i = 0; i < 8; i++) {
        const room = roomName();
        const res = await env.ROOMS.get(env.ROOMS.idFromName(room)).fetch('https://room/init', { method: 'POST', body: JSON.stringify({ room, host }) });
        if (res.status === 200) return json(200, { room, t, life: LIFE }, origin);
      }
      return json(503, { error: 'full' }, origin);
    }

    if (what === 'ws' && request.method === 'GET') {
      if ((request.headers.get('upgrade') || '').toLowerCase() !== 'websocket') return json(426, null, origin);
      if (flooded(ip, 'join', JOIN_PER_MIN)) return json(429, { error: 'busy' }, origin);
      const room = (url.searchParams.get('r') || '').toUpperCase(), t = url.searchParams.get('t') || '';
      if (!ROOM.test(room) || (t && !KEY.test(t))) return json(400, null, origin);
      return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(request);
    }
    return json(404, null, origin);
  },
};

/* ---------- the room ---------- */
export class Room {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.burst = new Map(); }

  async state() { return (await this.ctx.storage.get('s')) || null; }
  async save(s) { await this.ctx.storage.put('s', s); }
  alive(s) { return !!s && s.exp > Date.now(); }
  sockets(tag) { return this.ctx.getWebSockets(tag); }
  host() { return this.sockets('h')[0] || null; }
  guest(g) { return this.sockets('g' + g)[0] || null; }
  send(ws, o) { try { ws.send(JSON.stringify(o)); } catch (_) { /* closed */ } }
  guestsNow(s) { return Object.keys(s.guests).map(Number).sort((a, b) => a - b).map(g => ({ g, on: !!this.guest(g) })); }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/init') {
      const s = await this.state();
      if (this.alive(s)) return new Response(null, { status: 409 });
      if (s) await this.wipe();
      const { room, host } = await request.json();
      const fresh = { room, host, exp: Date.now() + LIFE, open: false, guests: {}, next: 1 };
      await this.save(fresh);
      await this.ctx.storage.setAlarm(fresh.exp);
      return new Response(null, { status: 200 });
    }
    const s = await this.state();
    if (!this.alive(s)) return json(404, { error: 'no_room' });
    const t = url.searchParams.get('t') || '', th = t ? await hash(t) : '';
    let role, g = 0, key = '';
    if (th && th === s.host) role = 'h';
    else if (th && Object.keys(s.guests).some(k => s.guests[k] === th)) { role = 'g'; g = Number(Object.keys(s.guests).find(k => s.guests[k] === th)); }
    else if (t) return json(403, { error: 'bad_key' });
    else {
      if (!s.open) return json(403, { error: 'closed' });
      if (Object.keys(s.guests).length >= GUESTS) return json(403, { error: 'full' });
      role = 'g'; g = s.next++; key = newKey();
      s.guests[g] = await hash(key);
      await this.save(s);
    }
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    const tag = role === 'h' ? 'h' : 'g' + g;
    for (const old of this.sockets(tag)) { try { old.close(4000, 'replaced'); } catch (_) { /* ignore */ } }
    this.ctx.acceptWebSocket(server, [tag]);
    server.serializeAttachment({ r: role, g });
    if (role === 'h') {
      this.send(server, { t: 'hi', room: s.room, open: s.open, exp: s.exp, guests: this.guestsNow(s) });
      for (const ws of this.sockets()) if (ws !== server && ws.deserializeAttachment().r === 'g') this.send(ws, { t: 'host', on: true });
    } else {
      this.send(server, Object.assign({ t: 'hi', g, host: !!this.host(), exp: s.exp }, key ? { k: key } : {}));
      const h = this.host();
      if (h) this.send(h, { t: key ? 'join' : 'on', g });
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  calm(ws, g) {   // a socket sending far too much is cut off
    const id = g, now = Math.floor(Date.now() / 10000), b = this.burst.get(id);
    if (!b || b[0] !== now) { this.burst.set(id, [now, 1]); return true; }
    return ++b[1] <= (id === 'h' ? HOST_BURST : BURST);
  }

  async webSocketMessage(ws, data) {
    const a = ws.deserializeAttachment() || {};
    if (typeof data !== 'string' || data.length > (a.r === 'h' ? HOST_MAX : GUEST_MAX)) { try { ws.close(1009, 'too big'); } catch (_) { /* ignore */ } return; }
    if (!this.calm(ws, a.r === 'h' ? 'h' : a.g)) { try { ws.close(1008, 'too many'); } catch (_) { /* ignore */ } return; }
    let o;
    try { o = JSON.parse(data); } catch (_) { return; }
    if (!o || typeof o !== 'object') return;
    const s = await this.state();
    if (!this.alive(s)) { this.send(ws, { t: 'bye', why: 'gone' }); try { ws.close(1000, 'gone'); } catch (_) { /* ignore */ } return; }
    if (a.r === 'g') {
      if (!s.guests[a.g]) { try { ws.close(4001, 'kicked'); } catch (_) { /* ignore */ } return; }
      if (o.t === 'm' && 'm' in o) { const h = this.host(); if (h) this.send(h, { t: 'm', g: a.g, m: o.m }); }
      return;
    }
    if (a.r !== 'h') return;
    if (o.t === 'to' && 'm' in o) {
      const list = Array.isArray(o.g) ? o.g.filter(g => Number.isInteger(g) && s.guests[g]) : Object.keys(s.guests).map(Number);
      for (const g of list) { const w = this.guest(g); if (w) this.send(w, { t: 'm', m: o.m }); }
      return;
    }
    if (o.t === 'open') { s.open = !!o.v; await this.save(s); return; }
    if (o.t === 'kick' && Number.isInteger(o.g) && s.guests[o.g]) {
      delete s.guests[o.g];
      await this.save(s);
      const w = this.guest(o.g);
      if (w) { this.send(w, { t: 'bye', why: 'kicked' }); try { w.close(4001, 'kicked'); } catch (_) { /* ignore */ } }
      this.send(ws, { t: 'off', g: o.g, gone: true });
      return;
    }
    if (o.t === 'close') await this.wipe('closed');
  }

  async webSocketClose(ws, code) {
    try { ws.close(code === 1005 || code === 1006 || !code ? 1000 : code); } catch (_) { /* already closed */ }
    const a = ws.deserializeAttachment() || {};
    const s = await this.state();
    if (!this.alive(s)) return;
    const other = tag => this.sockets(tag).filter(w => w !== ws);
    if (a.r === 'h') { if (!other('h').length) for (const w of other()) this.send(w, { t: 'host', on: false }); }
    else if (a.r === 'g') { const h = other('h')[0]; if (h && !other('g' + a.g).length) this.send(h, { t: 'off', g: a.g }); }
  }
  async webSocketError(ws) { await this.webSocketClose(ws); }

  async alarm() { await this.wipe('gone'); }

  async wipe(why) {
    for (const w of this.sockets()) { this.send(w, { t: 'bye', why: why || 'gone' }); try { w.close(1000, why || 'gone'); } catch (_) { /* ignore */ } }
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }
}
