import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { PracticeSession } from './PracticeSession';
import type { PracticeItem } from '../types';

const items: PracticeItem[] = [
  {
    id: 'a',
    mode: 'translate',
    english: 'I am going to Westlands.',
    before: '',
    after: ' Westlands.',
    options: [
      { text: 'Ninaenda', correct: true },
      { text: 'Unaenda', correct: false, feedback: 'unaenda = YOU are going.' },
    ],
    explanation: 'Ninaenda = I am going.',
  },
  {
    id: 'b',
    mode: 'complete',
    english: 'Where are you going?',
    before: 'Unaenda ',
    after: '?',
    options: [
      { text: 'wapi', correct: true },
      { text: 'vipi', correct: false },
    ],
    explanation: 'Wapi = where.',
  },
];

async function answer(user: ReturnType<typeof userEvent.setup>, wrongFirst: boolean) {
  const sentence = screen.getByTestId('practice-sentence').textContent ?? '';
  const isFirst = sentence.includes('Westlands');
  if (wrongFirst) {
    await user.click(screen.getByRole('button', { name: isFirst ? 'Unaenda' : 'vipi' }));
  }
  await user.click(screen.getByRole('button', { name: isFirst ? 'Ninaenda' : 'wapi' }));
}

describe('PracticeSession', () => {
  it('shows the distractor feedback on a wrong pick, then fills the gap on the right one', async () => {
    const user = userEvent.setup();
    render(<PracticeSession items={[items[0]]} />);
    expect(screen.getByText('I am going to Westlands.')).toBeInTheDocument();
    expect(screen.getByLabelText('blank')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Unaenda' }));
    expect(screen.getByText(/unaenda = YOU are going/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Ninaenda' }));
    expect(screen.getByTestId('practice-sentence')).toHaveTextContent('Ninaenda Westlands.');
    expect(screen.getByText('Ninaenda = I am going.')).toBeInTheDocument();
  });

  it('hides the English for fill-the-gap items until answered', async () => {
    const user = userEvent.setup();
    render(<PracticeSession items={[items[1]]} />);
    expect(screen.queryByText('Where are you going?')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'wapi' }));
    expect(screen.getByText('Where are you going?')).toBeInTheDocument();
  });

  it('scores only first-try answers', async () => {
    const user = userEvent.setup();
    render(<PracticeSession items={items} />);
    await answer(user, true);
    await user.click(screen.getByRole('button', { name: /next/i }));
    await answer(user, false);
    await user.click(screen.getByRole('button', { name: /see results/i }));
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });
});

describe('PracticeSession — Roam review', () => {
  it('shows every item already answered, in order, and never scores', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<PracticeSession items={items} onFinish={onFinish} review />);
    expect(screen.getByTestId('practice-sentence').textContent).toBe('Ninaenda Westlands.');
    await user.click(screen.getByRole('button', { name: 'Next →' }));
    expect(screen.getByTestId('practice-sentence').textContent).toBe('Unaenda wapi?');
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.getByText(/Roam · end of practice/)).toBeTruthy();
    expect(onFinish).not.toHaveBeenCalled();
  });
});

describe('PracticeSession — typed answers (levels 5+)', () => {
  it('partial: type the gap; a wrong try then the right answer is not first-try', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<PracticeSession items={[items[0]]} onFinish={onFinish} typing="partial" />);
    const box = screen.getByLabelText('Your answer');
    await user.type(box, 'Unaenda{Enter}');
    expect(screen.getByText(/Not quite/)).toBeTruthy();
    await user.clear(box);
    await user.type(box, 'ninaenda{Enter}');
    await user.click(screen.getByRole('button', { name: 'See results' }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ firstTryCorrect: 0, total: 1, missedIds: ['a'] }));
  });

  it('complete: type the whole sentence from the English', async () => {
    const user = userEvent.setup();
    const onFinish = vi.fn();
    render(<PracticeSession items={[items[1]]} onFinish={onFinish} typing="complete" />);
    expect(screen.getByTestId('practice-english').textContent).toContain('Where are you going?');
    await user.type(screen.getByLabelText('Your answer'), 'unaenda wapi{Enter}');
    await user.click(screen.getByRole('button', { name: 'See results' }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ firstTryCorrect: 1, total: 1 }));
  });
});
