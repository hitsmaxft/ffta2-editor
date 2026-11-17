import { Bytes } from '../../core/binary';
import { Flags } from './flags';
import { Race, JobMoveType, JobMovablePlaces, JobElementalResistance, JobGender } from './enums';

// Pure record ports. Reference fields store raw numeric indices; name/description
// resolution and list-size defaults happen in the controller layer (RomData).
// expandedTopSprites mirrors PatchesController.patchedExpandedTopSprites.

export class JobData {
  id: number;
  unitPortrait = 0;
  enemyPortrait = 0;
  unitSprite = -1;
  unitAlternateSprite = -1;
  enemySprite = -1;
  enemyAlternateSprite = -1;
  unitPalette = 0;
  enemyPalette = 0;
  race = 0;
  moveType = 0;
  movablePlaces = 0;
  move = 0;
  jump = 0;
  hpBase = 0;
  hpGrowth = 0;
  mpBase = 0;
  mpGrowth = 0;
  speedBase = 0;
  speedGrowth = 0;
  attackBase = 0;
  attackGrowth = 0;
  defenseBase = 0;
  defenseGrowth = 0;
  magickBase = 0;
  magickGrowth = 0;
  resistanceBase = 0;
  resistanceGrowth = 0;
  fireResistance = 0;
  airResistance = 0;
  earthResistance = 0;
  waterResistance = 0;
  iceResistance = 0;
  electricityResistance = 0;
  holyResistance = 0;
  darkResistance = 0;
  evasion = 0;
  _0x2a = 0;
  _0x2b = 0;
  _0x2c = 0;
  resilience = 0;
  abilitySet = 0;
  _0x2f = 0;
  unarmedBonus = 0;
  raceSomethingMaybe = 0;
  _0x32 = 0;
  gender = 0;
  _0x34 = 0;
  _0x35 = 0;
  _0x36 = 0;
  _0x37 = 0;
  _0x38 = 0;
  _0x39 = 0;
  _0x3a = 0;
  _0x3b = 0;
  _0x3c = 0;
  _0x3d = 0;
  _0x3e = 0;
  unitTopSprite = 0;
  enemyTopSprite = 0;
  _0x41 = 0;
  propertyFlags: Flags;
  equipFlags: Flags;

  constructor(bytes: Bytes, id: number, expandedTopSprites = false) {
    this.id = id;
    this.unitPortrait = bytes.getU16();
    this.enemyPortrait = bytes.getU16();
    this.unitSprite = bytes.getShort();
    this.unitAlternateSprite = bytes.getShort();
    this.enemySprite = bytes.getShort();
    this.enemyAlternateSprite = bytes.getShort();
    this.unitPalette = bytes.getU8();
    this.enemyPalette = bytes.getU8();
    this.race = Race.fromInteger(bytes.getU8());
    this.moveType = JobMoveType.fromInteger(bytes.getU8());
    this.movablePlaces = JobMovablePlaces.fromInteger(bytes.getU8());
    this.move = bytes.getU8();
    this.jump = bytes.getU8();
    this.hpBase = bytes.getU8();
    this.hpGrowth = bytes.getU8();
    this.mpBase = bytes.getU8();
    this.mpGrowth = bytes.getU8();
    this.speedBase = bytes.getU8();
    this.speedGrowth = bytes.getU8();
    this.attackBase = bytes.getU8();
    this.attackGrowth = bytes.getU8();
    this.defenseBase = bytes.getU8();
    this.defenseGrowth = bytes.getU8();
    this.magickBase = bytes.getU8();
    this.magickGrowth = bytes.getU8();
    this.resistanceBase = bytes.getU8();
    this.resistanceGrowth = bytes.getU8();
    this.fireResistance = JobElementalResistance.fromInteger(bytes.getU8());
    this.airResistance = JobElementalResistance.fromInteger(bytes.getU8());
    this.earthResistance = JobElementalResistance.fromInteger(bytes.getU8());
    this.waterResistance = JobElementalResistance.fromInteger(bytes.getU8());
    this.iceResistance = JobElementalResistance.fromInteger(bytes.getU8());
    this.electricityResistance = JobElementalResistance.fromInteger(bytes.getU8());
    this.holyResistance = JobElementalResistance.fromInteger(bytes.getU8());
    this.darkResistance = JobElementalResistance.fromInteger(bytes.getU8());
    this.evasion = bytes.getU8();
    this._0x2a = bytes.getU8();
    this._0x2b = bytes.getU8();
    this._0x2c = bytes.getU8();
    this.resilience = bytes.getU8();
    this.abilitySet = bytes.getU8();
    this._0x2f = bytes.getU8();
    this.unarmedBonus = bytes.getU8();
    this.raceSomethingMaybe = bytes.getU8();
    this._0x32 = bytes.getU8();
    this.gender = JobGender.fromInteger(bytes.getU8());
    this._0x34 = bytes.getU8();
    this._0x35 = bytes.getU8();
    this._0x36 = bytes.getU8();
    this._0x37 = bytes.getU8();
    this._0x38 = bytes.getU8();
    this._0x39 = bytes.getU8();
    this._0x3a = bytes.getU8();
    this._0x3b = bytes.getU8();
    if (expandedTopSprites) {
      this.unitTopSprite = bytes.getU16();
      this.enemyTopSprite = bytes.getU16();
      this._0x3e = bytes.getU8();
      this._0x3c = 0;
      this._0x3d = 0;
    } else {
      this._0x3c = bytes.getU8();
      this._0x3d = bytes.getU8();
      this._0x3e = bytes.getU8();
      this.unitTopSprite = bytes.getU8();
      this.enemyTopSprite = bytes.getU8();
    }
    this._0x41 = bytes.getU8();
    this.propertyFlags = new Flags(new Uint8Array([bytes.getU8()]));
    this.equipFlags = new Flags(bytes.getBytesAt(bytes.position(), 5));
    bytes.position(bytes.position() + 5);
  }

