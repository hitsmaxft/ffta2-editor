import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IdxAndPak } from '../src/core/idxpak';
import { loadRom } from '../src/data/load';
import { loadMessages } from '../src/data/text';
import { RomData } from '../src/data/romData';
import {
  loadEquipment,
  saveEquipment,
  loadConsumables,
  saveConsumables,
  loadLoot,
  saveLoot,
  loadItemTables,
  saveItemTables,
  loadLawBonus,
  saveLawBonus,
  loadBazaar,
  saveBazaar,
  loadAuctions,
  saveAuctions,
  getAuctionInfoList,
  getLawBonusStoryRequirements,
  itemName,
  itemDescription,
  bazaarSetName,
  auctionRegionName,
} from '../src/data/controllers/item';
import { fixturesDir } from './helpers';

const romDir = join(fixturesDir, '../../../data/extracted');
const romFile = existsSync(romDir)
  ? readdirSync(romDir).find((f) => f.endsWith('.nds'))
  : undefined;
const romPath = romFile ? join(romDir, romFile) : null;

function loadItemDomain(data: RomData): void {
  loadEquipment(data);
  loadConsumables(data);
  loadLoot(data);
  loadItemTables(data);
  loadLawBonus(data);
  loadBazaar(data);
  loadAuctions(data);
}

function saveItemDomain(data: RomData): void {
  saveEquipment(data);
  saveConsumables(data);
  saveLoot(data);
  saveItemTables(data);
  saveLawBonus(data);
  saveBazaar(data);
  saveAuctions(data);
}

describe('item controllers without a ROM', () => {
  it('are no-ops when no archive is loaded', () => {
    const data = new RomData();
    loadItemDomain(data);
    expect(data.equipmentList).toEqual([]);
    expect(data.consumableList).toEqual([]);
    expect(data.lootList).toEqual([]);
    expect(data.itemList).toEqual([]);
    expect(data.itemTableList).toEqual([]);
    expect(data.lawBonusList).toEqual([]);
    expect(data.bazaarRecipeList).toEqual([]);
    expect(data.bazaarSetList).toEqual([]);
    expect(data.auctionPrizeTableList).toEqual([]);
    expect(getAuctionInfoList(data)).toEqual([]);
  });
});

