// Lightweight UI internationalization. Game data names/field identifiers are
// not translated; only the editor chrome and hints are.

export type Language = 'en' | 'zh-CN';

const en = {
  'lang.label': 'Language',
  'group.other': 'Other',
  'group.visuals': 'Visuals',
  'group.references': 'References',
  'group.stats': 'Stats',
  'group.growth': 'Growth',
  'group.resistances': 'Resistances',
  'group.flags': 'Flags',
  'group.questInfo': 'Quest Information',
  'group.questData': 'Quest Data',
  'group.formationHeader': 'Formation Header',
  'group.formationUnits': 'Formation Units',
  'button.openRom': 'Open ROM…',
  'button.wordTable': 'Word Table…',
  'wordTable.label': 'Word table',
  'wordTable.auto': 'Word table: Auto',
  'wordTable.us': 'Word table: US default',
  'wordTable.fftaDecomp': 'Word table: FFTA-DECOMP V4.1',
  'wordTable.custom': 'Word table: Local file…',
  'button.save': 'Save',
  'button.saveAs': 'Save As…',
  'file.noRom': 'No ROM loaded',
  'file.noWordTable': 'No word table',
  'file.wordTable': 'Word table: {name}',

  'empty.open': 'Open a Final Fantasy Tactics Advance 2 ROM (.nds) to begin editing.',
  'empty.official': 'Official ROM: open the .nds directly.',
  'empty.chinese': 'Chinese ROM: open the .nds; the built-in FFTA-DECOMP word table is selected automatically. Use the word-table selector for US default or a local file.',
  'empty.save': 'Saving uses minimal in-place writes when your browser supports the File System Access API; other browsers download a patched ROM.',

  'status.ready': 'Ready.',
  'status.loading': 'Loading {name}…',
  'status.loadedEntries': 'Loaded {name} — {count} archive entries.',
  'status.failedLoad': 'Failed to load: {message}',
  'status.saving': 'Saving…',
  'status.savedInPlace': 'Saved in place — {count} changed byte spans.',
  'status.savedDownload': 'Saved {bytes} bytes — {count} changed byte spans.',
  'status.failedSave': 'Save failed: {message}',
  'status.detectingChinese': 'Chinese double-byte text detected — loading the built-in FFTA-DECOMP V4.1 word table…',
  'status.loadedDefaultTable': 'Loaded {name} — Chinese text decoded with the built-in FFTA-DECOMP V4.1 word table.',
  'status.chineseNeedTable': 'Loaded {name} — Chinese double-byte text detected. The built-in word table could not be loaded; choose a local word table file.',
  'status.wordTableLoaded': 'Loaded word table "{name}" ({count} entries). Text tables were re-decoded.',
  'status.wordTableLoadedNext': 'Loaded word table "{name}" ({count} entries). It will be used for the next opened ROM.',
  'status.failedWordTable': 'Failed to load word table: {message}',
  'status.usTable': 'Using the US/base charset (no external word table).',
  'status.builtinTable': 'Using built-in FFTA-DECOMP V4.1 word table.',
  'status.wordTableConfirm': 'Loading a word table re-decodes the text tables and discards unsaved text edits. Continue?',
  'warnings.count': '{count} load warnings',

  'tab.text': 'Text',
  'tab.jobs': 'Jobs',
  'tab.jobGroups': 'Job Groups',
  'tab.jobRequirements': 'Job Requirements',
  'tab.characters': 'Characters',
  'tab.abilities': 'Abilities',
  'tab.abilitySets': 'Ability Sets',
  'tab.equipment': 'Equipment',
  'tab.consumables': 'Consumables',
  'tab.loot': 'Loot',
  'tab.itemTables': 'Item Tables',
  'tab.lawBonuses': 'Law Bonuses',
  'tab.lawRequirements': 'Law Story Reqs',
  'tab.formations': 'Formations',
  'tab.quests': 'Quests',
  'tab.bazaar': 'Bazaar',
  'tab.bazaarRecipes': 'Bazaar Recipes',
  'tab.auctions': 'Auctions',
  'tab.auctionPrizes': 'Auction Prizes',
  'tab.auctionGrandPrizes': 'Auction Grand Prizes',
  'tab.maps': 'Maps (read-only)',
  'tab.unitSprites': 'Unit Sprites (read-only)',
  'tab.topSprites': 'Top Sprites (read-only)',
  'tab.faces': 'Faces (read-only)',

  'text.tables': 'Message tables',
  'text.filterTables': 'Filter tables…',
  'text.strings': '{count} strings',
  'text.emptyTable': 'This table is empty.',
  'text.stringId': 'String #{id}',
  'text.emptyString': '(empty)',
  'text.controlHint': 'Control codes use \\var2:XX\\, \\end\\, \\endPage\\ syntax. Unknown bytes appear as <unknown:XX> or <unknown:XXXX>. For Chinese ROMs load an external word table from the toolbar; unknown double-byte codes remain reversible.',

  'model.records': '{count} records',
  'model.filter': 'Filter…',
  'model.addRecord': 'Add record',
  'model.removeLast': 'Remove last',
  'model.confirmRemove': 'Remove the last {label} record?',
  'model.addItem': 'Add item',
  'model.removeLastItem': 'Remove last',
  'model.itemCount': '{count} items',
  'model.bytesReadOnly': '{count} bytes — read-only hex preview (too large for inline editing).',
  'model.setAll': 'Set all',
  'model.clear': 'Clear',
  'model.flagsSummary': '{bytes} bytes / {bits} bits',
  'model.hexHint': 'Space-separated hexadecimal bytes.',
  'model.unsupported': 'Unsupported value.',
  'model.rawId': 'Raw record id/index: {id}',
  'law.title': 'Law bonus story requirements',
  'law.hint': 'Four unsigned 16-bit story flags stored in arm9 at 0x11B650. Written back by saveLawBonus.',
  'law.requirement': 'Requirement {n}',
} as const;

