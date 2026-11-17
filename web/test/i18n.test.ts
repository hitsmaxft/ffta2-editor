// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { applyTranslations, getLanguage, setLanguage, t } from '../src/ui/i18n';

describe('UI internationalization', () => {
  beforeEach(() => {
    setLanguage('en');
    document.body.replaceChildren();
  });

  it('translates UI keys and persists the selected language', () => {
    setLanguage('zh-CN');
    expect(getLanguage()).toBe('zh-CN');
    expect(t('tab.jobs')).toBe('职业');
    expect(t('status.loadedEntries', { name: 'rom.nds', count: 3 })).toContain('rom.nds');
  });

  it('applies data-i18n, placeholder and title translations', () => {
    setLanguage('zh-CN');
    const text = document.createElement('button');
    text.dataset.i18n = 'button.save';
    const input = document.createElement('input');
    input.dataset.i18nPlaceholder = 'model.filter';
    const titled = document.createElement('span');
    titled.dataset.i18nTitle = 'lang.label';
    document.body.append(text, input, titled);
    applyTranslations();
    expect(text.textContent).toBe('保存');
    expect(input.placeholder).toBe('筛选…');
    expect(titled.title).toBe('语言');
    expect(document.documentElement.lang).toBe('zh-CN');
  });
});
