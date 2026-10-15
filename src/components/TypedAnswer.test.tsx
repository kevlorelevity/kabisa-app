import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TypedAnswer } from './TypedAnswer';
import type { CheckResult } from '../lib/aiCheck';

const check = vi.fn<(...a: unknown[]) => Promise<CheckResult | null>>();
vi.mock('../lib/aiCheckClient', () => ({ checkWithAi: (...a: unknown[]) => check(...a) }));

const ai = { english: 'I am going to Westlands', salient: ['Naenda'] };

function setup() {
  const onSolved = vi.fn();
  const onMiss = vi.fn();
  render(<TypedAnswer accepted={['Naenda Westlands']} whole wide aiCheck={ai} onSolved={onSolved} onMiss={onMiss} />);
  const type = (v: string) => {
    fireEvent.change(screen.getByLabelText('Your answer'), { target: { value: v } });
    fireEvent.click(screen.getByRole('button', { name: /check/i }));
  };
  return { onSolved, onMiss, type };
}

describe('TypedAnswer AI check', () => {
  beforeEach(() => check.mockReset());

  it('does not call the AI for a stored answer', () => {
    const { onSolved, type } = setup();
    type('naenda westlands');
    expect(check).not.toHaveBeenCalled();
    expect(onSolved).toHaveBeenCalled();
  });

  it('accepts other good wording with part points', async () => {
    check.mockResolvedValue({ verdict: 'correct', credit: 0.5, feedback: 'That works!', missing: ['Naenda'] });
    const { onSolved, onMiss, type } = setup();
    type('Ninaelekea Westlands');
    await screen.findByTestId('ai-accepted');
    expect(screen.getByText(/½ point/)).toBeTruthy();
    await waitFor(() => expect(onSolved).toHaveBeenCalledWith('Ninaelekea Westlands', expect.stringContaining('That works!'), 0.5), { timeout: 4000 });
    expect(onMiss).not.toHaveBeenCalled();
  });

  it('shows the slip and a correction for an almost-right sentence', async () => {
    check.mockResolvedValue({ verdict: 'almost', credit: 0, feedback: 'Use “na-” for I.', corrected: 'Naelekea Westlands', missing: [] });
    const { onSolved, onMiss, type } = setup();
    type('Unaelekea Westlands');
    await screen.findByTestId('ai-almost');
    expect(screen.getByText('Naelekea Westlands')).toBeTruthy();
    expect(onMiss).toHaveBeenCalledOnce();
    expect(onSolved).not.toHaveBeenCalled();
  });

  it('falls back to "not quite" when the check is unavailable', async () => {
    check.mockResolvedValue(null);
    const { onMiss, type } = setup();
    type('Twende Westlands');
    await screen.findByText(/Not quite/);
    expect(onMiss).toHaveBeenCalledOnce();
  });
});
