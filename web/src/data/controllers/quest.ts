// Ports of QuestController.loadQuests/saveQuests and
// FormationController.loadFormations/saveFormations (data logic only, JavaFX
// UI stripped). Models are pure parsers with raw numeric indices, so reference
// range checks, list-size defaults and name resolution happen here.
//
// Load order: jobs/abilities/characters/items -> formations -> quests.
// Quest data lives in sysdata (NOT jhQuest, which holds quest TEXT):
//   sysdata file 10 = QuestInfo records (0x8 bytes each)
//   sysdata file 11 = QuestData records (0x64 bytes each)
// Formations live in entrydata as (header, units) file pairs:
//   entrydata file i*2   = FormationHeader (0x44 bytes)
//   entrydata file i*2+1 = FormationUnit[] (0x3c bytes each)
// Quest counts are read from arm9 shorts at 0x000cb284 (info) and 0x000cb2c8
// (data), each +1. Neither save function patches arm9/overlays in Java.

import { Bytes, toUnsignedShort } from '../../core/binary';
import { RomData } from '../romData';
import { Quest, QuestData, QuestInfo, QuestItemReward } from '../model/quest';
import { FormationData, FormationHeader, FormationUnit } from '../model/formation';

// ---------------------------------------------------------------------------
// Formation display names
// ---------------------------------------------------------------------------
// Java FormationData.name is a UI-only StringProperty (never serialized) that
// loadFormations/loadQuests populate. The ported TS model is a pure parser
// without that field, so display names are kept here, per RomData instance.

const formationNameMaps = new WeakMap<RomData, Map<number, string>>();

export function formationNames(data: RomData): Map<number, string> {
  let names = formationNameMaps.get(data);
  if (!names) {
    names = new Map();
    formationNameMaps.set(data, names);
  }
  return names;
}

export function getFormationName(data: RomData, id: number): string {
  return formationNames(data).get(id) ?? '';
}

// ---------------------------------------------------------------------------
// Name resolution helpers (Java StringBindings / cell renderers)
// ---------------------------------------------------------------------------

// Java Quest.name binds to App.questNames.get(id).string ("" when id is past
// the table); Quest.description defaults to "\var2:00\\end\".
export function questName(data: RomData, id: number): string {
  return id < data.questNames.length ? data.questNames[id].string : '';
}

export function questDescription(data: RomData, id: number): string {
  return id < data.questDescriptions.length
    ? data.questDescriptions[id].string
    : '\\var2:00\\\\end\\';
}

export function questLocationName(data: RomData, questData: QuestData): string {
  const index = questData.questLocation & 0xff;
  return index < data.locationNames.length ? data.locationNames[index].string : '';
}

export function questFormationName(data: RomData, info: QuestInfo): string {
  return getFormationName(data, info.formation);
}

export function itemRewardName(data: RomData, reward: QuestItemReward): string {
  return reward.item < data.itemNames.length ? data.itemNames[reward.item].string : '';
}

export function formationUnitName(data: RomData, unit: FormationUnit): string {
  const index = toUnsignedShort(unit.name);
  return index < data.characterNames.length ? data.characterNames[index].string : '';
}

export function formationLawName(data: RomData, header: FormationHeader): string {
  const index = header.law & 0xff;
  return index < data.lawNames.length ? data.lawNames[index].string : '';
}

// ---------------------------------------------------------------------------
// Reference validation
// ---------------------------------------------------------------------------
// Java model constructors resolve references via App.<list>.get(index), which
// throws IndexOutOfBoundsException on out-of-range indices. The ported models
// keep raw indices, so the checks are reproduced here. Prerequisite loaders
// (jobs/abilities/characters/items) may not have run yet; while a list is
// empty the check is skipped (local workaround for the missing loaders).

function checkIndex(list: { length: number }, index: number, label: string): void {
  if (list.length > 0 && index >= list.length) {
    throw new Error(`${label}: index ${index} out of range (list size ${list.length})`);
  }
}

const UNIT_ABILITY_FIELDS = [
  'primaryAbility1',
  'primaryAbility2',
  'primaryAbility3',
  'primaryAbility4',
  'primaryAbility5',
  'primaryAbility6',
  'secondaryAbility1',
  'secondaryAbility2',
  'secondaryAbility3',
  'secondaryAbility4',
] as const;

