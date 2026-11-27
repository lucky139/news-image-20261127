// News image for Friday 27 November 2026 (make.fun news-image-20261127).
// A single self-contained Node 22 program, standard library only. It draws a
// 1024 x 1024 newspaper front page in memory and writes it, deterministically,
// to /output/entry.png (or $MAKEFUN_OUTPUT_DIR/entry.png outside the grader).
// No network, no files read, no timestamps: two runs write identical bytes.
// Every story below was checked against news reported on 27 November 2026:
// the tanker explosions in the Strait of Hormuz, the diesel tanker sunk off
// Ibiza, the Russian strikes on Ukraine, the Gaza strikes, the Thanksgiving
// storm on the US East Coast and the million-satellite SpaceX approval, with
// the Colombia siege, UK migration and the EU Ukraine loan as briefs in the
// footer.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---- palette: newsprint paper, navy masthead, ink text, one accent per beat
const PAPER = [247, 243, 232];
const WHITE = [255, 255, 255];
const INK = [20, 24, 31];
const GREY = [74, 82, 94];
const NAVY = [15, 42, 74];
const NAVY_LIGHT = [28, 68, 110];
const RED = [178, 34, 24];
const GOLD = [196, 141, 32];
const TEAL = [16, 110, 102];
const PLUM = [110, 44, 92];
const RUST = [176, 84, 24];
const SLATE = [58, 84, 110];
const LINE = [203, 196, 180];

type RGB = [number, number, number];

// ---- 5x7 bitmap font, uppercase only. Each glyph is 7 rows of 5 bits,
// written as five characters of "1" (ink) and "0" (blank), top row first.
const FONT: Record<string, string[]> = {
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

// ---- canvas: a plain RGB byte array, origin top-left
const px = new Uint8Array(W * H * 3);
function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
  }
}
function fillCircle(cx: number, cy: number, r: number, c: RGB): void {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r * r) setPixel(x, y, c);
    }
  }
}
function ring(cx: number, cy: number, r: number, t: number, c: RGB): void {
  for (let y = cy - r - t; y <= cy + r + t; y++) {
    for (let x = cx - r - t; x <= cx + r + t; x++) {
      const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      if (d >= r - t / 2 && d <= r + t / 2) setPixel(x, y, c);
    }
  }
}
// Filled triangle by scanline interpolation between its three edges.
function fillTriangle(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, c: RGB): void {
  const minY = Math.min(ay, by, cy);
  const maxY = Math.max(ay, by, cy);
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    const edges: Array<[number, number, number, number]> = [[ax, ay, bx, by], [bx, by, cx, cy], [cx, cy, ax, ay]];
    for (const [x1, y1, x2, y2] of edges) {
      if ((y1 <= y && y < y2) || (y2 <= y && y < y1)) {
        xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1));
      }
    }
    if (xs.length >= 2) {
      const lo = Math.ceil(Math.min(...xs));
      const hi = Math.floor(Math.max(...xs));
      for (let x = lo; x <= hi; x++) setPixel(x, y, c);
    }
  }
}

// ---- text: draw one glyph scaled, then words, then wrapped paragraphs
function drawChar(ch: string, x: number, y: number, s: number, c: RGB): void {
  const g = FONT[ch];
  if (!g) return;
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === '1') fillRect(x + col * s, y + r * s, s, s, c);
    }
  }
}
function textWidth(text: string, s: number): number {
  return text.length * 6 * s - s;
}
function drawText(text: string, x: number, y: number, s: number, c: RGB): void {
  const upper = text.toUpperCase();
  for (let i = 0; i < upper.length; i++) drawChar(upper[i], x + i * 6 * s, y, s, c);
}
function drawCentred(text: string, cx: number, y: number, s: number, c: RGB): void {
  drawText(text, cx - Math.floor(textWidth(text, s) / 2), y, s, c);
}
// Greedy word wrap on whole words; a word longer than the width is split.
function wrapText(text: string, maxW: number, s: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur ? cur + ' ' + w : w;
    if (textWidth(trial, s) <= maxW) { cur = trial; continue; }
    if (cur) lines.push(cur);
    if (textWidth(w, s) > maxW) {
      let part = '';
      for (const ch of w) {
        if (textWidth(part + ch, s) > maxW) { lines.push(part); part = ch; }
        else part += ch;
      }
      cur = part;
    } else cur = w;
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---- PNG encoder: 8-bit RGB, one deflate stream, filter 0 per scanline
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

// ---- the day's stories, each with its beat colour and a small pictogram
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
    colour: NAVY_LIGHT,
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

// One small white pictogram inside the coloured kicker band, top right.
function drawIcon(kind: string, x: number, y: number): void {
  const w: RGB = WHITE;
  if (kind === 'bars') {
    fillRect(x + 2, y + 18, 8, 12, w);
    fillRect(x + 14, y + 10, 8, 20, w);
    fillRect(x + 26, y + 2, 8, 28, w);
  } else if (kind === 'burst') {
    fillCircle(x + 18, y + 15, 6, w);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      const x1 = x + 18 + Math.round(Math.cos(a) * 9);
      const y1 = y + 15 + Math.round(Math.sin(a) * 9);
      const x2 = x + 18 + Math.round(Math.cos(a) * 15);
      const y2 = y + 15 + Math.round(Math.sin(a) * 15);
      fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1) + 3, Math.abs(y2 - y1) + 3, w);
    }
  } else if (kind === 'alert') {
    fillTriangle(x + 18, y + 1, x + 2, y + 29, x + 34, y + 29, w);
    fillRect(x + 16, y + 10, 4, 11, NAVY);
    fillRect(x + 16, y + 24, 4, 4, NAVY);
  } else if (kind === 'atom') {
    ring(x + 18, y + 15, 6, 3, w);
    ring(x + 18, y + 15, 13, 3, w);
    fillCircle(x + 18, y + 15, 3, w);
  } else if (kind === 'flame') {
    fillTriangle(x + 18, y + 1, x + 4, y + 22, x + 32, y + 22, w);
    fillTriangle(x + 18, y + 12, x + 10, y + 29, x + 26, y + 29, GOLD);
  } else if (kind === 'truck') {
    fillRect(x + 1, y + 8, 22, 13, w);
    fillRect(x + 24, y + 12, 11, 9, w);
    fillCircle(x + 9, y + 24, 4, w);
    fillCircle(x + 28, y + 24, 4, w);
  } else if (kind === 'ship') {
    fillRect(x + 15, y + 2, 6, 12, w);
    fillTriangle(x + 18, y + 2, x + 6, y + 14, x + 30, y + 14, w);
    fillRect(x + 2, y + 16, 32, 6, w);
    fillRect(x + 2, y + 25, 32, 3, w);
    fillRect(x + 8, y + 29, 20, 2, w);
  } else if (kind === 'storm') {
    fillRect(x + 6, y + 4, 24, 12, w);
    fillRect(x + 2, y + 8, 32, 8, w);
    fillTriangle(x + 20, y + 16, x + 12, y + 29, x + 20, y + 29, w);
    fillTriangle(x + 26, y + 16, x + 18, y + 29, x + 26, y + 29, GOLD);
  } else if (kind === 'satellite') {
    fillRect(x + 14, y + 12, 8, 8, w);
    fillRect(x + 2, y + 8, 10, 6, w);
    fillRect(x + 24, y + 8, 10, 6, w);
    fillRect(x + 2, y + 18, 10, 6, w);
    fillRect(x + 24, y + 18, 10, 6, w);
    fillRect(x + 12, y + 14, 12, 4, w);
    fillRect(x + 16, y + 20, 4, 9, w);
  }
}

