// Renders assets/emojis/svg/*.svg to 128x128 PNGs and builds preview.png.
// Usage: bun scripts/render-emojis.ts
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.join(__dirname, '..', 'assets', 'emojis');
const SVG_DIR = path.join(ROOT, 'svg');
const PNG_DIR = path.join(ROOT, 'png');
const SIZE = 128;
const MAX_BYTES = 256 * 1024;

const COLS = 6;
const CELL_W = 150;
const CELL_H = 120;
const PAD = 20;
const HEADER = 36;
const THEMES = [
  {label: 'Dark', bg: '#313338', fg: '#DBDEE1'},
  {label: 'Light', bg: '#FFFFFF', fg: '#313338'},
];

async function main() {
  fs.mkdirSync(PNG_DIR, {recursive: true});
  const names = fs
    .readdirSync(SVG_DIR)
    .filter(f => f.endsWith('.svg'))
    .map(f => f.slice(0, -4))
    .sort();

  for (const name of names) {
    const svg = fs.readFileSync(path.join(SVG_DIR, `${name}.svg`));
    const out = path.join(PNG_DIR, `${name}.png`);
    // viewBox is 64 units; 144 dpi renders it at 128px.
    await sharp(svg, {density: 144})
      .resize(SIZE, SIZE)
      .png({compressionLevel: 9})
      .toFile(out);
    const bytes = fs.statSync(out).size;
    if (bytes > MAX_BYTES) throw new Error(`${name}.png is ${bytes} bytes`);
    console.log(`${name}.png  ${bytes} B`);
  }

  // Pre-scale with sharp so 22px/64px look like a browser downscale.
  const scaled = async (name: string, px: number) =>
    (
      await sharp(path.join(PNG_DIR, `${name}.png`))
        .resize(px, px)
        .toBuffer()
    ).toString('base64');

  const rows = Math.ceil(names.length / COLS);
  const panelH = HEADER + rows * CELL_H;
  const width = PAD * 2 + COLS * CELL_W;
  const height = PAD + THEMES.length * (panelH + PAD);
  let body = '';

  for (const [t, theme] of THEMES.entries()) {
    const y0 = PAD + t * (panelH + PAD);
    body +=
      `<rect x="${PAD}" y="${y0}" width="${COLS * CELL_W}" height="${panelH}"` +
      ` rx="12" fill="${theme.bg}"/>` +
      `<text x="${PAD + 14}" y="${y0 + 24}" fill="${theme.fg}"` +
      ` font-size="16" font-weight="bold">${theme.label}</text>`;
    for (const [i, name] of names.entries()) {
      const x = PAD + (i % COLS) * CELL_W;
      const y = y0 + HEADER + Math.floor(i / COLS) * CELL_H;
      const cx = x + CELL_W / 2;
      body +=
        `<image x="${cx - 32}" y="${y}" width="64" height="64"` +
        ` href="data:image/png;base64,${await scaled(name, 64)}"/>` +
        `<text x="${cx - 8}" y="${y + 86}" fill="${theme.fg}"` +
        ' font-size="15" text-anchor="end">Aa</text>' +
        `<image x="${cx - 4}" y="${y + 70}" width="22" height="22"` +
        ` href="data:image/png;base64,${await scaled(name, 22)}"/>` +
        `<text x="${cx}" y="${y + 108}" fill="${theme.fg}" font-size="12"` +
        ` text-anchor="middle" opacity=".7">${name}</text>`;
    }
  }

  const sheet =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}"` +
    ` height="${height}" font-family="Segoe UI, Arial, sans-serif">` +
    `<rect width="100%" height="100%" fill="#8A8F98"/>${body}</svg>`;
  await sharp(Buffer.from(sheet)).png().toFile(path.join(ROOT, 'preview.png'));
  console.log(`preview.png  ${width}x${height}`);
}

main().catch(err => {
  console.error(err);
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
});
