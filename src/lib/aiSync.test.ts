import { describe, expect, it } from 'vitest';
import { buildSyncPrompt, normalizeSync, type SyncInput } from './aiSync';

const input: SyncInput = {
  lesson: { id: 'work-business', title: 'Talking Business', level: 4 },
  instruction: 'extend with costs and profit',
  turns: [{ speaker: 'Wewe', swahili: 'Faida ni kidogo.', english: 'The profit is small.' }],
  vocabulary: [{ id: 'v-biashara', swahili: 'biashara', english: 'business', exampleContext: '', note: 'Kenyan favourite' }],
  practice: [{ id: 'p1', mode: 'translate', english: 'x', before: '', after: '.', options: [{ text: 'Faida', correct: true }, { text: 'Bei', correct: false }], explanation: '' }],
};
const item = (t: string, id?: string) => ({ ...(id ? { id } : {}), mode: 'translate', english: t, before: '', after: '.', options: [{ text: t, correct: true }, { text: 'Bei', correct: false }], explanation: '' });

describe('reviewing vocabulary & practice after a conversation rewrite', () => {
  it('keeps ids of cards and items that stay, adds new ones', () => {
    const r = normalizeSync(
      {
        summary: 'Added faida and gharama.',
        vocabulary: [
          { id: 'v-biashara', swahili: 'biashara', english: 'business', exampleContext: '', partOfSpeech: 'noun', nounForms: { one: 'biashara', many: 'biashara' }, englishForms: { one: 'business', many: 'businesses' }, note: 'Kenyan favourite' },
          { swahili: 'faida', english: 'profit', exampleContext: '', partOfSpeech: 'noun', nounForms: { one: 'faida', many: 'faida' }, englishForms: { one: 'profit', many: 'profits' } },
          { swahili: 'gharama', english: 'cost', exampleContext: '', partOfSpeech: 'noun' },
          { swahili: 'mbia', english: 'partner', exampleContext: '', partOfSpeech: 'noun' },
        ],
        practice: [item('Faida', 'p1'), item('Gharama'), item('Mbia')],
      },
      input,
    );
    expect(r.vocabulary[0]).toMatchObject({ id: 'v-biashara', note: 'Kenyan favourite' });
    expect(r.vocabulary[1].id).not.toBe('v-biashara');
    expect(r.practice.map((p) => p.id)[0]).toBe('p1');
    expect(r.practice).toHaveLength(3);
  });

  it('shows Claude the new lines and the current lists', () => {
    const { system, user } = buildSyncPrompt(input, [], []);
    expect(system).toContain('KEY VOCABULARY');
    expect(user).toContain('Wewe: Faida ni kidogo.');
    expect(user).toContain('v-biashara');
  });
});
