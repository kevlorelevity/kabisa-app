import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useProgress } from './useProgress';

const {
  useAuthMock,
  isSupabaseConfiguredMock,
  fetchModuleProgressMock,
  upsertModuleProgressMock,
  getModuleProgressMock,
  setModuleProgressMock,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  isSupabaseConfiguredMock: vi.fn(),
  fetchModuleProgressMock: vi.fn(),
  upsertModuleProgressMock: vi.fn(),
  getModuleProgressMock: vi.fn(),
  setModuleProgressMock: vi.fn(),
}));

vi.mock('./useAuth', () => ({ useAuth: useAuthMock }));
vi.mock('../lib/supabase', () => ({ isSupabaseConfigured: isSupabaseConfiguredMock }));
vi.mock('../lib/progress', () => ({
  fetchModuleProgress: fetchModuleProgressMock,
  upsertModuleProgress: upsertModuleProgressMock,
}));
vi.mock('../storage', () => ({
  getModuleProgress: getModuleProgressMock,
  setModuleProgress: setModuleProgressMock,
}));

describe('useProgress', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    isSupabaseConfiguredMock.mockReset();
    fetchModuleProgressMock.mockReset();
    upsertModuleProgressMock.mockReset();
    getModuleProgressMock.mockReset();
    setModuleProgressMock.mockReset();
  });

  it('offline: reads/writes through storage.ts, keyed by the module slug', () => {
    isSupabaseConfiguredMock.mockReturnValue(false);
    useAuthMock.mockReturnValue({ user: null });
    getModuleProgressMock.mockReturnValue(null);

    const { result } = renderHook(() => useProgress('chai-kiosk', 'uuid-1'));
    expect(result.current.progress.status).toBe('not-started');

    act(() => {
      result.current.updateProgress({ status: 'in-progress' });
    });

    expect(setModuleProgressMock).toHaveBeenCalledWith(
      'chai-kiosk',
      expect.objectContaining({ status: 'in-progress' }),
    );
    expect(upsertModuleProgressMock).not.toHaveBeenCalled();
  });

  it('online: fetches the row on mount and writes through lib/progress, keyed by module.uuid', async () => {
    isSupabaseConfiguredMock.mockReturnValue(true);
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
    fetchModuleProgressMock.mockResolvedValue({
      status: 'in-progress',
      addedToReview: false,
      lastReviewed: null,
    });

    const { result } = renderHook(() => useProgress('chai-kiosk', 'uuid-1'));

    await waitFor(() => expect(result.current.progress.status).toBe('in-progress'));
    expect(fetchModuleProgressMock).toHaveBeenCalledWith('u1', 'uuid-1');

    act(() => {
      result.current.updateProgress({ addedToReview: true });
    });

    expect(upsertModuleProgressMock).toHaveBeenCalledWith(
      'u1',
      'uuid-1',
      expect.objectContaining({ status: 'in-progress', addedToReview: true }),
    );
    expect(setModuleProgressMock).not.toHaveBeenCalled();
  });

  it('online without a resolved moduleUuid yet: does not fetch or throw', () => {
    isSupabaseConfiguredMock.mockReturnValue(true);
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });

    const { result } = renderHook(() => useProgress('chai-kiosk', undefined));

    expect(result.current.progress.status).toBe('not-started');
    expect(fetchModuleProgressMock).not.toHaveBeenCalled();
  });
});