export type TranslationKey = keyof typeof en;
type Key = TranslationKey;

const zh: Record<Key, string> = {
  'lang.label': '语言',
  'group.other': '其他',
  'group.visuals': '外观',
  'group.references': '关联数据',
  'group.stats': '属性',
  'group.growth': '成长',
  'group.resistances': '抗性',
  'group.flags': '标志位',
  'group.questInfo': '任务信息',
  'group.questData': '任务数据',
  'group.formationHeader': '编成信息',
  'group.formationUnits': '编成单位',
  'button.openRom': '打开 ROM…',
  'button.wordTable': '词表…',
  'wordTable.label': '词表',
  'wordTable.auto': '词表：自动',
  'wordTable.us': '词表：美版默认',
  'wordTable.fftaDecomp': '词表：FFTA-DECOMP V4.1',
  'wordTable.custom': '词表：本地文件…',
  'button.save': '保存',
  'button.saveAs': '另存为…',
  'file.noRom': '未加载 ROM',
  'file.noWordTable': '未加载词表',
  'file.wordTable': '词表：{name}',

  'empty.open': '打开《最终幻想战略版 A2》ROM（.nds）开始编辑。',
  'empty.official': '官方 ROM：直接打开 .nds 文件。',
  'empty.chinese': '中文 ROM：打开 .nds 后会自动使用内置 FFTA-DECOMP 词表；可在词表选择器中切换美版默认或本地文件。',
  'empty.save': '支持 File System Access API 的浏览器会尽量原地写入修改区域，其他浏览器会下载修改后的 ROM。',

  'status.ready': '就绪。',
  'status.loading': '正在加载 {name}…',
  'status.loadedEntries': '已加载 {name} — {count} 个 Archive 条目。',
  'status.failedLoad': '加载失败：{message}',
  'status.saving': '正在保存…',
  'status.savedInPlace': '已原地保存 — 修改了 {count} 个字节区间。',
  'status.savedDownload': '已保存 {bytes} 字节 — 修改了 {count} 个字节区间。',
  'status.failedSave': '保存失败：{message}',
  'status.detectingChinese': '检测到中文双字节文本 — 正在加载内置 FFTA-DECOMP V4.1 词表…',
  'status.loadedDefaultTable': '已加载 {name} — 已使用内置 FFTA-DECOMP V4.1 词表解码中文。',
  'status.chineseNeedTable': '已加载 {name} — 检测到中文双字节文本，但内置词表加载失败；请在词表选择器中选择本地文件。',
  'status.wordTableLoaded': '已加载词表「{name}」（{count} 项），文本表已重新解码。',
  'status.wordTableLoadedNext': '已加载词表「{name}」（{count} 项），将在下次打开 ROM 时使用。',
  'status.failedWordTable': '词表加载失败：{message}',
  'status.usTable': '已切换为美版默认字符集（不使用外部词表）。',
  'status.builtinTable': '已使用内置 FFTA-DECOMP V4.1 词表。',
  'status.wordTableConfirm': '加载词表会重新解码文本表，并丢弃未保存的文本修改。是否继续？',
  'warnings.count': '{count} 个加载警告',

  'tab.text': '文本',
  'tab.jobs': '职业',
  'tab.jobGroups': '职业组',
  'tab.jobRequirements': '职业条件',
  'tab.characters': '角色',
  'tab.abilities': '技能',
  'tab.abilitySets': '技能组',
  'tab.equipment': '装备',
  'tab.consumables': '消耗品',
  'tab.loot': '素材',
  'tab.itemTables': '道具表',
  'tab.lawBonuses': '法则奖励',
  'tab.lawRequirements': '法则剧情条件',
  'tab.formations': '编成',
  'tab.quests': '任务',
  'tab.bazaar': '商店',
  'tab.bazaarRecipes': '商店配方',
  'tab.auctions': '拍卖',
  'tab.auctionPrizes': '拍卖奖品',
  'tab.auctionGrandPrizes': '拍卖大奖',
  'tab.maps': '地图（只读）',
  'tab.unitSprites': '单位精灵（只读）',
  'tab.topSprites': '顶部精灵（只读）',
  'tab.faces': '头像（只读）',

  'text.tables': '文本表',
  'text.filterTables': '筛选文本表…',
  'text.strings': '{count} 条文本',
  'text.emptyTable': '该文本表为空。',
  'text.stringId': '文本 #{id}',
  'text.emptyString': '（空）',
  'text.controlHint': '控制码使用 \\var2:XX\\、\\end\\、\\endPage\\ 语法。未知字节显示为 <unknown:XX> 或 <unknown:XXXX>。中文 ROM 可从工具栏加载外部词表；未映射的双字节码会保持可逆。',

  'model.records': '{count} 条记录',
  'model.filter': '筛选…',
  'model.addRecord': '添加记录',
  'model.removeLast': '删除最后一条',
  'model.confirmRemove': '删除最后一条{label}记录？',
  'model.addItem': '添加项目',
  'model.removeLastItem': '删除最后一项',
  'model.itemCount': '{count} 项',
  'model.bytesReadOnly': '{count} 字节 — 只读十六进制预览（过大，不适合内联编辑）。',
  'model.setAll': '全选',
  'model.clear': '清空',
  'model.flagsSummary': '{bytes} 字节 / {bits} 位',
  'model.hexHint': '以空格分隔的十六进制字节。',
  'model.unsupported': '不支持的值。',
  'model.rawId': '原始记录 id/索引：{id}',
  'law.title': '法则奖励剧情条件',
  'law.hint': 'arm9 0x11B650 处的 4 个无符号 16 位剧情标志，由 saveLawBonus 写回。',
  'law.requirement': '条件 {n}',
};


