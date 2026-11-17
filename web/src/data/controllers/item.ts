// Port of the ITEM-domain controllers' data logic (JavaFX UI ignored):
//   EquipmentController.loadEquipment/saveEquipment (sysdata 16)
//   ConsumableController.loadConsumables/saveConsumables (sysdata 17)
//   LootController.loadLoot/saveLoot (sysdata 18)
//   ItemTableController.loadItemTables/saveItemTables (sysdata 24)
//   LawBonusController.loadLawBonus/saveLawBonus (sysdata 45)
//   BazaarController.loadBazaar/saveBazaar (sysdata 26 recipes, 25 sets)
//   AuctionController.loadAuctions/saveAuctions (sysdata 33 prize tables,
//     34 grand prize tables, 32 auction infos)
//
// In Java, EquipmentController.loadEquipment actually parses equipment AND
// consumables AND loot AND builds App.itemList in one pass; the separate
// loadConsumables/loadLoot only populate UI lists. Here the parsing is split
// per domain: loadEquipment -> loadConsumables -> loadLoot (which builds
// itemList), matching the MainController load order. Consumable/loot ids
// depend on equipmentList already being loaded.
//
// Models are pure parsers with raw numeric indices; name resolution and
// dummy-record defaults live here (Java did them in model constructors via
// App.* globals).

import { Bytes } from '../../core/binary';
import { RomData } from '../romData';
import {
  EquipmentData,
  ConsumableData,
  LootData,
  ItemData,
  ItemTable,
  LawBonus,
} from '../model/item';
import { BazaarRecipe, BazaarSet } from '../model/bazaar';
import {
  AuctionPrizeTable,
  AuctionPrizeItem,
  AuctionInfo,
  AuctionVanillaData,
} from '../model/auction';
import { LootRank } from '../model/enums';

// --- arm9 / overlay offsets (exact Java values) ---------------------------
const EQUIPMENT_COUNT_OFFSET = 0x000cb3fc; // u16, count = value + 1
const ITEM_TABLE_COUNT_OFFSET = 0x000cb5fc; // u16, count = value + 1
const LAW_BONUS_COUNT_OFFSET = 0x000cb958; // u16, count = value + 1
const LAW_BONUS_STORY_REQ_OFFSET = 0x0011b650; // 4 x u16 story requirements
const BAZAAR_RECIPE_COUNT_OFFSET = 0x000cb684; // u16, count = value + 1
const BAZAAR_SET_COUNT_OFFSET = 0x000cb634; // u8, count = value + 1
const BAZAAR_SET_COUNT_OFFSET_2 = 0x000cb638; // u8, patched on save (size - 1)
const BAZAAR_SET_COUNT_OVL8_OFFSET = 0x171c; // overlay8 u8, patched on save (size)
const AUCTION_INFO_COUNT_OFFSET = 0x000cb7d0; // u8, count = value + 1
const AUCTION_PRIZE_TABLE_COUNT_OFFSET = 0x000cb808; // u8, count = value + 1
const AUCTION_GRAND_PRIZE_COUNT_OFFSET = 0x000cb840; // u8, count = value + 1

const NUM_CONSUMABLES = 0x13;
const NUM_LOOT = 0xcc;

// Java default description literal "\\var2:00\\\\end\\" (models + controllers).
const DEFAULT_ITEM_DESCRIPTION = '\\var2:00\\\\end\\';