const UNIT_EQUIPMENT_FIELDS = [
  'equipment1',
  'equipment2',
  'equipment3',
  'equipment4',
  'equipment5',
] as const;

const UNIT_LOOT_FIELDS = [
  'lootLevel1',
  'lootLevel2',
  'lootLevel3',
  'lootLevel4',
  'lootConsumable',
  'lootGil',
] as const;

function resolveFormationReferences(data: RomData, formation: FormationData): void {
  for (const unit of formation.units) {
    const label = `Formation ${formation.id}, Unit ${unit.id}`;
    checkIndex(data.characterList, unit.character, `${label} character`);
    checkIndex(data.jobDataList, unit.job, `${label} job`);
    for (const f of UNIT_ABILITY_FIELDS) {
      checkIndex(data.abilityList, unit[f], `${label} ${f}`);
    }

    // Java defaults out-of-range secondary ability sets to abilitySetList[0]
    // and records a load warning. This default AFFECTS saved bytes.
    if (data.abilitySetList.length > 0 && unit.secondaryAbilitySet >= data.abilitySetList.length) {
      const warning = `Formation ${formation.id}, Unit ${unit.id}: secondary Ability Set ${unit.secondaryAbilitySet} not found. Defaulting to 0`;
      data.warnings.push(warning);
      unit.secondaryAbilitySet = data.abilitySetList[0].id;
    }

    // Java maps reaction/passive id 0 to reactionAbilityList[0] /
    // passiveAbilityList[0]; both have id 0, so this is byte-equivalent.
    if (unit.reactionAbility === 0 && data.reactionAbilityList.length > 0) {
      unit.reactionAbility = data.reactionAbilityList[0].id;
    }
    if (unit.passiveAbility === 0 && data.passiveAbilityList.length > 0) {
      unit.passiveAbility = data.passiveAbilityList[0].id;
    }

    for (const f of UNIT_EQUIPMENT_FIELDS) {
      checkIndex(data.equipmentList, unit[f], `${label} ${f}`);
    }
    for (const f of UNIT_LOOT_FIELDS) {
      checkIndex(data.itemTableList, unit[f], `${label} ${f}`);
    }
  }
}

function resolveQuestReferences(data: RomData, quest: Quest): void {
  const label = `Quest ${quest.id}`;
  checkIndex(data.formationList, quest.info.formation, `${label} formation`);
  checkIndex(data.abilityList, quest.data.abilityRequirement, `${label} abilityRequirement`);
  checkIndex(data.itemList, quest.data.requiredItem1, `${label} requiredItem1`);
  checkIndex(data.itemList, quest.data.requiredItem2, `${label} requiredItem2`);
  checkIndex(data.itemList, quest.data.itemReward1.item, `${label} itemReward1`);
  checkIndex(data.itemList, quest.data.itemReward2.item, `${label} itemReward2`);
  checkIndex(data.itemList, quest.data.itemReward3.item, `${label} itemReward3`);
  checkIndex(data.itemList, quest.data.itemReward4.item, `${label} itemReward4`);
  checkIndex(data.jobDataList, quest.data.recommendedDispatch, `${label} recommendedDispatch`);
}

// ---------------------------------------------------------------------------
// FormationController.loadFormations / saveFormations
// ---------------------------------------------------------------------------

export function loadFormations(data: RomData): void {
  if (!data.archive) return;

  const entrydata = data.entrydata!;
  const numFormations = Math.floor(entrydata.numFiles() / 2);
  const formationDataList: FormationData[] = [];

  for (let i = 0; i < numFormations; i++) {
    const headerBytes = entrydata.getFile(i * 2);
    const unitBytes = entrydata.getFile(i * 2 + 1);
    if (headerBytes == null || unitBytes == null) {
      throw new Error(`Formation ${i} data is null`);
    }
    headerBytes.rewind();
    unitBytes.rewind();
    let formation: FormationData;
    try {
      formation = new FormationData(headerBytes, unitBytes, i);
    } catch (e) {
      throw new Error(`Failed to load Formation ${i}`, { cause: e });
    }
    resolveFormationReferences(data, formation);
    formationDataList.push(formation);
    headerBytes.rewind();
    unitBytes.rewind();
  }

  data.formationList = formationDataList;
  // Java: formationDataList.get(0).name.set("Recruitable Units")
  formationNames(data).set(0, 'Recruitable Units');
}

