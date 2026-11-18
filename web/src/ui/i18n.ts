// Display-only UI localization; never changes model keys or ROM strings.
import { extraFieldLabels } from './fieldLabels';
import { extraEnumLabels } from './enumLabels';
import { gameTerms } from './gameTerms';

export type Language = 'en' | 'zh-CN';

const en = {
  'lang.label': 'Language',
  'preview.title': 'ROM images',
  'preview.empty': 'No image',
  'preview.failed': 'Preview unavailable',
  'preview.frame': 'Frame',
  'preview.palette': 'Palette',
  'group.other': 'Other',
  'ref.noMatches': 'No matches',
  'ref.none': '(none)',
  'ref.unknown': 'unknown',
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
  'preview.title': 'ROM 图片',
  'preview.empty': '无图片',
  'preview.failed': '预览不可用',
  'preview.frame': '帧',
  'preview.palette': '调色板',
  'group.other': '其他',
  'ref.noMatches': '没有匹配项',
  'ref.none': '（无）',
  'ref.unknown': '未知',
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
  'tab.bazaar': '合成装备',
  'tab.bazaarRecipes': '合成配方',
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


const zhFieldLabels: Record<string, string> = {
  dialogueRole: '对白角色', voice: '语音', name: '名称', defaultJob: '初始职业',
  jobName: '职业名', jobDescription: '职业描述', unitPortrait: '单位头像', enemyPortrait: '敌方头像',
  unitSprite: '单位精灵', unitAlternateSprite: '单位备用精灵', enemySprite: '敌方精灵',
  enemyAlternateSprite: '敌方备用精灵', unitPalette: '单位调色板', enemyPalette: '敌方调色板',
  unitTopSprite: '单位顶部精灵', enemyTopSprite: '敌方顶部精灵',
  race: '种族', gender: '性别', moveType: '移动类型', movablePlaces: '可移动地形',
  move: '移动力', jump: '跳跃力', hpBase: 'HP 基础', hpGrowth: 'HP 成长',
  mpBase: 'MP 基础', mpGrowth: 'MP 成长', speedBase: '速度基础', speedGrowth: '速度成长',
  attackBase: '攻击基础', attackGrowth: '攻击成长', defenseBase: '防御基础', defenseGrowth: '防御成长',
  magickBase: '魔力基础', magickGrowth: '魔力成长', resistanceBase: '魔防御基础', resistanceGrowth: '魔防御成长',
  fireResistance: '火抗性', airResistance: '风抗性', earthResistance: '地抗性', waterResistance: '水抗性',
  iceResistance: '冰抗性', electricityResistance: '雷抗性', holyResistance: '圣抗性', darkResistance: '暗抗性',
  evasion: '回避', resilience: '耐性', abilitySet: '技能组', unarmedBonus: '徒手加成',
  raceSomethingMaybe: '种族相关值', propertyFlags: '属性标志', equipFlags: '装备标志',
  abilityHelp: '技能帮助文本', abilityElement: '技能属性', mpCost: 'MP 消耗', power: '威力',
  weaponRequirement: '武器需求', specialRequirement: '特殊需求', rangeAOEType: '范围/AOE 类型',
  range: '射程', radius: '半径', heightDifference: '高度差', menuRoutine: '菜单例程',
  effect1: '效果 1', effect2: '效果 2', effect3: '效果 3', effect4: '效果 4',
  abilityFlags: '技能标志', targets: '目标', effect: '效果', accuracy: '命中', modifier: '修正',
  learnedAbility: '可学习技能', learnedAbilityId: '可学习技能 ID', maxAP: '最大 AP', apIndex: 'AP 槽位',
  race1: '种族 1', race2: '种族 2', race3: '种族 3', race4: '种族 4', race5: '种族 5', race6: '种族 6',
  apIndex1: 'AP 槽位 1', apIndex2: 'AP 槽位 2', apIndex3: 'AP 槽位 3', apIndex4: 'AP 槽位 4',
  apIndex5: 'AP 槽位 5', apIndex6: 'AP 槽位 6',
  equipmentType: '装备类型', notName: '非名称值', element: '属性', equipmentLocation: '装备位置',
  palette: '调色板', sprite: '精灵', attackEffect: '攻击效果', hitEffect: '命中效果', hitSound: '命中音效',
  buy: '买入价', sell: '卖出价', bonusEffect: '附加效果', attack: '攻击', defense: '防御',
  magick: '魔力', resistance: '魔防御', speed: '速度', jobGroup1: '职业组 1', jobGroup2: '职业组 2',
  jobGroup3: '职业组 3', ability1: '技能 1', ability2: '技能 2', ability3: '技能 3',
  storyProgress: '剧情进度', category: '类别', rank: '等级', item1: '道具 1', item2: '道具 2',
  item3: '道具 3', item4: '道具 4',
  type: '类型', questGroup: '任务组', regionFlags: '地区标志', storyRequirement: '剧情要求',
  flagRequirement: '标志要求', unknownRequirementIndex: '未知要求索引', unknownRequirementValue: '未知要求值',
  monthRequirement: '月份要求', dayRequirement: '日期要求', abilityRequirement: '技能要求', days: '天数',
  cooldownFailure: '失败冷却', cooldownSuccess: '成功冷却', fee: '费用',
  requiredItem1: '所需道具 1', requiredItemAmount1: '所需数量 1', requiredItem2: '所需道具 2',
  requiredItemAmount2: '所需数量 2', negotiation: '交涉', aptitude: '适性', teamwork: '团队合作',
  adaptability: '适应力', questLocation: '任务地点', battlefield: '战场', dispatch: '派遣',
  recommendedDispatch: '推荐派遣职业', gilReward: '金币奖励', apReward: 'AP 奖励', cpReward: 'CP 奖励',
  itemReward1: '道具奖励 1', itemReward2: '道具奖励 2', itemReward3: '道具奖励 3', itemReward4: '道具奖励 4',
  amount: '数量', law: '法则', numUnits: '单位数', partyLimit: '队伍上限', character: '角色', job: '职业',
  minLevel: '最低等级', maxLevel: '最高等级', character1: '角色 1', character2: '角色 2',
  jobId: '职业 ID', job1: '职业/技能组 1', job2: '职业/技能组 2', job3: '职业/技能组 3',
  abilityNum1: '技能数 1', abilityNum2: '技能数 2', abilityNum3: '技能数 3',
  primaryAbility1: '主技能 1', primaryAbility2: '主技能 2', primaryAbility3: '主技能 3',
  primaryAbility4: '主技能 4', primaryAbility5: '主技能 5', primaryAbility6: '主技能 6',
  secondaryAbility1: '副技能 1', secondaryAbility2: '副技能 2', secondaryAbility3: '副技能 3',
  secondaryAbility4: '副技能 4', secondaryAbilitySet: '副技能组', reactionAbility: '反应技能',
  passiveAbility: '被动技能', equipment1: '装备 1', equipment2: '装备 2', equipment3: '装备 3',
  equipment4: '装备 4', equipment5: '装备 5', lootLevel1: '素材等级 1', lootLevel2: '素材等级 2',
  lootLevel3: '素材等级 3', lootLevel4: '素材等级 4', lootConsumable: '素材消耗品', lootGil: '素材金币',
  info: '信息', data: '数据', header: '头部信息', units: '单位列表', items: '项目', prizes: '奖品',
  prizeTables: '奖品表', region: '地区', otherRegion1: '其他地区 1', otherRegion2: '其他地区 2',
  entryFee: '参赛费', grade: '等级', unused: '未使用',
  loot1: '素材 1', loot2: '素材 2', loot3: '素材 3',
  _0x00: '未知 0x00', _0x02: '未知 0x02', _0x04: '未知 0x04', _0x05: '未知 0x05',
  _0x06: '未知 0x06', _0x07: '未知 0x07', _0x08: '未知 0x08', _0x09: '未知 0x09',
  _0x0a: '未知 0x0a', _0x0b: '未知 0x0b', _0x0c: '未知 0x0c', _0x0d: '未知 0x0d',
  _0x0e: '未知 0x0e', _0x0f: '未知 0x0f', _0x10: '未知 0x10', _0x11: '未知 0x11',
  _0x12: '未知 0x12', _0x13: '未知 0x13', _0x14: '未知 0x14', _0x15: '未知 0x15',
  _0x16: '未知 0x16', _0x17: '未知 0x17', _0x18: '未知 0x18', _0x19: '未知 0x19',
  _0x1a: '未知 0x1a', _0x1b: '未知 0x1b', _0x1c: '未知 0x1c', _0x1d: '未知 0x1d',
  _0x1e: '未知 0x1e', _0x1f: '未知 0x1f', _0x20: '未知 0x20', _0x21: '未知 0x21',
  _0x22: '未知 0x22', _0x23: '未知 0x23', _0x24: '未知 0x24', _0x25: '未知 0x25',
  _0x26: '未知 0x26', _0x27: '未知 0x27', _0x28: '未知 0x28', _0x29: '未知 0x29',
  _0x2a: '未知 0x2a', _0x2b: '未知 0x2b', _0x2c: '未知 0x2c', _0x2d: '未知 0x2d',
  _0x2e: '未知 0x2e', _0x2f: '未知 0x2f', _0x30: '未知 0x30', _0x31: '未知 0x31',
  _0x32: '未知 0x32', _0x33: '未知 0x33', _0x34: '未知 0x34', _0x35: '未知 0x35',
  _0x36: '未知 0x36', _0x37: '未知 0x37', _0x38: '未知 0x38', _0x39: '未知 0x39',
  _0x3a: '未知 0x3a', _0x3b: '未知 0x3b', _0x3c: '未知 0x3c', _0x3d: '未知 0x3d',
  _0x3e: '未知 0x3e', _0x3f: '未知 0x3f', _0x40: '未知 0x40', _0x41: '未知 0x41',
  _0x42: '未知 0x42', _0x43: '未知 0x43', _0x44: '未知 0x44', _0x45: '未知 0x45',
  _0x46: '未知 0x46', _0x47: '未知 0x47', _0x48: '未知 0x48', _0x49: '未知 0x49',
  _0x4a: '未知 0x4a', _0x4b: '未知 0x4b', _0x4c: '未知 0x4c', _0x4d: '未知 0x4d',
  _0x4e: '未知 0x4e', _0x4f: '未知 0x4f', _0x50: '未知 0x50', _0x51: '未知 0x51',
  _0x52: '未知 0x52', _0x53: '未知 0x53', _0x54: '未知 0x54', _0x55: '未知 0x55',
  _0x56: '未知 0x56', _0x57: '未知 0x57', _0x58: '未知 0x58', _0x59: '未知 0x59',
  _0x5a: '未知 0x5a', _0x5b: '未知 0x5b', _0x5c: '未知 0x5c', _0x5d: '未知 0x5d',
  _0x5e: '未知 0x5e', _0x5f: '未知 0x5f', _0x60: '未知 0x60', _0x61: '未知 0x61',
  _0x62: '未知 0x62', _0x63: '未知 0x63', _0x64: '未知 0x64', _0x65: '未知 0x65',
  _0x66: '未知 0x66', _0x67: '未知 0x67', _0x68: '未知 0x68', _0x69: '未知 0x69',
  _0x6a: '未知 0x6a', _0x6b: '未知 0x6b', _0x6c: '未知 0x6c', _0x6d: '未知 0x6d',
  _0x6e: '未知 0x6e', _0x6f: '未知 0x6f', _0x70: '未知 0x70', _0x71: '未知 0x71',
  _0x72: '未知 0x72', _0x73: '未知 0x73', _0x74: '未知 0x74', _0x75: '未知 0x75',
  _0x76: '未知 0x76', _0x77: '未知 0x77', _0x78: '未知 0x78', _0x79: '未知 0x79',
  _0x7a: '未知 0x7a', _0x7b: '未知 0x7b', _0x7c: '未知 0x7c', _0x7d: '未知 0x7d',
  _0x7e: '未知 0x7e', _0x7f: '未知 0x7f',
};

const zhEnumLabels: Record<string, string> = {
  NONE: '无', MALE: '男', FEMALE: '女', UNKNOWN: '未知',
  GROUNDED: '地面', FLYING: '飞行', TELEPORT: '传送',
  CANNOT_ENTER_WATER: '不能进入水面', CAN_STAND_IN_WATER: '可站在水中',
  CAN_STAND_ON_WATER: '可在水面行走', CAN_FLOAT_OVER_WATER: '可漂浮过水面', DUMMY: '占位',
  WEAK: '弱', NEUTRAL: '普通', HALF: '半减', NULL: '无效', ABSORB: '吸收',
  FIRE: '火', WIND: '风', EARTH: '地', WATER: '水', ICE: '冰', THUNDER: '雷', HOLY: '圣', DARK: '暗',
  HUME: '修姆', BANGAA: '邦伽', NU_MOU: '恩莫', VIERA: '维艾拉', MOOGLE: '莫古利',
  SEEQ: '席克', GRIA: '格丽亚', BAKNAMY: '巴克纳姆', SPRITE: '精灵', LAMIA: '拉米亚',
  WOLF: '狼', DREAMHARE: '梦兔', WEREWOLF: '狼人', ANTLION: '蚁狮', SHELLING: '贝壳怪',
  MALBORO: '魔界花', TOMATO: '番茄怪', COCKATRICE: '鸡蛇兽', CHOCOBO: '陆行鸟', FLAN: '果冻',
  BOMB: '炸弹', ZOMBIE: '僵尸', GHOST: '幽灵', DEATHSCYTHE: '死神', FLOATING_EYE: '浮游眼',
  AHRIMAN: '阿利曼', TONBERRY: '冬贝利', HEADLESS: '无头骑士', BEHEMOTH: '贝希摩斯',
  MAGICK_POT: '魔法壶', DRAKE: '龙', MIMIC: '模仿怪', YOWIE: '尤威', RAFFLESIA: '大王花',
  DEMON_WALL: '恶魔墙', NEUKHIA: '奴其亚', UPSILON: '厄普西隆',
  KNIFE: '小刀', SWORD: '剑', BLADE: '宽剑', SABER: '军刀', KNIGHTSWORD: '骑士剑', RAPIER: '刺突剑',
  GREATSWORD: '大剑', BROADSWORD: '宽刃剑', KATANA: '刀', SPEAR: '枪', ROD: '魔杖', STAFF: '杖',
  POLE: '棒', KNUCKLES: '拳套', BOW: '弓', GREATBOW: '刚弓', GUN: '铳', INSTRUMENT: '乐器',
  HAND_CANNON: '大炮', GRENADE: '手榴弹', AXE: '斧', HAMMER: '锤', MACE: '锡杖', CARD: '扑克牌',
  BOOK: '书物', SHIELD: '盾', HELM: '头盔', HAIR_ACCESSORY: '缎带', HAT: '帽子',
  HEAVY_ARMOR: '铠', LIGHT_ARMOR: '服', ROBE: '长袍', BOOTS: '靴子', GLOVES: '手套',
  ACCESSORY: '饰物', HANDS: '手', HEAD: '头', ARMOR: '身体',
  MAGICITE: '魔石', METALS: '金属', SKINS: '皮革', BONES: '骨头', FLORA: '植物', TIMBER: '木材',
  PHILTRES: '药液', CLOTH: '布料', ZERO_STAR: '0 星', ONE_STAR: '1 星', TWO_STAR: '2 星', THREE_STAR: '3 星',
  BLACKFROST: '黑霜月', SKYFROST: '天霜月', GREENFIRE: '绿火月', BLOODFIRE: '血火月',
  ROSEFIRE: '玫瑰火月', COPPERSUN: '铜阳月', GOLDSUN: '金阳月', SILVERSUN: '银阳月',
  ASHLEAF: '灰叶月', MISTLEAF: '雾叶月', EMBERLEAF: '烬叶月', PLUMFROST: '梅霜月',
  INFINITE_LINE: '无限直线', LINE: '直线', SURROUNDING_CROSS: '周围十字', ALL_UNITS: '全体单位',
  CONE: '扇形', WEAPON: '武器', SELF: '自身', ALL: '全部', ALLY: '同伴', FOE: '敌人',
  REVIVE: '复活', MAGICK_FRENZY: '魔法爆击', NATURAL_SELECTION: '生态之书', MIX_MAYBE: '调合（推测）',
  THROW_ITEM: '投掷道具', GIL_TOSS: '投掷金币', MIRROR_ITEM: '镜像道具', DOUBLECAST: '连续魔法',
  CONTROL_MONSTER: '控制怪物',
};

export function fieldLabel(key: string, fallback: string): string {
  if (currentLanguage !== 'zh-CN') return fallback;
  if (zhFieldLabels[key] ?? extraFieldLabels[key]) return zhFieldLabels[key] ?? extraFieldLabels[key];
  const unknown = /^(?:_0x|ability_0x)([0-9a-f]+)$/i.exec(key);
  return unknown ? `未知 0x${unknown[1]}` : fallback;
}

export function enumLabel(name: string, fallback: string): string {
  if (currentLanguage !== 'zh-CN') return fallback;
  const label = zhEnumLabels[name] ?? extraEnumLabels[name];
  if (label) return label;
  const unknown = /^_0x([0-9a-f]+)$/i.exec(name);
  if (unknown) return `未知 0x${unknown[1]}`;
  if (name.startsWith('TARGET_')) {
    const uncertain = name.endsWith('_MAYBE');
    const target = name.slice(7).replace(/_MAYBE$/, '');
    const translated = enumLabel(target, '');
    if (translated) return `目标：${translated}${uncertain ? '（推测）' : ''}`;
  }
  return fallback;
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

// Exact, category-scoped English-name lookup. No ID substitution: modified ROM
// names, Chinese names and unmapped names pass through unchanged.
export function gameName(category: string, original: string): string {
  if (currentLanguage !== 'zh-CN') return original;
  const terms = Object.hasOwn(gameTerms, category) ? gameTerms[category] : undefined;
  const translated = terms && Object.hasOwn(terms, original) ? terms[original] : undefined;
  return translated ? `${translated}（${original}）` : original;
}

export function referenceName(kind: string, id: number): string {
  const labels: Record<string, [string, string]> = {
    activeAbility: ['Ability', '技能'], equipment: ['Equipment', '装备'], loot: ['Loot', '素材'],
    abilitySet: ['Ability Set', '技能组'], jobGroup: ['Job Group', '职业组'],
    formation: ['Formation', '编成'], job: ['Job', '职业'], quest: ['Quest', '任务'],
    auctionPrizeTable: ['Prize Table', '奖品表'], face: ['Face', '头像'],
    topSprite: ['Top Sprite', '顶部精灵'], unitSprite: ['Unit Sprite', '单位精灵'],
  };
  const pair = labels[kind];
  return `${pair ? pair[currentLanguage === 'zh-CN' ? 1 : 0] : kind} #${id}`;
}
