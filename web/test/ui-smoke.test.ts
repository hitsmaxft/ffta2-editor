// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRom } from '../src/data/load';
import { loadAll } from '../src/data/orchestration';
import { fixturesDir } from './helpers';
import {
  textTab,
} from '../src/ui/textEditor';
import {
  jobTab, jobGroupTab, jobRequirementTab, characterTab, abilityTab, abilitySetTab,
  equipmentTab, consumableTab, lootTab, itemTableTab, lawBonusTab, lawRequirementTab,
  formationTab, questTab, bazaarTab, bazaarRecipeTab, auctionTab, auctionPrizeTab,
  auctionGrandPrizeTab, mapTab, unitSpriteTab, topSpriteTab, faceTab,
} from '../src/ui/modelEditor';

const romDir = join(fixturesDir, '../../../data/extracted');
const romFile = existsSync(romDir) ? readdirSync(romDir).find((f) => f.endsWith('.nds')) : undefined;
const romPath = romFile ? join(romDir, romFile) : null;

const TABS = [
  textTab, jobTab, jobGroupTab, jobRequirementTab, characterTab, abilityTab, abilitySetTab,
  equipmentTab, consumableTab, lootTab, itemTableTab, lawBonusTab, lawRequirementTab,
  formationTab, questTab, bazaarTab, bazaarRecipeTab, auctionTab, auctionPrizeTab,
  auctionGrandPrizeTab, mapTab, unitSpriteTab, topSpriteTab, faceTab,
];

describe.skipIf(!romPath)('web UI smoke test on a real ROM', () => {
  const rom = romPath ? new Uint8Array(readFileSync(romPath)) : new Uint8Array(0);

  it('renders every editor tab without throwing', () => {
    const data = loadRom(rom);
    loadAll(data);
    for (const tab of TABS) {
      if (!tab.available(data)) continue;
      const container = document.createElement('div');
      tab.render(container, data, () => {});
      expect(container.childElementCount, tab.id).toBeGreaterThan(0);
    }
  });

  it('edits a numeric job field through the generated form and adds a record', () => {
    const data = loadRom(rom);
    loadAll(data);
    const before = data.jobDataList.length;
    const container = document.createElement('div');
    jobTab.render(container, data, () => {});

    expect(container.querySelector('select.enum-input')).not.toBeNull();
    expect(container.querySelector('.search-select')).not.toBeNull();
    expect(container.querySelector('.search-select input')?.getAttribute('role')).toBe('combobox');

    const moveLabel = [...container.querySelectorAll('label')].find((l) => l.textContent === 'Move');
    const numberInput = moveLabel?.nextElementSibling as HTMLInputElement | null;
    expect(numberInput?.type).toBe('number');
    numberInput!.value = '77';
    numberInput!.dispatchEvent(new Event('change'));
    expect(data.jobDataList[0].move).toBe(77);

    const add = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Add record');
    expect(add).toBeDefined();
    add!.click();
    expect(data.jobDataList.length).toBe(before + 1);
  });
});
