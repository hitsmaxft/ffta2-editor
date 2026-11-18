import { Bytes } from '../core/binary';
import { fail } from './errors';

export function checkedRange(start: number, size: number, length: number, resource: string): void {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(size) || start < 0 || size < 0 || start > length - size) {
    fail('OUT_OF_BOUNDS', resource, 'Resource span is outside its containing buffer', { start, size, length });
  }
}
/** Strict indexed-resource reader. The final index record is a sentinel. */
export function readIndexedPak(idx: Uint8Array, pak: Uint8Array, resource = 'idx/pak'): Array<Uint8Array | null> {
  if (idx.length < 10) fail('TRUNCATED_INDEX', resource, 'Index lacks a header and sentinel');
  const view = new DataView(idx.buffer, idx.byteOffset, idx.byteLength);
  const count = Math.floor((idx.length - 4) / 6);
  if (count > 100001) fail('RESOURCE_LIMIT', resource, 'Too many index records');
  if (idx.slice(4 + count * 6).some((byte) => byte !== 0)) fail('INDEX_PADDING', resource, 'Nonzero bytes after complete six-byte index records');
  const words = Array.from({ length: count }, (_, i) => view.getUint32(4 + i * 6, true));
  const offsets = words.map((word) => ((word & 0x7ffffff) >>> 3) * 4);
  if (!(words.at(-1)! & 7)) fail('MISSING_SENTINEL', resource, 'Final index record is not a null sentinel');
  for (let i = 0; i < offsets.length; i++) {
    if (offsets[i] > pak.length || (i > 0 && offsets[i] < offsets[i - 1])) {
      fail('INVALID_INDEX_OFFSET', resource, 'Index offsets must be ordered and inside the resource', { index: i, offset: offsets[i] });
    }
  }
  if (pak.slice(offsets.at(-1)).some((byte) => byte !== 0)) fail('UNREFERENCED_DATA', resource, 'Nonzero data after the final index boundary');
  return words.slice(0, -1).map((word, i) => word & 7 ? null : pak.subarray(offsets[i], offsets[i + 1]));
}

/** Validate dynamic NitroFS spans and directory structure before using NdsRom. */
export function validateNds(bytes: Uint8Array): void {
  if (bytes.length < 0x200) fail('TRUNCATED_NDS', 'NDS', 'NDS header is incomplete');
  const b = Bytes.wrap(bytes); const v = b.view;
  const code = new TextDecoder('ascii').decode(bytes.subarray(12, 16));
  if (code !== 'A6FE') fail('UNSUPPORTED_GAME', 'NDS', 'This layout requires the FFTA2 USA game code', { gameCode: code });
  const fnt = v.getUint32(0x40, true), fntSize = v.getUint32(0x44, true);
  const fat = v.getUint32(0x48, true), fatSize = v.getUint32(0x4c, true);
  checkedRange(fnt, fntSize, bytes.length, 'NitroFS/FNT');
  checkedRange(fat, fatSize, bytes.length, 'NitroFS/FAT');
  if (fatSize % 8 || fatSize / 8 > 65536 || fntSize < 8) fail('INVALID_NITROFS', 'NitroFS', 'Invalid FAT/FNT table shape');
  for (let i = 0; i < fatSize / 8; i++) {
    const start = v.getUint32(fat + i * 8, true), end = v.getUint32(fat + i * 8 + 4, true);
    checkedRange(start, end - start, bytes.length, `NitroFS/FAT/${i}`);
  }
  const dirs = v.getUint16(fnt + 6, true);
  if (dirs < 1 || dirs > 4096 || dirs * 8 > fntSize) fail('INVALID_FNT', 'NitroFS/FNT', 'Invalid directory count');
  const visited = new Set<number>();
  const walk = (id: number) => {
    if (visited.has(id) || id >= dirs) fail('INVALID_FNT_GRAPH', 'NitroFS/FNT', 'Repeated or invalid directory', { id });
    visited.add(id);
    let cursor = v.getUint32(fnt + id * 8, true);
    if (cursor < dirs * 8 || cursor >= fntSize) fail('INVALID_FNT', 'NitroFS/FNT', 'Directory subtable outside FNT');
    let ended = false;
    while (cursor < fntSize) {
      const tag = bytes[fnt + cursor++];
      if (!tag) { ended = true; break; }
      const length = tag & 127;
      if (!length || cursor + length + (tag & 128 ? 2 : 0) > fntSize) fail('TRUNCATED_FNT', 'NitroFS/FNT', 'Directory entry is truncated');
      cursor += length;
      if (tag & 128) { const child = v.getUint16(fnt + cursor, true) & 0xfff; cursor += 2; walk(child); }
    }
    if (!ended) fail('TRUNCATED_FNT', 'NitroFS/FNT', 'Directory terminator is missing');
  };
  walk(0);
  checkedRange(v.getUint32(0x50, true), v.getUint32(0x54, true), bytes.length, 'NDS/overlays');
}
