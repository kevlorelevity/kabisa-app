import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { LessonFlashcards } from './LessonFlashcards';
import type { VocabEntry } from '../types';

const entries: VocabEntry[] = [
  { id: 'a', swahili: 'Uko aje?', english: 'How are you?', exampleContext: 'Asked back after a greeting' },
  { id: 'b', swahili: 'Niko poa', english: "I'm good", exampleContext: 'Answer to uko aje' },
];

describe('LessonFlashcards', () => {
  it('reveals English, then Swahili, then usage notes', async () => {
    const user = userEvent.setup();
    render(<LessonFlashcards entries={entries} />);
    expect(screen.getByText('How are you?')).toBeInTheDocument();
    expect(screen.queryByText('Uko aje?')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /flashcard side/i }));
    expect(screen.getByText('Uko aje?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /flashcard side/i }));
    expect(screen.getByText('Asked back after a greeting')).toBeInTheDocument();
  });

  it('moves between cards and resets to the first side', async () => {
    const user = userEvent.setup();
    render(<LessonFlashcards entries={entries} />);
    await user.click(screen.getByRole('button', { name: /flashcard side/i }));
    await user.click(screen.getByRole('button', { name: /^next/i }));
    expect(screen.getByText("I'm good")).toBeInTheDocument();
    expect(screen.getByText('Card 2 of 2')).toBeInTheDocument();
  });
});
