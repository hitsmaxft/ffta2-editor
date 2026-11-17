// App shell: ROM open/save lifecycle, tab switching, status + warnings.

import { RomData } from '../data/romData';
import { loadRom } from '../data/load';
import { loadAll, saveAll } from '../data/orchestration';
import { loadMessages } from '../data/text';
import { parseWordTable, WordTable } from '../core/wordTable';
import { buildSavePlan, saveRom } from '../data/save';
import {
  OpenedRom, supportsFsAccess, openRomViaPicker, openRomViaInput,
  saveInPlace, saveAsViaPicker, downloadRom,
} from './file';
import { EditorTab, textTab } from './textEditor';
import {
  jobTab, jobGroupTab, jobRequirementTab, characterTab, abilityTab, abilitySetTab,
  equipmentTab, consumableTab, lootTab, itemTableTab, lawBonusTab, lawRequirementTab, formationTab,
  questTab, bazaarTab, bazaarRecipeTab, auctionTab, auctionPrizeTab,
  auctionGrandPrizeTab, mapTab, unitSpriteTab, topSpriteTab, faceTab,
} from './modelEditor';
import { el, clear } from './widgets';
import { applyTranslations, getLanguage, setLanguage, t, Language } from './i18n';

const TABS: EditorTab[] = [
  textTab,
  jobTab, jobGroupTab, jobRequirementTab, characterTab,
  abilityTab, abilitySetTab,
  equipmentTab, consumableTab, lootTab, itemTableTab, lawBonusTab, lawRequirementTab,
  bazaarTab, bazaarRecipeTab,
  auctionTab, auctionPrizeTab, auctionGrandPrizeTab,
  formationTab, questTab,
  mapTab, unitSpriteTab, topSpriteTab, faceTab,
];

interface AppState {
  data: RomData | null;
  opened: OpenedRom | null;
  dirty: boolean;
  activeTab: string;
  wordTable: WordTable | null;
}

const state: AppState = { data: null, opened: null, dirty: false, activeTab: TABS[0].id, wordTable: null };

// The official FFTA2-US-CHS V4.1 table is GPLv3 and is therefore fetched at
// runtime instead of being bundled into this MIT repository. The raw GitHub
// endpoint sends Access-Control-Allow-Origin: * so this works from Pages.
const DEFAULT_WORDTABLE_URL =
  import.meta.env.VITE_DEFAULT_WORDTABLE_URL ??
  'https://raw.githubusercontent.com/ffta-decomp/FFTA-US-CHS/main/charset/v4.1/glyphs.json';
const WORDTABLE_CACHE_KEY = 'ffta2.default-wordtable.v4.1';

function hasDoubleByteText(data: RomData): boolean {
  return data.messageList.some((table) =>
    table.strings.some((entry) => /<unknown:[0-9A-Fa-f]{4}>/.test(entry.string))
  );
}

function readCachedWordTable(): WordTable | null {
  try {
    const cached = localStorage.getItem(WORDTABLE_CACHE_KEY);
    return cached ? parseWordTable(cached, 'glyphs.json') : null;
  } catch {
    return null;
  }
}

