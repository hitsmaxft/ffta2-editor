// Central data context replacing the Java App static globals.
// Holds raw ROM resources plus all parsed model lists and name tables.

import { Bytes } from '../core/binary';
import { Archive } from '../core/archive';
import { IdxAndPak } from '../core/idxpak';
import { NdsRom } from '../core/nds';
import { StringTable, StringSingle, StringWithId } from './model/stringTable';
import { JobData, JobGroup, AbilitySet, JobRequirementData } from './model/job';
import { CharacterData } from './model/character';
import { ActiveAbilityData, SPAbilityData } from './model/abilityData';
import { EquipmentData, ConsumableData, LootData, ItemData, ItemTable, LawBonus } from './model/item';
import { BazaarRecipe, BazaarSet } from './model/bazaar';
import { FormationData } from './model/formation';
import { Quest } from './model/quest';
import { AuctionPrizeTable } from './model/auction';
import { UnitSst, TopSprite, UnitFace } from './model/sprites';
import { MapData } from './model/map';
import { SBN } from './model/battle';
import type { WordTable } from '../core/wordTable';

export class RomData {
  nds: NdsRom | null = null;
  archive: Archive | null = null;

  sysdata: IdxAndPak | null = null;
  unitSsts: IdxAndPak | null = null;
  unitCgs: IdxAndPak | null = null;
  jdMessage: IdxAndPak | null = null;
  jhQuest: IdxAndPak | null = null;
  jhRumor: IdxAndPak | null = null;
  jhNotice: IdxAndPak | null = null;
  evMsg: IdxAndPak | null = null;
  entrydata: IdxAndPak | null = null;
  atl: IdxAndPak | null = null;
  face: IdxAndPak | null = null;
  mapData: IdxAndPak | null = null;
  texData: IdxAndPak | null = null;
  plttData: IdxAndPak | null = null;

  arm9: Bytes | null = null;
  overlay8: Bytes | null = null;
  overlay11: Bytes | null = null;
  naUnitAnimTable: Bytes | null = null;
  /** Optional external double-byte (Chinese) word table. */
  wordTable: WordTable | null = null;

  // Text domain
  messageList: StringTable[] = [];
  eventMsgList: StringTable[] = [];
  questList: StringSingle[] = [];
  rumorList: StringSingle[] = [];
  noticeList: StringSingle[] = [];
  evMsgNames = new Map<number, string>();

  characterNames: StringWithId[] = [];
  jobNames: StringWithId[] = [];
  abilitySetNames: StringWithId[] = [];
  abilityNames: StringWithId[] = [];
  jobDescriptions: StringWithId[] = [];
  abilitySetDescriptions: StringWithId[] = [];
  abilityDescriptions: StringWithId[] = [];
  abilityHelpText: StringWithId[] = [];
  itemNames: StringWithId[] = [];
  itemDescriptions: StringWithId[] = [];
  bonusEffects: StringWithId[] = [];
  lawNames: StringWithId[] = [];
  questNames: StringWithId[] = [];
  questDescriptions: StringWithId[] = [];
  regionNames: StringWithId[] = [];
  locationNames: StringWithId[] = [];
  bazaarSetNames: StringWithId[] = [];
  bazaarSetDescriptions: StringWithId[] = [];
  noticeNames: StringWithId[] = [];
  rumorNames: StringWithId[] = [];

  // Model lists (ported from App static globals). Name/description resolution
  // and list-size defaults live in the controller layer, not the models.
  jobDataList: JobData[] = [];
  jobGroupList: JobGroup[] = [];
  jobRequirementList: JobRequirementData[] = [];
  abilitySetList: AbilitySet[] = [];
  activeAbilityList: ActiveAbilityData[] = [];
  passiveAbilityList: SPAbilityData[] = [];
  reactionAbilityList: SPAbilityData[] = [];
  abilityList: (ActiveAbilityData | SPAbilityData)[] = [];
  characterList: CharacterData[] = [];
  equipmentList: EquipmentData[] = [];
  consumableList: ConsumableData[] = [];
  lootList: LootData[] = [];
  itemList: ItemData[] = [];
  itemTableList: ItemTable[] = [];
  lawBonusList: LawBonus[] = [];
  bazaarRecipeList: BazaarRecipe[] = [];
  bazaarSetList: BazaarSet[] = [];
  formationList: FormationData[] = [];
  questDataList: Quest[] = [];
  auctionPrizeTableList: AuctionPrizeTable[] = [];
  auctionGrandPrizeTableList: AuctionPrizeTable[] = [];
  unitSstList: UnitSst[] = [];
  topSprites: TopSprite[] = [];
  unitFaces: UnitFace[] = [];
  maps: MapData[] = [];
  sbn: SBN | null = null;

  warnings: string[] = [];
}