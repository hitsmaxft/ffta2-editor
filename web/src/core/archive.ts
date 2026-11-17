// Port of Archive.java: the master pc.idx / pc.bin container.

import { Bytes, align16 } from './binary';

export interface ArchiveEntryList {
  chr: number; // signed byte, as in Java
  chrPosition: number;
  file: Bytes;
}

export type ArchiveEntry =
  | { isList: true; files: ArchiveEntryList[] }
  | { isList: false; file: Bytes }
  | null;

interface ExtraData {
  offset: number;
  size: number;
  chr: number;
  chrPosition: number;
}

function decodeTableId(a: number, b: number): { offset: number; size: number } {
  const offset = (a & 0x3ffffff) * 2;
  const size = ((a >>> 26) + (b & 0xffff) * 64) * 4;
  return { offset, size };
}

function encodeTableId(offset: number, size: number): { a: number; b: number } {
  const a = Math.floor(offset / 2) + ((Math.floor(size / 4) & 0x3f) * 0x4000000);
  const b = 0x360000 + Math.floor(Math.floor(size / 4) / 64);
  return { a, b };
}

export class Archive {
  files: ArchiveEntry[] = [];
  warnings: string[] = [];
  private extraStart = 0;

  constructor(pcIdx: Bytes, pcBin: Bytes) {
    const numIds = pcIdx.getInt();
    pcIdx.getInt(); // unused
    const tableByIds: Array<{ a: number; b: number }> = [];
    for (let i = 0; i < numIds; i++) {
      const a = pcIdx.getU32();
      const b = pcIdx.getU32();
      pcIdx.get(); // always 0 in practice
      tableByIds.push({ a, b });
    }
    this.extraStart = pcIdx.pos;
    const extra = pcIdx.slice(this.extraStart, pcIdx.remaining());

    const bottomTable = this.unpackBottomTable(extra);

    for (const { a, b } of tableByIds) {
      if (a === 0 && b === 0) {
        this.files.push(null);
        continue;
      }
      const decoded = decodeTableId(a, b);
      if ((a & 1) === 1) {
        const index = Math.floor(decoded.offset / 4) - this.extraStart;
        const extras = bottomTable.get(index);
        if (!extras) throw new Error(`Archive: missing bottom table at ${index}`);
        const entry: ArchiveEntry = { isList: true, files: [] };
        for (const ex of extras) {
          const newSize = ex.size === 0 ? decoded.size : ex.size;
          entry.files.push({
            chr: ex.chr,
            chrPosition: ex.chrPosition,
            file: pcBin.slice(ex.offset, newSize),
          });
        }
        this.files.push(entry);
      } else {
        this.files.push({ isList: false, file: pcBin.slice(decoded.offset, decoded.size) });
      }
    }
  }

  private unpackBottomTable(extra: Bytes): Map<number, ExtraData[]> {
    const extras = new Map<number, ExtraData[]>();
    while (extra.remaining() > 0) {
      const startOffset = extra.pos;
      const numEntries = extra.get(); // signed, as in Java
      if (numEntries === 0) break;
      const list: ExtraData[] = [];
      for (let i = 0; i < numEntries; i++) {
        const offset = extra.getInt();
        let size = 0;
        if (i !== 0) {
          size = extra.getInt();
          extra.getInt(); // skip 4 bytes
        }
        const chr = extra.get();
        const chrPosition = extra.get();
        extra.get(); // skip 1 byte
        list.push({ offset: offset * 4, size: size * 4, chr, chrPosition });
      }
      extras.set(startOffset, list);
    }
    return extras;
  }

  static filenameCrc(name: string): number {
    const asBytes = new TextEncoder().encode(name);
    let crc = (asBytes[0] << 24) >> 24; // signed byte
    for (let i = 1; i < asBytes.length; i++) {
      const b = (asBytes[i] << 24) >> 24;
      crc = (Math.imul(crc, 0x25) + b) | 0;
    }
    return crc & 0x3ff;
  }

  getFile(id: number, name = ''): Bytes | null {
    const entry = this.files[id];
    if (!entry) return null;
    if (entry.isList) {
      for (const sub of entry.files) {
        if (sub.chrPosition < name.length && name.charCodeAt(sub.chrPosition) === sub.chr) {
          return sub.file;
        }
      }
      return null;
    }
    return entry.file;
  }

  getFileByName(name: string): Bytes | null {
    return this.getFile(Archive.filenameCrc(name), name);
  }

