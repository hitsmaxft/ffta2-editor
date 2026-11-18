import * as enums from '../data/model/enums';
import { Targets, Effect, Accuracy, Modifier } from '../data/model/abilityEffect';
import { SpecialRequirement, WeaponRequirement } from '../data/model/abilityRequirements';
import type { FieldSpec, TableSpec, Domain } from './types';
import { FLAG_DEFINITIONS } from './flagDefinitions';

export const LAYOUT_ID = 'ffta2-usa-sysdata-v1';
// Relative record layouts and archive table IDs are format definitions, never
// physical ROM addresses. Record counts come from the actual indexed resources.
type Field = string | [key: string, bytes: number, enumeration?: string];
function fields(rows: Field[]): FieldSpec[] {
  let offset = 0;
  return rows.map((row) => {
    const [key, bytes, enumeration] = typeof row === 'string' ? [row, 1, undefined] : row;
    const out: FieldSpec = { key, bytes, offset };
    if (enumeration) out.enum = enumeration;
    if (/^_|_0x|Maybe|unknown|padding/i.test(key)) out.unknown = true;
    offset += bytes;
    return out;
  });
}
const visual: Field[] = ['unitPortrait', 'enemyPortrait', 'unitSprite', 'unitAlternateSprite', 'enemySprite', 'enemyAlternateSprite'].map((key) => [key, 2]);
const growth: Field[] = ['hp', 'mp', 'speed', 'attack', 'defense', 'magick', 'resistance'].flatMap((key) => [key + 'Base', key + 'Growth']);
const resist: Field[] = ['fire', 'air', 'earth', 'water', 'ice', 'electricity', 'holy', 'dark'].map((key) => [key + 'Resistance', 1, 'JobElementalResistance']);
const jobFields: Field[] = [...visual, 'unitPalette', 'enemyPalette', ['race', 1, 'Race'], ['moveType', 1, 'JobMoveType'],
  ['movablePlaces', 1, 'JobMovablePlaces'], 'move', 'jump', ...growth, ...resist, 'evasion', '_0x2a', '_0x2b', '_0x2c', 'resilience',
  'abilitySet', '_0x2f', 'unarmedBonus', 'raceSomethingMaybe', '_0x32', ['gender', 1, 'JobGender'],
  ...Array.from({ length: 11 }, (_, i) => `_0x${(0x34 + i).toString(16)}`),
  'unitTopSprite', 'enemyTopSprite', '_0x41', 'properties', ['equipment', 5]];
const activeFields: Field[] = [['abilityHelp', 2], ['abilityElement', 1, 'AbilityElement'], 'mpCost', '_0x4', '_0x5', ['power', 2],
  ['weaponRequirement', 2, 'WeaponRequirement'], ['specialRequirement', 1, 'SpecialRequirement'], ['rangeAOEType', 1, 'RangeAOEType'],
  'range', 'radius', 'heightDifference', ['menuRoutine', 1, 'AbilityMenuRoutine']];
for (let i = 1; i <= 4; i++) for (const [key, enumeration] of [['target', 'Targets'], ['effect', 'Effect'], ['accuracy', 'Accuracy'], ['modifier', 'Modifier']]) activeFields.push([`effect${i}.${key}`, 1, enumeration]);
activeFields.push(['flags', 4]);
for (let i = 1; i <= 6; i++) activeFields.push([`race${i}`, 1, 'Race'], `apIndex${i}`);
activeFields.push('_0x30', '_0x31', ['learnedAbilityId', 2]);
const characterFields: Field[] = ['dialogueRole', ['gender', 1, 'JobGender'], ...visual, 'unitPalette', 'enemyPalette', ['name', 2],
  'defaultJob', 'voice', ['jobName', 2], ['jobDescription', 2], 'unitTopSprite', 'enemyTopSprite', '_0x1a', '_0x1b'];
const equipmentFields: Field[] = [['equipmentType', 2, 'EquipmentType'], ['notName', 2], ['element', 1, 'AbilityElement'], 'range',
  ['equipmentLocation', 1, 'EquipmentLocation'], 'palette', ['sprite', 2], ['attackEffect', 2], 'hitEffect', 'hitSound', ['buy', 2], ['sell', 2],
  'bonusEffect', 'attack', 'defense', 'magick', 'resistance', 'speed', 'evasion', 'move', 'jump', 'jobGroup1', 'jobGroup2', 'jobGroup3',
  ['ability1', 2], ['ability2', 2], ['ability3', 2], ['properties', 4]];
const reqFields: Field[] = [['flag', 2], 'indexOrder', 'jobId', 'character1', 'character2', 'job1', 'abilityNum1', 'job2', 'abilityNum2', 'job3', 'abilityNum3'];
const unitFields: Field[] = ['character', 'job', 'minLevel', 'maxLevel', ['name', 2], '_0x06', '_0x07', '_0x08', '_0x09', 'xPosition', 'yPosition', '_0x0c', '_0x0d',
  ...Array.from({ length: 6 }, (_, i): Field => [`primaryAbility${i + 1}`, 2]), 'secondaryAbilitySet', '_0x1b',
  ...Array.from({ length: 4 }, (_, i): Field => [`secondaryAbility${i + 1}`, 2]), ['reactionAbility', 2], ['passiveAbility', 2],
  ...Array.from({ length: 5 }, (_, i): Field => [`equipment${i + 1}`, 2]), '_0x32', '_0x33', 'lootLevel1', 'lootLevel2', 'lootLevel3', 'lootLevel4', 'lootConsumable', 'lootGil', 'faction', '_0x3b'];
