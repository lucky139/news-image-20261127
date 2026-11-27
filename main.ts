// news-image-20261127 — a newspaper front page for Friday 27 November 2026.
// Drawn entirely in memory with Node's standard library only: a hand-made
// 5x7 pixel typeface, a hand-rolled PNG writer, and a fixed two-column layout.
// Deterministic: no clock, no randomness, no network, no files read.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync, chmodSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------- canvas
const W = 1024;
const H = 1024;
const PAPER = [247, 242, 231];
const INK = [22, 22, 22];
const CRIMSON = [176, 32, 32];
const NAVY = [16, 30, 58];
const SLATE = [88, 84, 74];
const WHITE = [255, 255, 255];
const GOLD = [196, 148, 44];

const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0];
  px[i * 3 + 1] = PAPER[1];
  px[i * 3 + 2] = PAPER[2];
}

function paint(x, y, w, h, c) {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const o = (yy * W + xx) * 3;
      px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2];
    }
  }
}

function rule(x, y, w, t, c) { paint(x, y, w, t, c); }

// ------------------------------------------------------- 5x7 pixel type
// Each letter is seven rows of five dots, "1" = ink. All shapes below were
// sketched for this page alone.
const LETTERS = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "—": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "•": ["00000", "00000", "01100", "01100", "01100", "00000", "00000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
};

const CELL = 6; // glyph advance in dot units (5 dots + 1 gap)

function glyphOf(ch) {
  const up = ch.toUpperCase();
  return LETTERS[up] || LETTERS["?"];
}

function stamp(ch, ox, oy, s, c) {
  const g = glyphOf(ch);
  for (let r = 0; r < 7; r++) {
    const row = g[r];
    for (let col = 0; col < 5; col++) {
      if (row[col] === "1") paint(ox + col * s, oy + r * s, s, s, c);
    }
  }
}

function measure(text, s) {
  return text.length * CELL * s - s;
}

function writeLine(text, ox, oy, s, c) {
  let x = ox;
  for (const ch of text) {
    stamp(ch, x, oy, s, c);
    x += CELL * s;
  }
  return x;
}

function splitWords(text) {
  return text.split(" ").filter((w) => w.length > 0);
}

function wrapPara(text, maxW, s) {
  const lines = [];
  let cur = "";
  for (const w of splitWords(text)) {
    const trial = cur === "" ? w : cur + " " + w;
    if (measure(trial, s) <= maxW || cur === "") {
      cur = trial;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function writeBlock(lines, ox, oy, s, c, gap, align, width) {
  let y = oy;
  for (const line of lines) {
    let x = ox;
    if (align === "center") x = ox + Math.floor((width - measure(line, s)) / 2);
    writeLine(line, x, y, s, c);
    y += 7 * s + gap;
  }
  return y;
}

// ------------------------------------------------------------ PNG writer
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let v = n;
  for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
  CRC_TABLE[n] = v >>> 0;
}

function crc32(buf) {
  let v = 0xffffffff;
  for (let i = 0; i < buf.length; i++) v = CRC_TABLE[(v ^ buf[i]) & 0xff] ^ (v >>> 8);
  return (v ^ 0xffffffff) >>> 0;
}

function chunk(tag, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(tag, 4, "ascii");
  data.copy(out, 8);
  const crcIn = Buffer.concat([Buffer.from(tag, "ascii"), data]);
  out.writeUInt32BE(crc32(crcIn), 8 + data.length);
  return out;
}

function makePng() {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const head = Buffer.alloc(13);
  head.writeUInt32BE(W, 0);
  head.writeUInt32BE(H, 4);
  head[8] = 8; // bit depth
  head[9] = 2; // truecolour RGB
  head[10] = 0;
  head[11] = 0;
  head[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // no filter
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", head),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------ page
const M = 40; // side margin
const COLW = 452;
const GAPX = 40;

// Top crimson band.
paint(0, 0, W, 12, CRIMSON);

// Masthead.
const mast = "WORLD NEWS";
const mastS = 9;
writeLine(mast, Math.floor((W - measure(mast, mastS)) / 2), 34, mastS, INK);
rule(M, 116, W - 2 * M, 4, INK);
rule(M, 124, W - 2 * M, 2, CRIMSON);

// Dateline.
const date = "FRIDAY 27 NOVEMBER 2026";
const dateS = 3;
writeLine(date, Math.floor((W - measure(date, dateS)) / 2), 140, dateS, CRIMSON);
rule(M, 172, W - 2 * M, 2, INK);

// Standfirst, centred, two lines.
const stand = "TANKERS HIT IN HORMUZ, STORM OVER THANKSGIVING, AND A MILLION SATELLITES";
const standLines = wrapPara(stand, W - 2 * M - 24, 3);
writeBlock(standLines, M, 190, 3, NAVY, 8, "center", W - 2 * M);
rule(M, 262, W - 2 * M, 4, NAVY);

// Six stories, two columns by three rows.
const stories = [
  {
    tag: "GULF — STRAIT OF HORMUZ",
    body: "Explosions hit three tankers. Iran reports blasts, its Guards say two hit sea mines off Oman, and oil prices jump.",
  },
  {
    tag: "SPAIN — IBIZA",
    body: "A diesel tanker carrying up to 7,000 tonnes of diesel capsizes and sinks off Ibiza. One crew member is dead.",
  },
  {
    tag: "UKRAINE",
    body: "Russian strikes kill 5 and knock out power across Ukraine. Kyiv says a laser weapon downed a Shahed drone for the first time.",
  },
  {
    tag: "GAZA",
    body: "Israeli strikes kill 10 in Gaza as Hamas weighs its response. A settler kills a 72-year-old Palestinian woman in the West Bank.",
  },
  {
    tag: "USA",
    body: "A Thanksgiving storm knocks out power and disrupts flights on the US East Coast. King tides and El Nino flood the California coast.",
  },
  {
    tag: "SPACE",
    body: "US regulators approve SpaceX's plan to launch a million data satellites to build data centres in space, the first approval of its kind.",
  },
];

const gridTop = 282;
const rowH = 196;
const colX = [M, M + COLW + GAPX];

for (let i = 0; i < stories.length; i++) {
  const col = i % 2;
  const row = Math.floor(i / 2);
  const x = colX[col];
  const y = gridTop + row * rowH;
  // Kicker with a small crimson square bullet.
  paint(x, y + 2, 10, 10, CRIMSON);
  writeLine(stories[i].tag, x + 18, y, 2, CRIMSON);
  const bodyLines = wrapPara(stories[i].body, COLW, 2);
  writeBlock(bodyLines, x, y + 30, 2, INK, 7, "left", COLW);
  // Row divider under each row except the last.
  if (row < 2) rule(x, y + rowH - 26, COLW, 1, SLATE);
}

// Footer briefs band.
const footTop = 886;
paint(0, footTop, W, H - footTop, NAVY);
rule(0, footTop, W, 4, GOLD);
writeLine("IN BRIEF", M, footTop + 18, 2, GOLD);
const briefs =
  "• All hostages freed after the 16-hour siege in Colombia.  • UK net migration at a near 30-year low.  • EU split over the 49 billion Ukraine loan.";
const briefLines = wrapPara(briefs, W - 2 * M, 2);
writeBlock(briefLines, M, footTop + 48, 2, WHITE, 7, "left", W - 2 * M);

// ------------------------------------------------------------------ save
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
mkdirSync(outDir, { recursive: true });
const target = join(outDir, "entry.png");
writeFileSync(target, makePng());
chmodSync(target, 0o644);
