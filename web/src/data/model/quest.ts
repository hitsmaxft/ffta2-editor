import { Bytes, toSignedByte } from '../../core/binary';
import { Flags } from './flags';
import { FFTA2Month } from './enums';

// Pure record ports of model/quest/*.java. Reference fields store raw numeric
// indices; name/description resolution happens in the controller layer (RomData).
// Signed byte/short fields use get()/getShort() to match Java ByteBuffer.

// Mirrors QuestData.ItemReward. `item` is the raw item index (data & 0x3FF),
// `amount` is a SIGNED byte: Java does (byte)(data >>> 10) on the sign-extended
// short, so negative shorts yield negative amounts.
export class QuestItemReward {
  item: number;
  amount: number;

  constructor(item: number, amount: number) {
    this.item = item;
    this.amount = toSignedByte(amount);
  }

  static fromShort(data: number): QuestItemReward {
    // data is a signed short; >>> operates on the sign-extended int like Java.
    return new QuestItemReward(data & 0x3ff, data >>> 10);
  }

  set(data: number): void {
    this.item = data & 0x3ff;
    this.amount = toSignedByte(data >>> 10);
  }

  toShort(): number {
    return ((this.item | (this.amount << 10)) << 16) >> 16;
  }
}

export class QuestData {
  id: number;
  type = 0;
  questGroup = 0;
  rank = 0;
  regionFlags: Flags;
  storyRequirement = 0;
  flagRequirement = 0;
  unknownRequirementIndex = 0;
  unknownRequirementValue = 0;
  monthRequirement = 0;
  dayRequirement = 0;
  _0x0d = 0;
  abilityRequirement = 0;
  days = 0;
  cooldownFailure = 0;
  cooldownSuccess = 0;
  fee = 0;
  requiredItem1 = 0;
  requiredItemAmount1 = 0;
  _0x17 = 0;
  requiredItem2 = 0;
  requiredItemAmount2 = 0;
  _0x1b = 0;
  negotiation = 0;
  aptitude = 0;
  teamwork = 0;
  adaptability = 0;
  _0x20 = 0;
  questLocation = 0;
  battlefield = 0;
  _0x24 = 0;
  _0x25 = 0;
  _0x26 = 0;
  _0x27 = 0;
  _0x28 = 0;
  _0x29 = 0;
  dispatch = false;
  _0x2b = 0;
  _0x2c = 0;
  _0x2d = 0;
  _0x2e = 0;
  recommendedDispatch = 0;
  _0x30 = 0;
  _0x31 = 0;
  _0x32 = 0;
  _0x33 = 0;
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
  _0x3f = 0;
  _0x40 = 0;
  _0x41 = 0;
  _0x42 = 0;
  _0x43 = 0;
  _0x44 = 0;
  _0x45 = 0;
  _0x46 = 0;
  _0x47 = 0;
  _0x48 = 0;
  _0x49 = 0;
  _0x4a = 0;
  _0x4b = 0;
  gilReward = 0;
  apReward = 0;
  cpReward = 0;
  itemReward1: QuestItemReward;
  itemReward2: QuestItemReward;
  itemReward3: QuestItemReward;
  itemReward4: QuestItemReward;
  itemReward4Flag = 0;
  _0x5a = 0;
  _0x5b = 0;
  _0x5c = 0;
  _0x5d = 0;
  expReward = 0;
  _0x5f = 0;
  _0x60 = 0;
  _0x61 = 0;
  _0x62 = 0;
  _0x63 = 0;

  constructor(bytes: Bytes, id = 0) {
    this.id = id;
    this.type = bytes.get();
    this.questGroup = bytes.get();
    this.rank = bytes.get();

    this.regionFlags = new Flags(bytes.getBytesAt(bytes.position(), 1));
    bytes.position(bytes.position() + 1);

    this.storyRequirement = bytes.getShort();
    this.flagRequirement = bytes.getShort();
    this.unknownRequirementIndex = bytes.getShort();
    this.unknownRequirementValue = bytes.get();
    this.monthRequirement = FFTA2Month.fromInteger(bytes.getU8());
    this.dayRequirement = bytes.get();
    this._0x0d = bytes.get();
    this.abilityRequirement = bytes.getU16();
    this.days = bytes.get();
    this.cooldownFailure = bytes.get();
    this.cooldownSuccess = bytes.get();
    this.fee = bytes.get();
    this.requiredItem1 = bytes.getU16();
    this.requiredItemAmount1 = bytes.get();
    this._0x17 = bytes.get();
    this.requiredItem2 = bytes.getU16();
    this.requiredItemAmount2 = bytes.get();
    this._0x1b = bytes.get();

    this.negotiation = bytes.get();
    this.aptitude = bytes.get();
    this.teamwork = bytes.get();
    this.adaptability = bytes.get();
    this._0x20 = bytes.get();
    this.questLocation = bytes.get();
    this.battlefield = bytes.getShort();

    this._0x24 = bytes.get();
    this._0x25 = bytes.get();
    this._0x26 = bytes.get();
    this._0x27 = bytes.get();
    this._0x28 = bytes.get();
    this._0x29 = bytes.get();

    this.dispatch = bytes.get() === 1;

    this._0x2b = bytes.get();
    this._0x2c = bytes.get();
    this._0x2d = bytes.get();
    this._0x2e = bytes.get();

    this.recommendedDispatch = bytes.getU8();

    this._0x30 = bytes.get();
    this._0x31 = bytes.get();
    this._0x32 = bytes.get();
    this._0x33 = bytes.get();
    this._0x34 = bytes.get();
    this._0x35 = bytes.get();
    this._0x36 = bytes.get();
    this._0x37 = bytes.get();
    this._0x38 = bytes.get();
    this._0x39 = bytes.get();
    this._0x3a = bytes.get();
    this._0x3b = bytes.get();
    this._0x3c = bytes.get();
    this._0x3d = bytes.get();
    this._0x3e = bytes.get();
    this._0x3f = bytes.get();
    this._0x40 = bytes.get();
    this._0x41 = bytes.get();
    this._0x42 = bytes.get();
    this._0x43 = bytes.get();
    this._0x44 = bytes.get();
    this._0x45 = bytes.get();
    this._0x46 = bytes.get();
    this._0x47 = bytes.get();
    this._0x48 = bytes.get();
    this._0x49 = bytes.get();
    this._0x4a = bytes.get();
    this._0x4b = bytes.get();

    this.gilReward = bytes.getShort();
    this.apReward = bytes.get();
    this.cpReward = bytes.get();

    this.itemReward1 = QuestItemReward.fromShort(bytes.getShort());
    this.itemReward2 = QuestItemReward.fromShort(bytes.getShort());
    this.itemReward3 = QuestItemReward.fromShort(bytes.getShort());
    this.itemReward4 = QuestItemReward.fromShort(bytes.getShort());

    this.itemReward4Flag = bytes.getShort();
    this._0x5a = bytes.get();
    this._0x5b = bytes.get();
    this._0x5c = bytes.get();
    this._0x5d = bytes.get();

    this.expReward = bytes.get();

    this._0x5f = bytes.get();
    this._0x60 = bytes.get();
    this._0x61 = bytes.get();
    this._0x62 = bytes.get();
    this._0x63 = bytes.get();
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x64);
    b.put(this.type);
    b.put(this.questGroup);
    b.put(this.rank);

