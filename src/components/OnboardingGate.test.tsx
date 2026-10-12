import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OnboardingGate } from './OnboardingGate';
import { WelcomeForm } from './WelcomeForm';

const { useProfileMock } = vi.hoisted(() => ({ useProfileMock: vi.fn() }));
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('../hooks/profileContext', () => ({ useProfile: useProfileMock }));

describe('form of address', () => {
  it('sign-up needs it before the lessons start', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<WelcomeForm onSave={onSave} />);
    fireEvent.change(screen.getByLabelText('Your first name'), { target: { value: 'amani' } });
    fireEvent.change(screen.getByLabelText('Where are you from?'), { target: { value: 'DE' } });
    const go = screen.getByRole('button', { name: /twende/i });
    expect(go).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Woman' }));
    expect(screen.getByText(/mama, dada or sista/)).toBeInTheDocument();
    fireEvent.click(go);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ displayName: 'amani', nationality: 'DE', gender: 'female' }));
  });

  it('existing learners are asked once, then go straight to their lessons', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    useProfileMock.mockReturnValue({ profile: { displayName: 'Amani', nationality: 'DE' }, loading: false, save });
    const { rerender } = render(<OnboardingGate><p>Lessons</p></OnboardingGate>);
    expect(screen.queryByText('Lessons')).not.toBeInTheDocument();
    expect(screen.getByText(/Karibu tena, Amani/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Man' }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({ displayName: 'Amani', nationality: 'DE', gender: 'male' }));
    useProfileMock.mockReturnValue({ profile: { displayName: 'Amani', nationality: 'DE', gender: 'male' }, loading: false, save });
    rerender(<OnboardingGate><p>Lessons</p></OnboardingGate>);
    expect(screen.getByText('Lessons')).toBeInTheDocument();
  });
});
