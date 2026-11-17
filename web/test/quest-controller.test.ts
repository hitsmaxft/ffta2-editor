import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IdxAndPak } from '../src/core/idxpak';
import { loadRom } from '../src/data/load';
import { loadMessages } from '../src/data/text';
import {
  loadFormations,
  saveFormations,
  loadQuests,
  saveQuests,
  getFormationName,
  questName,
  questDescription,
  formationUnitName,
} from '../src/data/controllers/quest';
import { RomData } from '../src/data/romData';
import { fixturesDir } from './helpers';

const romDir = join(fixturesDir, '../../../data/extracted');
const romFile = existsSync(romDir)
  ? readdirSync(romDir).find((f) => f.endsWith('.nds'))
  : undefined;
const romPath = romFile ? join(romDir, romFile) : null;

// These tests run only when a real ROM is present locally (data/ is gitignored).
// Prerequisite domain loaders (jobs/abilities/characters/items) are not ported
// yet, so their RomData lists stay empty; the controller skips reference range
// checks for empty lists. Formation/quest parsing itself has no such deps.
describe.skipIf(!romPath)('quest + formation controllers (real ROM)', () => {
  const rom = romPath ? new Uint8Array(readFileSync(romPath)) : new Uint8Array(0);

  function loadAll(): RomData {
    const data = loadRom(rom);
    loadMessages(data);
    loadFormations(data);
    loadQuests(data);
    return data;
  }

  function fileBytes(pak: IdxAndPak, i: number): Uint8Array {
    const f = pak.getFile(i);
    expect(f, `file ${i} should exist`).not.toBeNull();
    return f!.toUint8Array();
  }

  it('loads formations from entrydata file pairs', () => {
    const data = loadRom(rom);
    loadFormations(data);
    const expected = Math.floor(data.entrydata!.numFiles() / 2);
    expect(expected).toBeGreaterThan(0);
    expect(data.formationList.length).toBe(expected);
    expect(getFormationName(data, 0)).toBe('Recruitable Units');
    expect(data.formationList.some((f) => f.units.length > 0)).toBe(true);
    // Unit counts must match the raw unsigned header numUnits byte.
    for (const f of data.formationList) {
      const header = fileBytes(data.entrydata!, f.id * 2);
      expect(f.units.length).toBe(header[1]);
      for (const u of f.units) {
        expect(u.formationId).toBe(f.id);
      }
    }
  });

  it('loads quests from sysdata 10/11 using arm9 counts and resolves names', () => {
    const data = loadAll();
    expect(data.questDataList.length).toBeGreaterThan(0);
    data.arm9!.position(0x000cb284);
    const numQuestInfo = data.arm9!.getU16() + 1;
    expect(data.questDataList.length).toBe(numQuestInfo);
    // Names come from the questNames text table.
    expect(data.questDataList.some((q) => questName(data, q.id).length > 0)).toBe(true);
    // loadQuests copies quest names into evMsgNames and formation names.
    let checkedEvent = false;
    let checkedFormation = false;
    for (const q of data.questDataList) {
      const name = questName(data, q.id);
      const eventIndex = q.info.startEvent & 0xffff;
      expect(data.evMsgNames.get(eventIndex)).toBe(name);
      expect(data.eventMsgList[eventIndex].name).toBe(name);
      checkedEvent = true;
      if (q.info.formation !== 0) {
        expect(getFormationName(data, q.info.formation)).toBe(name);
        checkedFormation = true;
      }
    }
    expect(checkedEvent).toBe(true);
    expect(checkedFormation).toBe(true);
    // Description default for ids past the table (Java Quest constructor).
    expect(questDescription(data, 0xffffff)).toBe('\\var2:00\\\\end\\');
    // Unit name resolution via characterNames.
    const unit = data.formationList
      .flatMap((f) => f.units)
      .find((u) => (u.name & 0xffff) !== 0 && (u.name & 0xffff) < data.characterNames.length);
    if (unit) {
      expect(formationUnitName(data, unit)).toBe(data.characterNames[unit.name & 0xffff].string);
    }
  });

  it('saveFormations writes entrydata pairs and survives repack + reload', () => {
    const data = loadRom(rom);
    loadFormations(data);
    const n = data.formationList.length;
    const origHeaders: Uint8Array[] = [];
    const origUnits: Uint8Array[] = [];
    for (let i = 0; i < n; i++) {
      origHeaders.push(fileBytes(data.entrydata!, i * 2));
      origUnits.push(fileBytes(data.entrydata!, i * 2 + 1));
    }

    saveFormations(data);
    for (let i = 0; i < n; i++) {
      // Java writes exactly 0x44 header bytes and units.length*0x3c unit
      // bytes; some ROM unit files carry trailing data past the header's
      // numUnits count, which Java's save drops.
      const numUnits = data.formationList[i].units.length;
      const savedHeader = fileBytes(data.entrydata!, i * 2);
      expect(savedHeader.length, `formation ${i} header size`).toBe(0x44);
      expect(savedHeader, `formation ${i} header`).toEqual(origHeaders[i].slice(0, 0x44));
      // Java quirk: FormationUnit.toBytes writes secondaryAbilitySet as a
      // SHORT, zeroing the parsed _0x1b byte at unit offset 0x1b.
      const expectedUnits = origUnits[i].slice(0, numUnits * 0x3c);
      for (let u = 0; u < numUnits; u++) {
        expectedUnits[u * 0x3c + 0x1b] = 0;
      }
      expect(fileBytes(data.entrydata!, i * 2 + 1), `formation ${i} units`).toEqual(expectedUnits);
    }

    // Repack entrydata, reparse, reload, save again: must be byte-stable.
    const { idx, pak } = data.entrydata!.repack();
    data.entrydata = new IdxAndPak('entrydata', idx, pak);
    loadFormations(data);
    expect(data.formationList.length).toBe(n);
    saveFormations(data);
    for (let i = 0; i < n; i++) {
      expect(fileBytes(data.entrydata!, i * 2), `reloaded formation ${i} header`).toEqual(
        origHeaders[i].slice(0, 0x44)
      );
      const expectedUnits = origUnits[i].slice(0, data.formationList[i].units.length * 0x3c);
      for (let u = 0; u < data.formationList[i].units.length; u++) {
        expectedUnits[u * 0x3c + 0x1b] = 0;
      }
      expect(fileBytes(data.entrydata!, i * 2 + 1), `reloaded formation ${i} units`).toEqual(
        expectedUnits
      );
    }
  });

  it('saveQuests writes sysdata 10/11 and survives repack + reload', () => {
    const data = loadAll();
    const n = data.questDataList.length;
    const origInfo = fileBytes(data.sysdata!, 10);
    const origData = fileBytes(data.sysdata!, 11);
    expect(origInfo.length).toBeGreaterThanOrEqual(n * 0x8);
    expect(origData.length).toBeGreaterThanOrEqual(n * 0x64);
    const before = data.questDataList.map((q) => q.toBytes());

    saveQuests(data);
    const savedInfo = fileBytes(data.sysdata!, 10);
    const savedData = fileBytes(data.sysdata!, 11);
    expect(savedInfo.length).toBe(n * 0x8);
    expect(savedData.length).toBe(n * 0x64);
    expect(savedInfo).toEqual(origInfo.slice(0, n * 0x8));
    // Java quirks: dispatch byte parses ==1 only (others reserialize as 0) and
    // unknown FFTA2Month values fall back to NONE (0).
    const expectedData = origData.slice(0, n * 0x64);
    for (let i = 0; i < n; i++) {
      const base = i * 0x64;
      if (expectedData[base + 0x0b] > 12) expectedData[base + 0x0b] = 0;
      if (expectedData[base + 0x2a] !== 1) expectedData[base + 0x2a] = 0;
    }
    expect(savedData).toEqual(expectedData);

    // Repack sysdata, reparse, reload quests, compare serialized models.
    const { idx, pak } = data.sysdata!.repack();
    data.sysdata = new IdxAndPak('sysdata', idx, pak);
    loadQuests(data);
    expect(data.questDataList.length).toBe(n);
    const after = data.questDataList.map((q) => q.toBytes());
    expect(after).toEqual(before);
    saveQuests(data);
    expect(fileBytes(data.sysdata!, 10)).toEqual(savedInfo);
    expect(fileBytes(data.sysdata!, 11)).toEqual(savedData);
  });

  it('loadQuests rejects mismatched arm9 info/data counts', () => {
    const data = loadRom(rom);
    loadMessages(data);
    loadFormations(data);
    data.arm9!.position(0x000cb284);
    const numQuestInfo = data.arm9!.getU16();
    data.arm9!.position(0x000cb2c8);
    data.arm9!.putU16(numQuestInfo + 1);
    expect(() => loadQuests(data)).toThrow(/don't match/);
  });
});