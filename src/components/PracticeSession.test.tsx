import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
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