function drawStory(s: Story, x: number, y: number, w: number, h: number): void {
  fillRect(x, y, w, h, WHITE);
  fillRect(x, y, w, h, WHITE);
  // border
  fillRect(x, y, w, 2, LINE); fillRect(x, y + h - 2, w, 2, LINE);
  fillRect(x, y, 2, h, LINE); fillRect(x + w - 2, y, 2, h, LINE);
  // kicker band with pictogram
  fillRect(x + 2, y + 2, w - 4, 40, s.colour);
  drawText(s.kicker, x + 14, y + 14, 2, WHITE);
  drawIcon(s.icon, x + w - 52, y + 7);
  // headline, up to 3 lines
  const headLines = wrapText(s.headline, w - 28, 3).slice(0, 3);
  let cy = y + 56;
  for (const ln of headLines) { drawText(ln, x + 14, cy, 3, INK); cy += 26; }
  fillRect(x + 14, cy + 2, w - 28, 2, s.colour);
  // body, up to 4 lines
  const bodyLines = wrapText(s.body, w - 28, 2).slice(0, 4);
  let by = cy + 12;
  for (const ln of bodyLines) { drawText(ln, x + 14, by, 2, GREY); by += 19; }
}

function drawPage(): void {
  fillRect(0, 0, W, H, PAPER);
  // masthead
  fillRect(0, 0, W, 148, NAVY);
  fillRect(0, 148, W, 6, RED);
  drawCentred('WORLD NEWS', W / 2, 22, 8, WHITE);
  drawCentred('FRIDAY 27 NOVEMBER 2026', W / 2, 92, 4, GOLD);
  drawText('THE DAY IN SIX STORIES', 24, 122, 2, WHITE);
  drawText('ALL TIMES LOCAL', W - 24 - textWidth('ALL TIMES LOCAL', 2), 122, 2, WHITE);
  // standfirst
  const stand = 'TANKERS HIT IN HORMUZ, STORM OVER THANKSGIVING, AND A MILLION SATELLITES';
  drawCentred(stand, W / 2, 168, 2, INK);
  // six stories in a 2 by 3 grid
  const gx = 24;
  const gy = 198;
  const cw = 476;
  const ch = 236;
  const gap = 16;
  for (let i = 0; i < STORIES.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    drawStory(STORIES[i], gx + col * (cw + gap), gy + row * (ch + gap), cw, ch);
  }
  // footer briefs
  const fy = 942;
  fillRect(24, fy, W - 48, 2, INK);
  const briefs = 'ALSO: ALL HOSTAGES FREED AFTER 16-HOUR SIEGE IN COLOMBIA. UK NET MIGRATION AT NEAR 30-YEAR LOW. EU SPLIT OVER 49 BILLION UKRAINE LOAN.';
  const lines = wrapText(briefs, W - 48, 2);
  let ly = fy + 12;
  for (const ln of lines.slice(0, 2)) { drawText(ln, 24, ly, 2, GREY); ly += 19; }
  drawCentred('REPORTED ON 27 NOVEMBER 2026 - SOURCES: NEWS WIRES AND BROADCAST REPORTS', W / 2, 1000, 1, GREY);
}

function main(): void {
  drawPage();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), encodePng());
}

main();
