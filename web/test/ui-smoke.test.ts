// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRom } from '../src/data/load';
import { loadAll } from '../src/data/orchestration';
import { fixturesDir } from './helpers';
import { setLanguage } from '../src/ui/i18n';
import { getUnitSpriteState } from '../src/data/controllers/sprites';
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
const romPath = process.env.FFTA2_PREVIEW_ROM ?? (romFile ? join(romDir, romFile) : null);

const TABS = [
  textTab, jobTab, jobGroupTab, jobRequirementTab, characterTab, abilityTab, abilitySetTab,
  equipmentTab, consumableTab, lootTab, itemTableTab, lawBonusTab, lawRequirementTab,
  formationTab, questTab, bazaarTab, bazaarRecipeTab, auctionTab, auctionPrizeTab,
  auctionGrandPrizeTab, mapTab, unitSpriteTab, topSpriteTab, faceTab,
];

const drawn = new Map<HTMLCanvasElement, Uint8ClampedArray>();
beforeEach(() => {
  drawn.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    return {
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: (bitmap: ImageData) => { drawn.set(this, bitmap.data.slice()); },
    } as unknown as CanvasRenderingContext2D;
  });
});
afterEach(() => vi.restoreAllMocks());

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

  it('renders all tabs in Chinese without modifying ROM model data', () => {
    setLanguage('zh-CN');
    try {
      const data = loadRom(rom);
      loadAll(data);
      const originalNames = data.jobNames.map((entry) => entry.string);
      const originalBytes = data.jobDataList[1].toBytes();
      for (const tab of TABS) {
        if (!tab.available(data)) continue;
        const container = document.createElement('div');
        tab.render(container, data, () => { throw new Error('Rendering marked data dirty'); });
        expect(container.childElementCount, tab.id).toBeGreaterThan(0);
        if (tab.id === 'jobs') {
          expect(container.textContent).toContain('可转职');
          expect(container.textContent).toContain('士兵');
        }
        if (tab.id === 'abilities') expect(container.textContent).toContain('默认已掌握');
      }
      expect(data.jobNames.map((entry) => entry.string)).toEqual(originalNames);
      expect(data.jobDataList[1].toBytes()).toEqual(originalBytes);
    } finally {
      setLanguage('en');
    }
  });

  it('refreshes real job sprite pixels when its palette is edited', () => {
    setLanguage('en');
    const data = loadRom(rom); loadAll(data);
    const container = document.createElement('div');
    let dirty = 0;
    jobTab.render(container, data, () => { dirty++; });
    container.querySelectorAll<HTMLElement>('.record-list li')[1].click();
    const job = data.jobDataList[1];
    const selector = `canvas[aria-label="Unit Sprite #${job.unitSprite}"]`;
    const initial = container.querySelector<HTMLCanvasElement>(selector)!;
    expect(initial).not.toBeNull();
    const before = drawn.get(initial)!;
    expect(before.some((value, i) => i % 4 === 3 && value > 0)).toBe(true);
    const state = getUnitSpriteState(data.unitSstList[job.unitSprite])!;
    const count = state.spritePalettes!.palettes.length;
    expect(count).toBeGreaterThan(1);
    const original = job.unitPalette;
    const label = container.querySelector('label[title="unitPalette"]')!;
    const input = label.nextElementSibling as HTMLInputElement;
    input.value = String((original + 1) % count);
    input.dispatchEvent(new Event('change'));
    expect(job.unitPalette).toBe((original + 1) % count);
    expect(drawn.get(container.querySelector<HTMLCanvasElement>(selector)!)).not.toEqual(before);
    expect(dirty).toBe(1);
    expect(state.hasChanged).toBe(false);
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
