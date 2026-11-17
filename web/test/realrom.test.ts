import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Bytes } from '../src/core/binary';
import { NdsRom } from '../src/core/nds';
import { IdxAndPak } from '../src/core/idxpak';
import { loadRom } from '../src/data/load';
import { loadMessages } from '../src/data/text';
import { fixturesDir, tsOutput } from './helpers';

const romDir = join(fixturesDir, '../../../data/extracted');
const romFile = existsSync(romDir)
  ? readdirSync(romDir).find((f) => f.endsWith('.nds'))
  : undefined;
const romPath = romFile ? join(romDir, romFile) : null;

// These tests run only when a real ROM is present locally (data/ is gitignored).
describe.skipIf(!romPath)('real ROM end-to-end', () => {
  const rom = romPath ? new Uint8Array(readFileSync(romPath)) : new Uint8Array(0);

  it('parses the NDS filesystem', () => {
    const nds = new NdsRom(Bytes.wrap(rom));
    expect(nds.files.length).toBeGreaterThan(10);
    expect(nds.arm9Size).toBeGreaterThan(0);
    expect(nds.overlays.length).toBeGreaterThan(0);
    expect(nds.getFileByPath('master/pc.idx')).toBeDefined();
    expect(nds.getFileByPath('master/pc.bin')).toBeDefined();
    const arm9 = nds.readArm9();
    expect(arm9.remaining()).toBe(nds.arm9Size);
    const ovl11 = nds.readOverlay(11);
    expect(ovl11.remaining()).toBeGreaterThan(0);
  });

  it('loads all archive resources and IdxAndPaks', () => {
    const data = loadRom(rom);
    expect(data.archive).not.toBeNull();
    expect(data.arm9!.remaining()).toBeGreaterThan(0);
    expect(data.naUnitAnimTable!.remaining()).toBeGreaterThan(0);
    for (const pak of [data.sysdata, data.unitSsts, data.unitCgs, data.jdMessage, data.jhQuest, data.jhRumor, data.jhNotice, data.evMsg, data.entrydata, data.atl, data.face, data.mapData, data.texData, data.plttData]) {
      expect(pak).not.toBeNull();
      expect(pak!.numFiles()).toBeGreaterThan(0);
    }
  });

  it('decodes real text tables', () => {
    const data = loadRom(rom);
    loadMessages(data);
    expect(data.messageList.length).toBeGreaterThan(0);
    expect(data.characterNames.length).toBeGreaterThan(0);
    expect(data.jobNames.length).toBeGreaterThan(0);
    expect(data.itemNames.length).toBeGreaterThan(0);
    expect(data.questList.length).toBeGreaterThan(0);
    // Names must decode to non-empty text (this ROM is Chinese-localized).
    expect(data.jobNames.some((n) => n.string.length > 0)).toBe(true);
    expect(data.characterNames.some((n) => n.string.length > 0)).toBe(true);
    tsOutput(
      'realrom/sample.json',
      new TextEncoder().encode(
        JSON.stringify(
          {
            jobNames: data.jobNames.slice(0, 12),
            characterNames: data.characterNames.slice(0, 12),
            itemNames: data.itemNames.slice(0, 12),
          },
          null,
          2
        )
      )
    );
  });

  it('IdxAndPak repack round-trips on real data', () => {
    const data = loadRom(rom);
    for (const pak of [data.sysdata, data.jdMessage, data.evMsg, data.face]) {
      const original: (Uint8Array | null)[] = [];
      for (let i = 0; i < pak!.numFiles(); i++) {
        const f = pak!.getFile(i);
        original.push(f ? f.toUint8Array() : null);
      }
      const { idx, pak: pakBytes } = pak!.repack();
      const reparsed = new IdxAndPak('rt', idx, pakBytes);
      expect(reparsed.numFiles()).toBe(pak!.numFiles());
      for (let i = 0; i < reparsed.numFiles(); i++) {
        const f = reparsed.getFile(i);
        if (original[i] == null) {
          expect(f).toBeNull();
        } else {
          expect(f).not.toBeNull();
          const got = f!.toUint8Array();
          // Reparsed files include alignment padding; compare the original prefix.
          expect(got.length).toBeGreaterThanOrEqual(original[i]!.length);
          expect(got.slice(0, original[i]!.length)).toEqual(original[i]);
        }
      }
    }
  });
});