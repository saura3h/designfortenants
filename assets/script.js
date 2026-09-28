(function () {
  'use strict';

  var reader = document.getElementById('reader');
  var scroller = document.getElementById('readerScroll');
  var navHit = document.getElementById('navHit');
  var rail = document.getElementById('navRail');
  var navList = document.getElementById('navList');
  var navPanel = document.querySelector('.nav-panel');
  var dock = document.querySelector('.nav-dock');
  var lead = document.querySelector('.lead');
  var brand = document.querySelector('.brand');
  var head = document.getElementById('head');
  var prose = document.getElementById('prose');

  var navLinks = Array.prototype.slice.call(navList.querySelectorAll('.nav-item'));
  var ticks = Array.prototype.slice.call(rail.querySelectorAll('.nav-tick'));
  var headings = navLinks.map(function (a) { return document.getElementById(a.dataset.target); });
  var shots = Array.prototype.slice.call(prose.querySelectorAll('.shot'));

  // ---------- the pictures ----------
  // A picture is in the flow now, so it arrives with its own words and leaves
  // with them. All the script has to do is say where it comes to rest: sticky
  // at the height that leaves equal room above and below, so a section with
  // more words than picture parks it in the middle of the window and reads
  // past it. A section shorter than its picture never gets there - the room to
  // stick in is the row's height less the picture's, which is nothing.
  //
  // It also starts where the words start rather than where the heading does. A
  // heading is a label on the section, not the first thing in it, so a picture
  // levelled with it sat a line or two high of everything it was next to. The
  // drop is measured rather than worked out from the type, so a heading that
  // wraps to two lines, or one whose size changes, still lands it right.
  //
  // A picture that belongs to one bullet of a list rather than to the section
  // says so with data-anchor, and is levelled with that instead. It is not
  // always the first thing in the row - the first of three lamp kinds still has
  // the section's opening line above it - so it has to be asked for by name.
  function firstWordsAt(fig) {
    var row = fig.closest('.row');
    var copy = row && row.querySelector('.copy');
    if (!copy) return 0;
    var anchor = copy.querySelector('[data-anchor]');
    if (anchor) return anchor.offsetTop - copy.offsetTop;
    for (var i = 0; i < copy.children.length; i++) {
      var el = copy.children[i];
      if (!el.classList.contains('heading')) return el.offsetTop - copy.offsetTop;
    }
    return 0;
  }

  // The line about the guide is set to the first picture: it starts where that
  // picture starts and runs as wide as it runs. Neither is a line the
  // stylesheet can name, because the pictures are centred in their box and
  // every one is a different width, so where the first one begins and how far
  // it reaches depend on its proportions and on how tall the window is.
  // Measured here instead, and measured again whenever either could have moved.
  function alignLead() {
    if (!lead || !shots.length) return;
    var pic = shots[0].getBoundingClientRect();
    var pad = pic.left - lead.getBoundingClientRect().left;
    lead.style.setProperty('--lead-pad', Math.max(0, Math.round(pad)) + 'px');
    lead.style.setProperty('--lead-w', Math.round(pic.width) + 'px');
  }

  // Below this the pictures are under their words, in the flow, at the column's
   // own width - so neither of the things place() writes applies. The number is
  // the stylesheet's; the two have to agree, and this is the second of the two
  // places it is written.
  var stacked = window.matchMedia('(max-width: 1099px)');
  // And below this the rail is not a rail at all, it is a window in the corner.
  // Third and last place the stylesheet's numbers are written out here.
  var phone = window.matchMedia('(max-width: 767px)');

  function place() {
    if (stacked.matches) {
      // Clear rather than skip: the window can be narrowed after a wide layout
      // has already been measured, and those numbers would otherwise stay on.
      shots.forEach(function (fig) {
        fig.parentNode.style.paddingTop = '';
        fig.style.top = '';
      });
      alignLead();
      return;
    }
    var view = scroller.clientHeight;
    // Read every drop before writing any of them, so sixty rows cost one
    // reflow between the two passes rather than one apiece.
    var drops = shots.map(firstWordsAt);
    shots.forEach(function (fig, i) {
      fig.parentNode.style.paddingTop = drops[i] + 'px';
    });
    shots.forEach(function (fig) {
      fig.style.top = Math.max(0, Math.round((view - fig.offsetHeight) / 2)) + 'px';
    });
    alignLead();
  }

  // Held at zero opacity until the file is actually in, so a picture arrives as
  // a fade over its own preview rather than as a box filling in top to bottom.
  // The class is added here, not in the markup, so a page without script still
  // shows every picture. What it does is the stylesheet's business: with a
  // preview behind it only the photograph waits, without one the whole figure
  // does, credit included.
  shots.forEach(function (fig) {
    var img = fig.querySelector('img');
    if (!img || img.complete) return;
    fig.classList.add('is-pending');
    var done = function () { fig.classList.remove('is-pending'); };
    img.addEventListener('load', done);
    img.addEventListener('error', done);
  });

  // ---------- fetching them early ----------
  // Every picture is `loading="lazy"` in the markup, so a page with no script
  // fetches only what it needs and nothing at all up front. What the script
  // adds is distance. Left alone, a browser starts a lazy file about a screen
  // before it is wanted, which is plenty for reading and nowhere near enough
  // for a flick through the guide: you outrun it, and land on a chapter whose
  // pictures have not been asked for yet.
  //
  // So a picture within a few screens of the window is promoted to eager and
  // starts on its own, well before it is anywhere near being looked at. It is
  // the browser's own loading attribute either way - nothing here holds a src
  // back or hands one over, so the page never depends on this having run.
  //
  // Two screens behind and three ahead: reading only ever goes one way, but the
  // way back up is somebody looking for something they have just read, and a
  // picture they have already passed should still be there. A connection that
  // has said it is slow, or a phone that has asked for less data, gets one
  // screen either side instead - it is speculative traffic, and the whole point
  // of asking for less is not to spend it on guesses.
  if (window.IntersectionObserver) {
    var link = navigator.connection || {};
    var thrifty = link.saveData || /2g/.test(link.effectiveType || '');
    var warmer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        warmer.unobserve(e.target);
        var img = e.target.querySelector('img');
        if (img && !img.complete) img.loading = 'eager';
      });
    }, {
      root: scroller,
      rootMargin: thrifty ? '100% 0px' : '200% 0px 300% 0px',
    });
    shots.forEach(function (fig) { warmer.observe(fig); });
  }

  // ---------- the hero's reveal ----------
  // A pixel cloud over the hero. It paints the empty room over the furnished
  // one wherever it covers, so one number - coverage - is the whole effect:
  // the opening sweep is the cloud leaving to the right.
  //
  // The cloud itself is value noise with a domain warp, the same billowing fbm
  // as the sketch this came from, sampled once per cell of a coarse grid. The
  // grid is a way of paying for the cloud once every six pixels instead of
  // every one; it is not meant to be seen. So the alpha it holds is carried
  // back up to the picture smoothly and blurred half a cell as it goes, and
  // what arrives is a soft edge rather than a staircase of blocks.
  // ---------- the opening ----------
  // Handing the page over: the picture dissolves in, the hairlines follow, the
  // wordmark rises out from behind the picture. The order and the timing are
  // the stylesheet's; all that is decided here is when it may begin.
  //
  // Which is once the picture is in. The cloud waits on both files - it paints
  // one over the other - so hanging the opening on the same moment means what
  // dissolves in is the empty room, and the sweep to the furnished one follows
  // out of it rather than interrupting it.
  //
  // The backstop is the promise it opens anyway. A file that never decodes must
  // not leave the page blank, and 2.5s of nothing is already too long - better
  // an empty box that fades in and fills a moment later than a white screen.
  //
  // The wordmark is held back further than the rest, until the cloud has all
  // but finished crossing: it rises out from behind the photograph, and it
  // should rise out of the room the guide is actually about rather than compete
  // with the picture still changing underneath it. So the sweep's timing lives
  // out here, where both the cloud and the opening can read it.
  //
  // All but. It starts half a second early, into the last of the sweep, and the
  // two overlap rather than queue: by then the cloud is off the left three
  // quarters of the picture and only the far edge is still clearing, so there
  // is nothing left for the wordmark to compete with - and waiting for the
  // very last cell put a hole in the opening where nothing happened at all.
  var SWEEP_MS = 2200, SWEEP_WAIT = 400;
  var BRAND_LEAD = 500;            // how far into the sweep's end the wordmark starts
  var entered = false, cleared = false;
  function enter() {
    if (entered) return;
    entered = true;
    document.documentElement.classList.add('entered');
    // Whichever way the page opened, the sweep starts with it - so the wait is
    // the same wait, counted from here. Nothing to wait for if there is no
    // cloud, and nothing to wait for if the reader has asked for less movement:
    // the stylesheet drops every delay in that case, and a script holding one
    // of its own would be the only thing left staggering the opening.
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (heroFig && !still) setTimeout(clear, Math.max(0, SWEEP_WAIT + SWEEP_MS - BRAND_LEAD));
    else clear();
  }
  // The cloud is gone. The only thing hung off this is the wordmark.
  function clear() {
    if (cleared) return;
    cleared = true;
    document.documentElement.classList.add('swept');
    arrive();                        // the corner window is on screen now
  }

  // The corner window's one arrival. `arrived` sits out here rather than being
  // worked out from the state of anything, so it survives every later call and
  // the animation can only ever play on the load that first puts the window on
  // screen - not again when the guide is scrolled, resized, or opened.
  //
  // Taken off again at 750ms, a quarter-second past the end of it. An animation
  // left on the element keeps its own transform, and would win against every
  // transition the window has for as long as it stayed.
  var arrived = false;
  function arrive() {
    if (arrived || !navHit || !phone.matches) return;
    arrived = true;
    navHit.classList.add('is-arriving');
    setTimeout(function () { navHit.classList.remove('is-arriving'); }, 750);
  }
  setTimeout(enter, 2500);

  var heroFig = document.querySelector('.hero--reveal');
  if (heroFig) heroReveal(heroFig);
  else openOnHero();

  // No cloud to wait on, so the one picture there is decides it.
  function openOnHero() {
    var img = document.querySelector('.hero img');
    if (!img) return enter();
    if (img.decode) return void img.decode().then(enter, enter);
    if (img.complete) return enter();
    img.addEventListener('load', enter);
    img.addEventListener('error', enter);
  }

  // A hero picture is a <picture> once there is a ladder of formats to pick
  // from, and a bare <img> when there is not. Either way what the canvas needs
  // is the photograph inside it.
  function photoIn(fig, cls) {
    var el = fig.querySelector('.' + cls);
    return !el ? null : el.tagName === 'IMG' ? el : el.querySelector('img');
  }

  function heroReveal(fig) {
    var full = photoIn(fig, 'hero-full');
    var empty = photoIn(fig, 'hero-empty');
    var canvas = fig.querySelector('.hero-canvas');
    if (!full || !empty || !canvas) return;
    var ctx = canvas.getContext('2d');

    // The dials. Grid first, then the cloud.
    //
    // There is no gap between the cells. The sketch this came from is a texture
    // over a background, so its pixels could sit apart and let the page through;
    // this is a mask over a photograph, and anything it does not cover is the
    // furnished room showing early. A reveal has to be able to reach opaque, so
    // the cells are contiguous and the only thing between them is their own
    // alpha.
    var CELL = 6;                    // the block, in CSS pixels
    var NOISE = 0.019;               // cloud size, per screen pixel - lower is bigger
    var SOFT = 0.30;                 // how gradual the cloud's own edge is
    var GRAIN = 0.28;                // per-cell noise, which frays every edge
    var BLUR = 3;                    // how far the mask's edge is smeared, in CSS px
    var DRIFT = 0.55;                // how fast the cloud boils while it travels
    var FRONT = 2.4;                 // how hard the sweep's edge is

    // ---- the same value noise, domain warped so the cloud billows ----
    function hash(x, y) {
      var n = (x * 374761393 + y * 668265263) | 0;
      n = (n ^ (n >> 13)) * 1274126177 | 0;
      return ((n ^ (n >> 16)) >>> 0) / 4294967295;
    }
    function fade(t) { return t * t * (3 - 2 * t); }
    function noise2(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y);
      var xf = x - xi, yf = y - yi;
      var u = fade(xf), v = fade(yf);
      var a = hash(xi, yi), b = hash(xi + 1, yi);
      var c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
      var top = a + (b - a) * u, bot = c + (d - c) * u;
      return top + (bot - top) * v;
    }
    function fbm(x, y, t) {
      var val = 0, amp = 0.5, fx = x, fy = y;
      fx += Math.sin(y * 0.4 + t) * 0.6;
      fy += Math.cos(x * 0.4 - t) * 0.6;
      for (var o = 0; o < 4; o++) {
        val += noise2(fx, fy) * amp;
        fx = fx * 2.02 + t * 0.1;
        fy = fy * 2.0 - t * 0.08;
        amp *= 0.5;
      }
      return val;
    }
    function smoothstep(e0, e1, x) {
      var t = (x - e0) / (e1 - e0);
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      return t * t * (3 - 2 * t);
    }

    // ---- the box, and the grid it is drawn through ----
    // The cloud is painted one canvas pixel per cell, on a canvas the size of
    // the grid, and then blown up to the picture with smoothing off. So a
    // 6px block costs one pixel to write rather than a rectangle to fill, and
    // the whole cloud is one putImageData and one drawImage however fine the
    // grid gets. Filling 20,000 contiguous rectangles a frame was the other way
    // to close the gap, and it is the reason the gap was there to begin with.
    var w = 0, h = 0, dpr = 1, cols = 0, rows = 0;
    var grid = document.createElement('canvas');
    var gctx = grid.getContext('2d');
    var cells = null;
    function size() {
      var r = full.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.height = h + 'px';
      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL);
      grid.width = cols; grid.height = rows;
      cells = gctx.createImageData(cols, rows);
      return true;
    }

    // ---- the loop ----
    // It runs while the sweep is still crossing. Otherwise it stops - a canvas
    // repainting eleven thousand cells behind a page nobody is looking at is a
    // battery bill for nothing.
    var started = 0, t = 0, last = 0, running = false, seen = true;
    // `cells` is the guard as well as the buffer: the observer below fires the
    // moment it starts watching, which is before the pictures have decoded and
    // so before size() has ever run. Waking on that drew a frame with no grid
    // to draw into.
    function wake() {
      if (running || !seen || !cells) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }

    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      t += dt * DRIFT * 1.3;

      // Where the sweep has got to. It starts left of the picture and ends
      // right of it, so the cloud clears the last cell before it stops.
      var age = now - started - SWEEP_WAIT;
      var p = age <= 0 ? -0.35
            : age >= SWEEP_MS ? 1.35
            : -0.35 + 1.7 * smoothstep(0, 1, age / SWEEP_MS);
      var sweeping = age < SWEEP_MS;

      var e0 = 0.5 - SOFT, e1 = 0.5 + SOFT;
      var data = cells.data;

      for (var j = 0; j < rows; j++) {
        var py = j * CELL;
        var ny = py * NOISE + t * 0.12;
        for (var i = 0; i < cols; i++) {
          var px = i * CELL;
          var n = fbm(px * NOISE + t * 0.5, ny, t * 0.4);
          n = (n - 0.06) * 2.94;                       // stretch to about 0..1

          // The sweep: as the front passes a column, its cells fall away.
          var v = n - (p - px / w) * FRONT;

          v += (hash(i + 1234, j + 5678) - 0.5) * GRAIN;   // fray every edge alike
          var a = smoothstep(e0, e1, v);
          if (a <= 0.012) a = 0;                             // let the clear parts go fully clear
          data[(j * cols + i) * 4 + 3] = (a * 255) | 0;      // alpha only; the rest is black
        }
      }

      // One cell to one pixel, then blown up with smoothing on, and blurred
      // about half a cell on the way so the ramps between cell centres stop
      // reading as facets. This is the whole cloud in two calls.
      //
      // It is drawn a little larger than the box on every side. A blur reaches
      // past its own edge for what is there, finds nothing, and fades the
      // outermost pixels of the mask - which on a mask means the furnished room
      // showing early down the borders. Overscanning puts that fade outside the
      // picture, at the cost of a fraction of a per cent of scale.
      gctx.putImageData(cells, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      var m = Math.ceil(BLUR * dpr * 2);
      ctx.filter = 'blur(' + (BLUR * dpr) + 'px)';
      ctx.drawImage(grid, 0, 0, cols, rows, -m, -m, canvas.width + 2 * m, canvas.height + 2 * m);
      ctx.filter = 'none';

      // Keep the empty room only where the cloud is.
      ctx.globalCompositeOperation = 'source-in';
      ctx.drawImage(empty, 0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

      if (sweeping) requestAnimationFrame(frame);
      else { running = false; ctx.clearRect(0, 0, w, h); }
    }

    // ---- start once both files are actually in ----
    // Reveal a picture that has not arrived and the cloud washes over nothing.
    // The timeout is the promise it runs anyway: a decode that never settles
    // must not leave the room empty for good.
    var armed = false;
    function begin() {
      if (armed) return;
      armed = true;
      // Both files are in, so the page can open - before the canvas is sized,
      // which can fail on a picture with no box yet and would otherwise take
      // the opening down with it.
      enter();
      if (!size()) return;
      started = performance.now();
      wake();
    }
    var ready = [full, empty].map(function (img) {
      if (img.decode) return img.decode().catch(function () {});
      if (img.complete) return Promise.resolve();
      return new Promise(function (done) {
        img.addEventListener('load', done);
        img.addEventListener('error', done);
      });
    });
    Promise.all(ready).then(begin);
    setTimeout(begin, 6000);

    window.addEventListener('resize', function () { if (armed && size()) wake(); });

    // Nothing to draw while it is off the screen.
    if (window.IntersectionObserver) {
      new IntersectionObserver(function (es) {
        seen = es[0].isIntersecting;
        if (seen) wake();
      }).observe(fig);
    }
  }

  // ---------- scroll tracking ----------
  // Offsets are measured once (and on resize) so scrolling is pure arithmetic
  // and never forces a layout.
  var headTops = [], dockTop = 0;
  var railRow = 8, railPad = 0, railView = 0, railOver = 0, docEnd = 0;
  function measure() {
    headTops = headings.map(function (el) { return el ? el.offsetTop : Infinity; });
    // The first chapter is the page itself now - the wordmark, the line beside
    // it and the picture under them - so it is current from the very top rather
    // than from its own heading, which is a screen or two down.
    if (headTops.length) headTops[0] = 0;
    // Where the rail sits in the document before it pins itself. Asking the
    // dock is no good: once it is pinned, its own offsetTop reports where it
    // has been moved to, so a re-measure taken halfway down the guide came back
    // 25,000px out. The header starts on the dock's line - the dock is above it
    // and of no height, so its margin sets them both - and never moves.
    dockTop = head.offsetTop;
    // The wordmark's second half paints its own gradient - see the stylesheet -
    // so it has to be told the box that gradient belongs to: the whole
    // wordmark, and how far down it this half has landed. Both change when the
    // title turns onto two lines, which is why they are taken here with
    // everything else that a new width invalidates.
    // Off the boxes as they sit, not off offsetTop: the two answer to whatever
    // is positioned above them, and asked early enough - before the display
    // face has swapped in and the line has settled - they answered to different
    // things and the drop came back a whole header out. The difference between
    // two rects cannot be wrong that way, and the transform the wordmark rides
    // in on moves both of them equally, so it cancels.
    if (brand) {
      var sheet = brand.getBoundingClientRect().top;
      brand.style.setProperty('--brand-sheet', brand.offsetHeight + 'px');
      for (var bi = 0; bi < brand.children.length; bi++) {
        brand.children[bi].style.setProperty('--brand-drop', Math.round(
          brand.children[bi].getBoundingClientRect().top - sheet) + 'px');
      }
    }
    // The furthest the working line can travel: at the end of the scroll it is
    // still only halfway down the window, so this is where reading finishes.
    // Not the document's own height, which is half a screen further on and can
    // never be reached - the last section measured against that came out longer
    // than it is, and its tick crawled where every other one moved.
    docEnd = scroller.scrollHeight - scroller.clientHeight / 2;
    // The window in the corner is scrolled on every frame of a scroll, so the
    // numbers that takes are read here instead - once, and never while the page
    // is moving. Every row is the same height, so where a tick sits in the list
    // is the row's height times its place in it, plus whatever padding holds
    // the first one off the top.
    //
    // Only while the corner is what the rail actually is, though. Wide, the
    // rail is a full-height column, and a measurement taken there says the list
    // is shorter than its own window - which reads as nothing to scroll, and
    // would leave the window dead when the phone layout came back. Crossing the
    // breakpoint fires a relayout of its own, so skipping it here costs
    // nothing.
    if (!ticks.length) return;
    railRow = ticks[0].parentNode.offsetHeight;
    railPad = ticks[0].parentNode.offsetTop - rail.offsetTop;
    // The run the hairlines actually occupy - every row, at the height they all
    // share. The rail's own box is the height of the window and mostly empty
    // under the last tick, so it is no use to the wide layout's panel, which
    // grows out of the marks themselves. It depends on how many there are, so
    // it cannot be a number the stylesheet knows.
    reader.style.setProperty('--rail-ink', (ticks.length * railRow) + 'px');
    if (!phone.matches) return;
    railView = rail.clientHeight;
    // Worked out rather than read off scrollHeight, which leaves the bottom
    // padding out of its answer - and that padding is the whole of what lets
    // the last few ticks reach the middle instead of stopping short of it.
    railOver = Math.max(0, railPad * 2 + ticks.length * railRow - railView);
  }

  function lastAbove(tops, line) {
    var found = -1;
    for (var i = 0; i < tops.length; i++) {
      if (tops[i] <= line) found = i; else break;
    }
    return found;
  }

  var activeIndex = -1;
  var isOpen = false;      // the one source of truth for the nav's state
  // An entry the reader picked, held until they scroll for themselves. The
  // working line sits halfway down the window and a heading you jump to lands
  // near the top, so the line reads whatever comes after it - pick a chapter
  // and the mark would go to its first section, which is not what was asked
  // for. Holding it is what makes the two agree; it lasts exactly as long as
  // the reader is not the one moving the page.
  var pinned = -1;
  // On a phone the rail is a window in the corner, and what shows through it is
  // where you have got to. It moves with the reading rather than with the
  // sections: a section is a screen or two of words, and a list that only
  // stepped when one ended would sit still for most of the time you spent
  // looking at it. So it is scrolled to wherever you are between one heading
  // and the next - a tick's own height, spread over a section's length - which
  // makes it travel at the speed the page does. Arithmetic on numbers measured
  // earlier, so a scroll never asks the browser for a layout.
  function trackRail(i, line) {
    if (railOver <= 0) { rail.scrollTop = 0; return; }
    var from = headTops[i];
    var to = i + 1 < headTops.length ? headTops[i + 1] : docEnd;
    var into = Math.min(1, Math.max(0, (line - from) / Math.max(1, to - from)));
    var mid = railPad + (i + into + 0.5) * railRow;
    rail.scrollTop = Math.max(0, Math.min(mid - railView / 2, railOver));
  }

  function update() {
    // The working line is the middle of the window: whichever section is filling
    // the top half of the screen is the one you are reading, and the moment a
    // new one has climbed far enough to hold that half, it takes the mark. So
    // the last heading to have passed the halfway line is the one marked.
    var line = scroller.scrollTop + scroller.clientHeight / 2;

    // At the foot of the guide the last section is the one you are in, whether
    // or not its heading ever made it up to the working line. A closing section
    // shorter than the window cannot get there - there is no scroll left to
    // carry it - and the mark stopped one entry short whenever that happened.
    // Reaching the end of the document is the answer in itself.
    var h = pinned >= 0 ? pinned
      : scroller.scrollTop >= scroller.scrollHeight - scroller.clientHeight - 1
        ? headTops.length - 1
        : Math.max(0, lastAbove(headTops, line));

    if (phone.matches) {
      // The same entry the mark is going to, so the hairline in the corner and
      // the name in the list can never be describing different sections.
      trackRail(h, line);
    } else {
      // For the first screenful the rail is still travelling up to its pinned
      // line, and it should stay with the prose while it does. The contents are
      // not prose though - they are a page of their own, and a page starts at
      // the top - so the list takes this back off the front and opens up there.
      // Arithmetic, not a measurement, so scrolling never forces a layout.
      var drop = Math.max(0, dockTop - scroller.scrollTop - TOP);
      dock.style.setProperty('--drop', drop + 'px');
    }

    if (h === activeIndex) return;
    if (navLinks[activeIndex]) navLinks[activeIndex].classList.remove('is-active');
    if (ticks[activeIndex]) ticks[activeIndex].classList.remove('is-active');
    navLinks[h].classList.add('is-active');
    if (ticks[h]) ticks[h].classList.add('is-active');
    activeIndex = h;
    markAddress(h);
    // The window in the corner is already where it should be - it was moved on
    // the way here, not on arrival.
    if (!phone.matches) centreRail();
  }

  // Both lanes are taller than the window on a long guide, so each scrolls.
  // Bring where you are into view rather than snapping to the top.
  //
  // Measured off the two boxes as they actually sit, not off offsetTop: the
  // entries answer to the nav's own positioned wrapper rather than to the list
  // they scroll inside, and the list carries a top padding besides. Both would
  // have to be subtracted back out by hand. This runs when the section changes
  // or when the nav opens, never on a scroll, so the read costs nothing.
  function centre(box, el) {
    if (!el) return;
    var over = box.scrollHeight - box.clientHeight;
    if (over <= 0) { box.scrollTop = 0; return; }
    var into = el.getBoundingClientRect().top - box.getBoundingClientRect().top;
    var want = box.scrollTop + into - box.clientHeight / 2;
    box.scrollTop = Math.max(0, Math.min(want, over));
  }

  // The rail is on screen the whole time and is a position indicator, so it
  // follows the current section whenever that changes. It only actually
  // scrolls on windows too short to hold all 59 ticks.
  function centreRail() {
    centre(rail, ticks[activeIndex] && ticks[activeIndex].parentNode);
  }

  // The contents list is different: it is scrolled BY the reader. There is
  // exactly one moment it may be moved for them - the instant it opens, while
  // it is still at zero opacity. Every other trigger tried here (on close, on
  // active change, after a glide) eventually fired while it was visible and
  // yanked it out from under the pointer.
  function centreList() {
    centre(navList, navLinks[activeIndex]);
  }

  // The one line the page starts on, and the one the rail pins itself to.
  var TOP = parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue('--top')) || 48;

  // The heading the address asked for when the page was opened, if it asked for
  // one this guide has. The opening at the foot of this file lands on it, and
  // every re-measure puts it back on it while the page is still settling.
  var landing = fromAddress();
  function fromAddress() {
    var id = '';
    try { id = decodeURIComponent((location.hash || '').slice(1)); }
    catch (err) { return ''; }                  // a hash that is not an escape
    return indexOf(id) >= 0 ? id : '';
  }
  function reland() { if (landing) goTo(landing, false); }

  scroller.addEventListener('scroll', update, { passive: true });
  // Crossing a breakpoint changes what place() should be doing at all, and a
  // resize event alone does not say which side of one we have landed on.
  // centreRail at the end because update() leaves the rail alone on a wide
  // screen - it is moved when the section changes, and coming back from the
  // phone layout is not a section changing.
  var relayout = function () {
    measure(); place(); update(); reland();
    if (!phone.matches) centreRail();
  };
  window.addEventListener('resize', relayout);
  [stacked, phone].forEach(function (mq) {
    if (mq.addEventListener) mq.addEventListener('change', relayout);
    else if (mq.addListener) mq.addListener(relayout);
  });

  // Offsets are cached, so anything that reflows the prose has to invalidate
  // them. fonts.ready alone was not enough - it can resolve before the text has
  // been laid out again, leaving every offset short and the current section
  // reading one heading behind. An observer catches the reflow whenever it
  // actually happens.
  if (window.ResizeObserver) {
    var watch = new ResizeObserver(function () { measure(); place(); update(); reland(); });
    watch.observe(prose);
    // The first picture too. What the header's second column is lined up with
    // is that picture's left edge, and its width answers to the window's height
    // as much as its width - so watching the box itself is surer than waiting
    // for a resize event and trusting that the layout has caught up by then.
    if (shots[0]) watch.observe(shots[0]);
    // And the wordmark. Its own box is what the second half's gradient is cut
    // to, and that box changes twice over a load that nothing else notices:
    // when the display face swaps in, and when the title turns onto two lines.
    if (brand) watch.observe(brand);
  } else if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { measure(); place(); update(); reland(); });
  }

  // ---------- nav ----------
  function setOpen(open) {
    if (open === isOpen) return;     // ignore repeats, the state only ever flips
    isOpen = open;
    // The sheet is as wide as its longest entry wants to be, and the box has to
    // be handed that as a length before it can be asked to grow into it - a
    // transition needs two of them, and max-content is not one.
    //
    // Read here rather than kept with the other measurements, and read before
    // the class goes on so the target is right from the first frame. The panel
    // is laid out at its own width the whole time it is closed, whatever the
    // box around it is doing, so the answer is always there for the asking -
    // and one that was cached went stale on the turn of a phone.
    // Measured off the list rather than the panel that holds it. The panel is
    // the thing being widened, so on a wide screen its own width is 19px at the
    // moment the question is asked; the entries inside it are laid out at the
    // width they want either way, and that is the width to open to.
    if (open && navList) {
      reader.style.setProperty('--sheet-w', navList.offsetWidth + 'px');
    }
    reader.classList.toggle('nav-open', open);
    // The labels only fade in at 130ms, so the list is invisible right now.
    // Nothing repositions it on close - there is no need, and every attempt
    // to do so has ended up moving it while someone was looking at it.
    if (open) centreList();
  }
  // A hover has to be one the reader made. Arriving on the page with the pointer
  // already parked in the rail's lane counted as one, because a browser hands
  // out mouseenter for whatever is under the cursor as soon as the page paints,
  // and again when you come back to the tab - so the nav was open before anyone
  // had touched anything. So: nothing opens on hover until the pointer has
  // actually moved, and coming back to the tab asks for that again.
  var moved = false;
  document.addEventListener('pointermove', function () {
    if (moved) return;
    moved = true;
    // It may have been a real hover all along - the reader could have moved
    // within the lane rather than into it, and the enter they get credit for
    // has already been and gone. Take the pointer's word for where it is.
    if (!byTap() && rail.matches(':hover')) setOpen(true);
  }, { passive: true });

  function forget() { moved = false; }
  window.addEventListener('blur', forget);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) forget();
  });

  // Hover is for pointers. A touch screen has none to open on, so it taps
  // instead - and a device that reports no hover must not also answer to the
  // mouseenter a tap synthesises, or the contents would open and shut in one go.
  var touch = window.matchMedia('(hover: none)');
  // The phone layout is opened by tapping whether or not the thing doing the
  // tapping is a finger. Hover would work there - the panel is a child of the
  // window in the DOM, so crossing the gap between them never counts as
  // leaving - but the window fades out as the panel arrives, and a control
  // that opens on hover and then vanishes from under the pointer leaves
  // nothing to hover. It is a button in the corner, so it behaves like one.
  function byTap() { return touch.matches || phone.matches; }

  navHit.addEventListener('mouseenter', function () {
    if (moved && !byTap()) setOpen(true);
  });
  navHit.addEventListener('mouseleave', function () {
    if (!byTap()) setOpen(false);
  });
  // The rail, or the window that stands in for it on a phone. Picking an entry
  // has its own handler and closes on its own, so it is left alone here.
  navHit.addEventListener('click', function (e) {
    if (!byTap()) return;
    if (e.target.closest('.nav-item')) return;
    setOpen(!isOpen);
  });
  // Nothing to leave, either, so a tap anywhere else closes it.
  document.addEventListener('click', function (e) {
    if (byTap() && isOpen && !navHit.contains(e.target)) setOpen(false);
  }, true);
  // Focus opens it too, but only the kind you get from a keyboard. The browser
  // hands focus back to whatever held it last when you return to the tab, and
  // that is not someone asking for the contents.
  navHit.addEventListener('focusin', function (e) {
    if (byKeyboard(e.target)) setOpen(true);
  });
  function byKeyboard(el) {
    try { return el.matches(':focus-visible'); } catch (err) { return true; }
  }
  // Focus moving from one entry to the next is still browsing, not leaving.
  // Without this, pressing on a second entry fires focusout then focusin, which
  // shuts and reopens the nav - and reopening recentres the list, so it slides
  // out from under the press and the mouseup lands somewhere else. No click
  // event on the link, no navigation.
  navHit.addEventListener('focusout', function (e) {
    if (e.relatedTarget && navHit.contains(e.relatedTarget)) return;
    setOpen(false);
  });

  // ---------- animated scrolling ----------
  // The native smooth scroll picks its own duration from the distance, so end
  // to end of a 30,000px guide crawled on for several seconds. This one caps
  // at 1.2s however far it travels, and eases in and out so the middle of the
  // journey is the fast part.
  var MAX_MS = 1200, BASE_MS = 260, PER_PX = 0.03;
  var gliding = false, raf = null;
  var slowMo = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function stopGlide() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    gliding = false;
  }

  function glideTo(top) {
    stopGlide();
    var from = scroller.scrollTop;
    var delta = top - from;
    if (!delta) return;
    if (slowMo && slowMo.matches) { scroller.scrollTop = top; update(); return; }

    var ms = Math.min(MAX_MS, BASE_MS + Math.abs(delta) * PER_PX);
    var t0 = null;
    gliding = true;

    raf = requestAnimationFrame(function step(now) {
      if (t0 === null) t0 = now;
      var t = Math.min(1, (now - t0) / ms);
      scroller.scrollTop = from + delta * easeInOutCubic(t);
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        stopGlide();
        update();              // mark the section we landed in
      }
    });
  }

  // Any real input wins over an animation in progress - and over a pick made
  // before it. The moment the reader is the one moving the page, where they are
  // is the only thing that says which section they are in.
  function takeOver() { stopGlide(); pinned = -1; landing = ''; }
  // pointerdown for the scrollbar, which is a way of moving the page that none
  // of the other three ever hear about.
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
    scroller.addEventListener(ev, takeOver, { passive: true });
  });

  // A heading lands where the page itself starts: the line the wordmark sits on
  // at the top of the document, which is the line the nav rail pins itself to.
  function goTo(id, smooth) {
    // Except the first chapter, which is the page itself. Its entry goes to the
    // very top, where the wordmark and the rail's own first tick are - and it
    // has no heading down in the prose to go to instead, so it is asked about
    // before anything is looked up.
    var first = navLinks[0] && navLinks[0].dataset.target === id;
    var target = document.getElementById(id);
    if (!first && !target) return;
    var top = first ? 0 : Math.max(0, target.offsetTop - TOP);
    if (smooth) glideTo(top);
    else { stopGlide(); scroller.scrollTop = top; }
  }

  navList.addEventListener('click', function (e) {
    var link = e.target.closest('.nav-item');
    if (!link) return;
    e.preventDefault();
    setOpen(false);            // picking something is the end of browsing
    pinned = navLinks.indexOf(link);
    landing = '';
    goTo(link.dataset.target, true);
    setHash(link.dataset.target);
  });

  // The wordmark used to be the way back to the top. It is at the top now, and
  // gone by the time you would want it, so there is nothing left for it to do.

  // ---------- the address ----------
  // Where you are is written into the address as you read it, so whatever is on
  // screen is always something you can send to somebody. replaceState, not a
  // jump: nothing moves for it, no history is made by it, and the back button
  // still leaves the guide the way it came in.
  //
  // It waits a moment first. update() runs on every scroll and a flick down the
  // page crosses a dozen sections on the way - a browser counts those against a
  // limit of its own and starts refusing them, and an address bar strobing
  // through the contents is not something anyone asked to watch. So it is
  // written once the reading has settled on one section.
  var addressTimer = null;
  function markAddress(i) {
    if (addressTimer) clearTimeout(addressTimer);
    addressTimer = setTimeout(function () {
      // The first chapter is the top of the page rather than a heading in it,
      // so it is the address the guide was opened on, with nothing on the end.
      setHash(i > 0 && navLinks[i] ? navLinks[i].dataset.target : '');
    }, 250);
  }

  // Opened as a plain file rather than served, rewriting the address is not
  // allowed at all, hence the guard.
  function setHash(id) {
    var url = location.href.split('#')[0] + (id ? '#' + id : '');
    if (url === location.href) return;
    try {
      history.replaceState(null, '', url);
    } catch (err) { /* file:// - leave the address as it is */ }
  }

  // ---------- copying a link ----------
  // Clicking a heading takes its link. The tooltip beside it is the only thing
  // ever drawn for this, and only while the pointer is on the heading, so the
  // guide reads as it always did until somebody goes looking.
  var COPY = 'Copy link', COPIED = 'Link copied';
  var held = null, heldTimer = null;      // the heading holding "Link copied"
  // The same news, for a reader who is being read to rather than shown.
  var say = document.createElement('p');
  say.className = 'sr-only';
  say.setAttribute('role', 'status');
  document.body.appendChild(say);

  prose.addEventListener('click', function (e) {
    var link = e.target.closest('.head-link');
    if (!link) return;
    // A modifier means the reader is asking the browser for something - a tab
    // of their own, a window - and the heading is a real link, so it is left to
    // do that. Everything else is the plain click, which copies rather than
    // goes anywhere.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
    e.preventDefault();
    // Whatever the address bar would read if you followed it: the page you are
    // on, the query it came with, and this heading on the end.
    toClipboard(link.href).then(function (ok) {
      if (ok) mark(link);
    });
  });

  function tipOf(link) { return link.querySelector('.tip'); }

  function mark(link) {
    if (held && held !== link) release(held);
    if (heldTimer) clearTimeout(heldTimer);
    held = link;
    link.classList.add('is-copied');
    tipOf(link).textContent = COPIED;
    say.textContent = COPIED;
    heldTimer = setTimeout(function () { release(link); }, 1600);
  }

  // Long enough to have been read, and then the heading is a heading again. The
  // tooltip goes on showing if the pointer is still there - it is back to
  // offering the link rather than reporting on one.
  function release(link) {
    link.classList.remove('is-copied');
    tipOf(link).textContent = COPY;
    if (held === link) { held = null; say.textContent = ''; }
  }

  // The clipboard proper where it is allowed, which is a served page in a
  // current browser. Off a file:// address, and anywhere the permission is
  // refused, the old way still works: put the text in a field nobody can see,
  // select it, and ask the document to copy the selection.
  function toClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
        .then(function () { return true; }, function () { return byField(text); });
    }
    return Promise.resolve(byField(text));
  }

  function byField(text) {
    var field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(field);
    var ok = false;
    try {
      field.select();
      ok = document.execCommand('copy');
    } catch (err) { ok = false; }
    document.body.removeChild(field);
    return ok;
  }

  // ---------- opening ----------
  // A link into the middle of the guide opens there. It is the one thing that
  // may set where the page starts, so it is read before anything else moves it,
  // and a name the guide does not have is no answer at all: the guide opens
  // where it always did, at the top, with the address tidied up behind it. The
  // browser's own memory of where you were is turned off either way - a refresh
  // is the guide from the top or the link you refreshed on, never a third place
  // nobody asked for.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  measure();
  place();

  if (landing) {
    // Held, and the mark held with it: the working line sits halfway down the
    // window and a heading landed on sits near the top, so the line would read
    // the section after the one that was asked for.
    pinned = indexOf(landing);
    goTo(landing, false);
    // Landing is one thing the page cannot do once and be done with. The
    // offsets it lands on are taken before the display face has swapped in and
    // before a single picture has decoded, and both move every heading below
    // them - by a screen on a fast connection and by a dozen on a slow one. So
    // the landing is held: every time the guide is measured again it is put
    // back on the heading it was sent to, and what ends that is the reader
    // moving the page for themselves. Which is the same rule the mark in the
    // rail keeps, and for the same reason.
  } else {
    setHash('');
    scroller.scrollTop = 0;
  }

  update();

  function indexOf(id) {
    for (var i = 0; i < navLinks.length; i++) {
      if (navLinks[i].dataset.target === id) return i;
    }
    return -1;
  }
})();
