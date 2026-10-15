// Uploads assets/emojis/png/*.png as application emojis, skipping any name
// that already exists. The bot looks emojis up by name at runtime, so forks
// can upload their own set under the same names.
// Usage: bun scripts/upload-emojis.ts [--dry-run]
// Needs DISCORD_TOKEN and DISCORD_APPLICATION_ID in the environment.
import * as fs from 'fs';
import * as path from 'path';
import {REST, Routes, type APIEmoji} from 'discord.js';

const PNG_DIR = path.join(__dirname, '..', 'assets', 'emojis', 'png');
const NAME_RE = /^[A-Za-z0-9_]{2,32}$/;
const MAX_BYTES = 256 * 1024;
const dryRun = process.argv.includes('--dry-run');

async function main() {
  const token = process.env.DISCORD_TOKEN;
  const appId = process.env.DISCORD_APPLICATION_ID;
  if (!token || !appId) {
    throw new Error('Set DISCORD_TOKEN and DISCORD_APPLICATION_ID.');
  }

  const rest = new REST().setToken(token);
  const route = Routes.applicationEmojis(appId);
  const list = async () =>
    ((await rest.get(route)) as {items: APIEmoji[]}).items;

  const names = fs
    .readdirSync(PNG_DIR)
    .filter(f => f.endsWith('.png'))
    .map(f => f.slice(0, -4))
    .sort();
  const existing = new Set((await list()).map(e => e.name));

  for (const name of names) {
    if (!NAME_RE.test(name)) throw new Error(`Invalid emoji name: ${name}`);
    const data = fs.readFileSync(path.join(PNG_DIR, `${name}.png`));
    if (data.length > MAX_BYTES) throw new Error(`${name}.png is too large`);

    // Never replace: an existing emoji with this name is left untouched.
    if (existing.has(name)) {
      console.log(`skip    ${name} (already exists)`);
      continue;
    }
    if (dryRun) {
      console.log(`upload  ${name} (dry run, ${data.length} B)`);
      continue;
    }
    await rest.post(route, {
      body: {name, image: `data:image/png;base64,${data.toString('base64')}`},
    });
    console.log(`upload  ${name}`);
  }

  if (dryRun) return;

  const uploaded = new Set((await list()).map(e => e.name));
  const missing = names.filter(n => !uploaded.has(n));
  if (missing.length) throw new Error(`Missing after upload: ${missing}`);
  console.log(`All ${names.length} emojis are on the application.`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);

  process.exit(1);
});
