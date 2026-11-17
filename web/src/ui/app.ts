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

type WordTableChoice = 'auto' | 'us' | 'ffta-decomp' | 'custom';

interface AppState {
  data: RomData | null;
  opened: OpenedRom | null;
  dirty: boolean;
  activeTab: string;
  wordTable: WordTable | null;
  wordTableChoice: WordTableChoice;
}

const WORDTABLE_CHOICE_KEY = 'ffta2.wordtable-choice';
const BUILTIN_WORDTABLE_PATH = 'wordtables/ffta-decomp-v4.1.tsv';
const REMOTE_WORDTABLE_URL =
  'https://raw.githubusercontent.com/ffta-decomp/FFTA-US-CHS/main/charset/v4.1/glyphs.json';

function savedWordTableChoice(): WordTableChoice {
  try {
    const value = localStorage.getItem(WORDTABLE_CHOICE_KEY);
    if (value === 'us' || value === 'ffta-decomp' || value === 'auto') return value;
  } catch {
    // ignore storage restrictions
  }
  return 'auto';
}

const state: AppState = {
  data: null,
  opened: null,
  dirty: false,
  activeTab: TABS[0].id,
  wordTable: null,
  wordTableChoice: savedWordTableChoice(),
};

function hasDoubleByteText(data: RomData): boolean {
  return data.messageList.some((table) =>
    table.strings.some((entry) => /<unknown:[0-9A-Fa-f]{4}>/.test(entry.string))
  );
}

async function loadBuiltinWordTable(): Promise<WordTable> {
  const localUrl = new URL(BUILTIN_WORDTABLE_PATH, document.baseURI).href;
  try {
    const res = await fetch(localUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseWordTable(await res.text(), 'ffta-decomp-v4.1.tsv');
  } catch (localError) {
    console.warn('Built-in word table unavailable, trying upstream:', localError);
    const res = await fetch(REMOTE_WORDTABLE_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseWordTable(await res.text(), 'glyphs.json');
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
  syncWordTableSelect();
}

function syncWordTableSelect(): void {
  const select = document.getElementById('word-table-select') as HTMLSelectElement | null;
  if (select) select.value = state.wordTableChoice;
}

function persistWordTableChoice(): void {
  try {
    if (state.wordTableChoice !== 'custom') localStorage.setItem(WORDTABLE_CHOICE_KEY, state.wordTableChoice);
  } catch {
    // ignore storage restrictions
  }
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

  let table = state.wordTableChoice === 'custom' ? state.wordTable : null;
  if (state.wordTableChoice === 'ffta-decomp') {
    if (!table) {
      try {
        table = await loadBuiltinWordTable();
        state.wordTable = table;
      } catch (err) {
        setStatus(t('status.failedWordTable', { message: (err as Error).message }));
        table = null;
      }
    }
  }

  const data = loadRom(opened.bytes);
  data.wordTable = table;
  loadAll(data);
  state.data = data;
  state.opened = opened;
  state.dirty = false;
  state.activeTab = TABS.find((t) => t.available(data))?.id ?? TABS[0].id;

  let autoLoadedTable = false;
  if (state.wordTableChoice === 'auto' && !data.wordTable && hasDoubleByteText(data)) {
    setStatus(t('status.detectingChinese'));
    try {
      table = await loadBuiltinWordTable();
      state.wordTable = table;
      data.wordTable = table;
      loadMessages(data);
      autoLoadedTable = true;
    } catch (err) {
      console.warn('Built-in word table unavailable:', err);
    }
  }

  refreshButtons();
  renderTabs();
  renderContent();
  if (autoLoadedTable) {
    setStatus(t('status.loadedDefaultTable', { name: opened.name }));
  } else if (state.wordTableChoice === 'us') {
    setStatus(t('status.usTable'));
  } else if (state.wordTableChoice === 'ffta-decomp' && data.wordTable) {
    setStatus(t('status.builtinTable'));
  } else if (!data.wordTable && hasDoubleByteText(data)) {
    setStatus(t('status.chineseNeedTable', { name: opened.name }));
  } else {
    setStatus(t('status.loadedEntries', { name: opened.name, count: data.archive?.files.length ?? 0 }));
  }
}

async function setWordTableChoice(choice: WordTableChoice): Promise<void> {
  const previous = state.wordTableChoice;
  if (choice === 'custom') {
    if (state.data && state.dirty && !confirm(t('status.wordTableConfirm'))) {
      syncWordTableSelect();
      return;
    }
    state.wordTableChoice = 'custom';
    ($('word-table-input') as HTMLInputElement).click();
    return;
  }

  state.wordTableChoice = choice;
  persistWordTableChoice();

  if (choice === 'us') {
    state.wordTable = null;
    if (state.data) {
      state.data.wordTable = null;
      loadMessages(state.data);
      renderContent();
    }
    refreshButtons();
    setStatus(t('status.usTable'));
    return;
  }

  if (choice === 'auto') {
    state.wordTable = null;
    if (state.data) {
      state.data.wordTable = null;
      loadMessages(state.data);
      if (hasDoubleByteText(state.data)) {
        try {
          const table = await loadBuiltinWordTable();
          state.wordTable = table;
          state.data.wordTable = table;
          loadMessages(state.data);
          renderContent();
          refreshButtons();
          setStatus(t('status.builtinTable'));
          return;
        } catch (err) {
          console.warn('Built-in word table unavailable:', err);
        }
      }
      renderContent();
    }
    refreshButtons();
    setStatus(t('status.ready'));
    return;
  }

  // Explicit built-in FFTA-DECOMP table.
  try {
    const table = await loadBuiltinWordTable();
    state.wordTable = table;
    if (state.data) {
      state.data.wordTable = table;
      loadMessages(state.data);
      renderContent();
    }
    refreshButtons();
    setStatus(state.data ? t('status.builtinTable') : t('status.ready'));
  } catch (err) {
    state.wordTableChoice = previous;
    syncWordTableSelect();
    setStatus(t('status.failedWordTable', { message: (err as Error).message }));
  }
}

async function loadWordTableFile(file: File): Promise<void> {
  const table = parseWordTable(await file.text(), file.name);
  state.wordTable = table;
  state.wordTableChoice = 'custom';
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
  const wordTableSelect = $('word-table-select') as HTMLSelectElement;
  wordTableSelect.value = state.wordTableChoice;
  wordTableSelect.onchange = () => void setWordTableChoice(wordTableSelect.value as WordTableChoice);
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