  toBytes(expandedTopSprites = false): Uint8Array {
    const b = Bytes.alloc(0x48);
    b.putU16(this.unitPortrait);
    b.putU16(this.enemyPortrait);
    b.putShort(this.unitSprite);
    b.putShort(this.unitAlternateSprite);
    b.putShort(this.enemySprite);
    b.putShort(this.enemyAlternateSprite);
    b.putU8(this.unitPalette);
    b.putU8(this.enemyPalette);
    b.putU8(this.race);
    b.putU8(this.moveType);
    b.putU8(this.movablePlaces);
    b.putU8(this.move);
    b.putU8(this.jump);
    b.putU8(this.hpBase);
    b.putU8(this.hpGrowth);
    b.putU8(this.mpBase);
    b.putU8(this.mpGrowth);
    b.putU8(this.speedBase);
    b.putU8(this.speedGrowth);
    b.putU8(this.attackBase);
    b.putU8(this.attackGrowth);
    b.putU8(this.defenseBase);
    b.putU8(this.defenseGrowth);
    b.putU8(this.magickBase);
    b.putU8(this.magickGrowth);
    b.putU8(this.resistanceBase);
    b.putU8(this.resistanceGrowth);
    b.putU8(this.fireResistance);
    b.putU8(this.airResistance);
    b.putU8(this.earthResistance);
    b.putU8(this.waterResistance);
    b.putU8(this.iceResistance);
    b.putU8(this.electricityResistance);
    b.putU8(this.holyResistance);
    b.putU8(this.darkResistance);
    b.putU8(this.evasion);
    b.putU8(this._0x2a);
    b.putU8(this._0x2b);
    b.putU8(this._0x2c);
    b.putU8(this.resilience);
    // Java writes abilitySet.id as a short here, overwriting the parsed _0x2f byte.
    b.putU16(this.abilitySet);
    b.putU8(this.unarmedBonus);
    b.putU8(this.raceSomethingMaybe);
    b.putU8(this._0x32);
    b.putU8(this.gender);
    b.putU8(this._0x34);
    b.putU8(this._0x35);
    b.putU8(this._0x36);
    b.putU8(this._0x37);
    b.putU8(this._0x38);
    b.putU8(this._0x39);
    b.putU8(this._0x3a);
    b.putU8(this._0x3b);
    if (expandedTopSprites) {
      b.putU16(this.unitTopSprite);
      b.putU16(this.enemyTopSprite);
      b.putU8(this._0x3e);
    } else {
      b.putU8(this._0x3c);
      b.putU8(this._0x3d);
      b.putU8(this._0x3e);
      b.putU8(this.unitTopSprite);
      b.putU8(this.enemyTopSprite);
    }
    b.putU8(this._0x41);
    b.putBytes(this.propertyFlags.toBytes());
    b.putBytes(this.equipFlags.toBytes());
    return b.toUint8Array();
  }
}

export class AbilitySetAbility {
  ability = 0;
  castAnimation = 0;
  ability_0x4 = 0;
  ability_0x5 = 0;
  ability_0x6 = 0;
  ability_0x7 = 0;
  ability_0x8 = 0;
  maxAP = 0;
  ability_0xa = 0;
  ability_0xb = 0;

