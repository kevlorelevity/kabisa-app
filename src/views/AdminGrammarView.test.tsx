import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminProvider } from '../components/AdminProvider';
import { AuthContext } from '../hooks/authContext';
import { AdminGrammarView } from './AdminGrammarView';

const { saveDraft, publishTopic } = vi.hoisted(() => ({
  saveDraft: vi.fn(async () => ({ ok: true as const, value: undefined })),
  publishTopic: vi.fn(async () => ({ ok: true as const, value: undefined })),
}));
vi.mock('../lib/grammarStudio', async (orig) => ({
  ...(await orig<typeof import('../lib/grammarStudio')>()),
  loadStudioRows: async () => ({ ok: true, value: [] }),
  saveDraft,
  publishTopic,
}));

function open(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthContext.Provider value={{ session: null, user: null, loading: false, signInWithGoogle: async () => {}, signOut: async () => {} }}>
        <AdminProvider forceAdmin>
          <Routes>
            <Route path="/admin/grammar" element={<AdminGrammarView />} />
            <Route path="/admin/grammar/:slug" element={<AdminGrammarView />} />
          </Routes>
        </AdminProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

describe('grammar studio', () => {
  it('lists every section with a way to start a new one', async () => {
    open('/admin/grammar');
    expect(screen.getByRole('heading', { name: 'Grammar studio' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New grammar section/ })).toHaveAttribute('href', '/admin/grammar/new');
    expect(await screen.findByText('The Subjunctive: -e for "Let / Should / So That"')).toBeInTheDocument();
  });

  it('drafts a new section, previews it and publishes it', async () => {
    window.confirm = () => true;
    open('/admin/grammar/new');
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'If / When: -ki-' } });
    expect(screen.getByLabelText('Web address')).toHaveValue('if-when-ki');
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled(); // no summary yet
    fireEvent.change(screen.getByLabelText(/^Summary/), { target: { value: 'Put -ki- in the verb for “if” or “when”.' } });
    fireEvent.change(screen.getByLabelText('Block 1 text'), { target: { value: '**ni- + -ki- + verb**: nikifika = when I arrive' } });
    fireEvent.change(screen.getByLabelText(/^Examples/), { target: { value: 'Nikifika, nitakupigia. | When I arrive, I’ll call you.' } });
    const preview = screen.getByTestId('grammar-preview');
    expect(preview).toHaveTextContent('If / When: -ki-');
    expect(preview).toHaveTextContent('Nikifika, nitakupigia.');
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledWith(expect.objectContaining({ slug: 'if-when-ki', level: 1 }), true));
  });

  it('reworks a shipped section starting from what learners see now', async () => {
    window.confirm = () => true;
    open('/admin/grammar/subjunctive');
    expect(await screen.findByLabelText('Title')).toHaveValue('The Subjunctive: -e for "Let / Should / So That"');
    expect(screen.getByLabelText('Web address')).toHaveAttribute('readonly');
    fireEvent.change(screen.getByLabelText(/^Summary/), { target: { value: 'New summary.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(publishTopic).toHaveBeenCalledWith(expect.objectContaining({ slug: 'subjunctive', summary: 'New summary.' }), false));
  });
});
