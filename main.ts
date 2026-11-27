// news-image-20261127 — one image summing up Friday 27 November 2026.
// A self-contained Node 22 program using only the standard library. It
// paints a 1024x1024 newspaper front page into an in-memory framebuffer and
// writes it as a PNG to $MAKEFUN_OUTPUT_DIR/entry.png (or /output/entry.png
// in the grader). No network, no input files, no clock: the same bytes come
// out every run. The picture is drawn with a hand-made 5x7 pixel font and a
// small hand-rolled PNG encoder, so nothing outside this file is needed.
//
// The six stories are the day's news as reported on 27 November 2026:
// explosions on tankers in the Strait of Hormuz, a diesel tanker sunk off
// Ibiza, Russian strikes on Ukraine, Israeli strikes in Gaza, the
// Thanksgiving storm on the US East Coast, and the US approval of a
// million-satellite SpaceX plan. Three more briefs sit in the footer.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const WIDTH = 1024;
const HEIGHT = 1024;

// ---------------------------------------------------------------- palette
// Newsprint paper, a navy masthead, dark ink, and one accent per story.
type RGB = [number, number, number];
const PAPER: RGB = [247, 243, 232];
const WHITE: RGB = [255, 255, 255];
const INK: RGB = [20, 24, 31];
const GREY: RGB = [74, 82, 94];
const NAVY: RGB = [15, 42, 74];
const NAVY2: RGB = [28, 68, 110];
const RED: RGB = [178, 34, 24];
const GOLD: RGB = [196, 141, 32];
const TEAL: RGB = [16, 110, 102];
const PLUM: RGB = [110, 44, 92];
const RUST: RGB = [176, 84, 24];
const RULE: RGB = [203, 196, 180];

// ------------------------------------------------------- framebuffer paint
// One RGB byte array, origin at the top left, x grows right, y grows down.
const fb = new Uint8Array(WIDTH * HEIGHT * 3);

function put(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const i = (y * WIDTH + x) * 3;
  fb[i] = c[0];
  fb[i + 1] = c[1];
  fb[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) put(xx, yy, c);
  }
}

function disc(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r) put(x, y, c);
    }
  }
}

function outline(cx: number, cy: number, r: number, t: number, c: RGB): void {
  for (let y = cy - r - t; y <= cy + r + t; y++) {
    for (let x = cx - r - t; x <= cx + r + t; x++) {
      const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      if (d >= r - t / 2 && d <= r + t / 2) put(x, y, c);
    }
  }
}

// Filled triangle: for each scanline, intersect the three edges and fill
// the span between the leftmost and rightmost crossings.
function tri(ax: number, ay: number, bx: number, by: number,
            cx: number, cy: number, c: RGB): void {
  const top = Math.min(ay, by, cy);
  const bottom = Math.max(ay, by, cy);
  const edges: Array<[number, number, number, number]> = [
    [ax, ay, bx, by],
    [bx, by, cx, cy],
    [cx, cy, ax, ay],
  ];
  for (let y = top; y <= bottom; y++) {
    const hits: number[] = [];
    for (const [x1, y1, x2, y2] of edges) {
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
        hits.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
      }
    }
    if (hits.length >= 2) {
      const lo = Math.ceil(Math.min(...hits));
      const hi = Math.floor(Math.max(...hits));
      for (let x = lo; x <= hi; x++) put(x, y, c);
    }
  }
}

// ------------------------------------------------------------- 5x7 bitmap font
// Uppercase only. Each glyph is seven rows of five bits, '1' for ink and
// '0' for blank, top row first. Digits and common punctuation included.
const GLYPHS: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
};

// One glyph at scale s: each bitmap cell becomes an s-by-s block.
function glyph(ch: string, x: number, y: number, s: number, c: RGB): void {
  const g = GLYPHS[ch];
  if (!g) return;
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === '1') rect(x + col * s, y + r * s, s, s, c);
    }
  }
}

// A glyph cell is 6 units wide (5 bitmap + 1 gap), so a string of n
// characters spans n * 6 * s - s pixels.
function textW(s: string, scale: number): number {
  return s.length * 6 * scale - scale;
}

function text(s: string, x: number, y: number, scale: number, c: RGB): void {
  const upper = s.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    glyph(upper[i], x + i * 6 * scale, y, scale, c);
  }
}

function centre(s: string, cx: number, y: number, scale: number, c: RGB): void {
  text(s, cx - Math.floor(textW(s, scale) / 2), y, scale, c);
}