  constructor(bytes: Bytes) {
    this.ability = bytes.getU16();
    this.castAnimation = bytes.getShort();
    this.ability_0x4 = bytes.getU8();
    this.ability_0x5 = bytes.getU8();
    this.ability_0x6 = bytes.getU8();
    this.ability_0x7 = bytes.getU8();
    this.ability_0x8 = bytes.getU8();
    this.maxAP = bytes.getU8();
    this.ability_0xa = bytes.getU8();
    this.ability_0xb = bytes.getU8();
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0xc);
    b.putU16(this.ability);
    b.putShort(this.castAnimation);
    b.putU8(this.ability_0x4);
    b.putU8(this.ability_0x5);
    b.putU8(this.ability_0x6);
    b.putU8(this.ability_0x7);
    b.putU8(this.ability_0x8);
    b.putU8(this.maxAP);
    b.putU8(this.ability_0xa);
    b.putU8(this.ability_0xb);
    return b.toUint8Array();
  }
}

export class AbilitySet {
  id: number;
  firstAbilityIndex = 0;
  lastAbilityIndex = 0;
  raceFlags: Flags;
  _0xa = 0;
  _0xb = 0;
  abilities: AbilitySetAbility[] = [];

  constructor(setBytes: Bytes, abilityBytes: Bytes, id: number) {
    this.id = id;
    this.firstAbilityIndex = setBytes.getShort();
    this.lastAbilityIndex = setBytes.getShort();
    this.raceFlags = new Flags(setBytes.getBytesAt(setBytes.position(), 6));
    setBytes.position(setBytes.position() + 6);
    this._0xa = setBytes.getU8();
    this._0xb = setBytes.getU8();
    abilityBytes.position(0xc * this.firstAbilityIndex);
    for (let i = 0; i < this.lastAbilityIndex - this.firstAbilityIndex + 1; i++) {
      this.abilities.push(new AbilitySetAbility(abilityBytes));
    }
  }

  tobytes(abilityStartIndex: number): [Uint8Array, Uint8Array] {
    const setBuffer = Bytes.alloc(0xc);
    setBuffer.putShort(abilityStartIndex);
    setBuffer.putShort(abilityStartIndex + this.abilities.length - 1);
    setBuffer.putBytes(this.raceFlags.toBytes());
    setBuffer.putU8(this._0xa);
    setBuffer.putU8(this._0xb);
    const abilityBuffer = Bytes.alloc(0xc * this.abilities.length);
    for (const ability of this.abilities) abilityBuffer.putBytes(ability.toBytes());
    return [setBuffer.toUint8Array(), abilityBuffer.toUint8Array()];
  }
}

export class JobGroup {
  id: number;
  job1 = 0;
  job2 = 0;
  job3 = 0;
  job4 = 0;

  constructor(bytes: Bytes, id: number) {
    this.id = id;
    this.job1 = bytes.getU8();
    this.job2 = bytes.getU8();
    this.job3 = bytes.getU8();
    this.job4 = bytes.getU8();
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x4);
    b.putU8(this.job1);
    b.putU8(this.job2);
    b.putU8(this.job3);
    b.putU8(this.job4);
    return b.toUint8Array();
  }
}

export class JobRequirementData {
  id: number;
  flag = 0;
  indexOrder = 0;
  jobId = 0;
  character1 = 0;
  character2 = 0;
  job1 = 0;
  abilityNum1 = 0;
  job2 = 0;
  abilityNum2 = 0;
  job3 = 0;
  abilityNum3 = 0;

  // abilitySetCount mirrors App.abilitySetList.size(); out-of-range ability set
  // indices clamp to 0 exactly as Java (defaults to abilitySetList.get(0), id 0).
  constructor(bytes: Bytes, id: number, abilitySetCount: number) {
    this.id = id;
    this.flag = bytes.getShort();
    this.indexOrder = bytes.get();
    this.jobId = bytes.getU8();
    this.character1 = bytes.getU8();
    this.character2 = bytes.getU8();
    const set1 = bytes.getU8();
    this.job1 = set1 < abilitySetCount ? set1 : 0;
    this.abilityNum1 = bytes.get();
    const set2 = bytes.getU8();
    this.job2 = set2 < abilitySetCount ? set2 : 0;
    this.abilityNum2 = bytes.get();
    const set3 = bytes.getU8();
    this.job3 = set3 < abilitySetCount ? set3 : 0;
    this.abilityNum3 = bytes.get();
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0xc);
    b.putShort(this.flag);
    b.put(this.indexOrder);
    b.putU8(this.jobId);
    b.putU8(this.character1);
    b.putU8(this.character2);
    b.putU8(this.job1);
    b.put(this.abilityNum1);
    b.putU8(this.job2);
    b.put(this.abilityNum2);
    b.putU8(this.job3);
    b.put(this.abilityNum3);
    return b.toUint8Array();
  }
}