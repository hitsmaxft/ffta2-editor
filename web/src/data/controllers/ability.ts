// Port of AbilityController.loadAbilities / saveAbilities (data logic only).
// JavaFX list wiring, cell factories, context menus and the race AP slot lists
// (a UI-support structure local to the Java controller) are intentionally omitted.
//
// Load-order dependency: loadMessages (text.ts) must run first so that
// data.abilityHelpText / data.abilityNames / data.abilityDescriptions are
// populated (the Java models read these App globals inside their constructors).
//
// Counts are FIXED constants in Java (not read from arm9/overlay bytes):
//   sysdata file 4: 0x336 active abilities   (0x34 bytes each)
//   sysdata file 5: 0x336 ability animations (0x18 bytes each)
//   sysdata file 6: 0x1D reaction SP abilities, ids from 0x336 (0x04 bytes each)
//   sysdata file 7: 0x28 passive SP abilities,  ids from 0x353 (0x04 bytes each)
// The SP lists each prepend a dummy id-0 entry (Java `new SPAbilityData("", 0)`).
//
// abilityAnimationList is a field of the Java controller, NOT of App; RomData
// has no corresponding field, so it is kept in a module-local WeakMap keyed by
// RomData (see getAbilityAnimations).

import { Bytes, toUnsignedShort } from '../../core/binary';
import { RomData } from '../romData';
import { ActiveAbilityData, SPAbilityData } from '../model/abilityData';
import { AbilityAnimation } from '../model/abilityAnimation';

export const ACTIVE_ABILITY_COUNT = 0x336;
export const REACTION_ABILITY_COUNT = 0x1d;
export const PASSIVE_ABILITY_COUNT = 0x28;
export const ACTIVE_ABILITY_SIZE = 0x34;
export const ABILITY_ANIMATION_SIZE = 0x18;

// Java default description when id >= App.abilityDescriptions.size():
// "\\var2:00\\\\end\\" in Java source == \var2:00\\end\
const DEFAULT_ABILITY_DESCRIPTION = '\\var2:00\\\\end\\';

// Workaround for the missing RomData.abilityAnimationList field: the animation
// list lives on the Java controller instance, so keep it per-RomData here.
const abilityAnimationLists = new WeakMap<RomData, AbilityAnimation[]>();

export function getAbilityAnimations(data: RomData): AbilityAnimation[] {
  return abilityAnimationLists.get(data) ?? [];
}

export function setAbilityAnimations(data: RomData, list: AbilityAnimation[]): void {
  abilityAnimationLists.set(data, list);
}

// Name/description resolution (Java model constructors read App.abilityNames /
// App.abilityDescriptions; the pure TS models store raw indices instead).
export function abilityName(data: RomData, id: number): string {
  return id < data.abilityNames.length ? data.abilityNames[id].string : '';
}

export function abilityDescription(data: RomData, id: number): string {
  return id < data.abilityDescriptions.length
    ? data.abilityDescriptions[id].string
    : DEFAULT_ABILITY_DESCRIPTION;
}

// Java `new SPAbilityData(String name, int id)`: zero-filled record; when the id
// is past the end of the name/description tables it APPENDS a new entry to them.
function newDummySPAbility(data: RomData, name: string, id: number): SPAbilityData {
  if (id >= data.abilityNames.length) {
    data.abilityNames.push({ id, string: name });
  }
  if (id >= data.abilityDescriptions.length) {
    data.abilityDescriptions.push({ id, string: DEFAULT_ABILITY_DESCRIPTION });
  }
  // Bytes.alloc is zero-filled: maxAP = 0, apIndex = 0, padding = 0, matching
  // the Java (String, int) constructor.
  return new SPAbilityData(Bytes.alloc(4), id);
}

