import { describe, it, expect } from 'vitest';
import { Bytes } from '../src/core/binary';
import { IdxAndPak } from '../src/core/idxpak';
import { fixture, fixtureJson, tsOutput, assertBytesEqual } from './helpers';

interface PakManifest {
  files: Array<string | null>;
}

const manifest = fixtureJson<PakManifest>('idxpak/manifest.json');

describe('IdxAndPak vs Java reference', () => {
  it('parses every file identically', () => {
    const pak = new IdxAndPak('test', Bytes.wrap(fixture('idxpak/in.idx')), Bytes.wrap(fixture('idxpak/in.pak')));
    expect(pak.numFiles()).toBe(manifest.files.length);
    manifest.files.forEach((name, i) => {
      const f = pak.getFile(i);
      if (name === null) {
        expect(f).toBeNull();
      } else {
        assertBytesEqual(f!.toUint8Array(), fixture(`idxpak/${name}.bin`), `file ${i}`);
      }
    });
  });

  it('repack is byte-identical to Java', () => {
    const pak = new IdxAndPak('test', Bytes.wrap(fixture('idxpak/in.idx')), Bytes.wrap(fixture('idxpak/in.pak')));
    const { idx, pak: newPak } = pak.repack();
    assertBytesEqual(idx.toUint8Array(), fixture('idxpak/repacked.idx'), 'repacked.idx');
    assertBytesEqual(newPak.toUint8Array(), fixture('idxpak/repacked.pak'), 'repacked.pak');
    tsOutput('idxpak/repacked.idx', idx.toUint8Array());
    tsOutput('idxpak/repacked.pak', newPak.toUint8Array());
  });

  it('modified repack is byte-identical to Java', () => {
    const pak = new IdxAndPak('test', Bytes.wrap(fixture('idxpak/in.idx')), Bytes.wrap(fixture('idxpak/in.pak')));
    pak.setFile(0, Bytes.wrap(fixture('idxpak/modified_0.bin')));
    pak.setFile(2, Bytes.wrap(fixture('idxpak/modified_2.bin')));
    pak.setFile(4, null);
    const { idx, pak: newPak } = pak.repack();
    assertBytesEqual(idx.toUint8Array(), fixture('idxpak/modified_repacked.idx'), 'modified idx');
    assertBytesEqual(newPak.toUint8Array(), fixture('idxpak/modified_repacked.pak'), 'modified pak');
    tsOutput('idxpak/modified_repacked.idx', idx.toUint8Array());
    tsOutput('idxpak/modified_repacked.pak', newPak.toUint8Array());

    const round2 = new IdxAndPak('r2', idx, newPak);
    expect(round2.numFiles()).toBe(pak.numFiles());
    for (let i = 0; i < pak.numFiles(); i++) {
      const a = pak.getFile(i);
      const b = round2.getFile(i);
      if (a === null || b === null) {
        expect(a === null && b === null).toBe(true);
      } else {
        // The format derives sizes from the next entry's aligned offset, so a
        // re-parsed file includes alignment padding (same behavior as Java).
        expect(b.lim).toBe((a.lim + 31) & ~31);
        assertBytesEqual(b.toUint8Array().slice(0, a.lim), a.toUint8Array(), `round2 file ${i}`);
      }
    }
  });

  it('odd file count padding matches Java', () => {
    const pak = new IdxAndPak('odd', Bytes.wrap(fixture('idxpak/odd.idx')), Bytes.wrap(fixture('idxpak/odd.pak')));
    expect(pak.numFiles()).toBe(3);
    const { idx, pak: newPak } = pak.repack();
    assertBytesEqual(idx.toUint8Array(), fixture('idxpak/odd_repacked.idx'), 'odd idx');
    assertBytesEqual(newPak.toUint8Array(), fixture('idxpak/odd_repacked.pak'), 'odd pak');
    tsOutput('idxpak/odd_repacked.idx', idx.toUint8Array());
    tsOutput('idxpak/odd_repacked.pak', newPak.toUint8Array());
  });
});