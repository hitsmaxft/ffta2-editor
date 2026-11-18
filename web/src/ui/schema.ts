// Field metadata for the generic record editor: enum dropdowns and reference
// fields that resolve numeric ids to human-readable game data.

import { RomData } from '../data/romData';
import type { EnumDef } from '../data/model/enums';
import {
  Race, JobGender, JobMoveType, JobMovablePlaces, JobElementalResistance,
  EquipmentType, EquipmentLocation, LootCategory, LootRank, AbilityElement,
  RangeAOEType, AbilityMenuRoutine, FFTA2Month,
} from '../data/model/enums';
import { SpecialRequirement, WeaponRequirement } from '../data/model/abilityRequirements';
import { Targets, Effect, Accuracy, Modifier } from '../data/model/abilityEffect';
import { getFormationName, questName } from '../data/controllers/quest';
import { gameName, referenceName, t, type TranslationKey } from './i18n';

export type RefKind =
  | 'character' | 'job' | 'ability' | 'activeAbility' | 'item' | 'equipment'
  | 'loot' | 'itemTable' | 'abilitySet' | 'jobGroup' | 'law' | 'formation'
  | 'jobRequirement' | 'bazaarSet' | 'auctionPrizeTable' | 'face' | 'topSprite'
  | 'unitSprite' | 'region' | 'location' | 'bonusEffect' | 'jobName'
  | 'jobDescription' | 'abilityHelpText' | 'quest';

export interface FieldMeta {
  label?: string;
  ref?: RefKind;
  enum?: EnumDef;
  group?: TranslationKey;
}

export interface RefOption {
  id: number;
  name: string;
}

const ref = (kind: RefKind, label?: string): FieldMeta => ({ ref: kind, label });
const en = (value: EnumDef, label?: string): FieldMeta => ({ enum: value, label });

function nameAt(list: { id: number; string: string }[] | undefined, id: number, category: string): string {
  return gameName(category, list?.find((entry) => entry.id === id)?.string ?? '');
}

function recordsToOptions<T extends { id: number }>(
  list: T[],
  label: (item: T) => string
): RefOption[] {
  return list.map((item) => ({ id: item.id, name: label(item) }));
}

function textOptions(list: { id: number; string: string }[] | undefined): RefOption[] {
  return (list ?? []).map((entry) => ({ id: entry.id, name: entry.string || `#${entry.id}` }));
}