const questFields: Field[] = ['type', 'questGroup', 'rank', 'regionFlags', ['storyRequirement', 2], ['flagRequirement', 2],
  ['unknownRequirementIndex', 2], 'unknownRequirementValue', ['monthRequirement', 1, 'FFTA2Month'], 'dayRequirement', '_0x0d',
  ['abilityRequirement', 2], 'days', 'cooldownFailure', 'cooldownSuccess', 'fee', ['requiredItem1', 2], 'requiredItemAmount1', '_0x17',
  ['requiredItem2', 2], 'requiredItemAmount2', '_0x1b', 'negotiation', 'aptitude', 'teamwork', 'adaptability', '_0x20', 'questLocation', ['battlefield', 2],
  ...Array.from({ length: 6 }, (_, i) => `_0x${(0x24 + i).toString(16)}`), 'dispatch', '_0x2b', '_0x2c', '_0x2d', '_0x2e', 'recommendedDispatch',
  ...Array.from({ length: 28 }, (_, i) => `_0x${(0x30 + i).toString(16)}`), ['gilReward', 2], 'apReward', 'cpReward',
  ['itemReward1', 2], ['itemReward2', 2], ['itemReward3', 2], ['itemReward4', 2], ['itemReward4Flag', 2], '_0x5a', '_0x5b', '_0x5c', '_0x5d', 'expReward',
  '_0x5f', '_0x60', '_0x61', '_0x62', '_0x63'];
function table(domain: Domain, tableId: number, stride: number, rows: Field[], idBase = 0, nameTable?: number, descriptionTable?: number): TableSpec {
  const spec = { domain, tableId, stride, fields: fields(rows), idBase, nameTable, descriptionTable };
  if (domain === 'quests') spec.fields.find((field) => field.key === 'type')!.unknown = true;
  if (spec.fields.reduce((n, field) => n + field.bytes, 0) !== stride) throw new Error(`Invalid record layout: ${domain}`);
  return spec;
}
export const TABLE_SPECS: TableSpec[] = [
  table('characters', 0, 28, characterFields, 0, 0), table('jobs', 1, 72, jobFields, 0, 1, 38),
  table('sets', 2, 12, [['first', 2], ['last', 2], ['raceFlags', 6], '_0xa', '_0xb'], 0, 2, 30),
  table('entries', 3, 12, [['ability', 2], ['castAnimation', 2], 'ability_0x4', 'ability_0x5', 'ability_0x6', 'ability_0x7', 'ability_0x8', 'maxAP', 'ability_0xa', 'ability_0xb']),
  table('active', 4, 52, activeFields, 0, 3, 31),
  table('animations', 5, 24, [['animation', 2], 'subtype', 'start', ['unitAnimation', 2], 'second', 'untilThird', 'third', 'untilFourth', 'fourth', 'untilEnd', ['_0x0C', 2], ['flinch_Glee', 2], '_0x10', '_0x11', '_0x12', '_0x13', ['targetState', 2], '_0x16', '_0x17']),
  table('reaction', 6, 4, ['maxAP', 'apIndex', ['padding', 2]], 0x336, 3, 31),
  table('support', 7, 4, ['maxAP', 'apIndex', ['padding', 2]], 0x353, 3, 31),
  table('equipment', 16, 40, equipmentFields, 0, 11, 39), table('requirements', 19, 12, reqFields),
  table('jobGroups', 36, 4, ['job1', 'job2', 'job3', 'job4']),
  table('consumables', 17, 8, [['buy', 2], ['sell', 2], ['_0x4', 2], ['storyProgress', 2]], 0, 11, 39),
  table('loot', 18, 8, [['buy', 2], ['sell', 2], ['category', 1, 'LootCategory'], ['rank', 1, 'LootRank'], ['_0x6', 2]], 0, 11, 39),
  table('questInfo', 10, 8, [['formation', 2], ['_0x02', 2], ['startEvent', 2], ['endEvent', 2]]),
  table('quests', 11, 100, questFields, 0, 6, 35),
];
export const FORMATION_HEADER = table('formationHeaders', -1, 68, ['law', 'numUnits', '_0x02', 'partyLimit', ...Array.from({ length: 64 }, (_, i) => `_0x${(i + 4).toString(16).padStart(2, '0')}`)]);
export const FORMATION_UNIT = table('formationUnits', -1, 60, unitFields);
export const ENUMS: Record<string, { name: string; value: number }[]> = {};
for (const [key, value] of Object.entries({ ...enums, Targets, Effect, Accuracy, Modifier, SpecialRequirement, WeaponRequirement })) ENUMS[key] = value.values;
export function getLayout(): object {
  return { id: LAYOUT_ID, gameCode: 'A6FE', tables: TABLE_SPECS, formationHeader: FORMATION_HEADER, formationUnit: FORMATION_UNIT,
    enums: ENUMS, bitDefinitions: FLAG_DEFINITIONS, numericStorage: 'unsigned little-endian raw values; signed/editor/game interpretations are separate',
    abilityIdNamespaces: { active: 0, reaction: 0x336, support: 0x353 }, unknownFieldsPreserved: true };
}
