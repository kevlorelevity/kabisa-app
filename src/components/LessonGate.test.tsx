import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LessonGateStatus, PracticeKey } from './LessonGate';
import { getRawLessons } from '../hooks/useLessons';

const [lesson, next] = getRawLessons().filter((l) => l.practice?.length);
const s = (best: number) => ({ best, last: best, attempts: 1, failed: best < 0.8 ? 1 : 0 });

describe('the path to the next lesson', () => {
  it('shows conversation → practice (the key) → next lesson', () => {
    render(<LessonGateStatus lesson={lesson} next={next} rec={{ dialogue: s(0.9), weakTurns: [], weakPractice: [] }} />);
    const path = screen.getByRole('list', { name: 'Your path to the next lesson' });
    expect(path).toHaveTextContent('✓ Conversation');
    expect(path).toHaveTextContent('2. 🔑 Practice');
    expect(path).toHaveTextContent('🔒 Next lesson');
    expect(screen.getByText(/practice session is your key to the next lesson/)).toBeInTheDocument();
  });

  it('after the conversation, the practice card says it unlocks the next lesson', () => {
    render(
      <MemoryRouter>
        <PracticeKey lesson={lesson} next={next} rec={{ dialogue: s(0.9), weakTurns: [], weakPractice: [] }} />
      </MemoryRouter>,
    );
    const card = screen.getByTestId('practice-key');
    expect(card).toHaveTextContent('your key to the next lesson');
    expect(card).toHaveTextContent(`unlock “${next.title}”`);
    expect(card).toHaveAttribute('href', `/lesson/${lesson.id}/practice`);
  });
});
