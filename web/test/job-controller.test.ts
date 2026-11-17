import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Bytes } from '../src/core/binary';
import { IdxAndPak } from '../src/core/idxpak';
import { loadRom } from '../src/data/load';
import { loadMessages } from '../src/data/text';
import { RomData } from '../src/data/romData';
import { JobData, JobRequirementData } from '../src/data/model/job';
import {
  loadJobs,
  saveJobs,
  loadCharacters,
  saveCharacters,
  loadJobGroups,
  saveJobGroups,
  loadJobRequirements,
  saveJobRequirements,
} from '../src/data/controllers/job';
import { fixturesDir } from './helpers';

const romDir = join(fixturesDir, '../../../data/extracted');
const romFile = existsSync(romDir)
  ? readdirSync(romDir).find((f) => f.endsWith('.nds'))
  : undefined;
const romPath = romFile ? join(romDir, romFile) : null;

function u8(b: Bytes, offset: number): number {
  b.position(offset);
  return b.getU8();
}

// Mirrors PatchesController.loadPatches detection (patches not ported yet).
function expandedTopSprites(data: RomData): boolean {
  return (data.arm9!.peekInt(0x000b5ab4) >>> 0) !== 0xe5d00018;
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrays) {
    out.set(a, off);
    off += a.length;
  }
  return out;
}

// Java quirks that must survive the port (no ROM needed).
describe('job model quirks preserved by controller save path', () => {
  it('JobData.toBytes writes abilitySet as u16, clobbering parsed _0x2f', () => {
    const raw = Bytes.alloc(0x48);
    raw.position(0x2e);
    raw.putU8(5); // abilitySet
    raw.position(0x2f);
    raw.putU8(0xab); // _0x2f
    raw.rewind();
    const job = new JobData(raw, 0);
    expect(job.abilitySet).toBe(5);
    expect(job._0x2f).toBe(0xab);
    const out = job.toBytes();
    expect(out[0x2e]).toBe(5);
    expect(out[0x2f]).toBe(0); // clobbered by the u16 write, exactly as Java
  });

  it('JobRequirementData clamps out-of-range ability-set indices to 0', () => {
    const raw = Bytes.alloc(0xc);
    raw.position(6);
    raw.putU8(200);
    raw.position(8);
    raw.putU8(250);
    raw.position(10);
    raw.putU8(255);
    raw.rewind();
    const req = new JobRequirementData(raw, 0, 10);
    expect(req.job1).toBe(0);
    expect(req.job2).toBe(0);
    expect(req.job3).toBe(0);
    const out = req.toBytes();
    expect(out[6]).toBe(0);
    expect(out[8]).toBe(0);
    expect(out[10]).toBe(0);
  });
});

