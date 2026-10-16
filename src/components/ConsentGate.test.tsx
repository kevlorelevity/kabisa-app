import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConsentGate } from './ConsentGate';

const { useProfileMock } = vi.hoisted(() => ({ useProfileMock: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../hooks/profileContext', () => ({ useProfile: useProfileMock }));

describe('terms consent', () => {
  beforeEach(() => localStorage.clear());

  it('blocks the app until the Terms are ticked; the email box starts ticked', async () => {
    useProfileMock.mockReturnValue({ profile: null, loading: false });
    render(<ConsentGate><p>Lessons</p></ConsentGate>);
    expect(await screen.findByTestId('terms-box')).toBeInTheDocument();
    expect(screen.queryByText('Lessons')).not.toBeInTheDocument();
    expect(screen.getByTestId('email-updates')).toBeChecked();
    expect(screen.getByTestId('agree-terms')).not.toBeChecked();
    fireEvent.click(screen.getByTestId('consent-continue'));
    expect(screen.getByText(/can’t use Kabisa without accepting/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel sign-up/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /back to the terms/i }));
    fireEvent.click(screen.getByTestId('agree-terms'));
    fireEvent.click(screen.getByTestId('email-updates'));
    fireEvent.click(screen.getByTestId('consent-continue'));
    expect(await screen.findByText('Lessons')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('ksa_consent')!)).toMatchObject({ emailUpdates: false });
  });

  it('existing learners who decline can delete their account', async () => {
    useProfileMock.mockReturnValue({ profile: { displayName: 'Amani', nationality: 'DE' }, loading: false });
    render(<ConsentGate><p>Lessons</p></ConsentGate>);
    expect(await screen.findByText(/Karibu tena, Amani/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('consent-continue'));
    fireEvent.click(screen.getByRole('button', { name: /delete my account/i }));
    await waitFor(() => expect(screen.getByTestId('confirm-delete')).toBeInTheDocument());
  });
});