export function loadAbilities(data: RomData): void {
  if (!data.archive) return;
  const sysdata = data.sysdata!;

  // Active Abilities (sysdata file 4)
  const activeAbilityDataBytes = sysdata.getFile(4);
  if (activeAbilityDataBytes == null) {
    throw new Error('Active Abilities are null');
  }
  activeAbilityDataBytes.rewind();

  const activeAbilityDataList: ActiveAbilityData[] = [];
  for (let i = 0; i < ACTIVE_ABILITY_COUNT; i++) {
    try {
      activeAbilityDataList.push(
        new ActiveAbilityData(activeAbilityDataBytes, i, data.abilityHelpText.length)
      );
    } catch (e) {
      data.warnings.push(`Failed to load Active Ability ${i} "${abilityName(data, i)}"`);
      throw e;
    }
  }
  data.activeAbilityList = activeAbilityDataList;
  activeAbilityDataBytes.rewind();

  // Reaction Abilities (sysdata file 6)
  const reactionAbilityDataBytes = sysdata.getFile(6);
  if (reactionAbilityDataBytes == null) {
    throw new Error('Reaction Abilities are null');
  }
  reactionAbilityDataBytes.rewind();

  const reactionAbilityDataList: SPAbilityData[] = [newDummySPAbility(data, '', 0)];
  for (let i = 0; i < REACTION_ABILITY_COUNT; i++) {
    try {
      reactionAbilityDataList.push(new SPAbilityData(reactionAbilityDataBytes, i + 0x336));
    } catch (e) {
      data.warnings.push(`Failed to load Reaction Ability ${i + 0x336} "${abilityName(data, i)}"`);
      throw e;
    }
  }
  data.reactionAbilityList = reactionAbilityDataList;
  reactionAbilityDataBytes.rewind();

  // Passive Abilities (sysdata file 7)
  const passiveAbilityDataBytes = sysdata.getFile(7);
  if (passiveAbilityDataBytes == null) {
    throw new Error('Passive Abilities are null');
  }
  passiveAbilityDataBytes.rewind();

  const passiveAbilityDataList: SPAbilityData[] = [newDummySPAbility(data, '', 0)];
  for (let i = 0; i < PASSIVE_ABILITY_COUNT; i++) {
    try {
      passiveAbilityDataList.push(new SPAbilityData(passiveAbilityDataBytes, i + 0x353));
    } catch (e) {
      data.warnings.push(`Failed to load Passive Ability ${i + 0x353} "${abilityName(data, i)}"`);
      throw e;
    }
  }
  data.passiveAbilityList = passiveAbilityDataList;
  passiveAbilityDataBytes.rewind();

  // Combined list: actives + reactions/passives without their dummy 0th entry.
  data.abilityList = [
    ...data.activeAbilityList,
    ...data.reactionAbilityList.slice(1),
    ...data.passiveAbilityList.slice(1),
  ];

  // Java: ability.learnedAbility.set(App.abilityList.get(unsigned(learnedAbilityId))).
  // abilityList[u].id === u, so resolving the object reduces to storing its id;
  // the learnableByBlueMagick binding is (learnedAbility != null && id != 0).
  for (const ability of data.activeAbilityList) {
    const index = toUnsignedShort(ability.learnedAbilityId);
    const target = data.abilityList[index];
    if (target === undefined) {
      // Java List.get throws IndexOutOfBoundsException here.
      throw new RangeError(`learnedAbilityId ${index} out of range for ability ${ability.id}`);
    }
    ability.learnedAbility = target.id;
    ability.abilityFlags.learnableByBlueMagick = target.id !== 0;
  }

  // Ability Animations (sysdata file 5). Plain 0x18-byte records; the Java
  // AbilityController does NOT consult naUnitAnimTable when parsing these.
  const abilityAnimationBytes = sysdata.getFile(5);
  if (abilityAnimationBytes == null) {
    throw new Error('Ability Animations are null');
  }
  abilityAnimationBytes.rewind();
  const abilityAnimationList: AbilityAnimation[] = [];
  for (let i = 0; i < ACTIVE_ABILITY_COUNT; i++) {
    try {
      abilityAnimationList.push(new AbilityAnimation(abilityAnimationBytes));
    } catch (e) {
      data.warnings.push(`Failed to load Ability Animation ${i}`);
      throw e;
    }
  }
  abilityAnimationLists.set(data, abilityAnimationList);
  abilityAnimationBytes.rewind();
}