// These tests run only when a real ROM is present locally (data/ is gitignored).
describe.skipIf(!romPath)('job controller on real ROM', () => {
  const rom = romPath ? new Uint8Array(readFileSync(romPath)) : new Uint8Array(0);

  // Load order: text -> jobs -> characters -> jobGroups -> jobRequirements.
  // Abilities/sprites controllers are not ported yet; the TS models keep raw
  // indices, so loadJobs only needs the text name tables (for warnings).
  function loadAll(): RomData {
    const data = loadRom(rom);
    loadMessages(data);
    loadJobs(data);
    loadCharacters(data);
    loadJobGroups(data);
    loadJobRequirements(data);
    return data;
  }

  function repackSysdata(data: RomData): void {
    const { idx, pak } = data.sysdata!.repack();
    data.sysdata = new IdxAndPak('rt', idx, pak);
  }

  it('loadJobs populates ability sets and jobs using arm9 counts', () => {
    const data = loadRom(rom);
    loadMessages(data);
    loadJobs(data);
    const numAbilitysets = u8(data.arm9!, 0xcb054) + 1;
    const numJobs = u8(data.arm9!, 0xcafdc) + 1;
    expect(data.abilitySetList.length).toBe(numAbilitysets);
    expect(data.jobDataList.length).toBe(numJobs);
    expect(numAbilitysets).toBeGreaterThan(1);
    expect(numJobs).toBeGreaterThan(1);
    expect(data.abilitySetList.some((s) => s.abilities.length > 0)).toBe(true);
    // Ability references stay raw indices into the (not-yet-loaded) ability list.
    for (const set of data.abilitySetList) {
      for (const a of set.abilities) {
        expect(a.ability).toBeGreaterThanOrEqual(0);
        expect(a.ability).toBeLessThan(0x10000);
      }
    }
    // Job ability-set references were clamped into range by the controller.
    for (const job of data.jobDataList) {
      expect(job.abilitySet).toBeLessThan(data.abilitySetList.length);
    }
    expect(data.jobNames.length).toBeGreaterThan(0);
  });

  it('loadCharacters populates characters using arm9 count', () => {
    const data = loadAll();
    const numCharacters = u8(data.arm9!, 0xcb018) + 1;
    expect(data.characterList.length).toBe(numCharacters);
    expect(numCharacters).toBeGreaterThan(1);
    for (const c of data.characterList) {
      expect(c.defaultJob).toBeLessThan(data.jobDataList.length);
      expect(c.name).toBeLessThan(0x10000);
    }
  });

  it('loadJobGroups populates groups referencing valid jobs', () => {
    const data = loadAll();
    const numJobGroups = u8(data.arm9!, 0xcb8b0) + 1;
    expect(data.jobGroupList.length).toBe(numJobGroups);
    expect(numJobGroups).toBeGreaterThan(1);
    for (const g of data.jobGroupList) {
      for (const j of [g.job1, g.job2, g.job3, g.job4]) {
        expect(j).toBeLessThan(data.jobDataList.length);
      }
    }
  });

  it('loadJobRequirements populates requirements (count byte has NO +1)', () => {
    const data = loadAll();
    const numJobRequirements = u8(data.arm9!, 0xb80b8);
    expect(data.jobRequirementList.length).toBe(numJobRequirements);
    expect(numJobRequirements).toBeGreaterThan(1);
    for (const r of data.jobRequirementList) {
      expect(r.jobId).toBeLessThan(data.jobDataList.length);
      expect(r.character1).toBeLessThan(data.characterList.length);
      expect(r.character2).toBeLessThan(data.characterList.length);
      for (const s of [r.job1, r.job2, r.job3]) {
        expect(s).toBeLessThan(data.abilitySetList.length);
      }
    }
  });

  it('saveJobs writes sysdata 1/2/3, patches counts, and round-trips', () => {
    const data = loadAll();
    const expanded = expandedTopSprites(data);
    const jobBytes = data.jobDataList.map((j) => j.toBytes(expanded));
    const setPairs: [Uint8Array, Uint8Array][] = [];
    let first = 0;
    for (const s of data.abilitySetList) {
      setPairs.push(s.tobytes(first));
      first += s.abilities.length;
    }

    saveJobs(data);

    // Count patches (Java offsets).
    expect(u8(data.arm9!, 0xcafdc)).toBe(data.jobDataList.length - 1);
    expect(u8(data.arm9!, 0xcafe0)).toBe(data.jobDataList.length - 1);
    expect(u8(data.arm9!, 0xcb054)).toBe(data.abilitySetList.length - 1);
    expect(u8(data.arm9!, 0xcb058)).toBe(data.abilitySetList.length - 1);
    expect(u8(data.arm9!, 0xb81dc)).toBe(data.abilitySetList.length);
    expect(u8(data.overlay11!, 0x4898)).toBe(data.abilitySetList.length);
    expect(u8(data.overlay11!, 0x83f8)).toBe(data.abilitySetList.length);
    data.arm9!.position(0xcb1d0);
    expect(data.arm9!.getInt()).toBe(first - 1);

    // Saved file contents equal the serialized models.
    expect(data.sysdata!.getFile(1)!.toUint8Array()).toEqual(concat(jobBytes));
    expect(data.sysdata!.getFile(2)!.toUint8Array()).toEqual(concat(setPairs.map((p) => p[0])));
    expect(data.sysdata!.getFile(3)!.toUint8Array()).toEqual(concat(setPairs.map((p) => p[1])));

    // Repack -> reparse -> reload preserves every serialized field.
    repackSysdata(data);
    data.jobDataList = [];
    data.abilitySetList = [];
    loadJobs(data);
    expect(data.jobDataList.length).toBe(jobBytes.length);
    expect(data.abilitySetList.length).toBe(setPairs.length);
    data.jobDataList.forEach((j, i) => expect(j.toBytes(expanded)).toEqual(jobBytes[i]));
    let idx = 0;
    data.abilitySetList.forEach((s, i) => {
      expect(s.tobytes(idx)).toEqual(setPairs[i]);
      idx += s.abilities.length;
    });
  });

  it('saveCharacters writes sysdata 0, patches counts, and round-trips', () => {
    const data = loadAll();
    const expanded = expandedTopSprites(data);
    const charBytes = data.characterList.map((c) => c.toBytes(expanded));

    saveCharacters(data);
    expect(u8(data.arm9!, 0xcb018)).toBe(data.characterList.length - 1);
    expect(u8(data.arm9!, 0xcb01c)).toBe(data.characterList.length - 1);
    expect(data.sysdata!.getFile(0)!.toUint8Array()).toEqual(concat(charBytes));

    repackSysdata(data);
    data.characterList = [];
    loadCharacters(data);
    expect(data.characterList.length).toBe(charBytes.length);
    data.characterList.forEach((c, i) => expect(c.toBytes(expanded)).toEqual(charBytes[i]));
  });

  it('saveJobGroups writes sysdata 36, patches counts, and round-trips', () => {
    const data = loadAll();
    const groupBytes = data.jobGroupList.map((g) => g.toBytes());

    saveJobGroups(data);
    expect(u8(data.arm9!, 0xcb8b0)).toBe(data.jobGroupList.length - 1);
    expect(u8(data.arm9!, 0xcb8b4)).toBe(data.jobGroupList.length - 1);
    expect(data.sysdata!.getFile(36)!.toUint8Array()).toEqual(concat(groupBytes));

    repackSysdata(data);
    data.jobGroupList = [];
    loadJobGroups(data);
    expect(data.jobGroupList.length).toBe(groupBytes.length);
    data.jobGroupList.forEach((g, i) => expect(g.toBytes()).toEqual(groupBytes[i]));
  });

  it('saveJobRequirements writes sysdata 19, patches arm9/overlay11, and round-trips', () => {
    const data = loadAll();
    const reqBytes = data.jobRequirementList.map((r) => r.toBytes());
    const n = data.jobRequirementList.length;

    saveJobRequirements(data);
    expect(u8(data.arm9!, 0xcb4bc)).toBe(n - 1);
    expect(u8(data.arm9!, 0xcb4c0)).toBe(n - 1);
    expect(u8(data.arm9!, 0xb80b8)).toBe(n);
    expect(u8(data.arm9!, 0xb7f60)).toBe(n);
    expect(u8(data.arm9!, 0xb8290)).toBe(n);
    expect(u8(data.overlay11!, 0x8ccc)).toBe(n);
    expect(u8(data.overlay11!, 0x9138)).toBe(n);
    expect(data.sysdata!.getFile(19)!.toUint8Array()).toEqual(concat(reqBytes));

    repackSysdata(data);
    data.jobRequirementList = [];
    loadJobRequirements(data);
    expect(data.jobRequirementList.length).toBe(reqBytes.length);
    data.jobRequirementList.forEach((r, i) => expect(r.toBytes()).toEqual(reqBytes[i]));
  });
});