const zhMessageTableNames: Record<number, string> = {
  0: '角色名', 1: '职业名', 2: '技能组名', 3: '技能名', 4: '地区名', 5: '地点名',
  6: '任务名', 7: '氏族称号 / 拍卖文本', 8: '传闻标题', 9: '杂项菜单文本',
  10: '通知标题', 11: '道具名', 12: '状态名', 13: '氏族名', 14: '法则名',
  15: '氏族特权名', 16: '拍卖菜单文本', 17: '任务相关文本', 18: '杂项道具文本',
  19: '键盘 1', 20: '键盘 2', 21: '键盘 3', 22: 'Just A 文本 1', 23: 'Just A 文本 2',
  24: '商店分类标题 / 菜单文本', 25: '不存在', 26: '不存在', 27: '不存在',
  28: '不存在', 29: '不存在', 30: '技能组描述', 31: '技能描述', 32: '地区描述',
  33: '地点描述', 34: '不存在', 35: '任务描述（短）', 36: '不存在', 37: '战斗文本',
  38: '职业描述', 39: '道具描述', 40: '同伴死亡文本', 41: '状态描述', 42: '法则描述',
  43: '氏族特权描述', 44: '拍卖行文本', 45: '酒馆文本', 46: '不存在',
  47: '技能帮助文本', 48: '单位解散 / 开场文本', 49: '新通知文本', 50: '商店文本',
  51: '机会文本', 52: '菜单文本 / 职业条件', 53: '商店分类描述', 54: '氏族描述',
};

export function messageTableName(id: number, fallback: string): string {
  return currentLanguage === 'zh-CN' ? (zhMessageTableNames[id] ?? fallback) : fallback;
}

const dictionaries: Record<Language, Record<Key, string>> = { en, 'zh-CN': zh };
const LANGUAGE_KEY = 'ffta2.lang';

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function detectLanguage(): Language {
  const saved = storage()?.getItem(LANGUAGE_KEY) ?? null;
  if (saved === 'en' || saved === 'zh-CN') return saved;
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return nav.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

let currentLanguage: Language = detectLanguage();

export function getLanguage(): Language {
  return currentLanguage;
}

export function setLanguage(language: Language): void {
  currentLanguage = language;
  try {
    storage()?.setItem(LANGUAGE_KEY, language);
  } catch {
    // ignore storage restrictions
  }
  applyTranslations();
}

export function t(key: Key, params: Record<string, string | number> = {}): string {
  const template = dictionaries[currentLanguage][key] ?? en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

export function applyTranslations(root: ParentNode = document): void {
  if (typeof document !== 'undefined') document.documentElement.lang = currentLanguage;
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((node) => {
    node.textContent = t(node.dataset.i18n as Key);
  });
  root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder as Key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((node) => {
    node.title = t(node.dataset.i18nTitle as Key);
  });
}
