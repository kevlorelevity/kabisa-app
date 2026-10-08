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
    await user.type(screen.getByLabelText('Your answer'), 'habari{Enter}');
    expect(await screen.findByText('Nzuri sana.', {}, { timeout: 2000 })).toBeTruthy();
  });
});
