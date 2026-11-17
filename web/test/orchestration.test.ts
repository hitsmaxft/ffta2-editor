import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRom } from '../src/data/load';
import { loadAll, saveAll } from '../src/data/orchestration';
import { saveRom } from '../src/data/save';
import { fixturesDir } from './helpers';

const romDir = join(fixturesDir, '../../../data/extracted');
const romFile = existsSync(romDir) ? readdirSync(romDir).find((f) => f.endsWith('.nds')) : undefined;
const romPath = romFile ? join(romDir, romFile) : null;

describe.skipIf(!romPath)('orchestration end-to-end (real ROM)', () => {
  const rom = romPath ? new Uint8Array(readFileSync(romPath)) : new Uint8Array(0);

  it('loadAll populates every model domain without throwing', () => {
    const data = loadRom(rom);
    loadAll(data);
    const lists: Array<[string, unknown[]]> = [
      ['jobDataList', data.jobDataList],
      ['jobGroupList', data.jobGroupList],
      ['jobRequirementList', data.jobRequirementList],
      ['abilitySetList', data.abilitySetList],
      ['activeAbilityList', data.activeAbilityList],
      ['passiveAbilityList', data.passiveAbilityList],
      ['reactionAbilityList', data.reactionAbilityList],
      ['abilityList', data.abilityList],
      ['characterList', data.characterList],
      ['equipmentList', data.equipmentList],
      ['consumableList', data.consumableList],
      ['lootList', data.lootList],
      ['itemList', data.itemList],
      ['itemTableList', data.itemTableList],
      ['lawBonusList', data.lawBonusList],
      ['bazaarRecipeList', data.bazaarRecipeList],
      ['bazaarSetList', data.bazaarSetList],
      ['formationList', data.formationList],
      ['questDataList', data.questDataList],
      ['auctionPrizeTableList', data.auctionPrizeTableList],
      ['auctionGrandPrizeTableList', data.auctionGrandPrizeTableList],
      ['unitSstList', data.unitSstList],
      ['topSprites', data.topSprites],
      ['unitFaces', data.unitFaces],
      ['maps', data.maps],
      ['messageList', data.messageList],
    ];
    for (const [name, list] of lists) {
      expect(list.length, `${name} should be populated`).toBeGreaterThan(0);
    }
    expect(data.sbn).not.toBeNull();
  });

  it('full save -> NDS patch -> reload round-trips every domain', () => {
    const data = loadRom(rom);
    loadAll(data);
    saveAll(data);
    const patched = saveRom(data);
    expect(patched.length).toBeGreaterThanOrEqual(rom.length);

    const reloaded = loadRom(patched);
    loadAll(reloaded);
    expect(reloaded.jobDataList.length).toBe(data.jobDataList.length);
    expect(reloaded.abilitySetList.length).toBe(data.abilitySetList.length);
    expect(reloaded.characterList.length).toBe(data.characterList.length);
    expect(reloaded.equipmentList.length).toBe(data.equipmentList.length);
    expect(reloaded.itemList.length).toBe(data.itemList.length);
    expect(reloaded.formationList.length).toBe(data.formationList.length);
    expect(reloaded.questDataList.length).toBe(data.questDataList.length);
    expect(reloaded.unitSstList.length).toBe(data.unitSstList.length);
    expect(reloaded.maps.length).toBe(data.maps.length);
    expect(reloaded.messageList.length).toBe(data.messageList.length);
  });
});