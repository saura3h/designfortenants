# sitev4

sitev3 built from `../draftv4.md`. The layout, the nav and the picture placement
are sitev3's, unchanged. What is new is the draft: sections renamed, one section
struck through, and the chapter that was "Room by room" now reading "Spaces".

Nine chapters, forty-eight sections.

## Running it

Open `index.html` directly. No server, no dependencies.

After editing `../draftv4.md`:

```
node build.js
```

Nothing in `index.html` is hand-edited - it is generated every time.

## How the page is put together

One scrolling document, the width of the window, cut into three lanes that
everything on the page is measured against. `--lanes` in the stylesheet is the
one definition of them, and the rows and the nav both use it, so nothing works
its position out twice:

1. the reading column's left margin: 48px flat up to a 1500px window
   (`--col-pad` and `--flat-to`), and a quarter of every pixel past that. It
   used to be worked out by centring a 554px column in the left half of the
   window, which put the crossover at 1300px as a side effect of a width
   nothing on the page was actually that wide. Same line and same slope,
   anchored on the number being chosen rather than one that implied it. The
   fluid half never fires today - see `--page` below - but it is left in.
2. the rail, the 48px after it, and the 455px measure - the lane ends on the
   last character of the text
3. everything to the right of the text, which is where a picture goes

**The guide is 1500px wide at most** (`--page`), and centres once the window is
wider. Everything cut to the lanes is cut to that same box, the hero with them,
by one rule - so the header, the nav and every row cannot come apart from each
other at any width.

It has to stop somewhere. The text lane is a fixed 522px and a picture is capped
at 620px, so every pixel a wider window gave went to the air between them: 159px
of gap on a laptop, 553px at 2560, 883px at 3440. The words and the picture they
belong to had drifted into two columns with a field in between. Capped, the gap
is 155px at any size, which is the laptop's own, and a big monitor's extra width
becomes margin on both sides instead.

1500 is also `--flat-to`, so lane 1 never reaches its fluid branch any more: the
grid it measures is never wider than the breakpoint, so it always resolves to its
48px floor. That branch is left in rather than folded away - raise `--page` and
it comes back, and the gap starts widening again at a quarter the rate.

The page is then a stack of rows. A row is a run of prose in lane 2 and, where
there is one, its picture in lane 3. Both are tracks of the same grid row, so
the row is as tall as whichever of the two is longer. Everything else follows
from that:

- The picture arrives with the words. It starts on the section's first line of
  text, not on its heading - a heading is a label on the section rather than the
  first thing in it, and a picture levelled with it sat high of everything it
  was next to. It rises up from the bottom of the window with the text rather
  than fading in somewhere off to the side. The drop is measured off the words
  rather than worked out from the type, so a heading that wraps to two lines, or
  one whose size changes, still lands it right.
- **More words than picture:** the picture is `position: sticky`, so once it
  reaches the middle of the window it parks there and you read on past it. The
  script sets its `top` to whatever leaves equal room above and below, and
  resets that on resize.
- **More picture than words:** the row keeps its height, so the next section
  waits until the picture is finished. That is where the blank left column in a
  short section comes from, and it is deliberate.
- A section with more than one picture splits into a second row at the second
  one, and carries on beneath it.

The header holds the wordmark and nothing else. It runs on one line, across
both lanes, because one lane cannot hold it: the measure is 455px and the
wordmark is half as wide again. The thesis line that used to sit beside it in
the picture lane is off the page - it is still the draft's first paragraph and
still the document's `description`, just not set here - and the rule that lined
it up with the first picture went with it.

The wordmark takes the rail's share off its front, exactly as `.copy` does, so
it begins where every line of the guide begins. It used to sit on the page's own
left edge instead, in the lane the rail only took over further down - which it
could, because the rail did not start until the header had gone. The rail starts
level with it now, so that lane is no longer free.

48px of sky sits over the wordmark (`--head-air`), and it is the nav dock that
holds it: the dock is above the header in the document and has no height, so its
top margin is what puts the two on the same line. Taking that space on the
header as well would set the wordmark 96px down.