export function refOptions(data: RomData, kind: RefKind): RefOption[] {
  let options: RefOption[];
  switch (kind) {
    case 'character':
      options = textOptions(data.characterNames);
      break;
    case 'job':
      options = textOptions(data.jobNames);
      break;
    case 'jobName':
      options = textOptions(data.jobNames);
      break;
    case 'jobDescription':
      options = textOptions(data.jobDescriptions);
      break;
    case 'ability':
      options = textOptions(data.abilityNames);
      break;
    case 'activeAbility':
      options = data.activeAbilityList.map((a) => ({
        id: a.id,
        name: nameAt(data.abilityNames, a.id, 'ability') || referenceName('activeAbility', a.id),
      }));
      break;
    case 'abilityHelpText':
      options = textOptions(data.abilityHelpText);
      break;
    case 'item':
      options = textOptions(data.itemNames);
      break;
    case 'equipment':
      options = data.equipmentList.map((e) => ({
        id: e.id,
        name: nameAt(data.itemNames, e.id, 'item') || referenceName('equipment', e.id),
      }));
      break;
    case 'loot':
      options = data.lootList.map((l) => ({
        id: l.id,
        name: nameAt(data.itemNames, l.id, 'item') || referenceName('loot', l.id),
      }));
      break;
    case 'itemTable':
      options = data.itemTableList.map((t) => ({
        id: t.id,
        name: `#${t.id}: ${[t.item1, t.item2, t.item3, t.item4]
          .map((id) => nameAt(data.itemNames, id, 'item') || `#${id}`)
          .join(' / ')}`,
      }));
      break;
    case 'abilitySet':
      options = data.abilitySetList.map((s) => ({
        id: s.id,
        name: nameAt(data.abilitySetNames, s.id, 'skill_school') || referenceName('abilitySet', s.id),
      }));
      break;
    case 'jobGroup':
      options = recordsToOptions(data.jobGroupList, (g) =>
        `${referenceName('jobGroup', g.id)}: ${[g.job1, g.job2, g.job3, g.job4]
          .map((id) => nameAt(data.jobNames, id, 'job') || `#${id}`)
          .join(' / ')}`
      );
      break;
    case 'law':
      options = textOptions(data.lawNames);
      break;
    case 'formation':
      options = data.formationList.map((f) => ({
        id: f.id,
        name: getFormationName(data, f.id) || referenceName('formation', f.id),
      }));
      break;
    case 'jobRequirement':
      options = data.jobRequirementList.map((r) => ({
        id: r.id,
        name: `#${r.id}: ${nameAt(data.jobNames, r.jobId, 'job') || referenceName('job', r.jobId)}`,
      }));
      break;
    case 'bazaarSet':
      options = textOptions(data.bazaarSetNames);
      break;
    case 'auctionPrizeTable':
      options = data.auctionPrizeTableList.map((t) => ({ id: t.id, name: referenceName('auctionPrizeTable', t.id) }));
      break;
    case 'face':
      options = data.unitFaces.map((_, index) => ({ id: index, name: referenceName('face', index) }));
      break;
    case 'topSprite':
      options = data.topSprites.map((s) => ({ id: s.id, name: referenceName('topSprite', s.id) }));
      break;
    case 'unitSprite':
      options = data.unitSstList.map((_, i) => ({ id: i, name: referenceName('unitSprite', i) }));
      options.unshift({ id: -1, name: t('ref.none') });
      break;
    case 'region':
      options = textOptions(data.regionNames);
      break;
    case 'location':
      options = textOptions(data.locationNames);
      break;
    case 'bonusEffect':
      options = textOptions(data.bonusEffects);
      break;
    case 'quest':
      options = data.questDataList.map((q) => ({
        id: q.id,
        name: questName(data, q.id) || referenceName('quest', q.id),
      }));
      break;
  }
  const categories: Partial<Record<RefKind, string>> = {
    job: 'job', jobName: 'job', ability: 'ability', item: 'item',
    region: 'region', location: 'location', character: 'character', law: 'law',
    quest: 'quest', bazaarSet: 'bazaar',
  };
  const category = categories[kind];
  return category ? options.map((option) => ({ ...option, name: gameName(category, option.name) })) : options;
}

const resist = () => en(JobElementalResistance);

const common: Record<string, FieldMeta> = {
  race: en(Race),
  race1: en(Race),
  race2: en(Race),
  race3: en(Race),
  race4: en(Race),
  race5: en(Race),
  race6: en(Race),

  gender: en(JobGender),
  moveType: en(JobMoveType),
  movablePlaces: en(JobMovablePlaces),
  fireResistance: resist(),
  airResistance: resist(),
  earthResistance: resist(),
  iceResistance: resist(),
  waterResistance: resist(),
  electricityResistance: resist(),
  holyResistance: resist(),
  darkResistance: resist(),
  unitPortrait: ref('face'),
  enemyPortrait: ref('face'),
  unitSprite: ref('unitSprite'),
  unitAlternateSprite: ref('unitSprite'),
  enemySprite: ref('unitSprite'),
  enemyAlternateSprite: ref('unitSprite'),
  unitTopSprite: ref('topSprite'),
  enemyTopSprite: ref('topSprite'),
  abilitySet: ref('abilitySet'),
  defaultJob: ref('job'),
  job: ref('job'),
  character: ref('character'),
  character1: ref('character'),
  character2: ref('character'),
  jobId: ref('job'),
  formation: ref('formation'),
  law: ref('law'),
  item: ref('item'),
  item1: ref('item'),
  item2: ref('item'),
  item3: ref('item'),
  item4: ref('item'),
  loot1: ref('loot'),
  loot2: ref('loot'),
  loot3: ref('loot'),
  requiredItem1: ref('item'),
  requiredItem2: ref('item'),
  lootConsumable: ref('itemTable'),
  lootGil: ref('itemTable'),
  lootLevel1: ref('itemTable'),
  lootLevel2: ref('itemTable'),
  lootLevel3: ref('itemTable'),
  lootLevel4: ref('itemTable'),
  equipment1: ref('equipment'),
  equipment2: ref('equipment'),
  equipment3: ref('equipment'),
  equipment4: ref('equipment'),
  equipment5: ref('equipment'),
  jobGroup1: ref('jobGroup'),
  jobGroup2: ref('jobGroup'),
  jobGroup3: ref('jobGroup'),
  bonusEffect: ref('bonusEffect'),
  ability: ref('activeAbility'),
  ability1: ref('ability'),
  ability2: ref('ability'),
  ability3: ref('ability'),
  primaryAbility1: ref('ability'),
  primaryAbility2: ref('ability'),
  primaryAbility3: ref('ability'),
  primaryAbility4: ref('ability'),
  primaryAbility5: ref('ability'),
  primaryAbility6: ref('ability'),
  secondaryAbility1: ref('ability'),
  secondaryAbility2: ref('ability'),
  secondaryAbility3: ref('ability'),
  secondaryAbility4: ref('ability'),
  reactionAbility: ref('ability'),
  passiveAbility: ref('ability'),
  learnedAbility: ref('ability'),
  learnedAbilityId: ref('ability'),
  abilityRequirement: ref('ability'),
  recommendedDispatch: ref('job'),
  questLocation: ref('location'),
  region: ref('region'),
  otherRegion1: ref('region'),
  otherRegion2: ref('region'),
  prizeTables: ref('auctionPrizeTable'),
  element: en(AbilityElement),
  abilityElement: en(AbilityElement),
  equipmentType: en(EquipmentType),
  equipmentLocation: en(EquipmentLocation),
  rangeAOEType: en(RangeAOEType),
  menuRoutine: en(AbilityMenuRoutine),
  weaponRequirement: en(WeaponRequirement),
  specialRequirement: en(SpecialRequirement),
  monthRequirement: en(FFTA2Month),
  targets: en(Targets),
  effect: en(Effect),
  accuracy: en(Accuracy),
  modifier: en(Modifier),
};

