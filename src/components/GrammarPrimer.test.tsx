import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { GrammarPrimer } from './GrammarPrimer';
import { getRawLessons } from '../hooks/useLessons';

describe('GrammarPrimer', () => {
  const lesson = getRawLessons().find((l) => l.id === 'car-breakdown')!;

  it('explains each focus structure on its own page, with lines from the conversation', () => {
    const onStart = vi.fn();
    render(<GrammarPrimer lesson={lesson} slugs={lesson.grammarFocus!} onStart={onStart} />);
    expect(screen.getByRole('heading', { name: 'The grammar you’ll learn' })).toBeInTheDocument();
    expect(screen.getByText(/Before you start/)).toBeInTheDocument();
    expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Mwambie or Umwambie?');
    expect(screen.getByText('In this conversation')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Next:/ }));
    expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Next:/ }));
    fireEvent.click(screen.getByRole('button', { name: /Start the conversation/ }));
    expect(onStart).toHaveBeenCalled();
  });
});
