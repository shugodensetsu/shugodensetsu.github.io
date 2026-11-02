/* For the GitHub Actions deploy (.github/workflows/server.yml): makes sure the D1 database "sakego" exists on the
   Cloudflare account and writes its id into wrangler.json for this run only (the id is never committed). */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const NAME = 'sakego';
const wrangler = args => execFileSync('npx', ['wrangler', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
function list() {
  const out = wrangler(['d1', 'list', '--json']);
  const a = out.indexOf('['), b = out.lastIndexOf(']');
  return a < 0 || b < a ? [] : JSON.parse(out.slice(a, b + 1));
}
let db = list().find(d => d.name === NAME);
if (!db) {
  console.log('creating the D1 database "' + NAME + '"');
  wrangler(['d1', 'create', NAME]);
  db = list().find(d => d.name === NAME);
}
const id = db && (db.uuid || db.database_id || db.id);
if (!id) throw new Error('the D1 database "' + NAME + '" could not be found or created');
const cfg = JSON.parse(fs.readFileSync('wrangler.json', 'utf8'));
cfg.d1_databases = [{ binding: 'DB', database_name: NAME, database_id: id }];
fs.writeFileSync('wrangler.json', JSON.stringify(cfg, null, '\t') + '\n');
console.log('D1 database "' + NAME + '" is ready');