    b.putBytes(this.regionFlags.toBytes());

    b.putShort(this.storyRequirement);
    b.putShort(this.flagRequirement);
    b.putShort(this.unknownRequirementIndex);
    b.put(this.unknownRequirementValue);
    b.put(this.monthRequirement);
    b.put(this.dayRequirement);
    b.put(this._0x0d);
    b.putShort(this.abilityRequirement);
    b.put(this.days);
    b.put(this.cooldownFailure);
    b.put(this.cooldownSuccess);
    b.put(this.fee);
    b.putShort(this.requiredItem1);
    b.put(this.requiredItemAmount1);
    b.put(this._0x17);
    b.putShort(this.requiredItem2);
    b.put(this.requiredItemAmount2);
    b.put(this._0x1b);

    b.put(this.negotiation);
    b.put(this.aptitude);
    b.put(this.teamwork);
    b.put(this.adaptability);
    b.put(this._0x20);
    b.put(this.questLocation);
    b.putShort(this.battlefield);

    b.put(this._0x24);
    b.put(this._0x25);
    b.put(this._0x26);
    b.put(this._0x27);
    b.put(this._0x28);
    b.put(this._0x29);

    b.put(this.dispatch ? 1 : 0);

    b.put(this._0x2b);
    b.put(this._0x2c);
    b.put(this._0x2d);
    b.put(this._0x2e);

    b.put(this.recommendedDispatch);

    b.put(this._0x30);
    b.put(this._0x31);
    b.put(this._0x32);
    b.put(this._0x33);
    b.put(this._0x34);
    b.put(this._0x35);
    b.put(this._0x36);
    b.put(this._0x37);
    b.put(this._0x38);
    b.put(this._0x39);
    b.put(this._0x3a);
    b.put(this._0x3b);
    b.put(this._0x3c);
    b.put(this._0x3d);
    b.put(this._0x3e);
    b.put(this._0x3f);
    b.put(this._0x40);
    b.put(this._0x41);
    b.put(this._0x42);
    b.put(this._0x43);
    b.put(this._0x44);
    b.put(this._0x45);
    b.put(this._0x46);
    b.put(this._0x47);
    b.put(this._0x48);
    b.put(this._0x49);
    b.put(this._0x4a);
    b.put(this._0x4b);

    b.putShort(this.gilReward);
    b.put(this.apReward);
    b.put(this.cpReward);

    b.putShort(this.itemReward1.toShort());
    b.putShort(this.itemReward2.toShort());
    b.putShort(this.itemReward3.toShort());
    b.putShort(this.itemReward4.toShort());

    b.putShort(this.itemReward4Flag);
    b.put(this._0x5a);
    b.put(this._0x5b);
    b.put(this._0x5c);
    b.put(this._0x5d);

    b.put(this.expReward);

    b.put(this._0x5f);
    b.put(this._0x60);
    b.put(this._0x61);
    b.put(this._0x62);
    b.put(this._0x63);

    return b.toUint8Array();
  }
}

export class QuestInfo {
  id = 0;
  formation = 0;
  _0x02 = 0;
  startEvent = 0;
  endEvent = 0;

  constructor(bytes: Bytes) {
    this.formation = bytes.getU16();
    this._0x02 = bytes.getShort();
    this.startEvent = bytes.getShort();
    this.endEvent = bytes.getShort();
  }

  toBytes(): Uint8Array {
    const b = Bytes.alloc(0x8);
    b.putShort(this.formation);
    b.putShort(this._0x02);
    b.putShort(this.startEvent);
    b.putShort(this.endEvent);
    return b.toUint8Array();
  }
}

export class Quest {
  id: number;
  info: QuestInfo;
  data: QuestData;

  constructor(infoBytes: Bytes, dataBytes: Bytes, id: number) {
    this.id = id;
    this.info = new QuestInfo(infoBytes);
    this.data = new QuestData(dataBytes);
  }

  toBytes(): [Uint8Array, Uint8Array] {
    return [this.info.toBytes(), this.data.toBytes()];
  }
}