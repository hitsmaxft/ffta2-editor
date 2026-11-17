import { Bytes } from '../core/binary';
import { RomData } from './romData';
import { StringTable, StringSingle, StringWithId, messageNames, evMsgNames } from './model/stringTable';

// Port of TextController.loadMessages (data logic only).
export function loadMessages(data: RomData): void {
  if (!data.archive) return;

  data.messageList = [];
  const jd = data.jdMessage!;
  for (let i = 0; i < jd.numFiles(); i++) {
    const bytes = jd.getFile(i);
    if (bytes == null || bytes.rewind().remaining() === 0) continue;
    const table = new StringTable(bytes, messageNames[i] ?? `Table ${i}`, i, data.wordTable);
    data.messageList.push(table);
    switch (i) {
      case 0: data.characterNames = table.strings; break;
      case 1: data.jobNames = table.strings; break;
      case 2: data.abilitySetNames = table.strings; break;
      case 3: data.abilityNames = table.strings; break;
      case 4: data.regionNames = table.strings; break;
      case 5: data.locationNames = table.strings; break;
      case 6: data.questNames = table.strings; break;
      case 8: data.rumorNames = table.strings; break;
      case 10: data.noticeNames = table.strings; break;
      case 11: data.itemNames = table.strings; break;
      case 14: data.lawNames = table.strings; break;
      case 18: {
        const temp: StringWithId[] = table.strings.slice(0x75, 0xc8);
        temp.unshift({ id: 0, string: 'None' });
        data.bonusEffects = temp;
        break;
      }
      case 24: data.bazaarSetNames = table.strings; break;
      case 30: data.abilitySetDescriptions = table.strings; break;
      case 31: data.abilityDescriptions = table.strings; break;
      case 35: data.questDescriptions = table.strings; break;
      case 38: data.jobDescriptions = table.strings; break;
      case 39: data.itemDescriptions = table.strings; break;
      case 47: data.abilityHelpText = table.strings; break;
      case 53: data.bazaarSetDescriptions = table.strings; break;
    }
  }

  data.eventMsgList = [];
  const ev = data.evMsg!;
  for (let i = 0; i < ev.numFiles(); i++) {
    const bytes = ev.getFile(i);
    const table = new StringTable(bytes, evMsgNames[i] ?? 'Unknown', i, data.wordTable);
    data.eventMsgList.push(table);
    data.evMsgNames.set(i, table.name);
  }

  data.questList = [];
  const jq = data.jhQuest!;
  for (let i = 0; i < jq.numFiles(); i++) {
    const bytes = jq.getFile(i);
    if (bytes == null || bytes.rewind().remaining() === 0) continue;
    data.questList.push(new StringSingle(bytes, data.questNames[i]?.string ?? '', i, data.wordTable));
  }

  data.rumorList = [];
  const jr = data.jhRumor!;
  for (let i = 0; i < jr.numFiles(); i++) {
    const bytes = jr.getFile(i);
    if (bytes == null || bytes.rewind().remaining() === 0) continue;
    data.rumorList.push(new StringSingle(bytes, data.rumorNames[i]?.string ?? '', i, data.wordTable));
  }

  data.noticeList = [];
  const jn = data.jhNotice!;
  for (let i = 0; i < jn.numFiles(); i++) {
    const bytes = jn.getFile(i);
    if (bytes == null || bytes.rewind().remaining() === 0) continue;
    data.noticeList.push(new StringSingle(bytes, data.noticeNames[i]?.string ?? '', i, data.wordTable));
  }
}

// Port of TextController.saveMessages.
export function saveMessages(data: RomData): void {
  for (const table of data.messageList) {
    const bytes = table.toBytes();
    if (bytes.length === 0) continue;
    data.jdMessage!.setFile(table.id, Bytes.wrap(bytes));
  }
  for (const table of data.eventMsgList) {
    const bytes = table.toBytes(false);
    if (bytes.length === 0) continue;
    data.evMsg!.setFile(table.id, Bytes.wrap(bytes));
  }
  for (const single of data.questList) {
    data.jhQuest!.setFile(single.id, Bytes.wrap(single.toBytes()));
  }
  for (const single of data.rumorList) {
    data.jhRumor!.setFile(single.id, Bytes.wrap(single.toBytes()));
  }
  for (const single of data.noticeList) {
    data.jhNotice!.setFile(single.id, Bytes.wrap(single.toBytes()));
  }
}