import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SignInGate } from './SignInGate';

const { useAuthMock, isSupabaseConfiguredMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  isSupabaseConfiguredMock: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useAuth: useAuthMock,
}));

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: isSupabaseConfiguredMock,
}));

describe('SignInGate', () => {
  it('renders children unguarded when Supabase is not configured', () => {
    isSupabaseConfiguredMock.mockReturnValue(false);
    useAuthMock.mockReturnValue({ session: null, loading: false });

    render(
      <SignInGate>
        <div>Catalog content</div>
      </SignInGate>,
    );

    expect(screen.getByText('Catalog content')).toBeInTheDocument();
  });

  it('shows a loading state while the initial session check is in flight', () => {
    isSupabaseConfiguredMock.mockReturnValue(true);
    useAuthMock.mockReturnValue({ session: null, loading: true });

    render(
      <SignInGate>
        <div>Catalog content</div>
      </SignInGate>,
    );

    expect(screen.getByText('Loading…')).toBeInTheDocument();
    expect(screen.queryByText('Catalog content')).not.toBeInTheDocument();
  });

  it('shows the sign-in screen when configured but signed out', () => {
    isSupabaseConfiguredMock.mockReturnValue(true);
    useAuthMock.mockReturnValue({ session: null, loading: false });

    render(
      <SignInGate>
        <div>Catalog content</div>
      </SignInGate>,
    );

    expect(screen.getByText('Sign in with Google')).toBeInTheDocument();
    expect(screen.queryByText('Catalog content')).not.toBeInTheDocument();
  });

  it('renders children once signed in', () => {
    isSupabaseConfiguredMock.mockReturnValue(true);
    useAuthMock.mockReturnValue({
      session: { user: { id: 'u1' } },
      loading: false,
    });

    render(
      <SignInGate>
        <div>Catalog content</div>
      </SignInGate>,
    );

    expect(screen.getByText('Catalog content')).toBeInTheDocument();
  });
});
