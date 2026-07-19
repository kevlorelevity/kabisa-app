import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ExerciseFillBlank } from './ExerciseFillBlank';
import type { FillBlankExercise } from '../types';

const exercise: FillBlankExercise = {
  id: 'test-fill-blank-1',
  type: 'fill-blank',
  prompt: "_____ hapa. (I'm getting off here)",
  answer: 'Nashuka',
};

describe('ExerciseFillBlank', () => {
  it('shows the prompt', () => {
    render(<ExerciseFillBlank exercise={exercise} onComplete={() => {}} />);
    expect(screen.getByText(exercise.prompt)).toBeInTheDocument();
  });

  it('shows success message on correct answer', async () => {
    render(<ExerciseFillBlank exercise={exercise} onComplete={() => {}} />);
    await userEvent.type(screen.getByRole('textbox'), 'Nashuka');
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    expect(screen.getByText(/correct/i)).toBeInTheDocument();
  });

  it('shows error message on wrong answer', async () => {
    render(<ExerciseFillBlank exercise={exercise} onComplete={() => {}} />);
    await userEvent.type(screen.getByRole('textbox'), 'Wrong');
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    expect(screen.getByText(/try again/i)).toBeInTheDocument();
  });

  it('calls onComplete when correct answer is submitted', async () => {
    const onComplete = vi.fn();
    render(<ExerciseFillBlank exercise={exercise} onComplete={onComplete} />);
    await userEvent.type(screen.getByRole('textbox'), 'Nashuka');
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not call onComplete on wrong answer', async () => {
    const onComplete = vi.fn();
    render(<ExerciseFillBlank exercise={exercise} onComplete={onComplete} />);
    await userEvent.type(screen.getByRole('textbox'), 'Incorrect');
    await userEvent.click(screen.getByRole('button', { name: /check/i }));
    expect(onComplete).not.toHaveBeenCalled();
  });
});