Under the wordmark, the hero picture, on the wordmark's own left
edge - `--lane1` plus the rail's share, the front every line of the guide takes.
Anything further left runs under the rail, which is pinned over that lane for
the whole height of the page and draws on top of it. The right margin is that
same measurement rather than the page's, so the two sides match and the picture
reads as centred; it is not centred in the window, the left edge is answering to
the wordmark and the right is only agreeing with it. 32px of air above it, 48px
below.

The first chapter has no heading in the prose. The wordmark and the picture
under it say what it is, and a second announcement under the
picture only repeated them - so its words start 48px after the picture instead.
It keeps its entry in the contents, and that entry goes to the very top rather
than to a heading that is not there: `goTo` asks whether it is the first chapter
before it looks anything up.

Everything scrolls away as before. The wordmark is not pinned and is not a link:
it used to be the way back to the top, and it is the top now. At the other end,
`--tail` gives the last line 96px under it and nothing more.

The nav rail starts at the top of the page, level with the wordmark, and pins
itself 48px from the top from then on. The dock it hangs off is a sticky box of
no height at all, so it holds nothing open in the flow and everything beside it
is laid out as though it were not there.

Nothing dissolves at the top: with nothing overhead for the text to pass
beneath, the white fade had nothing left to hide, so the page runs top to bottom
clean. `--top` is the working line, 48px down: the rail once it pins, any
heading you jump to, and the contents when they open all sit on it.

There is one display style and two things wear it: the wordmark that opens the
guide, and the heading that opens a chapter. Haskoy, 600, the brand gradient.
The size is what tells them apart, and the size is all that does - 48px at
-1.5px for the wordmark, 28px at -0.6px for a chapter. Both get 32px of air
under them before the words start.

A section heading is the body's own 15px, just greyer, and it carries only its
own name. It used to read `Constraints / Power supply`; the chapter is already
the last big thing you passed, and the rail is holding your place besides.

The space above a heading belongs to the row rather than to the heading inside
it, so the picture starts level with its own title instead of below it: 128px
above either kind.

The tinted right half is gone. With the pictures moving through the page there
was nothing left for a second surface to be.

## The nav

It starts at the top of the page, level with the wordmark, so the guide opens
with its first tick already beside its own title - and that first tick is the
Introduction, which is now the page itself: the wordmark and the picture under
it. Its entry goes to the very top rather than to its heading
further down, and it is the current one from scroll zero.

Collapsed, it is a column of hairlines: long ones for chapters, short ones for
sections, with the current one marked in the accent colour. Its hover target
reaches 12px past the rail on every side, via a wrapper whose negative margin
cancels its padding, so the hairlines themselves never move.

The hover has to be one the reader made. A browser hands out a mouseenter for
whatever is under the cursor as soon as the page paints, and again when you come
back to the tab, so arriving on the guide with the pointer parked in the rail's
lane opened the contents before anyone had touched anything. Nothing opens on
hover now until the pointer has moved, and leaving the tab asks for that again.
Focus opens it too, but only `:focus-visible`, the kind you get from a keyboard:
the browser hands focus back to whatever held it last when you return to a tab,
and that is not someone asking for the contents.

On hover the hairlines fade out (75ms), the rows snap to their open height, and
the contents list fades up (150ms). Only opacity moves - nothing travels, and
nothing animates its width or height, so no weight shifts.

**The contents arrive in a container of their own**, floating over the guide -
opaque, so there is nothing to hide and no fade to hide it with. The page simply
carries on underneath and is covered where the container covers it. The whole
scrolling half used to clear out instead, so opening the contents cost you the
page you were reading and the pictures with it, and the pictures were never in
the way of anything.

It is held off the window's edges top and bottom by the working line, so it
reads as a panel laid on the page rather than a column cut out of it. Its top is
the one number it has to work for: the hit box it sits in starts `--top` plus
`--drop` down the window and the panel wants to start at `--top`, so what is
left to take off is `--drop` - which is only ever anything over the first
screenful, while the rail is still travelling up to its line.