export function saveFormations(data: RomData): void {
  const formations = data.formationList;
  // Java keeps the entrydata resize block commented out: the file count is
  // never changed here, only existing slots are overwritten.
  for (let i = 0; i < formations.length; i++) {
    try {
      // FormationData.toBytes mutates header.numUnits to (byte)units.length.
      const [headerBytes, unitBytes] = formations[i].toBytes();
      data.entrydata!.setFile(i * 2, Bytes.wrap(headerBytes));
      data.entrydata!.setFile(i * 2 + 1, Bytes.wrap(unitBytes));
    } catch (e) {
      throw new Error(`Failed to save Formation ${i}`, { cause: e });
    }
  }
}

// ---------------------------------------------------------------------------
// QuestController.loadQuests / saveQuests
// ---------------------------------------------------------------------------

export function loadQuests(data: RomData): void {
  if (!data.archive) return;

  const sysdata = data.sysdata!;
  const questInfoBytes = sysdata.getFile(10);
  const questDataBytes = sysdata.getFile(11);
  if (questDataBytes == null) {
    throw new Error('Quest data is null');
  }
  if (questInfoBytes == null) {
    throw new Error('Quest Info data is null');
  }
  questInfoBytes.rewind();
  questDataBytes.rewind();

  // Java reads absolute arm9 shorts (position-independent); restore position.
  const arm9 = data.arm9!;
  const arm9Pos = arm9.position();
  arm9.position(0x000cb284);
  const numQuestInfo = arm9.getU16() + 1;
  arm9.position(0x000cb2c8);
  const numQuestData = arm9.getU16() + 1;
  arm9.position(arm9Pos);
  if (numQuestData !== numQuestInfo) {
    throw new Error("Quest info and Quest data don't match");
  }

  const questDataList: Quest[] = [];
  for (let i = 0; i < numQuestInfo; i++) {
    try {
      const quest = new Quest(questInfoBytes, questDataBytes, i);
      resolveQuestReferences(data, quest);
      questDataList.push(quest);
    } catch (e) {
      throw new Error(`Failed to load Quest ${i} "${questName(data, i)}"`, { cause: e });
    }
  }
  data.questDataList = questDataList;

  questInfoBytes.rewind();
  questDataBytes.rewind();

  for (const quest of questDataList) {
    const name = questName(data, quest.id);
    const eventIndex = toUnsignedShort(quest.info.startEvent);
    // Java: App.evMsgNames.get(startEvent).set(quest.name) — NPE (rethrown)
    // when the event index has no table.
    if (!data.evMsgNames.has(eventIndex)) {
      throw new Error(`Failed to set Event ${eventIndex} name from Quest ${quest.id} name`);
    }
    data.evMsgNames.set(eventIndex, name);
    // Java's evMsgNames map holds the StringTable's own name property; mirror
    // the update onto the parsed table too.
    const table = data.eventMsgList[eventIndex];
    if (table) table.name = name;

    if (quest.info.formation !== 0) {
      formationNames(data).set(quest.info.formation, name);
    }
  }
}

export function saveQuests(data: RomData): void {
  const quests = data.questDataList;
  const newQuestInfoBytes = Bytes.alloc(quests.length * 0x8);
  const newQuestDataBytes = Bytes.alloc(quests.length * 0x64);

  for (let i = 0; i < quests.length; i++) {
    try {
      const [infoBytes, dataBytes] = quests[i].toBytes();
      newQuestInfoBytes.putBytes(infoBytes);
      newQuestDataBytes.putBytes(dataBytes);
    } catch (e) {
      throw new Error(`Failed to save Quest ${i} "${questName(data, quests[i].id)}"`, { cause: e });
    }
  }
  newQuestInfoBytes.rewind();
  newQuestDataBytes.rewind();
  data.sysdata!.setFile(10, newQuestInfoBytes);
  data.sysdata!.setFile(11, newQuestDataBytes);
}