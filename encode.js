#!/usr/bin/env node
// Sizes the photographs down for the page.
//
// `images/` is the source folder and it is not touched: the files there are
// straight off Unsplash, 2MB to 18MB each and several thousand pixels wide,
// where a picture on the page is never wider than 620 CSS pixels. This writes
// the set the page actually serves into `sized/` - a ladder of widths in AVIF,
// WebP and the original's own format - and `sized.json`, which build.js reads
// to write the `srcset` attributes.
//
// It runs from build.js, so `node build.js` is still the one command. On its
// own:
//
//   node encode.js           what has changed since last time
//   node encode.js --all     the lot, again
//
// It needs sharp (`npm install`). Without it build.js still writes the page and
// points every picture at its original file, exactly as it did before.
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

let sharp;
try {
  sharp = require('sharp');
} catch (err) {
  console.error('  ! sharp is not installed, so no pictures were sized.');
  console.error('    npm install');
  process.exit(2);
}

const ROOT = __dirname;
const SRC_DIR = path.join(ROOT, 'images');
const OUT_DIR = path.join(ROOT, 'sized');
const SIDECAR = path.join(ROOT, 'sized.json');

// The ladder. Every rung is a width the stylesheet can actually ask for, so
// nothing here is guesswork:
//
//   a picture is at most 620px, and 455px once the lanes stack; the narrowest
//   phone the guide is read on leaves it about 300px. Doubled and tripled for
//   the screens that want it, that is 480, 768, 960, 1280 and 1920.
//
// The hero is the page's own width rather than a lane's - 1270px at the widest,
// so it needs a rung above the rest and can skip the one in the middle.
const LADDER = [480, 768, 960, 1280, 1920];
const HERO_LADDER = [480, 768, 1280, 1920, 2560];

// AVIF first because it is half the size of anything else and every browser
// less than four years old takes it; WebP catches most of what is left; the
// original's own format catches the rest. The <picture> element picks, so a
// browser only ever downloads one of the three.
const FORMATS = [
  { ext: 'avif', type: 'image/avif', opts: { quality: 50, effort: 4, chromaSubsampling: '4:2:0' } },
  { ext: 'webp', type: 'image/webp', opts: { quality: 74, effort: 4 } },
];
const FALLBACK = {
  jpg: { ext: 'jpg', type: 'image/jpeg', opts: { quality: 76, mozjpeg: true, chromaSubsampling: '4:2:0' } },
  png: { ext: 'png', type: 'image/png', opts: { compressionLevel: 9, palette: true } },
};

// The preview: the whole photograph in about four hundred bytes, inlined into
// the page so there is something in the box from the first paint. It is 28px
// wide and the browser blows it up to 620, which is what makes it a blur.
const LQIP_WIDTH = 28;

// Change any dial above and everything is encoded again, because the files on
// disk were made by a different set of numbers.
const SETTINGS = crypto.createHash('sha1')
  .update(JSON.stringify({ LADDER, HERO_LADDER, FORMATS, FALLBACK, LQIP_WIDTH }))
  .digest('hex').slice(0, 12);

// The hero names its place in the page rather than a section, the same way
// build.js reads it, and it is the one picture measured off the page's own
// margins - so it is the one picture on the other ladder.
const isHero = (stem) => stem === 'hero' || stem.startsWith('hero-');

const rel = (p) => encodeURI('sized/' + p);

function ladderFor(stem, natural) {
  const rungs = isHero(stem) ? HERO_LADDER : LADDER;
  // Never wider than the file itself. Blowing a photograph up costs bytes and
  // buys nothing, so the top rung becomes the source's own width.
  const top = Math.min(Math.max.apply(null, rungs), natural);
  const ws = rungs.filter((w) => w < top);
  ws.push(top);
  return ws;
}