The list scrolls inside it, and the padding is on the list rather than the panel
so the entries run the panel's whole height and are cut by its own rounded edge
instead of stopping short at an inner margin. The full list is about 2,240px
against a panel of 800, so it always scrolls; opening it brings the current
entry to the middle, and that is the one moment it may be moved for you.

A chapter's entry is set the way that chapter's heading is set: Haskoy 600 at
28px, the brand gradient, the same three declarations the wordmark wears. Its
letters are the gradient showing through a transparent colour, so there is
nothing for an underline to be drawn in - the active and hover states name
`text-decoration-color` for it instead and leave the letters alone.

The full list is 57 items, taller than the viewport once it opens, so the nav
scrolls and keeps the current position near the middle - but only while it is
closed, so it never scrolls out from under a pointer that is reading it. It
catches up once it has shut. Clicking an entry lands that heading on the line the
page starts on, level with the rail's first tick.

The contents read as a page of their own, and a page starts at the top, so the
list opens on the working line however far down you are and wherever the rail
has got to. Its box runs the whole height of the window and carries the 48px as
padding instead of starting there, so a scrolled list
runs off the top edge of the screen the way anything else does. An edge partway
down the window would slice an entry in half, which is what the soft dissolve
was there to cover up. There is no dissolve on either lane now.

Two numbers move the box, and both come off the front and go on to the height so
it always lands on the window's own edges: the 48px, always, and `--drop`, how
far below its pinned line the rail currently sits. Over the first screenful the
rail has not got there yet and stays with the prose while it travels. `--drop`
is worked out from the scroll position rather than measured, so scrolling still
never forces a layout - and it comes off the prose's offset, not the rail's,
because a pinned sticky element reports the position it has been moved to.

Picking an entry writes `#that-section` into the address bar, but only as a
marker of where you are. Loading the page is always loading the guide from the
top: the anchor is dropped, the browser's scroll memory is turned off, and every
refresh is a hard one. So the address bar is not a link back into the middle of
the guide - if it should be, that is the one line to change.

## Cuts

Text struck through in the draft never reaches the page. Striking a section's
heading takes the whole section with it - the prose, the lists and the image
slots underneath - because striking the title is how the draft says a section
is gone, and nobody wants to strike a section a line at a time. A struck line
on its own, under a heading that survived, drops by itself.

`Non-movable stuff` is the one cut so far, so Constraints ends on Power supply
and runs straight into Functionality. The build prints what it dropped, so a
section does not leave the guide quietly.

## Images

**The folder decides. The draft only suggests.** What the guide shows is
whatever is in `images/`; the `<aside>🖼️</aside>` markers in `draftv4.md` say
where the draft wanted a picture and what of, and nothing more. So a file with
no marker still gets a place, and a marker with no file renders nothing at all -
no row split, no empty box, no placeholder.

Take a file out of `images/` and it leaves the page and `images.json` on the
next build. There is nowhere a stale mapping can survive, because placement is
read off the folder every time rather than remembered.

`hero-<photographer>.jpg` is the picture under the wordmark. It names a place in
the page the way every other file names a section, and it is taken out of the
running before the sections are matched, so nothing else can claim it and it
claims nothing else. It renders in the header rather than through the usual
path: it belongs to no section, sits in no lane, and is measured off the page's
own margins.

**The filename says which section a picture belongs to.** Drop the file in
`images/` named after that section, lowercased and hyphenated, exactly as the
heading reads:

```
Sunlight               ->  sunlight.jpg
Walk your walkways     ->  walk-your-walkways.jpg
Groups and anchors     ->  groups-and-anchors-shin-li-bdFdbOae2b0-unsplash.jpg
```

The first picture in a section rides up to the top of that section's row, so it
starts where the heading starts, wherever the marker was actually written. Give
a section several files and they fill its markers in filename order, then take
places of their own at the end of the section once the markers run out.

Rename a section in the draft and its picture stops matching, because the match
is on the name. `natural-light.jpg` was renamed to `sunlight.jpg` by hand when
the section was, and `room-within-rooms-...` to `rooms-within-rooms-...`. The
build reports anything left over as unused, which is how you find them.

