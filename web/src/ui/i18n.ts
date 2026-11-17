// Lightweight UI internationalization. Game data names/field identifiers are
// not translated; only the editor chrome and hints are.

export type Language = 'en' | 'zh-CN';

const en = {
  'lang.label': 'Language',
  'button.openRom': 'Open ROM…',
  'button.wordTable': 'Word Table…',
  'button.save': 'Save',
  'button.saveAs': 'Save As…',
  'file.noRom': 'No ROM loaded',
  'file.noWordTable': 'No word table',
  'file.wordTable': 'Word table: {name}',

  'empty.open': 'Open a Final Fantasy Tactics Advance 2 ROM (.nds) to begin editing.',
  'empty.official': 'Official ROM: open the .nds directly.',
  'empty.chinese': 'Chinese ROM: open the .nds; the official word table is fetched automatically. Use Word Table… for a local glyphs.json if offline.',
  'empty.save': 'Saving uses minimal in-place writes when your browser supports the File System Access API; other browsers download a patched ROM.',

  'status.ready': 'Ready.',
  'status.loading': 'Loading {name}…',
  'status.loadedEntries': 'Loaded {name} — {count} archive entries.',
  'status.failedLoad': 'Failed to load: {message}',
  'status.saving': 'Saving…',
  'status.savedInPlace': 'Saved in place — {count} changed byte spans.',
  'status.savedDownload': 'Saved {bytes} bytes — {count} changed byte spans.',
  'status.failedSave': 'Save failed: {message}',
  'status.detectingChinese': 'Chinese double-byte text detected — loading FFTA2-US-CHS V4.1 default word table…',
  'status.loadedDefaultTable': 'Loaded {name} — Chinese text decoded with the default FFTA2-US-CHS V4.1 word table.',
  'status.chineseNeedTable': 'Loaded {name} — Chinese double-byte text detected. Default word table could not be fetched; use "Word Table…" to load glyphs.json manually.',
  'status.wordTableLoaded': 'Loaded word table "{name}" ({count} entries). Text tables were re-decoded.',
  'status.wordTableLoadedNext': 'Loaded word table "{name}" ({count} entries). It will be used for the next opened ROM.',
  'status.failedWordTable': 'Failed to load word table: {message}',
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

type Key = keyof typeof en;

const zh: Record<Key, string> = {
  'lang.label': '语言',
  'button.openRom': '打开 ROM…',
  'button.wordTable': '词表…',
  'button.save': '保存',
  'button.saveAs': '另存为…',
  'file.noRom': '未加载 ROM',
  'file.noWordTable': '未加载词表',
  'file.wordTable': '词表：{name}',

  'empty.open': '打开《最终幻想战略版 A2》ROM（.nds）开始编辑。',
  'empty.official': '官方 ROM：直接打开 .nds 文件。',
  'empty.chinese': '中文 ROM：打开 .nds 后会自动获取官方词表；离线时可用「词表…」加载本地 glyphs.json。',
  'empty.save': '支持 File System Access API 的浏览器会尽量原地写入修改区域，其他浏览器会下载修改后的 ROM。',

  'status.ready': '就绪。',
  'status.loading': '正在加载 {name}…',
  'status.loadedEntries': '已加载 {name} — {count} 个 Archive 条目。',
  'status.failedLoad': '加载失败：{message}',
  'status.saving': '正在保存…',
  'status.savedInPlace': '已原地保存 — 修改了 {count} 个字节区间。',
  'status.savedDownload': '已保存 {bytes} 字节 — 修改了 {count} 个字节区间。',
  'status.failedSave': '保存失败：{message}',
  'status.detectingChinese': '检测到中文双字节文本 — 正在加载 FFTA2-US-CHS V4.1 默认词表…',
  'status.loadedDefaultTable': '已加载 {name} — 已使用默认 FFTA2-US-CHS V4.1 词表解码中文。',
  'status.chineseNeedTable': '已加载 {name} — 检测到中文双字节文本，但默认词表获取失败；请用「词表…」手动加载 glyphs.json。',
  'status.wordTableLoaded': '已加载词表「{name}」（{count} 项），文本表已重新解码。',
  'status.wordTableLoadedNext': '已加载词表「{name}」（{count} 项），将在下次打开 ROM 时使用。',
  'status.failedWordTable': '词表加载失败：{message}',
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
