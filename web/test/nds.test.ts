import { describe, it, expect } from 'vitest';
import { Bytes } from '../src/core/binary';
import { NdsRom } from '../src/core/nds';
import { fixture, fixtureJson, tsOutput, assertBytesEqual } from './helpers';

interface NdsManifest {
  files: Record<string, string>;
  overlays: Record<string, string>;
}

const manifest = fixtureJson<NdsManifest>('nds/manifest.json');

function loadRom(): NdsRom {
  return new NdsRom(Bytes.wrap(fixture('nds/test.nds')));
}

describe('NDS ROM filesystem', () => {
  it('resolves all file paths and contents', () => {
    const rom = loadRom();
    const overlayPaths = new Set(Object.values(manifest.overlays));
    for (const [path, name] of Object.entries(manifest.files)) {
      if (overlayPaths.has(name)) continue; // stored compressed, covered below
      const content = rom.readFile(path);
      assertBytesEqual(content.toUint8Array(), fixture(`nds/${name}.bin`), path);
    }
  });

  it('reads arm9', () => {
    const rom = loadRom();
    assertBytesEqual(rom.readArm9().toUint8Array(), fixture('nds/arm9.bin'), 'arm9');
  });

  it('decompresses overlays', () => {
    const rom = loadRom();
    for (const [id, name] of Object.entries(manifest.overlays)) {
      const content = rom.readOverlay(Number(id));
      assertBytesEqual(content.toUint8Array(), fixture(`nds/${name}.bin`), `overlay ${id}`);
    }
  });

  it('in-place patch keeps untouched bytes and updates changed files', () => {
    const rom = loadRom();
    const original = fixture('nds/test.nds');

    // grow pc.bin beyond its span, shrink sysdata.pak, change overlay 11 + arm9
    const newPcBin = new Uint8Array(16384).fill(0xab);
    const newSysdata = new Uint8Array(64).fill(0xcd);
    const newOverlay11 = new Uint8Array(7000).fill(0xef);
    const newArm9 = fixture('nds/arm9.bin').slice();
    newArm9[0x100] ^= 0xff;

    const plan = rom.buildPatchPlan(
      new Map([
        ['master/pc.bin', newPcBin],
        ['system/rom/sysdata.pak', newSysdata],
      ]),
      new Map([[11, newOverlay11]]),
      newArm9
    );
    const patched = NdsRom.applyPlan(original, plan);
    tsOutput('nds/patched.nds', patched);

    const rom2 = new NdsRom(Bytes.wrap(patched));
    assertBytesEqual(rom2.readFile('master/pc.bin').toUint8Array(), newPcBin, 'grown pc.bin');
    assertBytesEqual(rom2.readFile('system/rom/sysdata.pak').toUint8Array(), newSysdata, 'shrunk sysdata');
    assertBytesEqual(rom2.readOverlay(11).toUint8Array(), newOverlay11, 'overlay 11');
    assertBytesEqual(rom2.readArm9().toUint8Array(), newArm9, 'arm9');
    // overlay 9 still compressed and intact
    assertBytesEqual(rom2.readOverlay(9).toUint8Array(), fixture('nds/overlay9.bin'), 'overlay 9');

    // untouched files keep their exact original bytes and locations
    for (const path of ['master/pc.idx', 'system/rom/sysdata_rom.idx', 'battle/btlprocess.sbn', 'char/NaUnitAnimTable.bin', 'data/other.bin', 'overlay9']) {
      const f1 = rom.getFileByPath(path)!;
      const f2 = rom2.getFileByPath(path)!;
      expect(f2.start).toBe(f1.start);
      assertBytesEqual(
        patched.slice(f2.start, f2.end),
        original.slice(f1.start, f1.end),
        `untouched ${path}`
      );
    }

    // header CRC valid
    const crc = crc16(patched.subarray(0, 0x15e));
    expect(new DataView(patched.buffer).getUint16(0x15e, true)).toBe(crc);
    expect(new DataView(patched.buffer).getUint32(0x80, true)).toBe(patched.length);

    // patch writes must be far smaller than the whole ROM
    const written = plan.writes.reduce((n, w) => n + w.data.length, 0);
    expect(written).toBeLessThan(original.length / 2);
  });

  it('shrinking-only patch does not grow the ROM', () => {
    const rom = loadRom();
    const original = fixture('nds/test.nds');
    const plan = rom.buildPatchPlan(new Map([['master/pc.bin', new Uint8Array(100)]]));
    expect(plan.newRomSize).toBe(original.length);
    const patched = NdsRom.applyPlan(original, plan);
    const rom2 = new NdsRom(Bytes.wrap(patched));
    expect(rom2.readFile('master/pc.bin').lim).toBe(100);
  });
});

function crc16(data: Uint8Array): number {
  let crc = 0xffff;
  for (const b of data) {
    crc ^= b;
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1;
  }
  return crc & 0xffff;
}