### A picture for one line

A picture can belong to a single line of a section - one bullet, or one
paragraph - rather than to the section as a whole. It says so the same way it
says which section it is in, by naming that line.

A bullet announces its subject in its first words, so the filename and the
bullet simply agree from the front:

```
## Three kinds of light
- Ambient light is the general fill...   <-  three-kinds-of-light-ambient-light-<photographer>.jpg
- Task light is for doing...             <-  three-kinds-of-light-task-light-<photographer>.jpg
- Accent light points at a thing...      <-  three-kinds-of-light-accent-light-<photographer>.jpg
```

Two words have to agree for that, so a bullet starting "The" cannot swallow a
photographer's name, and the longest agreement wins if several lines could
answer to the same file. The order is the draft's, not the folder's - `accent`
sorts first as a filename and still lands third, where its bullet is.

A paragraph usually buries its subject, so one distinctive word is enough there:

```
## Make it feel bigger
Keep the floors visible...          <-  make-it-feel-bigger-floors-<photographer>.jpg
Mirrors extend the visible space... <-  make-it-feel-bigger-mirrors-<photographer>.jpg
```

The word has to be four letters or more and sit within the first four words of
exactly one line in the section. Four letters is the shortest that can be
distinctive - below it you are matching "the" and "for" and a photographer
called Yan, and the first word of a filename's tail is usually a first name.
Ambiguous is no answer: if two lines could claim the word, neither gets it and
the file falls back to filling a marker.

Sometimes the subject is buried deeper still. The bullet on overhead lights only
reaches pendants fifty words in, so `which-lamps-to-get-pendant-...` finds
nothing near any front. There the whole of each line is read instead - but only
in a section that has already answered to a match from the front. Three of the
four lamp pictures name their bullet the strict way, and that is the section
saying it is being addressed line by line; the fourth is then read in that
light. Everywhere else the loose reading never runs, because a photographer
called Mirror would otherwise land in the wrong paragraph.

Either way the section is then cut into a row per picture, and each picture is
levelled with the line that named it. It has to be cut: a photo is several times
the height of one line, and three of them will not hang off three lines. The row
growing to its picture's height is exactly what pushes the lines apart far enough
to make room. The line carries `data-anchor` so the script levels the picture
with it rather than with the first line of the row, which for the first of three
bullets is the section's opening sentence.

Every one of these rows takes the air a section takes, `--gap-section` via
`.row--item`, bullets and paragraphs alike. Whatever the prose is doing, what
the eye sees down the right hand side is a run of pictures, and the guide
already has a measure for how far apart things that size should sit. Prose after
an anchored paragraph carries on in the same row, beside its picture.

Anchored bullets lose their markers as well. Once they are a picture's height
apart they have stopped being a list to look at, so the marker goes and the
items sit on the text's own left edge - a bullet that far from its neighbours is
just a stray dot. What holds them together now is that they are plainly
parallel, not that they are marked.

An Unsplash name after the prefix (`...-<11 char id>-unsplash.jpg`) still gives
the photographer and the photo URL for the credit, which sits under the picture,
on its right edge. Photos of your own carry no name, so no credit line shows.

`build.js` writes all of this into `images.json` and reports what it placed and
what went unused. The file is generated - the one field you edit by hand is
`alt`, which survives a rebuild. `width` and `height` are read from the JPEG/PNG
header; `note` is the draft's own description of the slot, refreshed on every
build.

Entries are named after their section (`three-kinds-of-light-2`) rather than
numbered through the document, so alt text you have written stays attached to
its picture when the draft changes somewhere else entirely.

A picture is centred in lane 3, which runs from the last character of the text
to the right edge of the window, so the air to its left and the air to its right
are the same. The split pane measured its own half of the window instead, which
put the picture's centre well right of the gap's and left it hugging the browser
edge. It never gets closer than 84px to either side (`--pane-pad`).

**Every picture is the same width.** Three caps, whichever bites first: 620px
(`--pic-max`), the lane, and half the window less the air on either side. All
three are measurements of the window rather than of the photo, so they come out
the same for every figure on the page.