// --- absolute access helpers ----------------------------------------------
// Java ByteBuffer absolute get/put do NOT move the buffer position; Bytes here
// is position-based, so use the DataView directly for arm9/overlay patches.
function u8At(b: Bytes, off: number): number {
  return b.view.getUint8(off);
}
function u16At(b: Bytes, off: number): number {
  return b.view.getUint16(off, true);
}
function putU8At(b: Bytes, off: number, v: number): void {
  b.view.setUint8(off, v & 0xff); // Java (byte) truncation
}
function putShortAt(b: Bytes, off: number, v: number): void {
  b.view.setInt16(off, v, true); // Java putShort truncation
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function sysdataFile(data: RomData, index: number, label: string): Bytes {
  const f = data.sysdata!.getFile(index);
  if (f == null) throw new Error(`${label} is null`);
  return f.rewind();
}

// Java save loops: allocate size*recordSize, put each toBytes(), rewind,
// setFile. Errors are logged with the record name then rethrown.
function serialize<T extends { toBytes(): Uint8Array }>(
  list: T[],
  recordSize: number,
  label: string,
  nameOf: (item: T) => string
): Bytes {
  const buf = Bytes.alloc(list.length * recordSize);
  for (let i = 0; i < list.length; i++) {
    try {
      buf.putBytes(list[i].toBytes());
    } catch (e) {
      throw new Error(`Failed to save ${label} ${i} "${nameOf(list[i])}": ${errMsg(e)}`);
    }
  }
  return buf.rewind();
}

// --- name resolution (Java model constructors / UI cells) ------------------

export function itemName(data: RomData, id: number): string {
  return id < data.itemNames.length ? data.itemNames[id].string : '';
}

export function itemDescription(data: RomData, id: number): string {
  return id < data.itemDescriptions.length
    ? data.itemDescriptions[id].string
    : DEFAULT_ITEM_DESCRIPTION;
}

export function bazaarSetName(data: RomData, id: number): string {
  return id < data.bazaarSetNames.length ? data.bazaarSetNames[id].string : '';
}

export function bazaarSetDescription(data: RomData, id: number): string {
  return id < data.bazaarSetDescriptions.length
    ? data.bazaarSetDescriptions[id].string
    : DEFAULT_ITEM_DESCRIPTION;
}

// EquipmentData.bonusEffect is an unsigned byte index into App.bonusEffects.
export function bonusEffectName(data: RomData, index: number): string {
  const i = index & 0xff;
  return i < data.bonusEffects.length ? data.bonusEffects[i].string : '';
}

// AuctionInfo.region/otherRegion1/otherRegion2: unsigned byte index into
// App.regionNames, "" when out of range (Java StringBinding).
export function auctionRegionName(data: RomData, region: number): string {
  const i = region & 0xff;
  return i < data.regionNames.length ? data.regionNames[i].string : '';
}

// Java AuctionInfo.prizeTables resolves raw indices to AuctionPrizeTable
// objects at parse time; the TS model keeps raw indices, resolve here.
export function auctionPrizeTablesOf(data: RomData, info: AuctionInfo): AuctionPrizeTable[] {
  return info.prizeTables.map((i) => data.auctionPrizeTableList[i]);
}

// Java AuctionInfo.grandPrizeTable = App.auctionGrandPrizeTableList.get(id).
export function auctionGrandPrizeTableOf(data: RomData, info: AuctionInfo): AuctionPrizeTable {
  return data.auctionGrandPrizeTableList[info.id];
}

// Java dummy constructors (ConsumableData("", 0) / LootData("", 0)) register a
// StringWithId in App.itemNames/itemDescriptions when the id is past the end.
function registerDummyItemStrings(data: RomData, id: number, name: string): void {
  if (id >= data.itemNames.length) data.itemNames.push({ id, string: name });
  if (id >= data.itemDescriptions.length) {
    data.itemDescriptions.push({ id, string: DEFAULT_ITEM_DESCRIPTION });
  }
}

// --- local state for fields RomData does not have --------------------------
// MISSING RomData fields (not added, per porting rules):
//  - auctionInfoList: Java keeps AuctionInfo records in the UI ListView only.
//  - law bonus story requirements: Java keeps them in 4 UI TextFields.
// Both are stored per-RomData in WeakMaps and exposed via getters below.

const auctionInfoLists = new WeakMap<RomData, AuctionInfo[]>();

export function getAuctionInfoList(data: RomData): AuctionInfo[] {
  return auctionInfoLists.get(data) ?? [];
}

const lawBonusStoryReqs = new WeakMap<RomData, number[]>();

// The 4 story-requirement shorts at arm9 0x11B650..0x11B656 (unsigned).
// Falls back to the current arm9 values when loadLawBonus was not called.
export function getLawBonusStoryRequirements(data: RomData): number[] {
  const stored = lawBonusStoryReqs.get(data);
  if (stored) return stored;
  if (!data.arm9) return [0, 0, 0, 0];
  return [0, 2, 4, 6].map((o) => u16At(data.arm9!, LAW_BONUS_STORY_REQ_OFFSET + o));
}

// Edits the four story-requirement shorts written by saveLawBonus. Values are
// truncated to 16 bits on save, exactly like Java's putShort.
export function setLawBonusStoryRequirements(data: RomData, values: number[]): void {
  lawBonusStoryReqs.set(data, [0, 1, 2, 3].map((i) => (values[i] ?? 0) & 0xffff));
}

// --- Equipment (EquipmentController) ---------------------------------------

export function loadEquipment(data: RomData): void {
  if (!data.archive) return;
  const bytes = sysdataFile(data, 16, 'Equipment data');
  const list: EquipmentData[] = [];
  const numEquipment = u16At(data.arm9!, EQUIPMENT_COUNT_OFFSET) + 1;
  for (let i = 0; i < numEquipment; i++) {
    try {
      list.push(new EquipmentData(bytes, i));
    } catch (e) {
      throw new Error(`Failed to load Equipment ${i} "${itemName(data, i)}": ${errMsg(e)}`);
    }
  }
  data.equipmentList = list;
  bytes.rewind();
}

export function saveEquipment(data: RomData): void {
  if (!data.archive) return;
  // Java does NOT patch the equipment count in arm9 on save.
  data.sysdata!.setFile(
    16,
    serialize(data.equipmentList, 0x28, 'Equipment', (e) => itemName(data, e.id))
  );
}

// --- Consumables (ConsumableController) ------------------------------------

export function loadConsumables(data: RomData): void {
  if (!data.archive) return;
  const bytes = sysdataFile(data, 17, 'Consumable data');
  const list: ConsumableData[] = [];
  // Java prepends dummy ConsumableData("", 0): all four shorts zero.
  const dummy = new ConsumableData(Bytes.alloc(0x8), 0);
  registerDummyItemStrings(data, 0, '');
  list.push(dummy);
  const numEquipment = data.equipmentList.length;
  for (let i = 0; i < NUM_CONSUMABLES; i++) {
    const id = i + numEquipment;
    try {
      list.push(new ConsumableData(bytes, id));
    } catch (e) {
      throw new Error(`Failed to load Consumable ${id} "${itemName(data, id)}": ${errMsg(e)}`);
    }
  }
  data.consumableList = list;
  bytes.rewind();
}

export function saveConsumables(data: RomData): void {
  if (!data.archive) return;
  // Java saves the UI list, which excludes the dummy entry at index 0.
  const list = data.consumableList.slice(1);
  data.sysdata!.setFile(
    17,
    serialize(list, 0x8, 'Consumable', (c) => itemName(data, c.id))
  );
}

// --- Loot (LootController) --------------------------------------------------

export function loadLoot(data: RomData): void {
  if (!data.archive) return;
  const bytes = sysdataFile(data, 18, 'Loot data');
  const list: LootData[] = [];
  // Java prepends dummy LootData("", 0): buy/sell/_0x6 = 0, category NONE,
  // rank ZERO_STAR. Parsing an all-zero record yields exactly those defaults
  // (LootRank.fromInteger(0) falls back to ZERO_STAR = 2).
  const dummy = new LootData(Bytes.alloc(0x8), 0);
  dummy.rank = LootRank.fromInteger(0);
  registerDummyItemStrings(data, 0, '');
  list.push(dummy);
  const numEquipment = data.equipmentList.length;
  for (let i = 0; i < NUM_LOOT; i++) {
    const id = i + numEquipment + NUM_CONSUMABLES;
    try {
      list.push(new LootData(bytes, id));
    } catch (e) {
      throw new Error(`Failed to load Loot ${id} "${itemName(data, id)}": ${errMsg(e)}`);
    }
  }
  data.lootList = list;
  bytes.rewind();

  // Java builds App.itemList at the end of EquipmentController.loadEquipment:
  // equipment + consumables[1..] + loot[1..]; ids equal itemList indices.
  data.itemList = [
    ...data.equipmentList,
    ...data.consumableList.slice(1),
    ...data.lootList.slice(1),
  ] as ItemData[];
}

export function saveLoot(data: RomData): void {
  if (!data.archive) return;
  // Java saves the UI list, which excludes the dummy entry at index 0.
  const list = data.lootList.slice(1);
  data.sysdata!.setFile(
    18,
    serialize(list, 0x8, 'Loot', (l) => itemName(data, l.id))
  );
}

// --- Item tables (ItemTableController) --------------------------------------

export function loadItemTables(data: RomData): void {
  if (!data.archive) return;
  const bytes = sysdataFile(data, 24, 'Item Table data');
  const list: ItemTable[] = [];
  const numItemTables = u16At(data.arm9!, ITEM_TABLE_COUNT_OFFSET) + 1;
  for (let i = 0; i < numItemTables; i++) {
    try {
      list.push(new ItemTable(bytes, i));
    } catch (e) {
      throw new Error(`Failed to load Item Table ${i}: ${errMsg(e)}`);
    }
  }
  data.itemTableList = list;
  bytes.rewind();
}

export function saveItemTables(data: RomData): void {
  if (!data.archive) return;
  // Java does NOT patch the item table count in arm9 on save.
  data.sysdata!.setFile(24, serialize(data.itemTableList, 0x8, 'Item Table', () => ''));
}

// --- Law bonuses (LawBonusController) ---------------------------------------

export function loadLawBonus(data: RomData): void {
  if (!data.archive) return;
  const bytes = sysdataFile(data, 45, 'Law Bonus data');
  const list: LawBonus[] = [];
  const numLawBonus = u16At(data.arm9!, LAW_BONUS_COUNT_OFFSET) + 1;
  for (let i = 0; i < numLawBonus; i++) {
    try {
      list.push(new LawBonus(bytes, i));
    } catch (e) {
      throw new Error(`Failed to load Law Bonus ${i}: ${errMsg(e)}`);
    }
  }
  data.lawBonusList = list;
  bytes.rewind();

  // Java reads the 4 story requirements into UI TextFields (unsigned shorts).
  lawBonusStoryReqs.set(
    data,
    [0, 2, 4, 6].map((o) => u16At(data.arm9!, LAW_BONUS_STORY_REQ_OFFSET + o))
  );
}

export function saveLawBonus(data: RomData): void {
  if (!data.archive) return;
  // Java does NOT patch the law bonus count in arm9 on save.
  data.sysdata!.setFile(45, serialize(data.lawBonusList, 0x8, 'Law Bonus', () => ''));

  // Java writes the 4 UI TextFields back as signed shorts.
  const reqs = getLawBonusStoryRequirements(data);
  for (let i = 0; i < 4; i++) {
    putShortAt(data.arm9!, LAW_BONUS_STORY_REQ_OFFSET + i * 2, reqs[i]);
  }
}

// --- Bazaar (BazaarController) ----------------------------------------------

export function loadBazaar(data: RomData): void {
  if (!data.archive) return;

  // Recipes (sysdata 26)
  const recipeBytes = sysdataFile(data, 26, 'Bazaar Recipe data');
  const recipes: BazaarRecipe[] = [];
  const numBazaarRecipes = u16At(data.arm9!, BAZAAR_RECIPE_COUNT_OFFSET) + 1;
  for (let i = 0; i < numBazaarRecipes; i++) {
    try {
      recipes.push(new BazaarRecipe(recipeBytes, i));
    } catch (e) {
      throw new Error(
        `Failed to load Bazaar Recipe ${i} "${itemName(data, i)}": ${errMsg(e)}`
      );
    }
  }
  data.bazaarRecipeList = recipes;
  recipeBytes.rewind();

  // Sets (sysdata 25). Java keeps these in the UI ListView; RomData has a
  // bazaarSetList field, so store them there.
  const setBytes = sysdataFile(data, 25, 'Bazaar Set data');
  const sets: BazaarSet[] = [];
  const numBazaarSets = u8At(data.arm9!, BAZAAR_SET_COUNT_OFFSET) + 1;
  for (let i = 0; i < numBazaarSets; i++) {
    try {
      sets.push(new BazaarSet(setBytes, i));
    } catch (e) {
      throw new Error(
        `Failed to load Bazaar Set ${i} "${bazaarSetName(data, i)}": ${errMsg(e)}`
      );
    }
  }
  data.bazaarSetList = sets;
  setBytes.rewind();
}

export function saveBazaar(data: RomData): void {
  // Java saveBazaar has no archive null-check.
  data.sysdata!.setFile(
    26,
    serialize(data.bazaarRecipeList, 0x8, 'Bazaar Recipe', (r) => itemName(data, r.item))
  );

  data.sysdata!.setFile(
    25,
    serialize(data.bazaarSetList, 0x2c, 'Bazaar Set', (s) => bazaarSetName(data, s.id))
  );

  // Patch arm9 code with new Set length (Java (byte) truncation).
  putU8At(data.arm9!, BAZAAR_SET_COUNT_OFFSET, data.bazaarSetList.length - 1);
  putU8At(data.arm9!, BAZAAR_SET_COUNT_OFFSET_2, data.bazaarSetList.length - 1);
  putU8At(data.overlay8!, BAZAAR_SET_COUNT_OVL8_OFFSET, data.bazaarSetList.length);
}

// --- Auctions (AuctionController) -------------------------------------------

export function loadAuctions(data: RomData): void {
  if (!data.archive) return;

  // Prize tables (sysdata 33)
  const prizeBytes = sysdataFile(data, 33, 'Auction Prize Table data');
  const prizeTables: AuctionPrizeTable[] = [];
  const numPrizeTables = u8At(data.arm9!, AUCTION_PRIZE_TABLE_COUNT_OFFSET) + 1;
  for (let i = 0; i < numPrizeTables; i++) {
    try {
      prizeTables.push(new AuctionPrizeTable(prizeBytes, i));
    } catch (e) {
      throw new Error(`Failed to load Auction Prize Table ${i}: ${errMsg(e)}`);
    }
  }
  data.auctionPrizeTableList = prizeTables;
  prizeBytes.rewind();

  // Grand prize tables (sysdata 34)
  const grandBytes = sysdataFile(data, 34, 'Auction Grand Prize Table data');
  const grandTables: AuctionPrizeTable[] = [];
  const numGrandTables = u8At(data.arm9!, AUCTION_GRAND_PRIZE_COUNT_OFFSET) + 1;
  // Java integer division: remaining() / 0x20.
  if (Math.floor(grandBytes.remaining() / 0x20) !== numGrandTables) {
    data.warnings.push('Resetting Grand Prizes');
    for (let i = 0; i < AuctionVanillaData.grandPrizes.length; i++) {
      // TS model has no AuctionPrizeTable(id) ctor; parsing an all-zero 0x20
      // record gives the same 8 default (item 0, flag 0) prizes.
      const table = new AuctionPrizeTable(Bytes.alloc(0x20), i);
      const items = AuctionVanillaData.grandPrizes[i];
      for (let j = 0; j < items.length; j++) {
        table.prizes[j] = new AuctionPrizeItem(items[j][0], items[j][1]);
      }
      grandTables.push(table);
    }
  } else {
    for (let i = 0; i < numGrandTables; i++) {
      try {
        grandTables.push(new AuctionPrizeTable(grandBytes, i));
      } catch (e) {
        throw new Error(`Failed to load Auction Grand Prize Table ${i}: ${errMsg(e)}`);
      }
    }
  }
  data.auctionGrandPrizeTableList = grandTables;
  grandBytes.rewind();

  // Auction infos (sysdata 32). RomData has no auctionInfoList field; keep it
  // in the module-local WeakMap (see getAuctionInfoList).
  const infoBytes = sysdataFile(data, 32, 'Auction Info data');
  const infos: AuctionInfo[] = [];
  const numInfos = u8At(data.arm9!, AUCTION_INFO_COUNT_OFFSET) + 1;
  for (let i = 0; i < numInfos; i++) {
    try {
      infos.push(new AuctionInfo(infoBytes, i));
    } catch (e) {
      throw new Error(`Failed to load Auction Info ${i}: ${errMsg(e)}`);
    }
  }
  auctionInfoLists.set(data, infos);
  infoBytes.rewind();
}

export function saveAuctions(data: RomData): void {
  // Java saveAuctions has no archive null-check.
  data.sysdata!.setFile(
    33,
    serialize(data.auctionPrizeTableList, 0x20, 'Auction Prize Table', () => '')
  );
  data.sysdata!.setFile(
    34,
    serialize(data.auctionGrandPrizeTableList, 0x20, 'Auction Grand Prize Table', () => '')
  );
  data.sysdata!.setFile(
    32,
    serialize(getAuctionInfoList(data), 0x10, 'Auction Info', () => '')
  );
  // Java does NOT patch the auction counts in arm9 on save.
}