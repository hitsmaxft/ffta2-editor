import { describe, it, expect } from 'vitest';
import { Bytes } from '../src/core/binary';
import { Archive } from '../src/core/archive';
import { fixture, fixtureJson, tsOutput, assertBytesEqual } from './helpers';

interface ArchiveManifest {
  entries: Array<
    | null
    | { single: string }
    | { list: Array<{ name: string; chr: number; chrPosition: number }> }
  >;
}

const manifest = fixtureJson<ArchiveManifest>('archive/manifest.json');

function loadArchive(): Archive {
  return new Archive(Bytes.wrap(fixture('archive/pc.idx')), Bytes.wrap(fixture('archive/pc.bin')));
}

describe('Archive vs Java reference', () => {
  it('parses every entry identically', () => {
    const archive = loadArchive();
    expect(archive.files.length).toBe(manifest.entries.length);
    manifest.entries.forEach((entry, i) => {
      const actual = archive.files[i];
      if (entry === null) {
        expect(actual).toBeNull();
        return;
      }
      expect(actual).not.toBeNull();
      if ('single' in entry) {
        expect(actual!.isList).toBe(false);
        if (!actual!.isList) {
          assertBytesEqual(actual!.file.toUint8Array(), fixture(`archive/${entry.single}.bin`), `entry ${i}`);
        }
      } else {
        expect(actual!.isList).toBe(true);
        if (actual!.isList) {
          expect(actual!.files.length).toBe(entry.list.length);
          entry.list.forEach((sub, j) => {
            expect(actual!.files[j].chr).toBe(sub.chr);
            expect(actual!.files[j].chrPosition).toBe(sub.chrPosition);
            const lookupName = 'n'.repeat(sub.chrPosition) + String.fromCharCode(sub.chr) + 'suffix';
            const got = archive.getFile(i, lookupName)!;
            assertBytesEqual(got.toUint8Array(), fixture(`archive/${sub.name}.bin`), `entry ${i},${j}`);
          });
        }
      }
    });
  });

  it('filename CRC matches Java', () => {
    const crcs = fixtureJson<Record<string, number>>('archive/filename_crc.json');
    for (const [name, id] of Object.entries(crcs)) {
      expect(Archive.filenameCrc(name)).toBe(id);
    }
  });

  it('repack is byte-identical to Java repack', () => {
    const archive = loadArchive();
    const { idx, bin } = archive.repack();
    assertBytesEqual(idx.toUint8Array(), fixture('archive/repacked.idx'), 'repacked.idx');
    assertBytesEqual(bin.toUint8Array(), fixture('archive/repacked.bin'), 'repacked.bin');
    tsOutput('archive/repacked.idx', idx.toUint8Array());
    tsOutput('archive/repacked.bin', bin.toUint8Array());
  });

  it('modified repack is byte-identical to Java modified repack', () => {
    const archive = loadArchive();
    archive.setFile(0, Bytes.wrap(fixture('archive/modified_0.bin')));
    archive.setFile(2, Bytes.wrap(fixture('archive/modified_2_1.bin')), 'name_jsuffix');
    archive.setFile(5, Bytes.wrap(fixture('archive/modified_5.bin')));
    const { idx, bin } = archive.repack();
    assertBytesEqual(idx.toUint8Array(), fixture('archive/modified_repacked.idx'), 'modified idx');
    assertBytesEqual(bin.toUint8Array(), fixture('archive/modified_repacked.bin'), 'modified bin');
    tsOutput('archive/modified_repacked.idx', idx.toUint8Array());
    tsOutput('archive/modified_repacked.bin', bin.toUint8Array());

    // repack of the repack must be stable (idempotent layout)
    const round2 = new Archive(idx, bin);
    const again = round2.repack();
    assertBytesEqual(again.idx.toUint8Array(), idx.toUint8Array(), 'repack idempotence idx');
    assertBytesEqual(again.bin.toUint8Array(), bin.toUint8Array(), 'repack idempotence bin');
  });
});