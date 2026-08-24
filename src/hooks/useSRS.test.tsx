import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { SRSProvider } from './SRSProvider';
import { useSRS } from './useSRS';

const {
  useAuthMock,
  isSupabaseConfiguredMock,
  fetchAllSRSCardsMock,
  upsertSRSCardMock,
  upsertSRSCardsBatchMock,
  getAllSRSCardsMock,
  setSRSCardMock,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  isSupabaseConfiguredMock: vi.fn(),
  fetchAllSRSCardsMock: vi.fn(),
  upsertSRSCardMock: vi.fn(),
  upsertSRSCardsBatchMock: vi.fn(),
  getAllSRSCardsMock: vi.fn(),
  setSRSCardMock: vi.fn(),
}));

vi.mock('./useAuth', () => ({ useAuth: useAuthMock }));
vi.mock('../lib/supabase', () => ({ isSupabaseConfigured: isSupabaseConfiguredMock }));
vi.mock('../lib/progress', () => ({
  fetchAllSRSCards: fetchAllSRSCardsMock,
  upsertSRSCard: upsertSRSCardMock,
  upsertSRSCardsBatch: upsertSRSCardsBatchMock,
}));
vi.mock('../storage', () => ({
  getAllSRSCards: getAllSRSCardsMock,
  setSRSCard: setSRSCardMock,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <SRSProvider>{children}</SRSProvider>;
}

const PAST_DUE = { interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: '2000-01-01' };

describe('useSRS (via SRSProvider)', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    isSupabaseConfiguredMock.mockReset();
    fetchAllSRSCardsMock.mockReset();
    upsertSRSCardMock.mockReset();
    upsertSRSCardsBatchMock.mockReset();
    getAllSRSCardsMock.mockReset();
    setSRSCardMock.mockReset();
  });

  it('offline: loads cards synchronously from storage.ts and schedules through it', () => {
    isSupabaseConfiguredMock.mockReturnValue(false);
    useAuthMock.mockReturnValue({ user: null });
    getAllSRSCardsMock.mockReturnValue({ v1: PAST_DUE });

    const { result } = renderHook(() => useSRS(), { wrapper });

    expect(result.current.loading).toBe(false);
    expect(result.current.dueCount).toBe(1);

    act(() => {
      result.current.schedule('v1', 'easy');
    });

    expect(setSRSCardMock).toHaveBeenCalledWith('v1', expect.any(Object));
    expect(upsertSRSCardMock).not.toHaveBeenCalled();
  });

  it('online: fetches once, and schedule/seedCards persist through lib/progress while updating shared state immediately', async () => {
    isSupabaseConfiguredMock.mockReturnValue(true);
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
    fetchAllSRSCardsMock.mockResolvedValue({ v1: PAST_DUE });

    const { result } = renderHook(() => useSRS(), { wrapper });
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchAllSRSCardsMock).toHaveBeenCalledWith('u1');
    expect(result.current.dueCount).toBe(1);

    act(() => {
      result.current.schedule('v1', 'easy');
    });
    expect(upsertSRSCardMock).toHaveBeenCalledWith('u1', 'v1', expect.any(Object));
    expect(setSRSCardMock).not.toHaveBeenCalled();

    act(() => {
      result.current.seedCards(['v2', 'v3']);
    });
    expect(upsertSRSCardsBatchMock).toHaveBeenCalledWith(
      'u1',
      expect.arrayContaining([
        expect.objectContaining({ vocabId: 'v2' }),
        expect.objectContaining({ vocabId: 'v3' }),
      ]),
    );
    // Seeded cards should be reflected in shared state immediately, no
    // refetch needed — this is the whole point of lifting SRS into a
    // provider instead of a per-call-site hook.
    expect(result.current.cards.v2).toBeDefined();
    expect(result.current.cards.v3).toBeDefined();
  });

  it('throws when used outside SRSProvider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useSRS())).toThrow(
      'useSRS must be used within an SRSProvider',
    );
    consoleError.mockRestore();
  });
});