  setFile(id: number, newFile: Bytes, name = ''): void {
    if (newFile.lim % 4 !== 0) {
      this.warnings.push(`Size of file "${name}" is not a multiple of 4 (${newFile.lim})`);
    }
    const entry = this.files[id];
    if (!entry) return;
    if (entry.isList) {
      for (const sub of entry.files) {
        if (sub.chrPosition < name.length && name.charCodeAt(sub.chrPosition) === sub.chr) {
          sub.file = newFile;
          return;
        }
      }
    } else {
      entry.file = newFile;
    }
  }

  setFileByName(name: string, newFile: Bytes): void {
    this.setFile(Archive.filenameCrc(name), newFile, name);
  }

  repack(): { idx: Bytes; bin: Bytes } {
    let currentOffset = 0;
    let bottomTableEntriesOffset = this.files.length * 9 + 8;
    const idxSize = this.files.length * 9 + 8;

    let bottomTableSize = 0;
    let binSize = 0;
    for (const entry of this.files) {
      if (!entry) continue;
      if (entry.isList) {
        bottomTableSize += (entry.files.length - 1) * 15 + 8;
        for (const sub of entry.files) binSize += align16(sub.file.lim);
      } else {
        binSize += align16(entry.file.lim);
      }
    }

    const newPcIdx = Bytes.alloc(idxSize + bottomTableSize);
    const newPcBin = Bytes.alloc(binSize);
    const bottom = newPcIdx.slice(idxSize, bottomTableSize);

    newPcIdx.putInt(this.files.length);
    newPcIdx.putInt(0);

    for (let i = 0; i < this.files.length; i++) {
      const entry = this.files[i];
      if (!entry) {
        newPcIdx.putZeroes(9);
        continue;
      }
      if (entry.isList) {
        bottom.put(entry.files.length);
        for (let j = 0; j < entry.files.length; j++) {
          const sub = entry.files[j];
          sub.file.rewind();
          const size = sub.file.remaining();
          if (size % 4 !== 0) {
            this.warnings.push(`Size of file (${i},${j}) is not a multiple of 4 (${size})`);
          }
          bottom.putInt(Math.floor(currentOffset / 4));
          if (j === 0) {
            const encoded = encodeTableId(bottomTableEntriesOffset * 4, size);
            newPcIdx.putU32(encoded.a + 1);
            newPcIdx.putU32(encoded.b);
            newPcIdx.pos -= 2;
            newPcIdx.put(0x42);
            newPcIdx.put(0);
            newPcIdx.put(0);
          } else {
            bottom.putInt(Math.floor(size / 4));
            bottom.putInt(0);
          }
          bottom.put(sub.chr);
          bottom.put(sub.chrPosition & 0xff);
          bottom.put(0);

          newPcBin.putBytes(sub.file);
          const newOffset = align16(currentOffset + size);
          newPcBin.putZeroes(newOffset - (currentOffset + size));
          currentOffset = newOffset;
        }
        bottomTableEntriesOffset = bottom.pos + idxSize;
      } else {
        entry.file.rewind();
        const size = entry.file.remaining();
        if (size % 4 !== 0) {
          this.warnings.push(`Size of file ${i} is not a multiple of 4 (${size})`);
        }
        newPcBin.putBytes(entry.file);
        const encoded = encodeTableId(currentOffset, size);
        newPcIdx.putU32(encoded.a);
        newPcIdx.putU32(encoded.b);
        newPcIdx.pos -= 2;
        newPcIdx.put(0x42);
        newPcIdx.put(0);
        newPcIdx.put(0);

        const newOffset = align16(currentOffset + size);
        newPcBin.putZeroes(newOffset - (currentOffset + size));
        currentOffset = newOffset;
      }
    }
    if (bottom.pos !== bottom.lim) {
      this.warnings.push(`bottomTableEntries size wrong (${bottom.pos} != ${bottom.lim})`);
    }
    if (newPcIdx.pos !== newPcIdx.lim - bottomTableSize) {
      this.warnings.push(`Idx size wrong (${newPcIdx.pos} != ${newPcIdx.lim})`);
    }
    if (newPcBin.pos !== newPcBin.lim) {
      this.warnings.push(`Bin size wrong (${newPcBin.pos} != ${newPcBin.lim})`);
    }
    return { idx: newPcIdx.rewind(), bin: newPcBin.rewind() };
  }
}