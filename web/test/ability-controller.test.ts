import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IdxAndPak } from '../src/core/idxpak';
import { toUnsignedShort } from '../src/core/binary';
import { loadRom } from '../src/data/load';
import { loadMessages } from '../src/data/text';
import { RomData } from '../src/data/romData';
import {
  loadAbilities,
  saveAbilities,
  getAbilityAnimations,
  abilityName,
  abilityDescription,
  ACTIVE_ABILITY_COUNT,
  REACTION_ABILITY_COUNT,
  PASSIVE_ABILITY_COUNT,
} from '../src/data/controllers/ability';
import { fixturesDir } from './helpers';

const romDir = join(fixturesDir, '../../../data/extracted');
const romFile = existsSync(romDir)
  ? readdirSync(romDir).find((f) => f.endsWith('.nds'))
  : undefined;
const romPath = romFile ? join(romDir, romFile) : null;

// These tests run only when a real ROM is present locally (data/ is gitignored).
describe.skipIf(!romPath)('ability controller (real ROM)', () => {
  const rom = romPath ? new Uint8Array(readFileSync(romPath)) : new Uint8Array(0);

  function loaded(): RomData {
    const data = loadRom(rom);
    loadMessages(data);
    loadAbilities(data);
    return data;
  }

  it('loads all ability lists with the vanilla counts and ids', () => {
    const data = loaded();
    expect(data.activeAbilityList.length).toBe(ACTIVE_ABILITY_COUNT); // 0x336
    expect(data.reactionAbilityList.length).toBe(REACTION_ABILITY_COUNT + 1); // dummy + 0x1D
    expect(data.passiveAbilityList.length).toBe(PASSIVE_ABILITY_COUNT + 1); // dummy + 0x28
    expect(data.abilityList.length).toBe(
      ACTIVE_ABILITY_COUNT + REACTION_ABILITY_COUNT + PASSIVE_ABILITY_COUNT
    );
    expect(getAbilityAnimations(data).length).toBe(ACTIVE_ABILITY_COUNT);

    // Dummy 0th entries and id ranges.
    expect(data.reactionAbilityList[0].id).toBe(0);
    expect(data.reactionAbilityList[0].maxAP).toBe(0);
    expect(data.passiveAbilityList[0].id).toBe(0);
    expect(data.reactionAbilityList[1].id).toBe(0x336);
    expect(data.reactionAbilityList[REACTION_ABILITY_COUNT].id).toBe(0x336 + 0x1d - 1);
    expect(data.passiveAbilityList[1].id).toBe(0x353);
    expect(data.passiveAbilityList[PASSIVE_ABILITY_COUNT].id).toBe(0x353 + 0x28 - 1);

    // abilityList[u].id === u (actives, then reactions/passives without dummies).
    data.abilityList.forEach((a, u) => expect(a.id).toBe(u));
  });

  it('resolves learnedAbility bindings and names via the text tables', () => {
    const data = loaded();
    for (const ability of data.activeAbilityList) {
      const index = toUnsignedShort(ability.learnedAbilityId);
      expect(ability.learnedAbility).toBe(data.abilityList[index].id);
      expect(ability.abilityFlags.learnableByBlueMagick).toBe(
        ability.learnedAbility !== 0
      );
    }
    // Names come from loadMessages' table 3 (this ROM is Chinese-localized).
    expect(abilityName(data, 1).length).toBeGreaterThan(0);
    expect(abilityDescription(data, 1).length).toBeGreaterThan(0);
    expect(abilityName(data, 0xffff)).toBe('');
    expect(abilityDescription(data, 0xffff)).toBe('\\var2:00\\\\end\\');
    // abilityHelp resolved against the real help table, not just vanilla ids.
    expect(data.abilityHelpText.length).toBeGreaterThan(0);
    expect(data.activeAbilityList[1].abilityHelp).toBeGreaterThanOrEqual(0);
    expect(data.activeAbilityList[1].abilityHelp).toBeLessThan(data.abilityHelpText.length);
  });

  it('saveAbilities rewrites files 4/5 byte-identically and leaves 6/7 untouched', () => {
    const data = loaded();
    const original = [4, 5, 6, 7].map((i) => data.sysdata!.getFile(i)!.toUint8Array());
    const arm9Before = data.arm9!.toUint8Array();

    saveAbilities(data);

    // Vanilla models are byte-verified, so an unmodified save round-trips
    // exactly — EXCEPT record 0: Java's ActiveAbilityData.toBytes() quirk
    // serializes id 0 as an all-zero record even though the vanilla ROM has
    // non-zero bytes there (help id 0x032b, power -1, ...).
    const saved4 = data.sysdata!.getFile(4)!.toUint8Array();
    expect(saved4.slice(0, 0x34)).toEqual(new Uint8Array(0x34));
    expect(saved4.slice(0x34)).toEqual(original[0].slice(0x34));
    expect(data.sysdata!.getFile(5)!.toUint8Array()).toEqual(original[1]);
    // Java saveAbilities does not write the SP files or patch arm9 (the patch
    // block is commented out in the Java source).
    expect(data.sysdata!.getFile(6)!.toUint8Array()).toEqual(original[2]);
    expect(data.sysdata!.getFile(7)!.toUint8Array()).toEqual(original[3]);
    expect(data.arm9!.toUint8Array()).toEqual(arm9Before);
  });

  it('round-trips field preservation through repack + reparse', () => {
    const data = loaded();
    saveAbilities(data);
    const { idx, pak } = data.sysdata!.repack();
    const reparsed = new IdxAndPak('rt', idx, pak);

    const data2 = new RomData();
    data2.archive = data.archive;
    data2.sysdata = reparsed;
    data2.abilityHelpText = data.abilityHelpText;
    data2.abilityNames = data.abilityNames;
    data2.abilityDescriptions = data.abilityDescriptions;
    loadAbilities(data2);

    expect(data2.activeAbilityList.length).toBe(data.activeAbilityList.length);
    expect(data2.reactionAbilityList.length).toBe(data.reactionAbilityList.length);
    expect(data2.passiveAbilityList.length).toBe(data.passiveAbilityList.length);
    expect(data2.abilityList.length).toBe(data.abilityList.length);

    const animations1 = getAbilityAnimations(data);
    const animations2 = getAbilityAnimations(data2);
    expect(animations2.length).toBe(animations1.length);

    // Full field preservation: every parsed field (including flags, effects and
    // resolved learnedAbility) must survive save -> repack -> reparse. Id 0 is
    // the documented Java quirk: its record is zeroed on save.
    expect(data2.activeAbilityList[0].toBytes()).toEqual(new Uint8Array(0x34));
    for (let i = 1; i < data.activeAbilityList.length; i++) {
      expect(JSON.stringify(data2.activeAbilityList[i])).toBe(
        JSON.stringify(data.activeAbilityList[i])
      );
    }
    for (let i = 0; i < data.reactionAbilityList.length; i++) {
      expect(data2.reactionAbilityList[i].toBytes()).toEqual(
        data.reactionAbilityList[i].toBytes()
      );
      expect(data2.reactionAbilityList[i].id).toBe(data.reactionAbilityList[i].id);
    }
    for (let i = 0; i < data.passiveAbilityList.length; i++) {
      expect(data2.passiveAbilityList[i].toBytes()).toEqual(
        data.passiveAbilityList[i].toBytes()
      );
      expect(data2.passiveAbilityList[i].id).toBe(data.passiveAbilityList[i].id);
    }
    for (let i = 0; i < animations1.length; i++) {
      expect(animations2[i].toBytes()).toEqual(animations1[i].toBytes());
    }
  });

  it('preserves edited fields through save + reparse', () => {
    const data = loaded();
    const ability = data.activeAbilityList[5];
    ability.mpCost = 42;
    ability.power = -1234;
    ability.abilityFlags.reflectable = !ability.abilityFlags.reflectable;
    const animation = getAbilityAnimations(data)[5];
    animation.flinch_Glee = 77;

    saveAbilities(data);
    const { idx, pak } = data.sysdata!.repack();
    const data2 = new RomData();
    data2.archive = data.archive;
    data2.sysdata = new IdxAndPak('rt', idx, pak);
    data2.abilityHelpText = data.abilityHelpText;
    data2.abilityNames = data.abilityNames;
    data2.abilityDescriptions = data.abilityDescriptions;
    loadAbilities(data2);

    expect(data2.activeAbilityList[5].mpCost).toBe(42);
    expect(data2.activeAbilityList[5].power).toBe(-1234);
    expect(data2.activeAbilityList[5].abilityFlags.reflectable).toBe(
      ability.abilityFlags.reflectable
    );
    expect(getAbilityAnimations(data2)[5].flinch_Glee).toBe(77);
  });
});