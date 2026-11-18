// Positions come from Java JobData, EquipmentData, AbilitySet and QuestData.
// Display names never change bit ordering or serialization.
import { EquipmentType, Race } from '../data/model/enums';
import { enumLabel, gameName, getLanguage } from './i18n';

const equipment: [string, string][] = [
  ['Two-handed', '双手持有'], ['Dual-wieldable', '可二刀流'],
  ['One-handed melee', '单手近战'], ['Two-handed melee', '双手近战'],
  ['Sellable', '可出售'], ['Limited stock', '限量库存'], ['Starts in shop', '初始商店出售'],
  ['Bow', '弓类'], ['Bladed', '刃类'], ['Piercing', '穿刺类'], ['Blunt', '打击类'],
  ['Ranged', '远程类'], ['Instrument / Book', '乐器／书'], ['Female only', '女性专用'],
];
const job: Record<number, [string, string]> = {
  2: ['Can change jobs', '可转职'], 3: ['Undead', '不死者'],
  6: ['Can always use items', '始终可使用道具'], 7: ['Cannot attack', '无法攻击'],
};

export function flagLabel(tab: string, field: string, bit: number): string {
  let name: string | undefined;
  const language = getLanguage() === 'zh-CN' ? 1 : 0;
  if (tab === 'jobs' && field === 'equipFlags' && bit > 0) {
    const entry = EquipmentType.values.find((entry) => entry.value === bit);
    if (entry) name = enumLabel(entry.name, entry.name);
  } else if (tab === 'jobs' && field === 'propertyFlags') {
    name = job[bit]?.[language];
  } else if (tab === 'equipment' && field === 'propertyFlags') {
    name = equipment[bit]?.[language];
  } else if (tab === 'abilitySets' && field === 'raceFlags' && bit > 0) {
    const entry = Race.values.find((entry) => entry.value === bit && !entry.name.startsWith('_0x'));
    if (entry) name = enumLabel(entry.name, entry.name);
  } else if (tab === 'quests' && field === 'regionFlags') {
    const region = ['', 'Targ Wood', 'Camoa', 'Graszton', 'Moorabella', 'Fluorgis', 'Goug'][bit];
    if (region) name = gameName('region', region);
  }
  return `${bit} · ${name ?? (language ? '未知' : 'Unknown')}`;
}
