import { Bytes } from '../../core/binary';

// Pure record port of AbilityAnimation (0x18-byte record). Shorts are signed,
// bytes are signed, matching Java's ByteBuffer.get()/getShort() storage.
export class AbilityAnimation {
  animation = 0;
  subtype = 0;
  start = 0;
  unitAnimation = 0;
  second = 0;
  untilThird = 0;
  third = 0;
  untilFourth = 0;
  fourth = 0;
  untilEnd = 0;
  _0x0C = 0;
  flinch_Glee = 0;
  _0x10 = 0;
  _0x11 = 0;
  _0x12 = 0;
  _0x13 = 0;
  targetState = 0;
  _0x16 = 0;
  _0x17 = 0;

  constructor(bytes?: Bytes) {
    if (bytes === undefined) return; // Java no-arg constructor: all zeroes.
    this.animation = bytes.getShort();
    this.subtype = bytes.get();
    this.start = bytes.get();
    this.unitAnimation = bytes.getShort();
    this.second = bytes.get();
    this.untilThird = bytes.get();
    this.third = bytes.get();
    this.untilFourth = bytes.get();
    this.fourth = bytes.get();
    this.untilEnd = bytes.get();
    this._0x0C = bytes.getShort();
    this.flinch_Glee = bytes.getShort();
    this._0x10 = bytes.get();
    this._0x11 = bytes.get();
    this._0x12 = bytes.get();
    this._0x13 = bytes.get();
    this.targetState = bytes.getShort();
    this._0x16 = bytes.get();
    this._0x17 = bytes.get();
  }

  copyFrom(source: AbilityAnimation): void {
    this.animation = source.animation;
    this.subtype = source.subtype;
    this.start = source.start;
    this.unitAnimation = source.unitAnimation;
    this.second = source.second;
    this.untilThird = source.untilThird;
    this.third = source.third;
    this.untilFourth = source.untilFourth;
    this.fourth = source.fourth;
    this.untilEnd = source.untilEnd;
    this._0x0C = source._0x0C;
    this.flinch_Glee = source.flinch_Glee;
    this._0x10 = source._0x10;
    this._0x11 = source._0x11;
    this._0x12 = source._0x12;
    this._0x13 = source._0x13;
    this.targetState = source.targetState;
    this._0x16 = source._0x16;
    this._0x17 = source._0x17;
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x18);
    b.putShort(this.animation);
    b.putU8(this.subtype);
    b.putU8(this.start);
    b.putShort(this.unitAnimation);
    b.putU8(this.second);
    b.putU8(this.untilThird);
    b.putU8(this.third);
    b.putU8(this.untilFourth);
    b.putU8(this.fourth);
    b.putU8(this.untilEnd);
    b.putShort(this._0x0C);
    b.putShort(this.flinch_Glee);
    b.putU8(this._0x10);
    b.putU8(this._0x11);
    b.putU8(this._0x12);
    b.putU8(this._0x13);
    b.putShort(this.targetState);
    b.putU8(this._0x16);
    b.putU8(this._0x17);
    return b.toUint8Array();
  }
}