The 620px is what governs from about 1576px of window upwards, and it is why a
picture and the prose beside it stay in proportion on a large display. Without
it the pictures grew with the window while the 455px measure stayed put, so at
2560px a photo ran to 1080px, well over twice the width of the text it belonged
to. Below the crossover the half-window cap is the smaller of the three and the
pictures ride the window down: 472px at 1280, 552px at 1440, 620px from 1576 on.

Height is nobody's business but the photo's. There used to be a third cap, on
what the window's height left, which sized a portrait down and a landscape up
and meant no two pictures agreed on a width. It is gone, along with the `--ar`
the build wrote on each figure to feed it. The width is fixed, the height
follows from the file's own proportions, and a tall photo is simply tall - the
tallest in the set runs past the bottom of a 900px window, and sticks at the top
rather than centring while you read past it.

Loading is the browser's job now. Every picture is `loading="lazy"`, so a file
is fetched as it comes near the window and nothing else is fetched at all. That
is what the crossfade pane needed a hand-written beat and a neighbour-warmer to
achieve. Width and height are in the markup, so the space is held before the
file arrives and nothing shifts when it lands. It is held at zero opacity until
it has decoded and fades in over 200ms, so a cold 5MB photo arrives as a fade
rather than as a box filling in top to bottom. The class that does that is added
by the script, so a page without script still shows every picture.

Compressing the set before launch is still worth doing. They are 2MB to 10MB
each, straight off Unsplash.

## Narrow screens

Two lanes of prose and pictures need about 1100px before the pictures start
being squeezed into nothing: lane 2 alone is a fixed 522px, and what is left has
to hold a photograph with air on both sides. **Below 1099px the two stack** -
each picture under the words it belongs to, which is where it belonged all
along. The lanes were only ever a way of showing them at the same time.

That number is written twice, in the stylesheet's media query and in the one the
script asks before `place()` positions anything. They have to agree: below it
nothing is sticky and nothing is dropped down its row, so both the numbers
`place()` writes would be wrong. It clears them rather than skipping, because a
window can be narrowed after a wide layout has already been measured. Crossing
the breakpoint re-lays out on its own - a resize event alone does not say which
side of it you have landed on.

**What stacks is lane 2 itself**, lifted out of the grid and centred: the rail,
the gap after it, and the measure. Everything is cut to that one box - header,
hero, rows and the nav dock - so the guide sits in the middle of the window
rather than hugging the left with the window's growth piling up on the right.
The wordmark, the hero, the prose and the pictures all clear the rail together,
so they share one left edge and one right edge, and the rail is the only thing
outside them. `--edge` is the floor it falls back to on a screen narrower than
the column itself.

Two paddings have to be named again rather than left to the wide layout:
`.media`'s right, or `--pane-pad` survives on that side alone and the pictures
come up 84px short of the text's right edge; and the hero's left, which sits on
the wordmark's own front like everything else. Photo credits stay on the right
of their picture, which leaves the left free for captions.

**The rail stays on phones.** It is the guide's own way of showing where you
are, and a phone wants that more than a wide screen does. What it cannot afford
is the 48px lane after it, so below 768px the gap and the page's margin both
come in to 20px - 56px of a 375px line bought back without touching the
hairlines. The type steps down with it: the wordmark 48px to 30px to 26px,
chapter headings 28px to 24px to 22px, the body's 15px left alone, because it
was set for reading and a phone does not want it smaller.

The contents keep sizing to their own entries there, capped at the screen less
its margins - 315px on a 375px phone, where the longest entry wants 259px and
the padding 56px. Only on a screen narrow enough to bite does the cap take over
and the entries wrap: at 320px the panel is 280px and two entries run to two
lines.

**Touch has no hover to open on.** A device that reports `hover: none` taps the
rail instead, and a tap anywhere else closes it; the same device must not also
answer to the `mouseenter` a tap synthesises, or the contents would open and
shut in one go. Pointer devices keep hovering at every width.
