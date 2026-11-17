// Port of IdxAndPak.java: secondary idx/pak containers (sysdata, UnitSst, text, ...).

import { Bytes, align16 } from './binary';

export class IdxAndPak {
  name: string;
  files: Array<Bytes | null> = [];

  constructor(name: string, idx: Bytes, pak: Bytes) {
    this.name = name;
    idx.rewind();
    pak.rewind();

    idx.getInt(); // unused header word
    const numEntries = Math.floor(idx.remaining() / 6);

    for (let i = 0; i < numEntries; i++) {
      const a1 = idx.getU32();
      idx.getShort();
      const ab1 = (a1 << 5) >>> 8;
      if ((a1 & 7) !== 0) {
        if (i !== numEntries - 1) this.files.push(null);
        continue;
      }
      const a2 = idx.peekInt(idx.pos) >>> 0;
      const ab2 = (a2 << 5) >>> 8;
      const size = (ab2 - ab1) << 2;
      const offset = ab1 << 2;
      this.files.push(pak.slice(offset, size));
    }
  }

  numFiles(): number {
    return this.files.length;
  }

  getFile(id: number): Bytes | null {
    return this.files[id];
  }

  setFile(id: number, newFile: Bytes | null): void {
    this.files[id] = newFile;
  }

  setNumFiles(newCount: number): void {
    while (this.files.length < newCount) this.files.push(null);
    while (this.files.length > newCount) this.files.pop();
  }

  repack(): { idx: Bytes; pak: Bytes } {
    const n = this.files.length;
    // Always end with a null file; pad idx size to a multiple of 4.
    const newIdxSize = 4 + 6 * (n + 1) + (n % 2 !== 1 ? 2 : 0);
    const newIdx = Bytes.alloc(newIdxSize);
    let newPakSize = 0;
    for (const f of this.files) if (f) newPakSize += align16(f.lim);
    if (newPakSize % 4 !== 0) newPakSize += 4 - (newPakSize % 4);
    const newPak = Bytes.alloc(newPakSize);

    newIdx.putInt(0);
    let offset = 0;
    for (const file of this.files) {
      const c = file ? 0 : 7;
      newIdx.putU32((2 * offset + c) >>> 0);
      newIdx.putShort(0);
      if (!file) continue;
      file.rewind();
      const size = file.remaining();
      newPak.putBytes(file);
      newPak.putZeroes(align16(offset + size) - newPak.pos);
      offset = align16(offset + size);
    }
    newIdx.putU32((2 * offset + 7) >>> 0);
    return { idx: newIdx.rewind(), pak: newPak.rewind() };
  }
}