// These tests run only when a real ROM is present locally (data/ is gitignored).
describe.skipIf(!romPath)('item controllers on real ROM', () => {
  const rom = romPath ? new Uint8Array(readFileSync(romPath)) : new Uint8Array(0);

  function loaded(): RomData {
    const data = loadRom(rom);
    loadMessages(data);
    loadItemDomain(data);
    return data;
  }

  it('loads equipment, consumables, loot and itemList with Java counts/ids', () => {
    const data = loaded();
    const arm9 = data.arm9!;
    const numEquipment = arm9.view.getUint16(0x000cb3fc, true) + 1;
    expect(numEquipment).toBeGreaterThan(0);
    expect(data.equipmentList.length).toBe(numEquipment);
    // Dummy id 0 prepended to consumables (0x13) and loot (0xCC).
    expect(data.consumableList.length).toBe(0x13 + 1);
    expect(data.lootList.length).toBe(0xcc + 1);
    expect(data.consumableList[0].id).toBe(0);
    expect(data.lootList[0].id).toBe(0);
    expect(data.lootList[0].rank).toBe(2); // ZERO_STAR default
    expect(data.itemList.length).toBe(numEquipment + 0x13 + 0xcc);
    // ids equal itemList indices
    data.itemList.forEach((item, i) => expect(item.id).toBe(i));
    // consumable/loot ids continue after equipment
    expect(data.consumableList[1].id).toBe(numEquipment);
    expect(data.lootList[1].id).toBe(numEquipment + 0x13);
    // name resolution via controller helpers
    expect(itemName(data, 1).length).toBeGreaterThan(0);
    expect(itemDescription(data, 1).length).toBeGreaterThan(0);
    expect(itemName(data, 0xffffff)).toBe('');
  });

  it('loads item tables and law bonuses with arm9 counts', () => {
    const data = loaded();
    const arm9 = data.arm9!;
    expect(data.itemTableList.length).toBe(arm9.view.getUint16(0x000cb5fc, true) + 1);
    expect(data.itemTableList.length).toBeGreaterThan(0);
    expect(data.lawBonusList.length).toBe(arm9.view.getUint16(0x000cb958, true) + 1);
    expect(data.lawBonusList.length).toBeGreaterThan(0);
    const reqs = getLawBonusStoryRequirements(data);
    expect(reqs.length).toBe(4);
    reqs.forEach((r, i) =>
      expect(r).toBe(arm9.view.getUint16(0x0011b650 + i * 2, true))
    );
  });

  it('loads bazaar recipes and sets', () => {
    const data = loaded();
    const arm9 = data.arm9!;
    expect(data.bazaarRecipeList.length).toBe(arm9.view.getUint16(0x000cb684, true) + 1);
    expect(data.bazaarRecipeList.length).toBeGreaterThan(0);
    expect(data.bazaarSetList.length).toBe(arm9.view.getUint8(0x000cb634) + 1);
    expect(data.bazaarSetList.length).toBeGreaterThan(0);
    for (const recipe of data.bazaarRecipeList) {
      expect(recipe.item).toBe(recipe.id);
      for (const loot of [recipe.loot1, recipe.loot2, recipe.loot3]) {
        // 0 resolves to the dummy lootList[0]; others index itemList.
        expect(loot).toBeGreaterThanOrEqual(0);
        expect(loot).toBeLessThan(data.itemList.length);
      }
    }
    for (const set of data.bazaarSetList) {
      expect(set.items.length).toBe(10);
    }
    expect(bazaarSetName(data, 0).length).toBeGreaterThan(0);
  });

  it('loads auction prize tables, grand prize tables and infos', () => {
    const data = loaded();
    const arm9 = data.arm9!;
    expect(data.auctionPrizeTableList.length).toBe(arm9.view.getUint8(0x000cb808) + 1);
    expect(data.auctionPrizeTableList.length).toBeGreaterThan(0);
    expect(data.auctionGrandPrizeTableList.length).toBeGreaterThan(0);
    for (const table of [...data.auctionPrizeTableList, ...data.auctionGrandPrizeTableList]) {
      expect(table.prizes.length).toBe(8);
    }
    const infos = getAuctionInfoList(data);
    expect(infos.length).toBe(arm9.view.getUint8(0x000cb7d0) + 1);
    expect(infos.length).toBeGreaterThan(0);
    for (const info of infos) {
      expect(info.prizeTables.length).toBe(4);
      for (const idx of info.prizeTables) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(data.auctionPrizeTableList.length);
      }
      expect(data.auctionGrandPrizeTableList[info.id]).toBeDefined();
      expect(typeof auctionRegionName(data, info.region)).toBe('string');
    }
  });

  it('save + repack sysdata + reparse round-trips every item domain', () => {
    const data = loaded();
    const snapshot = (v: unknown) => JSON.stringify(v);
    const before = {
      equipment: snapshot(data.equipmentList),
      consumables: snapshot(data.consumableList),
      loot: snapshot(data.lootList),
      items: snapshot(data.itemList.map((i) => i.id)),
      itemTables: snapshot(data.itemTableList),
      lawBonus: snapshot(data.lawBonusList),
      recipes: snapshot(data.bazaarRecipeList),
      sets: snapshot(data.bazaarSetList),
      prizeTables: snapshot(data.auctionPrizeTableList),
      grandTables: snapshot(data.auctionGrandPrizeTableList),
      infos: snapshot(getAuctionInfoList(data)),
      storyReqs: snapshot(getLawBonusStoryRequirements(data)),
    };

    // Original sysdata file bytes for the item domain.
    const fileIndices = [16, 17, 18, 24, 45, 25, 26, 32, 33, 34];
    const originalFiles = new Map<number, Uint8Array>();
    for (const i of fileIndices) {
      originalFiles.set(i, data.sysdata!.getFile(i)!.toUint8Array());
    }

    saveItemDomain(data);

    // Bazaar save patches arm9 (size-1) and overlay8 (size).
    const numSets = data.bazaarSetList.length;
    expect(data.arm9!.view.getUint8(0x000cb634)).toBe((numSets - 1) & 0xff);
    expect(data.arm9!.view.getUint8(0x000cb638)).toBe((numSets - 1) & 0xff);
    expect(data.overlay8!.view.getUint8(0x171c)).toBe(numSets & 0xff);

    // Repack and reparse the sysdata IdxAndPak.
    const { idx, pak } = data.sysdata!.repack();
    data.sysdata = new IdxAndPak('sysdata-rt', idx, pak);

    // Quirk-free domains must be byte-identical to the original ROM files
    // (reparsed files may carry alignment padding; compare the prefix).
    for (const i of [17, 24, 45, 25, 26, 32, 33]) {
      const orig = originalFiles.get(i)!;
      const got = data.sysdata.getFile(i)!.toUint8Array();
      expect(got.length).toBeGreaterThanOrEqual(orig.length);
      expect(got.slice(0, orig.length)).toEqual(orig);
    }

    // Reparse all models from the repacked sysdata and compare.
    loadItemDomain(data);
    expect(snapshot(data.equipmentList)).toBe(before.equipment);
    expect(snapshot(data.consumableList)).toBe(before.consumables);
    expect(snapshot(data.lootList)).toBe(before.loot);
    expect(snapshot(data.itemList.map((i) => i.id))).toBe(before.items);
    expect(snapshot(data.itemTableList)).toBe(before.itemTables);
    expect(snapshot(data.lawBonusList)).toBe(before.lawBonus);
    expect(snapshot(data.bazaarRecipeList)).toBe(before.recipes);
    expect(snapshot(data.bazaarSetList)).toBe(before.sets);
    expect(snapshot(data.auctionPrizeTableList)).toBe(before.prizeTables);
    expect(snapshot(data.auctionGrandPrizeTableList)).toBe(before.grandTables);
    expect(snapshot(getAuctionInfoList(data))).toBe(before.infos);
    expect(snapshot(getLawBonusStoryRequirements(data))).toBe(before.storyReqs);
  });
});