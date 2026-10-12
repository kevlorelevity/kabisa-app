import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DialoguePlayer } from './DialoguePlayer';
import type { DialogueTurn } from '../types';

const turns = [
  { id: 't1', role: 'user', speaker: 'You', swahili: 'Habari yako?', english: 'How are you?', words: [],
    options: [ { swahili: 'Habari yako?', correct: true }, { swahili: 'Kwa heri', correct: false } ] },
  { id: 't2', role: 'auto', speaker: 'Kamau', swahili: 'Nzuri sana.', english: 'Very good.', words: [] },
] as unknown as DialogueTurn[];

describe('DialoguePlayer — Roam review', () => {
  it('shows every line and the marked answer choices without scoring', () => {
    const onComplete = vi.fn();
    render(<DialoguePlayer turns={turns} onComplete={onComplete} review />);
    expect(screen.getByText('Nzuri sana.')).toBeTruthy();
    expect(screen.getByText('✓ Habari yako?', { exact: false })).toBeTruthy();
    expect(screen.getByText('Kwa heri')).toBeTruthy();
    expect(screen.queryByTestId('answer-tray')).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
  });
});

describe('DialoguePlayer — typed answers', () => {
  it('partial: blanks a word of the learner line and accepts it typed', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<DialoguePlayer turns={turns} onComplete={onComplete} typing="partial" />);
    expect(screen.getByText('“How are you?”')).toBeTruthy();
    await user.type(screen.getByLabelText('Your answer'), 'yako{Enter}');
    expect(await screen.findByText('Nzuri sana.', {}, { timeout: 2000 })).toBeTruthy();
  });
  it('accepts another right answer and says why both work', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    const t = [
      { id: 'u1', role: 'user', speaker: 'You', swahili: 'Naomba umwambie anipigie.', english: 'Please tell him to call me.', typeWord: 'umwambie', words: [],
        accept: [{ text: 'Naomba mwambie anipigie.', note: 'Umwambie is more polite and very common.' }],
        options: [ { swahili: 'Naomba umwambie anipigie.', correct: true }, { swahili: 'Kwa heri', correct: false } ] },
      { id: 'a1', role: 'auto', speaker: 'Mwangi', swahili: 'Sawa.', english: 'Okay.', words: [] },
    ] as DialogueTurn[];
    render(<DialoguePlayer turns={t} onComplete={vi.fn()} typing="partial" />);
    await user.type(screen.getByLabelText('Your answer'), 'mwambie{Enter}');
    expect(await screen.findByTestId('typed-affirmation')).toHaveTextContent(
      'You chose “mwambie”! Good — both “mwambie” and “umwambie” work. Umwambie is more polite and very common.',
    );
  });
});
