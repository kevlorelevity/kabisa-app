import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { VocabEntry } from './VocabEntry';
import type { VocabEntry as VocabEntryType } from '../types';

const entry: VocabEntryType = {
  swahili: 'Nashuka hapa',
  english: "I'm getting off here",
  exampleContext: 'Said to the conductor when approaching your stop',
  sanifu: 'Nitashuka hapa',
  sanifuNote: "Kenyan speakers use 'na-' where sanifu uses 'nita-'",
};

describe('VocabEntry', () => {
  it('shows the Kenyan Swahili form and English by default', () => {
    render(<VocabEntry entry={entry} />);
    expect(screen.getByText('Nashuka hapa')).toBeInTheDocument();
    expect(screen.getByText("I'm getting off here")).toBeInTheDocument();
  });

  it('hides the sanifu content by default', () => {
    render(<VocabEntry entry={entry} />);
    expect(screen.queryByText('Nitashuka hapa')).not.toBeInTheDocument();
  });

  it('shows sanifu content when toggle is clicked', async () => {
    render(<VocabEntry entry={entry} />);
    await userEvent.click(screen.getByText('Sanifu →'));
    expect(screen.getByText('Nitashuka hapa')).toBeInTheDocument();
    expect(screen.getByText(entry.sanifuNote)).toBeInTheDocument();
  });

  it('hides sanifu content when toggle is clicked again', async () => {
    render(<VocabEntry entry={entry} />);
    await userEvent.click(screen.getByText('Sanifu →'));
    await userEvent.click(screen.getByText('Sanifu ↑'));
    expect(screen.queryByText('Nitashuka hapa')).not.toBeInTheDocument();
  });

  it('shows the exampleContext', () => {
    render(<VocabEntry entry={entry} />);
    expect(screen.getByText(entry.exampleContext)).toBeInTheDocument();
  });
});