async function loadDefaultWordTable(): Promise<WordTable | null> {
  const cached = readCachedWordTable();
  if (cached) return cached;
  try {
    const res = await fetch(DEFAULT_WORDTABLE_URL, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const table = parseWordTable(text, 'glyphs.json');
    try {
      localStorage.setItem(WORDTABLE_CACHE_KEY, text);
    } catch {
      // Quota/privacy mode: keep the in-memory table only.
    }
    return table;
  } catch (err) {
    console.warn('Default word table unavailable:', err);
    return null;
  }
}

const $ = (id: string) => document.getElementById(id)!;

function setStatus(msg: string): void {
  $('status').textContent = msg;
}

function markDirty(): void {
  state.dirty = true;
  refreshButtons();
}

function refreshButtons(): void {
  const loaded = state.data !== null;
  ($('save-btn') as HTMLButtonElement).disabled = !loaded;
  ($('save-as-btn') as HTMLButtonElement).disabled = !loaded;
  $('file-name').textContent = state.opened
    ? `${state.opened.name}${state.dirty ? ' •' : ''}`
    : t('file.noRom');
  $('word-table-name').textContent = state.wordTable
    ? t('file.wordTable', { name: state.wordTable.name })
    : t('file.noWordTable');
}

function renderTabs(): void {
  const nav = $('tabs');
  clear(nav);
  if (!state.data) return;
  for (const tab of TABS) {
    if (!tab.available(state.data)) continue;
    const btn = el('button', {
      class: `tab${tab.id === state.activeTab ? ' active' : ''}`,
      text: tab.label(),
    });
    btn.onclick = () => { state.activeTab = tab.id; renderTabs(); renderContent(); };
    nav.append(btn);
  }
}

function renderContent(): void {
  const content = $('content');
  clear(content);
  if (!state.data) {
    content.append(el('div', { class: 'empty-state' }, [
      el('p', { text: t('empty.open') }),
    ]));
    return;
  }
  const tab = TABS.find((t) => t.id === state.activeTab) ?? TABS[0];
  tab.render(content, state.data, markDirty);
  if (state.data.warnings.length > 0) {
    const details = el('details', { class: 'warnings' });
    details.append(el('summary', { text: t('warnings.count', { count: state.data.warnings.length }) }));
    const ul = el('ul');
    for (const w of state.data.warnings) ul.append(el('li', { text: w }));
    details.append(ul);
    content.append(details);
  }
}

async function applyOpened(opened: OpenedRom): Promise<void> {
  setStatus(t('status.loading', { name: opened.name }));
  const data = loadRom(opened.bytes);
  data.wordTable = state.wordTable;
  loadAll(data);
  state.data = data;
  state.opened = opened;
  state.dirty = false;
  state.activeTab = TABS.find((t) => t.available(data))?.id ?? TABS[0].id;
  let autoLoadedTable = false;
  if (!data.wordTable && hasDoubleByteText(data)) {
    setStatus(t('status.detectingChinese'));
    const table = await loadDefaultWordTable();
    if (table) {
      state.wordTable = table;
      data.wordTable = table;
      loadMessages(data);
      autoLoadedTable = true;
    }
  }

  refreshButtons();
  renderTabs();
  renderContent();
  if (autoLoadedTable) {
    setStatus(t('status.loadedDefaultTable', { name: opened.name }));
  } else if (!data.wordTable && hasDoubleByteText(data)) {
    setStatus(t('status.chineseNeedTable', { name: opened.name }));
  } else {
    setStatus(t('status.loadedEntries', { name: opened.name, count: data.archive?.files.length ?? 0 }));
  }
}

async function loadWordTableFile(file: File): Promise<void> {
  const table = parseWordTable(await file.text(), file.name);
  state.wordTable = table;
  if (state.data) {
    state.data.wordTable = table;
    loadMessages(state.data);
    renderContent();
  }
  refreshButtons();
  setStatus(t(state.data ? 'status.wordTableLoaded' : 'status.wordTableLoadedNext', {
    name: table.name,
    count: table.decodeMap.size + table.singleDecodeMap.size,
  }));
}

function openWordTable(): void {
  if (state.data && state.dirty && !confirm(t('status.wordTableConfirm'))) {
    return;
  }
  ($('word-table-input') as HTMLInputElement).click();
}

async function openRom(): Promise<void> {
  try {
    let opened: OpenedRom | null;
    if (supportsFsAccess()) {
      opened = await openRomViaPicker();
    } else {
      opened = await openRomViaInput($('file-input') as HTMLInputElement);
    }
    if (!opened) return;
    await applyOpened(opened);
  } catch (err) {
    setStatus(t('status.failedLoad', { message: (err as Error).message }));
    console.error(err);
  }
}

async function save(asNew: boolean): Promise<void> {
  if (!state.data || !state.opened) return;
  try {
    setStatus(t('status.saving'));
    saveAll(state.data);
    const plan = buildSavePlan(state.data);
    const canInPlace = !asNew && state.opened.handle && supportsFsAccess();
    if (canInPlace) {
      await saveInPlace(state.opened.handle!, plan);
      setStatus(t('status.savedInPlace', { count: plan.writes.length }));
    } else {
      const bytes = saveRom(state.data);
      const name = state.opened.name;
      if (!asNew && supportsFsAccess()) {
        await saveAsViaPicker(name, bytes);
      } else {
        downloadRom(name, bytes);
      }
      setStatus(t('status.savedDownload', { bytes: bytes.length.toLocaleString(), count: plan.writes.length }));
    }
    state.dirty = false;
    refreshButtons();
  } catch (err) {
    setStatus(t('status.failedSave', { message: (err as Error).message }));
    console.error(err);
  }
}

export function boot(): void {
  $('open-btn').onclick = () => void openRom();
  $('word-table-btn').onclick = openWordTable;
  const wordTableInput = $('word-table-input') as HTMLInputElement;
  wordTableInput.onchange = async () => {
    const file = wordTableInput.files?.[0];
    wordTableInput.value = '';
    if (!file) return;
    try {
      await loadWordTableFile(file);
    } catch (err) {
      setStatus(t('status.failedWordTable', { message: (err as Error).message }));
      console.error(err);
    }
  };
  $('save-btn').onclick = () => void save(false);
  $('save-as-btn').onclick = () => void save(true);

  const langSelect = $('lang-select') as HTMLSelectElement;
  langSelect.value = getLanguage();
  langSelect.onchange = () => {
    setLanguage(langSelect.value as Language);
    renderTabs();
    renderContent();
    refreshButtons();
    if (!state.data) setStatus(t('status.ready'));
    else if (state.opened) {
      setStatus(t('status.loadedEntries', { name: state.opened.name, count: state.data.archive?.files.length ?? 0 }));
    }
  };

  applyTranslations();
  refreshButtons();
  renderContent();

  // Dev convenience: ?rom=<url> auto-loads a served ROM (no file handle).
  if (import.meta.env.DEV) {
    const romUrl = new URLSearchParams(location.search).get('rom');
    if (romUrl) {
      void (async () => {
        try {
          const res = await fetch(romUrl);
          const bytes = new Uint8Array(await res.arrayBuffer());
          const name = romUrl.split('/').pop() ?? 'rom.nds';
          await applyOpened({ bytes, name, handle: null });
        } catch (err) {
          setStatus(t('status.failedLoad', { message: (err as Error).message }));
          console.error(err);
        }
      })();
    }
  }
}