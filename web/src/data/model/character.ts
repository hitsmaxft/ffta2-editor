import { Bytes } from '../../core/binary';
import { JobGender } from './enums';

export class CharacterData {
  id: number;
  dialogueRole = 0;
  gender = 0;
  unitPortrait = 0;
  enemyPortrait = 0;
  unitSprite = -1;
  unitAlternateSprite = -1;
  enemySprite = -1;
  enemyAlternateSprite = -1;
  unitPalette = 0;
  enemyPalette = 0;
  name = 0;
  defaultJob = 0;
  voice = 0;
  jobName = 0;
  jobDescription = 0;
  unitTopSprite = 0;
  enemyTopSprite = 0;
  _0x1a = 0;
  _0x1b = 0;

  constructor(bytes: Bytes, id: number, expandedTopSprites = false) {
    this.id = id;
    this.dialogueRole = bytes.getU8();
    this.gender = JobGender.fromInteger(bytes.getU8());
    this.unitPortrait = bytes.getU16();
    this.enemyPortrait = bytes.getU16();
    this.unitSprite = bytes.getShort();
    this.unitAlternateSprite = bytes.getShort();
    this.enemySprite = bytes.getShort();
    this.enemyAlternateSprite = bytes.getShort();
    this.unitPalette = bytes.getU8();
    this.enemyPalette = bytes.getU8();
    this.name = bytes.getU16();
    this.defaultJob = bytes.getU8();
    this.voice = bytes.getU8();
    this.jobName = bytes.getU16();
    this.jobDescription = bytes.getU16();
    if (expandedTopSprites) {
      this.unitTopSprite = bytes.getU16();
      this.enemyTopSprite = bytes.getU16();
      this._0x1a = 0;
      this._0x1b = 0;
    } else {
      this.unitTopSprite = bytes.getU8();
      this.enemyTopSprite = bytes.getU8();
      this._0x1a = bytes.getU8();
      this._0x1b = bytes.getU8();
    }
  }

  toBytes(expandedTopSprites = false): Uint8Array {
    const b = Bytes.alloc(0x1c);
    b.putU8(this.dialogueRole);
    b.putU8(this.gender);
    b.putU16(this.unitPortrait);
    b.putU16(this.enemyPortrait);
    b.putShort(this.unitSprite);
    b.putShort(this.unitAlternateSprite);
    b.putShort(this.enemySprite);
    b.putShort(this.enemyAlternateSprite);
    b.putU8(this.unitPalette);
    b.putU8(this.enemyPalette);
    b.putU16(this.name);
    b.putU8(this.defaultJob);
    b.putU8(this.voice);
    b.putU16(this.jobName);
    b.putU16(this.jobDescription);
    if (expandedTopSprites) {
      b.putU16(this.unitTopSprite);
      b.putU16(this.enemyTopSprite);
    } else {
      b.putU8(this.unitTopSprite);
      b.putU8(this.enemyTopSprite);
      b.putU8(this._0x1a);
      b.putU8(this._0x1b);
    }
    return b.toUint8Array();
  }
}