export function saveAbilities(data: RomData): void {
  const sysdata = data.sysdata!;

  // Active Abilities -> sysdata file 4.
  const abilities = data.activeAbilityList;
  const newAbilityDataBytes = Bytes.alloc(abilities.length * ACTIVE_ABILITY_SIZE);
  for (let i = 0; i < abilities.length; i++) {
    try {
      newAbilityDataBytes.putBytes(abilities[i].toBytes());
    } catch (e) {
      data.warnings.push(`Failed to save Active Ability ${i} "${abilityName(data, abilities[i].id)}"`);
      throw e;
    }
  }
  newAbilityDataBytes.rewind();
  sysdata.setFile(4, newAbilityDataBytes);

  // Ability Animations -> sysdata file 5.
  const abilityAnimationList = abilityAnimationLists.get(data);
  if (abilityAnimationList === undefined) {
    // Java NPEs on the null controller field when loadAbilities was never run.
    throw new Error('Ability Animations are null');
  }
  const newAbilityAnimationBytes = Bytes.alloc(abilityAnimationList.length * ABILITY_ANIMATION_SIZE);
  for (let i = 0; i < abilityAnimationList.length; i++) {
    try {
      newAbilityAnimationBytes.putBytes(abilityAnimationList[i].toBytes());
    } catch (e) {
      data.warnings.push(`Failed to save Ability Animation ${i} "${abilityName(data, abilities[i]?.id ?? i)}"`);
      throw e;
    }
  }
  newAbilityAnimationBytes.rewind();
  sysdata.setFile(5, newAbilityAnimationBytes);

  // Faithful to Java saveAbilities:
  // - Reaction/passive SP files (6/7) are NOT written back by this method.
  // - The arm9 count patches below are COMMENTED OUT in the Java source
  //   ("TODO: Rewrite FUN_02080f38"), so no arm9/overlay bytes are touched here.
  //   Offsets kept for reference (arm9 file offsets; numActive = active count,
  //   numReaction/numPassive exclude the dummy 0th entry):
  //     short numActive-1: 0x000cb0a8 0x000bbde4 0x000c0208 0x000b63bc 0x000b68ac
  //                        0x000b6f48 0x000b84a0 0x0010f8e0 0x000b8640
  //     short numActive:   0x000bb108 0x000bbddc 0x000cb0f4 0x000b6a34 0x000cb558
  //                        0x000b84a4 0x0009f7c0 0x0010f8e4
  //     int 0xe3a04fcd:    0x000b7464
  //     int 0xe2840000+(numActive-0x334): 0x000b746c
  //     int 0xe3e00000:    0x000bbc50
  //     byte numActive-0x300: 0x0007c5d4
  //     short numActive+numReaction: 0x000bb10c 0x000bbde0 0x000cb144 0x000b6b48
  //                        0x000b84a8 0x0009f7c4 0x0010f8e8
  //     short numActive+numReaction-1: 0x000f0028
  //     int -numActive:    0x000cb0f8
  //     int -(numActive+numReaction): 0x000cb148
  //     byte numReaction-1: 0x000baebc 0x000bbb58 0x000cb0d8 0x000b697c 0x000cb538
  //                        0x000b83c0 0x0009f72c 0x0010f8ac 0x000efe60
  //     byte numPassive-1: 0x000baee4 0x000bbbcc 0x000cb128 0x000b6a90 0x000b8420
  //                        0x0009f74c 0x0010f8c8
  //     byte numPassive:   0x000efe70
  //     byte animations-1: 0x000cb18c
  // - sysdata.repack() + archive.setFile happen in MainController.save (ROM-level
  //   orchestration), not in saveAbilities.
}