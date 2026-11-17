// NDS ROM filesystem: replaces the external ndstool dependency.
// Supports reading files by path and computing minimal in-place patch plans
// so saves only write changed regions of the local ROM file.

import { Bytes } from './binary';
import * as LZSS from './lzss';

export interface NdsFile {
  id: number;
  path: string;
  start: number;
  end: number;
}

export interface OverlayInfo {
  id: number;
  fileId: number;
  compressed: boolean;
  ramAddress: number;
  ramSize: number;
}

export interface PatchWrite {
  position: number;
  data: Uint8Array;
}

export interface PatchPlan {
  writes: PatchWrite[];
  newRomSize: number;
}

const HEADER_CRC_OFFSET = 0x15e;

function crc16(data: Uint8Array): number {
  let crc = 0xffff;
  const poly = 0xa001;
  for (const b of data) {
    crc ^= b;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >>> 1) ^ poly : crc >>> 1;
    }
  }
  return crc & 0xffff;
}

// Emit only spans of bytes that differ, so near-identical rewrites (e.g. a
// patched arm9.bin) touch a tiny fraction of the ROM file.
function diffSpans(position: number, oldData: Uint8Array, newData: Uint8Array): PatchWrite[] {
  const writes: PatchWrite[] = [];
  let start = -1;
  for (let i = 0; i <= newData.length; i++) {
    const differs = i < newData.length && oldData[i] !== newData[i];
    if (differs && start < 0) start = i;
    if (!differs && start >= 0) {
      writes.push({ position: position + start, data: newData.slice(start, i) });
      start = -1;
    }
  }
  return writes;
}

export class NdsRom {
  readonly data: Bytes;
  readonly files: NdsFile[] = [];
  readonly overlays: OverlayInfo[] = [];
  private fatOffset = 0;
  private fatSize = 0;
  private fntOffset = 0;
  arm9Offset = 0;
  arm9Size = 0;
  arm7Offset = 0;
  arm7Size = 0;

  constructor(data: Bytes) {
    this.data = data;
    const v = data.view;
    this.fntOffset = v.getUint32(0x40, true);
    const fntSize = v.getUint32(0x44, true);
    this.fatOffset = v.getUint32(0x48, true);
    this.fatSize = v.getUint32(0x4c, true);
    this.arm9Offset = v.getUint32(0x20, true);
    this.arm9Size = v.getUint32(0x2c, true);
    this.arm7Offset = v.getUint32(0x30, true);
    this.arm7Size = v.getUint32(0x3c, true);

    const numFiles = this.fatSize / 8;
    const paths = this.parseFnt(this.fntOffset, this.fntOffset + fntSize);
    for (let id = 0; id < numFiles; id++) {
      const start = v.getUint32(this.fatOffset + id * 8, true);
      const end = v.getUint32(this.fatOffset + id * 8 + 4, true);
      this.files.push({ id, path: paths.get(id) ?? `file_${id}`, start, end });
    }

    const ovlOffset = v.getUint32(0x50, true);
    const ovlSize = v.getUint32(0x54, true);
    for (let i = 0; i < ovlSize / 32; i++) {
      const base = ovlOffset + i * 32;
      const fileIdWord = v.getUint32(base + 24, true);
      this.overlays.push({
        id: v.getUint32(base, true),
        fileId: fileIdWord & 0xffffff,
        compressed: (fileIdWord & 0x1000000) !== 0,
        ramAddress: v.getUint32(base + 4, true),
        ramSize: v.getUint32(base + 8, true),
      });
    }
  }

  private parseFnt(fntOffset: number, fntEnd: number): Map<number, string> {
    const v = this.data.view;
    const paths = new Map<number, string>();
    const decoder = new TextDecoder('ascii');

    const readSubtable = (subOffset: number, dirPath: string, firstFileId: number) => {
      let p = subOffset;
      let fileId = firstFileId;
      while (p < fntEnd) {
        const typeLen = v.getUint8(p++);
        if (typeLen === 0) break;
        const isDir = (typeLen & 0x80) !== 0;
        const len = typeLen & 0x7f;
        const name = decoder.decode(new Uint8Array(this.data.buf, this.data.base + p, len));
        p += len;
        if (isDir) {
          const subId = v.getUint16(p, true);
          p += 2;
          const subEntry = fntOffset + (subId & 0xfff) * 8;
          const subFirstFile = v.getUint16(subEntry + 4, true);
          readSubtable(fntOffset + v.getUint32(subEntry, true), `${dirPath}${name}/`, subFirstFile);
        } else {
          paths.set(fileId, `${dirPath}${name}`);
          fileId++;
        }
      }
    };

    const rootSubOffset = v.getUint32(fntOffset, true);
    const rootFirstFile = v.getUint16(fntOffset + 4, true);
    readSubtable(fntOffset + rootSubOffset, '', rootFirstFile);
    return paths;
  }

  getFileByPath(path: string): NdsFile | undefined {
    return this.files.find((f) => f.path === path);
  }

  readFile(path: string): Bytes {
    const f = this.getFileByPath(path);
    if (!f) throw new Error(`NDS file not found: ${path}`);
    return this.data.slice(f.start, f.end - f.start);
  }

