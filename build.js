#!/usr/bin/env node
// Builds index.html from ../draftv4.md, the prose of record.
// Re-run after editing draftv4.md: `node build.js`
//
// Structure:
//   `# `      chapter (the first one, the doc title, is skipped; its following
//             paragraph becomes the lead line under the wordmark)
//   `## `     section
//   `~~`      struck through in the draft, so cut from the guide. A struck
//             heading takes its whole section with it; see isCut below.
//   <aside>   image slot - the picture that runs beside this stretch of prose.
//             Slots are mirrored into images.json so real images and credits
//             can be filled in without touching the draft.
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DRAFT = path.join(ROOT, '..', 'draftv4.md');
const OUT = path.join(ROOT, 'index.html');
const MANIFEST = path.join(ROOT, 'images.json');
const IMG_DIR = path.join(ROOT, 'images');

const esc = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// escape, then turn **bold** / *italic* into tags
const inline = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  .replace(/(^|[^*])\*([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');

const stripMd = (s) => s.replace(/\*\*/g, '').replace(/\*/g, '').replace(/~~/g, '').trim();

// A line the draft has struck through is a line Saurabh has cut, so it never
// reaches the page. On a heading it cuts the whole section under it - the
// prose, the lists and the image slots - because a section is only struck by
// striking its title.
const isCut = (s) => /^~~[\s\S]*~~$/.test(s.trim());

function slugify(s) {
  return s.toLowerCase()
    .replace(/[’'"]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'section';
}

const usedIds = new Set();
function slug(s) {
  const base = slugify(s);
  let id = base, n = 2;
  while (usedIds.has(id)) id = `${base}-${n++}`;
  usedIds.add(id);
  return id;
}

// ---- parse ----
const lines = fs.readFileSync(DRAFT, 'utf8').split('\n');

const chapters = [];
let markers = 0;           // <aside> slots the draft asked for
let cur = null, sec = null, listBuf = null;
let aside = null;          // buffer while inside an <aside>
let seenTitle = false;
let lead = null;           // the thesis line, before any chapter
let cutting = false;       // inside a struck-through section
const cutSections = [];    // what was dropped, for the build report

function bucket() { return sec ? sec.blocks : (cur ? cur.intro : null); }
function flushList() {
  if (listBuf && listBuf.items.length) bucket().push(listBuf);
  listBuf = null;
}

for (const line of lines) {
  const t = line.trim();

  // Every heading settles the question again: a struck one opens a cut that
  // runs to the next heading, a live one closes whatever cut was open. This
  // has to be read before the <aside> branch, or a slot inside a cut section
  // would open a buffer and swallow the lines that end it.
  const heading = !aside && /^#{1,6} (.+)$/.exec(t);
  if (heading) {
    cutting = isCut(heading[1]);
    if (cutting) { flushList(); cutSections.push(stripMd(heading[1])); continue; }
  } else if (cutting) {
    continue;
  }

  if (t === '<aside>') { aside = []; continue; }
  if (aside) {
    if (t === '</aside>') {
      // A marker says the draft wants a picture here and what of. Which file
      // fills it is settled later, by name, against the whole images/ folder.
      const note = aside.filter(Boolean).filter(l => l !== '🖼️').join(' ').trim();
      if (bucket()) { bucket().push({ type: 'slot', note }); markers++; }
      aside = null;
    } else {
      aside.push(t.replace(/^🖼️\s*/, ''));
    }
    continue;
  }

  const h1 = t.match(/^# (.+)$/);
  if (h1) {
    flushList();
    if (!seenTitle) { seenTitle = true; continue; }  // doc title -> the wordmark
    const title = stripMd(h1[1]);
    cur = { title, id: slug(title), intro: [], sections: [] };
    sec = null;
    chapters.push(cur);
    continue;
  }

  const h2 = t.match(/^## (.+)$/);
  if (h2 && cur) {
    flushList();
    const title = stripMd(h2[1]);
    sec = { title, id: slug(title), blocks: [] };
    cur.sections.push(sec);
    continue;
  }

  if (t === '') { flushList(); continue; }

  // A struck line standing on its own, under a heading that survived.
  if (isCut(t)) { flushList(); continue; }

  if (!cur) { if (!lead) lead = t; continue; }   // thesis line under the title

  const li = t.match(/^- (.+)$/);
  const oli = t.match(/^\d+\.\s+(.+)$/);
  if (li || oli) {
    const type = li ? 'ul' : 'ol';
    if (!listBuf || listBuf.type !== type) { flushList(); listBuf = { type, items: [] }; }
    listBuf.items.push((li || oli)[1].trim());
    continue;
  }

  flushList();
  bucket().push({ type: 'p', text: t });
}
flushList();

// ---- the images/ folder -------------------------------------------------
// Reads JPEG/PNG headers for natural size, and pulls the photographer and the
// photo id out of Unsplash's `name-slug-<11 char id>-unsplash.jpg` filenames.
//
// A file says which section it belongs to by starting with that section's slug:
// `natural-light.jpg`, `groups-and-anchors-shin-li-bdFdbOae2b0-unsplash.jpg`.
// Anything that matches no section is simply not used, and a section with no
// file of its own shows no image at all.
function imageSize(buf) {
  if (buf.readUInt32BE(0) === 0x89504e47) {                 // PNG
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.readUInt16BE(0) !== 0xffd8) return null;          // not a JPEG either
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    // SOF0..SOF15, skipping the four that are not frame headers
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc, 0xd8].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

function titleCase(slug) {
  return slug.split('-').filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function readImages() {
  if (!fs.existsSync(IMG_DIR)) return [];
  return fs.readdirSync(IMG_DIR)
    .filter(f => /\.(jpe?g|png)$/i.test(f))
    .sort()
    .map(file => {
      const size = imageSize(fs.readFileSync(path.join(IMG_DIR, file))) || {};
      return {
        file,
        stem: file.replace(/\.(jpe?g|png)$/i, ''),
        src: 'images/' + file,
        width: size.width || 379,
        height: size.height || 474,
      };
    });
}
const photos = readImages();

// Every heading is somewhere a picture can be named after, whether or not the
// draft wrote an <aside> under it. The folder is what decides which pictures
// the guide has; the markers only say what the draft had in mind for them.
const units = [];
for (const ch of chapters) {
  units.push({ chapter: ch.title, section: '', key: ch.id, blocks: ch.intro });
  for (const s of ch.sections) {
    units.push({ chapter: ch.title, section: s.title, key: s.id, blocks: s.blocks });
  }
}

// Longest key first, so a file only ever answers to the most specific section
// name it could belong to.
const keys = units.map(u => u.key).filter(Boolean).sort((a, b) => b.length - a.length);
const unitByKey = Object.fromEntries(units.map(u => [u.key, u]));

const keyFor = (stem) => keys.find(k => stem === k || stem.startsWith(k + '-'));

// `hero-<photographer>.jpg` is the picture under the wordmark. It names a place
// in the page the way every other file names a section, so it is taken out of
// the running before the sections are matched - nothing else may claim it, and
// it claims nothing else.
//
// `hero-empty-...` is the same room before it was furnished, and it is what the
// guide opens on. It has to be picked out first: it starts with `hero-` too,
// and it sorts ahead of the real one, so a plain search for the hero would find
// the empty room and stop there.
const isHero = (p) => p.stem === 'hero' || p.stem.startsWith('hero-');
const heroEmpty = photos.find(p => p.stem.startsWith('hero-empty'));
const heroFile = photos.find(p => isHero(p) && p !== heroEmpty);

// key -> the files marked for it, in filename order.
const marked = {};
for (const p of photos) {
  if (p === heroFile || p === heroEmpty) continue;
  const key = keyFor(p.stem);
  if (!key) continue;
  (marked[key] = marked[key] || []).push(p);
}
const unused = photos.filter(p => p !== heroFile && p !== heroEmpty && !keyFor(p.stem));

// What is left of the filename once the section it names is off the front: the
// photographer, and - where the picture belongs to one bullet of a list rather
// than to the section as a whole - the opening words of that bullet first.
function credit(rest) {
  const un = rest.match(/^(.+)-([A-Za-z0-9_-]{11})-unsplash$/);
  return {
    credit: un ? titleCase(un[1]) : '',
    creditUrl: un ? 'https://unsplash.com/photos/' + un[2] : '',
  };
}

// A file can name a list item the way it names a section, by starting with its
// opening words: `three-kinds-of-light-ambient-light-<photographer>.jpg` is the
// picture for the bullet that begins "Ambient light is...". Two words have to
// agree before it counts, so a bullet starting "The..." cannot swallow a
// photographer's name, and the longest agreement wins when several could match.
// A bullet announces its subject in its first words, so the opening of the
// filename and the opening of the bullet simply agree. A paragraph often buries
// it - "Keep the floors visible" is about floors, three words in - so a single
// distinctive word counts too, as long as it turns up near the front of exactly
// one paragraph or bullet in the section. Four letters is the shortest that can
// be distinctive; below that it is "the" and "for" and a photographer called
// Yan, and the first word of a filename's tail is usually a first name.
// Sometimes the subject is buried deeper still. The bullet on overhead lights
// gets to pendants fifty words in, so `...-pendant-<photographer>.jpg` finds
// nothing near any front. Reading the whole of every line would be a loose rule
// to apply everywhere - a photographer called Mirror would land in the wrong
// paragraph - so it is only allowed in a section that has already answered to a
// strict match. Three of the four lamp pictures name their bullet from the
// front; that is the section telling us it is being addressed line by line, and
// the fourth is read in that light.
const OPENING = 4;         // how far into a block a naming word may sit
function anchorOf(rest, targets, loose) {
  const words = rest.split('-').filter(Boolean);
  const free = targets.filter(t => !t.taken);
  let best = null;
  for (const t of free) {
    const tw = t.slug.split('-').filter(Boolean);
    let n = 0;
    while (n < words.length && n < tw.length && words[n].toLowerCase() === tw[n]) n++;
    if (n >= 2 && (!best || n > best.n)) {
      best = { target: t, n, rest: words.slice(n).join('-'), strict: true };
    }
  }
  if (best) return best;

  const w = words[0] && words[0].toLowerCase();
  if (!w || w.length < OPENING) return null;
  let hits = free.filter(t => t.slug.split('-').slice(0, OPENING).includes(w));
  let strict = true;
  if (!hits.length && loose) { hits = free.filter(t => t.slug.split('-').includes(w)); strict = false; }
  if (hits.length !== 1) return null;                // ambiguous is no answer
  return { target: hits[0], n: 1, rest: words.slice(1).join('-'), strict };
}

// ---- placing the files -------------------------------------------------
// Per section: the bullet-anchored files go to their bullets, and the rest fill
// the draft's markers in order. A file with no marker left to fill gets one of
// its own at the end of the section, so a picture is never dropped for want of
// an <aside>; a marker with no file left renders nothing at all.
const slots = [];
const extraSlots = [];     // files that outnumbered their section's markers
const anchoredTo = [];     // pictures levelled with a bullet rather than a section
let markersFilled = 0;
for (const u of units) {
  const files = marked[u.key] || [];
  if (!files.length) continue;

  // Anything a picture can be levelled with: a bullet, or a paragraph.
  const targets = [];
  for (const b of u.blocks) {
    if (b.type === 'p') targets.push({ block: b, slug: slugify(stripMd(b.text)) });
    else if (b.type === 'ul' || b.type === 'ol') {
      b.items.forEach((text, i) => targets.push({ block: b, i, slug: slugify(stripMd(text)) }));
    }
  }

  function take(p, hit) {
    const t = hit.target, photo = { ...p, ...credit(hit.rest) };
    t.taken = true;
    if (t.i === undefined) t.block.anchor = photo;
    else (t.block.anchors = t.block.anchors || {})[t.i] = photo;
    const text = t.i === undefined ? t.block.text : t.block.items[t.i];
    anchoredTo.push({ file: p.file, at: stripMd(text).slice(0, 44) });
  }

  // Strict first, across the whole section, so what the section is doing is
  // settled before the looser reading is allowed to lean on it.
  const rests = new Map(files.map(p => [p, p.stem.slice(u.key.length).replace(/^-/, '')]));
  const over = [];
  let strictHits = 0;
  for (const p of files) {
    const hit = targets.length ? anchorOf(rests.get(p), targets, false) : null;
    if (hit) { take(p, hit); strictHits++; } else over.push(p);
  }

  const plain = [];
  for (const p of over) {
    const hit = strictHits ? anchorOf(rests.get(p), targets, true) : null;
    if (hit) take(p, hit);
    else plain.push({ ...p, ...credit(rests.get(p)) });
  }

  const markers = u.blocks.filter(b => b.type === 'slot');
  markers.forEach((b, i) => { if (plain[i]) { b.photo = plain[i]; markersFilled++; } });
  for (const p of plain.slice(markers.length)) {
    const b = { type: 'slot', note: '', photo: p };
    u.blocks.push(b);
    extraSlots.push({ key: u.key, file: p.file });
  }

  // Numbered in reading order within the section, so a picture keeps its name
  // in images.json when the draft changes somewhere else entirely.
  let n = 0;
  const name = () => (files.length > 1 ? `${u.key}-${++n}` : (n++, u.key));
  for (const b of u.blocks) {
    if (b.type === 'slot') { if (b.photo) slots.push({ ...u, id: name(), block: b }); continue; }
    if (b.anchor) { slots.push({ ...u, id: name(), block: b }); continue; }
    if (!b.anchors) continue;
    b.items.forEach((text, i) => {
      if (b.anchors[i]) slots.push({ ...u, id: name(), block: b, item: i });
    });
  }
}

// ---- image manifest: what is on the page, and the alt text written by hand ----
let existing = {};
if (fs.existsSync(MANIFEST)) {
  try {
    for (const e of JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))) existing[e.id] = e;
  } catch (err) {
    console.warn(`  ! ${path.basename(MANIFEST)} is not valid JSON, ignoring it`);
  }
}
// Every entry is a picture the folder actually holds, so taking a file out of
// images/ takes its entry out of here and its place out of the page on the next
// build. `alt` is the one field written by hand, and it is kept.
const manifest = slots.map((s) => {
  const p = s.item === undefined ? (s.block.photo || s.block.anchor) : s.block.anchors[s.item];
  const was = existing[s.id];
  const m = {
    id: s.id,
    chapter: s.chapter,
    section: s.section,
    note: s.block.note || '',                          // refreshed from the draft
    src: p.src,                                        // e.g. "images/foo.jpg"
    width: p.width,                                    // natural size, sets the aspect ratio
    height: p.height,
    alt: (was && was.alt) || '',
    credit: p.credit,
    creditUrl: p.creditUrl,
  };
  p.id = s.id;                                         // the render reads it back off the file
  return m;
});
fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
const byId = Object.fromEntries(manifest.map(m => [m.id, m]));

// ---- render ----
// The page is a stack of rows. A row is a run of prose on the left and, where
// there is one, its picture on the right. The row is as tall as whichever of
// the two is taller, which is what makes a short section wait for its own
// picture to finish before the next one starts.
function renderBlock(b, pad) {
  if (b.type === 'p') return `${pad}<p${b.anchor ? ' data-anchor' : ''}>${inline(b.text)}</p>`;
  // `start` keeps a split ordered list counting on; `data-anchor` is the line
  // the picture beside it is levelled with, which is not always the first thing
  // in the row - see firstWordsAt in the script.
  const attrs = [
    b.type === 'ol' && b.start > 1 ? ` start="${b.start}"` : '',
    b.anchor ? ' data-anchor' : '',
  ].join('');
  return `${pad}<${b.type}${attrs}>\n${b.items.map(i => `${pad}  <li>${inline(i)}</li>`).join('\n')}\n${pad}</${b.type}>`;
}

const rows = [];
let row = null;
let part = null;           // the run of list items the current row is holding

function openRow(kind, heading) {
  row = { kind, heading: heading || '', blocks: [], image: null };
  part = null;
  rows.push(row);
}

// A picture belongs to its heading, not to the line it was written beside, so
// the first one in a section rides up to the top of the row and starts where
// the heading starts. A section that wants a second picture splits the row
// there and carries on beneath it. An empty slot renders nothing at all.
function addBlocks(blocks) {
  for (const b of blocks) {
    if (b.type === 'slot') { if (b.photo) place(byId[b.photo.id]); part = null; continue; }
    if ((b.type === 'ul' || b.type === 'ol') && b.anchors) { addList(b); continue; }
    // A paragraph with a picture of its own opens the stretch that picture sits
    // beside, and the prose after it carries on in the same stretch. It gets a
    // section's worth of air, the same as an anchored bullet: whatever the
    // prose is doing, what the eye sees is a run of pictures, and they want
    // spacing the guide already has a measure for.
    if (b.anchor) {
      if (row.image) openRow('item', '');
      row.blocks.push(b);
      part = null;
      place(byId[b.anchor.id]);
      continue;
    }
    row.blocks.push(b);
    part = null;
  }
}

function place(m) {
  if (!m || !m.src) return;
  if (row.image) openRow('cont', '');
  row.image = m;
}

// A list whose bullets have pictures of their own is cut into a row per
// picture, because a photo is several times the height of the bullet it
// belongs to and there is no room to hang three of them off three lines. The
// row growing to its picture's height is what pushes the bullets apart, and
// each one starts level with its own.
function addList(b) {
  b.items.forEach((text, i) => {
    const photo = b.anchors[i];
    if (photo) {
      if (row.image) openRow('item', '');
      part = { type: b.type, items: [], start: i + 1, anchor: true };
      row.blocks.push(part);
      part.items.push(text);
      place(byId[photo.id]);
      return;
    }
    if (!part) { part = { type: b.type, items: [], start: i + 1 }; row.blocks.push(part); }
    part.items.push(text);
  });
}

// The wordmark and the line under it are the first thing in the document rather
// than a pinned layer over it, so they leave with the first screenful and give
// the page back. They are their own block, above the nav, and render separately.
// The wordmark, on one line, and nothing beside it. The thesis line that used
// to sit in the picture lane is gone from the page - it is still the draft's
// first paragraph and still the document's description, just not set here.
const head =
  `      <div class="brand-lane"><span class="brand">` +
  `<span>The Tenant's Guide</span> <span>to Interior Design</span>` +
  `</span></div>`;

// The picture under them. It is not one of the guide's pictures: it belongs to
// no section, sits in no lane, and is measured off the page's own margins
// instead - so it renders here rather than through renderMedia, and it stays
// out of `.prose`, which is where the script looks for the pictures it has to
// place and to line the lead up with.
const heroCredit = heroFile ? credit(heroFile.stem.replace(/^hero-?/, '')) : null;
// The furnished room is the picture: it is in the flow, it holds the box, and it
// is what shows if none of the rest of this runs. The empty room is loaded but
// never displayed - it is a source for the canvas laid over the top, which
// paints it back in wherever the pixel cloud covers. So the guide opens on the
// empty room, the cloud sweeps off to the right and leaves it furnished, and a
// cursor drawn across it brings the empty room back under the pointer.
const hero = !heroFile ? '' : [
  `      <figure class="hero${heroEmpty ? ' hero--reveal' : ''}">`,
  `        <img class="hero-full" src="${heroFile.src}" alt="" width="${heroFile.width}" height="${heroFile.height}" fetchpriority="high" decoding="async" />`,
  heroEmpty
    ? `        <img class="hero-empty" src="${heroEmpty.src}" alt="" width="${heroEmpty.width}" height="${heroEmpty.height}" fetchpriority="high" decoding="async" aria-hidden="true" />`
    : '',
  heroEmpty ? `        <canvas class="hero-canvas" aria-hidden="true"></canvas>` : '',
  heroCredit.credit
    ? `        <figcaption class="credit">Photo by <a href="${heroCredit.creditUrl}" target="_blank" rel="noopener">${esc(heroCredit.credit)}</a></figcaption>`
    : '',
  `      </figure>`,
].filter(Boolean).join('\n');

const navItems = [];
chapters.forEach((ch, i) => {
  navItems.push({ level: 'chapter', id: ch.id, label: ch.title });
  // The first chapter has no heading of its own down here. It is the page: the
  // wordmark, the line beside it and the picture under them say what it is
  // already, and a second announcement under the picture only repeated them.
  // It keeps its entry in the contents, which goes to the very top.
  openRow('chapter', i === 0 ? ''
    : `<h2 class="heading heading--chapter" id="${ch.id}">${esc(ch.title)}</h2>`);
  addBlocks(ch.intro);
  for (const s of ch.sections) {
    navItems.push({ level: 'section', id: s.id, label: s.title });
    openRow('section', `<h3 class="heading heading--section" id="${s.id}">${esc(s.title)}</h3>`);
    addBlocks(s.blocks);
  }
});
openRow('end', '<p class="colophon">Written and designed by <a href="https://saurabh.so" target="_blank" rel="noopener">Saurabh</a>.</p>');

// Every figure is the same width, set in the stylesheet off the window rather
// than off the photo, so nothing about the picture's own proportions is needed
// here any more. The width and height attributes still go on the img: they hold
// the space at the right shape before the file lands, and they are what the
// height now follows from.
function renderMedia(m) {
  const name = m.creditUrl
    ? `<a href="${m.creditUrl}" target="_blank" rel="noopener">${esc(m.credit)}</a>`
    : `<span class="credit-name">${esc(m.credit)}</span>`;
  return [
    `          <div class="media" data-slot="${m.id}">`,
    `            <figure class="shot">`,
    `              <img src="${m.src}" alt="${esc(m.alt)}" width="${m.width}" height="${m.height}" loading="lazy" decoding="async" />`,
    m.credit ? `              <figcaption class="credit">Photo by ${name}</figcaption>` : '',
    `            </figure>`,
    `          </div>`,
  ].filter(Boolean).join('\n');
}

const prose = rows.map(r => {
  const copy = [
    r.heading ? `            ${r.heading}` : '',
    r.blocks.map(b => renderBlock(b, '            ')).join('\n'),
  ].filter(Boolean).join('\n');
  return [
    `        <section class="row row--${r.kind}">`,
    copy ? `          <div class="copy">\n${copy}\n          </div>` : '',
    r.image ? renderMedia(r.image) : '',
    `        </section>`,
  ].filter(Boolean).join('\n');
}).join('\n');

// Two views of the same list, from the same data so they cannot drift: the
// rail of hairlines on the left, and the readable contents that take over the
// text column on hover.
const rail = navItems.map(n =>
  `            <span class="rail-row"><span class="nav-tick nav-tick--${n.level}"></span></span>`
).join('\n');

const nav = navItems.map(n =>
  `            <a class="nav-item nav-item--${n.level}" href="#${n.id}" data-target="${n.id}">${esc(n.label)}</a>`
).join('\n');

const v = Date.now();
const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>The Tenant's Guide to Interior Design</title>
  <meta name="description" content="${esc(lead || '')}" />
  <link rel="stylesheet" href="assets/styles.css?v=${v}" />
</head>
<body>
  <div class="reader" id="reader">
    <div class="reader-scroll" id="readerScroll">
      <div class="nav-dock">
        <div class="nav-anchor">
          <div class="nav-hit" id="navHit">
            <div class="nav-rail" id="navRail" aria-hidden="true">
${rail}
            </div>
            <div class="nav-panel">
              <nav class="nav-list" id="navList" aria-label="Contents">
${nav}
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div class="head" id="head">
${head}
      </div>
${hero}

      <div class="prose" id="prose">
${prose}
      </div>
    </div>
  </div>

  <script src="assets/script.js?v=${v}"></script>
</body>
</html>
`;

fs.writeFileSync(OUT, html);
console.log(`Built ${OUT}`);
console.log(`  ${chapters.length} chapters, ${navItems.length - chapters.length} sections`);
if (cutSections.length) {
  console.log(`  ${cutSections.length} section(s) struck through in the draft, so left out:`);
  for (const c of cutSections) console.log(`    ${c}`);
}
console.log(`  ${photos.length} files in images/, ${manifest.length} on the page`);
console.log(`  ${markers} marker(s) in the draft, ${markersFilled} filled, ${markers - markersFilled} with no file so nothing rendered`);
if (extraSlots.length) {
  console.log(`  ${extraSlots.length} file(s) past the markers their section had, given a place of their own:`);
  for (const e of extraSlots) console.log(`    ${e.key}  <-  ${e.file}`);
}
if (anchoredTo.length) {
  console.log(`  ${anchoredTo.length} picture(s) levelled with a line of their own:`);
  for (const a of anchoredTo) console.log(`    "${a.at}..."  <-  ${a.file}`);
}
console.log(`  ${rows.length} rows, ${rows.filter(r => r.image).length} of them with a picture`);
if (unused.length) {
  console.log(`  ${unused.length} file(s) match no section, so they are unused:`);
  for (const p of unused) console.log(`    ${p.file}`);
}
console.log(`  Mirrored into ${path.basename(MANIFEST)}`);
