// Scan a localized FFTA2 ROM and emit a fill-in template for the external
// double-byte word table.
//
// Usage:
//   npx vite-node scripts/extract-wordtable.ts [rom.nds] [out.tsv]
//
// With no args it looks for ../data/extracted/*.nds and writes to stdout.
// Fill the second TSV column with Chinese text, then load the file through the
// "Word Table…" button in the web editor.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRom, IdxPakKey } from '../src/data/load';
import { Bytes } from '../src/core/binary';
import { DEFAULT_DOUBLE_BYTE_LEADS, formatWordTableTemplate } from '../src/core/wordTable';

const PARAM_CONTROL = new Set([0xc2, 0xc4, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcc, 0xcd, 0xce, 0xcf]);

function scanString(raw: Uint8Array, counts: Map<number, number>): void {
  let i = 0;
  while (i < raw.length) {
    const b = raw[i];
    if (b === 0) { i++; continue; }
    if (DEFAULT_DOUBLE_BYTE_LEADS.has(b) && i + 1 < raw.length) {
      const code = (b << 8) | raw[i + 1];
      counts.set(code, (counts.get(code) ?? 0) + 1);
      i += 2;
      continue;
    }
    if (PARAM_CONTROL.has(b) && i + 1 < raw.length) { i += 2; continue; }
    if (b === 0xc0 || b === 0xc1 || b === 0xc3 || b === 0xc8) { i += 2; continue; }
    i++;
  }
}

function scanStringTable(file: Bytes, counts: Map<number, number>): void {
  const b = file.rewind();
  if (b.remaining() < 2) return;
  const count = b.getShort();
  const entries: Array<[number, number]> = [];
  for (let i = 0; i < count; i++) {
    const len = b.getInt();
    const off = b.getInt();
    b.getU16();
    entries.push([off, len]);
  }
  for (const [off, len] of entries) scanString(b.getBytesAt(off, len), counts);
}

function scanStringSingle(file: Bytes, counts: Map<number, number>): void {
  const b = file.rewind();
  if (b.remaining() < 0x0e) return;
  b.position(6);
  const len = b.getInt();
  scanString(b.getBytesAt(0x0e, len), counts);
}

function defaultRom(): string {
  const dir = join(process.cwd(), '..', 'data', 'extracted');
  if (!existsSync(dir)) throw new Error(`ROM directory not found: ${dir}`);
  const name = readdirSync(dir).find((f) => f.endsWith('.nds'));
  if (!name) throw new Error(`No .nds found in ${dir}`);
  return join(dir, name);
}

const romPath = process.argv[2] ?? defaultRom();
const outPath = process.argv[3];
const data = loadRom(new Uint8Array(readFileSync(romPath)));
const counts = new Map<number, number>();

const tableKeys: IdxPakKey[] = ['jdMessage', 'evMsg'];
for (const key of tableKeys) {
  const pak = data[key]!;
  for (let i = 0; i < pak.numFiles(); i++) {
    const file = pak.getFile(i);
    if (file) scanStringTable(file, counts);
  }
}
for (const key of ['jhQuest', 'jhRumor', 'jhNotice'] as IdxPakKey[]) {
  const pak = data[key]!;
  for (let i = 0; i < pak.numFiles(); i++) {
    const file = pak.getFile(i);
    if (file) scanStringSingle(file, counts);
  }
}

const template = formatWordTableTemplate(counts);
if (outPath) {
  writeFileSync(outPath, template);
  console.log(`Wrote ${counts.size} double-byte codes to ${outPath}`);
} else {
  process.stdout.write(template);
}