const schemas: Record<string, Record<string, FieldMeta>> = {
  jobs: { ...common },
  jobGroups: { job1: ref('job'), job2: ref('job'), job3: ref('job'), job4: ref('job') },
  jobRequirements: {
    ...common,
    job1: ref('abilitySet'), job2: ref('abilitySet'), job3: ref('abilitySet'),
  },
  characters: {
    ...common,
    name: ref('character'),
    jobName: ref('jobName'),
    jobDescription: ref('jobDescription'),
  },
  abilities: {
    ...common,
    abilityHelp: ref('abilityHelpText'),
  },
  abilitySets: {
    ...common,
    ability: ref('activeAbility'),
  },
  equipment: { ...common, sprite: ref('unitSprite') },
  consumables: {},
  loot: { category: en(LootCategory), rank: en(LootRank) },
  itemTables: { ...common },
  lawBonuses: { ...common },
  bazaar: { item: ref('equipment') },
  bazaarRecipes: { item: ref('equipment'), loot1: ref('loot'), loot2: ref('loot'), loot3: ref('loot') },
  auctions: { ...common },
  auctionPrizes: { ...common },
  auctionGrandPrizes: { ...common },
  formations: {
    ...common,
    header: { label: 'Header', group: 'group.formationHeader' },
    units: { label: 'Units', group: 'group.formationUnits' },
  },
  quests: {
    ...common,
    info: { label: 'Info', group: 'group.questInfo' },
    data: { label: 'Data', group: 'group.questData' },
  },
};

export function fieldMeta(tabId: string, key: string): FieldMeta | undefined {
  return schemas[tabId]?.[key] ?? common[key];
}

const VISUAL_FIELDS = new Set([
  'unitPortrait', 'enemyPortrait', 'unitSprite', 'unitAlternateSprite',
  'enemySprite', 'enemyAlternateSprite', 'unitTopSprite', 'enemyTopSprite',
  'sprite', 'unitPalette', 'enemyPalette', 'palette',
]);

export function groupFor(tabId: string, key: string): TranslationKey {
  const meta = fieldMeta(tabId, key);
  if (meta?.group) return meta.group;
  if (VISUAL_FIELDS.has(key)) return 'group.visuals';
  if (key === 'propertyFlags' || key === 'equipFlags' || key.startsWith('abilityFlags')) return 'group.flags';
  if (key.endsWith('Resistance')) return 'group.resistances';
  if (key.endsWith('Growth')) return 'group.growth';
  if (key.endsWith('Base') || key === 'move' || key === 'jump' || key === 'evasion' || key === 'resilience') return 'group.stats';
  if (meta?.ref) return 'group.references';
  return 'group.other';
}