async function size(file, prev) {
  const src = path.join(SRC_DIR, file);
  const st = fs.statSync(src);
  const stem = file.replace(/\.(jpe?g|png)$/i, '');
  const stamp = `${st.mtimeMs}:${st.size}:${SETTINGS}`;

  // Unchanged source, unchanged dials, and every file it claims to have written
  // still on disk: nothing to do.
  if (prev && prev.stamp === stamp && prev.files.every((f) => fs.existsSync(path.join(ROOT, f)))) {
    return { entry: prev, wrote: 0 };
  }

  const meta = await sharp(src).metadata();
  const ws = ladderFor(stem, meta.width);

  // Decoded and scaled once, to the top rung, and every rung below is taken off
  // that rather than off the original. An 18MB source is decoded one time
  // instead of fifteen.
  const { data, info } = await sharp(src)
    .resize({ width: ws[ws.length - 1], withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const from = () => sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } });

  // A photograph goes back out as a JPEG. Anything actually carrying
  // transparency - the drawn ones - goes back out as a PNG, or the fallback
  // fills its holes with black.
  const clear = info.channels === 4 && !(await from().stats()).isOpaque;
  const formats = FORMATS.concat([clear ? FALLBACK.png : FALLBACK.jpg]);

  const files = [];
  const sets = {};
  for (const fmt of formats) {
    const rungs = [];
    for (const w of ws) {
      const name = `${stem}-${w}.${fmt.ext}`;
      await from().resize({ width: w }).toFormat(fmt.ext === 'jpg' ? 'jpeg' : fmt.ext, fmt.opts)
        .toFile(path.join(OUT_DIR, name));
      files.push('sized/' + name);
      rungs.push(`${rel(name)} ${w}w`);
    }
    sets[fmt.ext] = { type: fmt.type, srcset: rungs.join(', ') };
  }

  // A drawing with holes in it gets no preview. The preview is a blur laid
  // behind the picture, and behind a picture you can see through it would stay
  // there for good, showing through every transparent pixel. What belongs
  // behind those is the page's own white, which is what is already there.
  const lqip = clear ? null : 'data:image/webp;base64,' + (await from()
    .resize({ width: LQIP_WIDTH })
    .webp({ quality: 45, effort: 6 }).toBuffer()).toString('base64');

  const fallback = formats[formats.length - 1];
  // The `src` is the middle of the ladder rather than the top: it is only ever
  // used by a browser too old to read srcset, and that browser is not on a
  // screen that wants 1920px.
  const mid = ws[Math.min(ws.length - 1, 2)];

  const entry = {
    stamp,
    width: meta.width,
    height: meta.height,
    lqip,
    src: rel(`${stem}-${mid}.${fallback.ext}`),
    sources: FORMATS.map((f) => ({ type: f.type, srcset: sets[f.ext].srcset })),
    srcset: sets[fallback.ext].srcset,
    files,
  };
  return { entry, wrote: files.length };
}

async function main() {
  const all = process.argv.includes('--all');
  if (!fs.existsSync(SRC_DIR)) {
    console.log('  no images/ folder, so nothing to size');
    return;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let old = {};
  if (!all && fs.existsSync(SIDECAR)) {
    try { old = JSON.parse(fs.readFileSync(SIDECAR, 'utf8')).files || {}; } catch (err) { old = {}; }
  }

  const sources = fs.readdirSync(SRC_DIR).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();

  // libvips threads inside every call, so the pool is what keeps the cores fed
  // without the calls fighting each other for them.
  sharp.concurrency(1);
  const lanes = Math.max(2, Math.min(8, os.cpus().length));

  const done = {};
  let wrote = 0, fresh = 0;
  const queue = sources.slice();
  await Promise.all(Array.from({ length: Math.min(lanes, queue.length) }, async function () {
    while (queue.length) {
      const file = queue.shift();
      const r = await size(file, old[file]);
      done[file] = r.entry;
      if (r.wrote) { wrote += r.wrote; fresh++; console.log(`    ${file}`); }
    }
  }));

  // Anything in sized/ that no source claims any more. Rename a section's
  // picture and its old ladder goes with it, so the folder never fills up with
  // widths of a photograph the page has stopped showing.
  const keep = new Set();
  for (const file of Object.keys(done)) for (const f of done[file].files) keep.add(path.basename(f));
  let swept = 0;
  for (const f of fs.readdirSync(OUT_DIR)) {
    if (keep.has(f)) continue;
    fs.unlinkSync(path.join(OUT_DIR, f));
    swept++;
  }

  const ordered = {};
  for (const k of Object.keys(done).sort()) ordered[k] = done[k];
  fs.writeFileSync(SIDECAR, JSON.stringify({ settings: SETTINGS, files: ordered }, null, 2) + '\n');

  const bytes = (dir) => fs.readdirSync(dir).reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0);
  const mb = (n) => (n / 1048576).toFixed(1) + 'MB';
  console.log(`  ${sources.length} picture(s): ${fresh} sized, ${sources.length - fresh} already current`);
  if (swept) console.log(`  ${swept} file(s) in sized/ belonged to nothing, so swept`);
  console.log(`  images/ ${mb(bytes(SRC_DIR))} in, sized/ ${mb(bytes(OUT_DIR))} out`);
}

main().catch((err) => {
  console.error('  ! sizing failed:', err.message);
  process.exit(1);
});
