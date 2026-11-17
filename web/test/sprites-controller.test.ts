import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bytesEqual } from '../src/core/binary';
import { IdxAndPak } from '../src/core/idxpak';
import * as LZSS from '../src/core/lzss';
import { loadRom } from '../src/data/load';
import { loadSprites, saveSprites, getUnitSpriteState } from '../src/data/controllers/sprites';
import { UnitSst, TopSprite, UnitFace } from '../src/data/model/sprites';
import { fixturesDir } from './helpers';

const romDir = join(fixturesDir, '../../../data/extracted');
const romFile = existsSync(romDir)
  ? readdirSync(romDir).find((f) => f.endsWith('.nds'))
  : undefined;
const romPath = romFile ? join(romDir, romFile) : null;

// These tests run only when a real ROM is present locally (data/ is gitignored).
describe.skipIf(!romPath)('sprites controller (real ROM)', () => {
  const rom = romPath ? new Uint8Array(readFileSync(romPath)) : new Uint8Array(0);

  it('loadSprites populates unitSstList/topSprites/unitFaces/maps/sbn', () => {
    const data = loadRom(rom);
    loadSprites(data);

    expect(data.unitSstList.length).toBeGreaterThan(0);
    expect(data.topSprites.length).toBeGreaterThan(1);
    expect(data.unitFaces.length).toBeGreaterThan(1);
    expect(data.maps.length).toBeGreaterThan(0);
    expect(data.sbn).not.toBeNull();
    expect(data.sbn!.commands.length).toBeGreaterThan(0);

    // Blank leading entries, then one entry per NON-NULL file (Java skips
    // nulls): topSprite id = fileIndex+1, face id = fileIndex.
    const nonNull = (pak: IdxAndPak) =>
      Array.from({ length: pak.numFiles() }, (_, i) => i).filter((i) => pak.getFile(i) != null);
    expect(data.topSprites[0].id).toBe(0);
    expect(data.unitFaces[0].id).toBe(0);
    expect(data.topSprites.length).toBe(nonNull(data.atl!).length + 1);
    expect(data.unitFaces.length).toBe(nonNull(data.face!).length + 1);
    expect(data.topSprites[1].id).toBe(nonNull(data.atl!)[0] + 1);
    expect(data.unitFaces[1].id).toBe(nonNull(data.face!)[0]);

    // Every loaded unit has sprite state with palettes and compressed slices.
    for (const sst of data.unitSstList) {
      const state = getUnitSpriteState(sst);
      expect(state).toBeDefined();
      expect(state!.spritePalettes).not.toBeNull();
      expect(state!.spritePalettes!.palettes.length).toBeGreaterThan(0);
      expect(state!.compressedSpriteList.length).toBe(state!.spriteData!.spriteMaps.length);
    }

    // Maps got palettes filled from plttData via the shared MapCtrl cursor.
    for (const map of data.maps) {
      expect(map.palettes.length).toBeGreaterThan(0);
      expect(map.texture.length).toBeGreaterThan(0);
    }
    expect(data.maps.some((m) => m.palettes.some((p) => p.some((b) => b !== 0)))).toBe(true);
    expect(data.maps.some((m) => m.parts !== null && m.parts.length > 0)).toBe(true);
  });

  it('saveSprites with no changes leaves all files untouched', () => {
    const data = loadRom(rom);
    loadSprites(data);
    const snapshot = (pak: IdxAndPak) =>
      Array.from({ length: pak.numFiles() }, (_, i) => {
        const f = pak.getFile(i);
        return f ? f.toUint8Array() : null;
      });
    const before = {
      sst: snapshot(data.unitSsts!),
      cg: snapshot(data.unitCgs!),
      atl: snapshot(data.atl!),
      face: snapshot(data.face!),
    };
    saveSprites(data);
    expect(snapshot(data.unitSsts!)).toEqual(before.sst);
    expect(snapshot(data.unitCgs!)).toEqual(before.cg);
    expect(snapshot(data.atl!)).toEqual(before.atl);
    expect(snapshot(data.face!)).toEqual(before.face);
    // saveSprites must not write maps/sbn/naUnitAnimTable back.
    expect(data.sbn).not.toBeNull();
  });

  it('changed unit round-trips: sst reparse, cg pixels and palettes preserved', () => {
    const data = loadRom(rom);
    loadSprites(data);
    const i = 0;
    const sst = data.unitSstList[i];
    const state = getUnitSpriteState(sst)!;

    // Capture originals before save mutates sprite map offsets.
    const origCg = data.unitCgs!.getFile(i)!.toUint8Array();
    const origPalettes = sst.getPalettes()!.toUint8Array();
    const origNodes = sst.asList().map((n) => ({ key: n.key, value: n.value! }));
    const origPixels = state.spriteData!.spriteMaps.map((m) => {
      const cg = data.unitCgs!.getFile(i)!;
      cg.position(m.spriteOffset);
      return LZSS.decode(cg).decodedData.toUint8Array();
    });
    const origSpriteMaps = state.spriteData!.spriteMaps.map((m) => ({ ...m }));

    sst.hasChanged = true;
    saveSprites(data);

    // UnitCg: Java save packs the compressed slices CONTIGUOUSLY (the original
    // ROM layout has alignment gaps between sprites), rewriting map offsets.
    const newCg = data.unitCgs!.getFile(i)!;
    const combined = state.compressedSpriteList.reduce((n, x) => n + x.lim, 0);
    expect(newCg.lim).toBe(combined);
    const expectedCg = new Uint8Array(combined);
    let off = 0;
    for (const slice of state.compressedSpriteList) {
      expectedCg.set(slice.toUint8Array(), off);
      off += slice.lim;
    }
    expect(bytesEqual(newCg.toUint8Array(), expectedCg)).toBe(true);
    // Each slice is still a byte-identical copy of the original cg region.
    origSpriteMaps.forEach((m, idx) => {
      const slice = state.compressedSpriteList[idx];
      expect(bytesEqual(slice.toUint8Array(), origCg.slice(m.spriteOffset, m.spriteOffset + slice.lim))).toBe(true);
    });

    // Reparse the saved UnitSst and verify everything survived.
    const reparsed = new UnitSst(data.unitSsts!.getFile(i)!);
    expect(reparsed.size).toBe(sst.size);
    const newPalettes = reparsed.getPalettes()!.toUint8Array();
    expect(bytesEqual(newPalettes, origPalettes)).toBe(true);
    const newSpriteData = reparsed.getSpriteMap()!;
    expect(newSpriteData.spriteMaps.length).toBe(origSpriteMaps.length);
    let expectedOffset = 0;
    newSpriteData.spriteMaps.forEach((m, idx) => {
      // Offsets rewritten to the contiguous layout; pieces/unknown preserved.
      expect(m.spriteOffset).toBe(expectedOffset);
      expectedOffset += state.compressedSpriteList[idx].lim;
      expect(m.unkownValue).toBe(origSpriteMaps[idx].unkownValue);
      expect(m.pieces).toEqual(origSpriteMaps[idx].pieces);
      const cg = data.unitCgs!.getFile(i)!;
      cg.position(m.spriteOffset);
      expect(bytesEqual(LZSS.decode(cg).decodedData.toUint8Array(), origPixels[idx])).toBe(true);
    });
    // Animation nodes keep their exact compressed values.
    for (const { key, value } of origNodes) {
      if (key === 0x00ff || key === 0x00f0) continue;
      expect(bytesEqual(reparsed.getCompressedValue(key)!, value)).toBe(true);
    }
  });

  it('changed top sprite and face round-trip through atl/face files', () => {
    const data = loadRom(rom);
    loadSprites(data);
    const top = data.topSprites[1];
    const face = data.unitFaces[1];
    top.hasChanged = true;
    face.hasChanged = true;
    saveSprites(data);

    const atlBytes = data.atl!.getFile(top.id - 1)!;
    expect(bytesEqual(atlBytes.toUint8Array(), top.toBytes())).toBe(true);
    const faceBytes = data.face!.getFile(face.id)!;
    expect(bytesEqual(faceBytes.toUint8Array(), face.toBytes())).toBe(true);

    // Reparse and reserialize: stable.
    const top2 = new TopSprite(atlBytes.rewind(), top.id);
    expect(bytesEqual(top2.toBytes(), top.toBytes())).toBe(true);
    const face2 = new UnitFace(faceBytes.rewind(), face.id);
    expect(bytesEqual(face2.toBytes(), face.toBytes())).toBe(true);
  });

  it('saved unitSsts/unitCgs/atl/face repack and reparse round-trip', () => {
    const data = loadRom(rom);
    loadSprites(data);
    data.unitSstList[0].hasChanged = true;
    data.topSprites[1].hasChanged = true;
    data.unitFaces[1].hasChanged = true;
    saveSprites(data);

    for (const pak of [data.unitSsts!, data.unitCgs!, data.atl!, data.face!]) {
      const original: (Uint8Array | null)[] = [];
      for (let i = 0; i < pak.numFiles(); i++) {
        const f = pak.getFile(i);
        original.push(f ? f.toUint8Array() : null);
      }
      const { idx, pak: pakBytes } = pak.repack();
      const reparsed = new IdxAndPak('rt', idx, pakBytes);
      expect(reparsed.numFiles()).toBe(pak.numFiles());
      for (let i = 0; i < reparsed.numFiles(); i++) {
        const f = reparsed.getFile(i);
        if (original[i] == null) {
          expect(f).toBeNull();
        } else {
          expect(f).not.toBeNull();
          const got = f!.toUint8Array();
          // Reparsed files include alignment padding; compare the original prefix.
          expect(got.length).toBeGreaterThanOrEqual(original[i]!.length);
          expect(bytesEqual(got.slice(0, original[i]!.length), original[i]!)).toBe(true);
        }
      }
    }
  });
});