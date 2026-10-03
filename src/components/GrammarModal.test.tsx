import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { GrammarProvider } from './GrammarProvider';
import { TappableSwahili } from './TappableSwahili';
import { GrammarView } from '../views/GrammarView';
import { resetFavoritesCache } from '../lib/grammarFavorites';

function setup(ui: React.ReactNode) {
  return render(
    <MemoryRouter>
      <GrammarProvider>{ui}</GrammarProvider>
    </MemoryRouter>,
  );
}

describe('grammar explainer modal', () => {
  beforeEach(() => {
    localStorage.clear();
    resetFavoritesCache();
  });

  it('opens from a word tooltip, shows the Sanifu look-up, and closes', async () => {
    const user = userEvent.setup();
    setup(
      <TappableSwahili
        enabled
        swahili="Jina yangu ni John."
        words={[{ text: 'Jina yangu', gloss: 'my name', sanifu: 'Sanifu: jina langu', grammar: ['possessives'] }]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Jina yangu' }));
    expect(screen.getByText('Sanifu: jina langu')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Possessives/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Possessives');
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('favourites an explainer and lists it under ★ Favourites', async () => {
    const user = userEvent.setup();
    setup(<GrammarView />);
    await user.click(screen.getByText('Past Tense -li-'));
    const dialog = screen.getByRole('dialog');
    await user.click(screen.getAllByRole('button', { name: /Add “Past Tense -li-” to favourites/ })[0]);
    expect(dialog).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('tab', { name: /Favourites \(1\)/ }));
    expect(screen.getByText('Past Tense -li-')).toBeInTheDocument();
    expect(screen.queryByText('Future Tense -ta-')).not.toBeInTheDocument();
  });

  it('follows related links and goes back', async () => {
    const user = userEvent.setup();
    setup(<GrammarView />);
    await user.click(screen.getByText('Past Tense -li-'));
    await user.click(screen.getByRole('button', { name: /📘 Negative Past/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Negative Past: si-ku-');
    await user.click(screen.getByRole('button', { name: '← Back' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Past Tense -li-');
  });
});
