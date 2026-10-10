import { describe, expect, it } from 'vitest';
import { formsText, vocabLabels } from './NounForms';

describe('vocabLabels', () => {
  it('shows nouns as singular / plural in both languages', () => {
    expect(vocabLabels({ swahili: 'viatu', english: 'shoes', nounForms: { one: 'kiatu', many: 'viatu' }, englishForms: { one: 'shoe', many: 'shoes' } })).toEqual({
      sw: 'kiatu / viatu',
      en: 'shoe / shoes',
    });
  });
  it('shows a word once when singular = plural, keeping English singular / plural', () => {
    expect(vocabLabels({ swahili: 'nguo', english: 'clothes', nounForms: { one: 'nguo', many: 'nguo' }, englishForms: { one: 'piece of clothing', many: 'clothes' } })).toEqual({
      sw: 'nguo',
      en: 'piece of clothing / clothes',
    });
    expect(vocabLabels({ swahili: 'nyumbu', english: 'wildebeest', nounForms: { one: 'nyumbu', many: 'nyumbu' }, englishForms: { one: 'wildebeest', many: 'wildebeest' } })).toEqual({
      sw: 'nyumbu',
      en: 'wildebeest',
    });
  });

  it('marks missing forms and leaves other words as written', () => {
    expect(formsText({ one: 'homa', many: null }, 'sw')).toBe('homa (no plural)');
    expect(formsText({ one: null, many: 'mafuriko' }, 'sw')).toBe('mafuriko (plural only)');
    expect(vocabLabels({ swahili: 'Niko poa', english: "I'm good" })).toEqual({ sw: 'Niko poa', en: "I'm good" });
  });
});