// Greedy wrap on whole words. A single word wider than the column is
// split across lines instead of overflowing.
function wrap(s: string, maxW: number, scale: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (textW(trial, scale) <= maxW) {
      cur = trial;
      continue;
    }
    if (cur) lines.push(cur);
    if (textW(w, scale) > maxW) {
      let part = '';
      for (const ch of w) {
        if (textW(part + ch, scale) > maxW) {
          lines.push(part);
          part = ch;
        } else {
          part += ch;
        }
      }
      cur = part;
    } else {
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------------------------------------------------------------- PNG writer
// 8-bit RGB, one deflate stream, filter byte 0 on every scanline. The
// deflate output is deterministic for fixed input, so identical pixels
// always produce identical files.
const CRC: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC[n] = c >>> 0;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(kind: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(kind, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function toPng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(WIDTH, 0);
  ihdr.writeUInt32BE(HEIGHT, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const raw = Buffer.alloc(HEIGHT * (1 + WIDTH * 3));
  for (let y = 0; y < HEIGHT; y++) {
    raw[y * (1 + WIDTH * 3)] = 0; // filter 0: no filtering
    raw.set(fb.subarray(y * WIDTH * 3, (y + 1) * WIDTH * 3), y * (1 + WIDTH * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- the stories
interface Story {
  kicker: string;
  headline: string;
  body: string;
  colour: RGB;
  icon: string;
}

const STORIES: Story[] = [
  {
    kicker: 'GULF - STRAIT OF HORMUZ',
    headline: 'EXPLOSIONS HIT THREE TANKERS IN HORMUZ',
    body: 'Iran reports blasts on three tankers in the Strait of Hormuz. Its Guards say two hit sea mines off Oman, and oil prices jump.',
    colour: RED,
    icon: 'flame',
  },
  {
    kicker: 'SPAIN - IBIZA',
    headline: 'DIESEL TANKER SINKS OFF IBIZA, ONE DEAD',
    body: 'A tanker carrying up to 7,000 tonnes of diesel capsizes and sinks off Ibiza. One crew member is dead and a slick spreads.',
    colour: NAVY2,
    icon: 'ship',
  },
  {
    kicker: 'UKRAINE',
    headline: 'RUSSIAN STRIKES KILL 5, BLACKOUTS SPREAD',
    body: 'Russian strikes kill five people and knock out power across Ukraine. Kyiv says a laser weapon downed a Shahed drone for the first time.',
    colour: PLUM,
    icon: 'burst',
  },
  {
    kicker: 'GAZA',
    headline: 'ISRAEL KILLS 10 IN GAZA, HAMAS WEIGHS REPLY',
    body: 'Israeli strikes kill ten people in Gaza, and Hamas weighs its response. A settler kills a 72-year-old Palestinian woman in the West Bank.',
    colour: TEAL,
    icon: 'alert',
  },
  {
    kicker: 'USA',
    headline: 'THANKSGIVING STORM CUTS POWER ON EAST COAST',
    body: 'A Thanksgiving storm knocks out power and disrupts flights on the US East Coast. King tides and El Nino flood the California coast.',
    colour: RUST,
    icon: 'storm',
  },
  {
    kicker: 'SPACE',
    headline: 'US CLEARS MUSK PLAN FOR A MILLION SATELLITES',
    body: 'US regulators approve a SpaceX plan to launch a million data satellites to build data centres in space, the first approval of its kind.',
    colour: GOLD,
    icon: 'satellite',
  },
];

// ------------------------------------------------------- pictograms (36 x 30)
// One small white pictogram per story, drawn top right inside the coloured
// kicker band. Each is built from the same rect / disc / triangle helpers.
function icon(kind: string, x: number, y: number): void {
  const w: RGB = WHITE;
  if (kind === 'flame') {
    tri(x + 18, y + 1, x + 4, y + 22, x + 32, y + 22, w);
    tri(x + 18, y + 12, x + 10, y + 29, x + 26, y + 29, GOLD);
  } else if (kind === 'ship') {
    rect(x + 15, y + 2, 6, 12, w);
    tri(x + 18, y + 2, x + 6, y + 14, x + 30, y + 14, w);
    rect(x + 2, y + 16, 32, 6, w);
    rect(x + 2, y + 25, 32, 3, w);
    rect(x + 8, y + 29, 20, 2, w);
  } else if (kind === 'burst') {
    disc(x + 18, y + 15, 6, w);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const x1 = x + 18 + Math.round(Math.cos(a) * 9);
      const y1 = y + 15 + Math.round(Math.sin(a) * 9);
      const x2 = x + 18 + Math.round(Math.cos(a) * 15);
      const y2 = y + 15 + Math.round(Math.sin(a) * 15);
      rect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1) + 3, Math.abs(y2 - y1) + 3, w);
    }
  } else if (kind === 'alert') {
    tri(x + 18, y + 1, x + 2, y + 29, x + 34, y + 29, w);
    rect(x + 16, y + 10, 4, 11, NAVY);
    rect(x + 16, y + 24, 4, 4, NAVY);
  } else if (kind === 'storm') {
    rect(x + 6, y + 4, 24, 12, w);
    rect(x + 2, y + 8, 32, 8, w);
    tri(x + 20, y + 16, x + 12, y + 29, x + 20, y + 29, w);
    tri(x + 26, y + 16, x + 18, y + 29, x + 26, y + 29, GOLD);
  } else if (kind === 'satellite') {
    rect(x + 14, y + 12, 8, 8, w);
    rect(x + 2, y + 8, 10, 6, w);
    rect(x + 24, y + 8, 10, 6, w);
    rect(x + 2, y + 18, 10, 6, w);
    rect(x + 24, y + 18, 10, 6, w);
    rect(x + 12, y + 14, 12, 4, w);
    rect(x + 16, y + 20, 4, 9, w);
  }
}

// ------------------------------------------------------------ story card layout
function card(s: Story, x: number, y: number, w: number, h: number): void {
  rect(x, y, w, h, WHITE);
  // Thin ruled border.
  rect(x, y, w, 2, RULE);
  rect(x, y + h - 2, w, 2, RULE);
  rect(x, y, 2, h, RULE);
  rect(x + w - 2, y, 2, h, RULE);
  // Coloured kicker band with the pictogram at its right end.
  rect(x + 2, y + 2, w - 4, 40, s.colour);
  text(s.kicker, x + 14, y + 14, 2, WHITE);
  icon(s.icon, x + w - 52, y + 7);
  // Headline, at most three lines at scale 3.
  const heads = wrap(s.headline, w - 28, 3).slice(0, 3);
  let cy = y + 56;
  for (const ln of heads) {
    text(ln, x + 14, cy, 3, INK);
    cy += 26;
  }
  // Accent rule under the headline.
  rect(x + 14, cy + 2, w - 28, 2, s.colour);
  // Body, at most four lines at scale 2.
  const bodys = wrap(s.body, w - 28, 2).slice(0, 4);
  let by = cy + 12;
  for (const ln of bodys) {
    text(ln, x + 14, by, 2, GREY);
    by += 19;
  }
}

// ---------------------------------------------------------------- the page
function paint(): void {
  rect(0, 0, WIDTH, HEIGHT, PAPER);
  // Masthead: navy block, red rule, big title, gold date line.
  rect(0, 0, WIDTH, 148, NAVY);
  rect(0, 148, WIDTH, 6, RED);
  centre('WORLD NEWS', WIDTH / 2, 22, 8, WHITE);
  centre('FRIDAY 27 NOVEMBER 2026', WIDTH / 2, 92, 4, GOLD);
  text('THE DAY IN SIX STORIES', 24, 122, 2, WHITE);
  text('ALL TIMES LOCAL', WIDTH - 24 - textW('ALL TIMES LOCAL', 2), 122, 2, WHITE);
  // Standfirst: the three biggest threads of the day in one line.
  centre('TANKERS HIT IN HORMUZ, STORM OVER THANKSGIVING, AND A MILLION SATELLITES', WIDTH / 2, 168, 2, INK);
  // Six stories in a 2-by-3 grid.
  const gx = 24;
  const gy = 198;
  const cw = 476;
  const ch = 236;
  const gap = 16;
  for (let i = 0; i < STORIES.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    card(STORIES[i], gx + col * (cw + gap), gy + row * (ch + gap), cw, ch);
  }
  // Footer briefs: three more stories in two lines, then the source line.
  const fy = 942;
  rect(24, fy, WIDTH - 48, 2, INK);
  const briefs =
    'ALSO: ALL HOSTAGES FREED AFTER 16-HOUR SIEGE IN COLOMBIA. UK NET MIGRATION AT NEAR 30-YEAR LOW. EU SPLIT OVER 49 BILLION UKRAINE LOAN.';
  const lines = wrap(briefs, WIDTH - 48, 2);
  let ly = fy + 12;
  for (const ln of lines.slice(0, 2)) {
    text(ln, 24, ly, 2, GREY);
    ly += 19;
  }
  centre('REPORTED ON 27 NOVEMBER 2026 - SOURCES: NEWS WIRES AND BROADCAST REPORTS', WIDTH / 2, 1000, 1, GREY);
}

// ---------------------------------------------------------------------- main
function main(): void {
  paint();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), toPng());
}

main();
