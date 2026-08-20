import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './useAuth';

const { getSupabaseMock } = vi.hoisted(() => ({ getSupabaseMock: vi.fn() }));

vi.mock('../lib/supabase', () => ({
  getSupabase: getSupabaseMock,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('useAuth', () => {
  beforeEach(() => {
    getSupabaseMock.mockReset();
  });

  it('resolves loading=false with no session when Supabase is not configured', async () => {
    getSupabaseMock.mockReturnValue(null);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('picks up the initial session and reacts to auth state changes', async () => {
    const fakeSession = {
      user: { id: 'u1', email: 'kevin@example.com', user_metadata: {} },
    };
    let authChangeCallback:
      | ((event: string, session: unknown) => void)
      | undefined;

    getSupabaseMock.mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: vi.fn((cb) => {
          authChangeCallback = cb;
          return { data: { subscription: { unsubscribe: vi.fn() } } };
        }),
      },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).toBeNull();

    authChangeCallback?.('SIGNED_IN', fakeSession);

    await waitFor(() =>
      expect(result.current.user?.email).toBe('kevin@example.com'),
    );
  });

  it('throws when useAuth is called outside an AuthProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider',
    );
    consoleError.mockRestore();
  });
});
