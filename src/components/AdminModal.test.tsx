import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminProvider } from './AdminProvider';
import { AuthContext } from '../hooks/authContext';
import { EditPencil } from './EditPencil';
import { lineTarget, vocabTarget } from './adminTargets';

function renderWith(node: React.ReactNode) {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ session: null, user: null, loading: false, signInWithGoogle: async () => {}, signOut: async () => {} }}>
        <AdminProvider forceAdmin>{node}</AdminProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('admin ✎ modal', () => {
  it('edits a line’s Swahili and English in one modal, with a Context field', () => {
    renderWith(<EditPencil target={lineTarget({ id: 't1', speaker: 'Fundi', swahili: 'Nitamaliza baada ya saa moja.', english: "I'll finish in an hour." })} />);
    expect(screen.getAllByRole('button', { name: /Suggest a change/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /Suggest a change/ }));
    expect(screen.getByLabelText(/^Swahili/)).toHaveValue('Nitamaliza baada ya saa moja.');
    expect(screen.getByLabelText(/^English/)).toHaveValue("I'll finish in an hour.");
    expect(screen.getByLabelText(/^Context/)).toBeInTheDocument();
    expect(screen.queryByText(/Why\?/)).not.toBeInTheDocument();
  });

  it('shows singular and plural fields for nouns', () => {
    renderWith(
      <EditPencil
        target={vocabTarget(
          { id: 'v1', swahili: 'viatu', english: 'shoes', exampleContext: 'Kenyans: viatu hizi', nounForms: { one: 'kiatu', many: 'viatu' }, englishForms: { one: 'shoe', many: 'shoes' } },
          'Flashcard',
        )}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Suggest a change/ }));
    expect(screen.getByLabelText(/Swahili · singular/)).toHaveValue('kiatu');
    expect(screen.getByLabelText(/Swahili · plural/)).toHaveValue('viatu');
    expect(screen.getByLabelText(/English · singular/)).toHaveValue('shoe');
    expect(screen.getByLabelText(/English · plural/)).toHaveValue('shoes');
  });
});