  readArm9(): Bytes {
    return this.data.slice(this.arm9Offset, this.arm9Size);
  }

  readOverlay(id: number): Bytes {
    const ovl = this.overlays.find((o) => o.id === id);
    if (!ovl) throw new Error(`Overlay ${id} not found`);
    const f = this.files[ovl.fileId];
    const raw = this.data.slice(f.start, f.end - f.start);
    if (ovl.compressed) return LZSS.decode(raw).decodedData;
    return raw;
  }

  // Compute a minimal patch plan. Files that still fit their original span are
  // overwritten in place; grown files are appended at the end of the ROM and
  // their FAT entries updated. Only changed regions are written.
  // Overlay content is always decompressed; its overlay-table compression flag
  // is cleared so the game loads it directly.
  buildPatchPlan(
    changes: Map<string, Uint8Array>,
    overlayChanges: Map<number, Uint8Array> = new Map(),
    arm9Change?: Uint8Array
  ): PatchPlan {
    const writes: PatchWrite[] = [];
    const fatUpdates = new Map<number, { start: number; end: number }>();
    let romSize = this.data.lim;
    const align = (n: number) => (n + 0x1ff) & ~0x1ff;

    if (arm9Change) {
      if (arm9Change.length !== this.arm9Size) {
        throw new Error('arm9 size must not change');
      }
      const oldArm9 = new Uint8Array(this.data.buf, this.data.base + this.arm9Offset, this.arm9Size);
      for (const w of diffSpans(this.arm9Offset, oldArm9, arm9Change)) writes.push(w);
    }

    const sorted = [...changes.entries()].sort(
      (a, b) => (this.getFileByPath(a[0])?.id ?? 0) - (this.getFileByPath(b[0])?.id ?? 0)
    );
    const fileChanges = new Map<number, Uint8Array>();
    for (const [path, content] of sorted) {
      const f = this.getFileByPath(path);
      if (!f) throw new Error(`NDS file not found: ${path}`);
      fileChanges.set(f.id, content);
    }
    const ovlTableWrites: PatchWrite[] = [];
    for (const [overlayId, content] of overlayChanges) {
      const ovl = this.overlays.find((o) => o.id === overlayId);
      if (!ovl) throw new Error(`Overlay ${overlayId} not found`);
      fileChanges.set(ovl.fileId, content);
      if (ovl.compressed) {
        const entry = new Uint8Array(4);
        new DataView(entry.buffer).setUint32(0, ovl.fileId, true); // clear compression flag
        const ovlOffset = this.data.view.getUint32(0x50, true);
        const idx = this.overlays.indexOf(ovl);
        ovlTableWrites.push({ position: ovlOffset + idx * 32 + 24, data: entry });
      }
    }
    for (const [id, content] of [...fileChanges.entries()].sort((a, b) => a[0] - b[0])) {
      const f = this.files[id];
      const oldSpan = f.end - f.start;
      if (content.length <= oldSpan) {
        const padded = new Uint8Array(oldSpan);
        padded.set(content);
        const oldBytes = new Uint8Array(this.data.buf, this.data.base + f.start, oldSpan);
        for (const w of diffSpans(f.start, oldBytes, padded)) writes.push(w);
        fatUpdates.set(f.id, { start: f.start, end: f.start + content.length });
      } else {
        const start = align(romSize);
        if (start > romSize) {
          writes.push({ position: romSize, data: new Uint8Array(start - romSize) });
        }
        writes.push({ position: start, data: content });
        fatUpdates.set(f.id, { start, end: start + content.length });
        romSize = start + content.length;
      }
    }

    writes.push(...ovlTableWrites);
    if (fatUpdates.size > 0) {
      const fat = new Uint8Array(this.fatSize);
      fat.set(new Uint8Array(this.data.buf, this.data.base + this.fatOffset, this.fatSize));
      const fv = new DataView(fat.buffer);
      for (const [id, { start, end }] of fatUpdates) {
        fv.setUint32(id * 8, start, true);
        fv.setUint32(id * 8 + 4, end, true);
      }
      writes.push({ position: this.fatOffset, data: fat });
    }

    if (romSize !== this.data.lim) {
      const header = new Uint8Array(0x160);
      header.set(new Uint8Array(this.data.buf, this.data.base, 0x160));
      const hv = new DataView(header.buffer);
      hv.setUint32(0x80, romSize, true);
      hv.setUint16(HEADER_CRC_OFFSET, crc16(header.subarray(0, HEADER_CRC_OFFSET)), true);
      writes.push({ position: 0, data: header });
    }

    writes.sort((a, b) => a.position - b.position);
    return { writes, newRomSize: romSize };
  }

  // Apply a patch plan to an in-memory copy (used for tests and Blob export).
  static applyPlan(rom: Uint8Array, plan: PatchPlan): Uint8Array {
    const out = new Uint8Array(Math.max(rom.length, plan.newRomSize));
    out.set(rom);
    for (const w of plan.writes) out.set(w.data, w.position);
    return out;
  }
}