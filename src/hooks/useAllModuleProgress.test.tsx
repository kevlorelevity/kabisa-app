import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAllModuleProgress } from './useAllModuleProgress';
import type { Module } from '../types';

const {
  useAuthMock,
  isSupabaseConfiguredMock,
  fetchAllModuleProgressMock,
  getModuleProgressMock,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  isSupabaseConfiguredMock: vi.fn(),
  fetchAllModuleProgressMock: vi.fn(),
  getModuleProgressMock: vi.fn(),
}));

vi.mock('./useAuth', () => ({ useAuth: useAuthMock }));
vi.mock('../lib/supabase', () => ({ isSupabaseConfigured: isSupabaseConfiguredMock }));
vi.mock('../lib/progress', () => ({ fetchAllModuleProgress: fetchAllModuleProgressMock }));
vi.mock('../storage', () => ({ getModuleProgress: getModuleProgressMock }));

const testModule: Module = {
  id: 'chai-kiosk',
  uuid: 'uuid-1',
  title: 'Chai Kiosk',
  category: 'food-drink',
  difficulty: 'beginner',
  culturalNote: '',
  vocabulary: [],
  exchange: [],
  exercises: [],
};

describe('useAllModuleProgress', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    isSupabaseConfiguredMock.mockReset();
    fetchAllModuleProgressMock.mockReset();
    getModuleProgressMock.mockReset();
  });

  it('offline: reads storage.ts synchronously per module by slug', () => {
    isSupabaseConfiguredMock.mockReturnValue(false);
    useAuthMock.mockReturnValue({ user: null });
    getModuleProgressMock.mockReturnValue({
      status: 'in-progress',
      addedToReview: false,
      lastReviewed: null,
    });

    const { result } = renderHook(() => useAllModuleProgress());

    expect(result.current.loading).toBe(false);
    expect(result.current.getProgress(testModule).status).toBe('in-progress');
    expect(getModuleProgressMock).toHaveBeenCalledWith('chai-kiosk');
    expect(fetchAllModuleProgressMock).not.toHaveBeenCalled();
  });

  it('online: fetches once and looks progress up by module.uuid', async () => {
    isSupabaseConfiguredMock.mockReturnValue(true);
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
    fetchAllModuleProgressMock.mockResolvedValue({
      'uuid-1': { status: 'reviewed', addedToReview: true, lastReviewed: '2026-08-21' },
    });

    const { result } = renderHook(() => useAllModuleProgress());
    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchAllModuleProgressMock).toHaveBeenCalledWith('u1');
    expect(result.current.getProgress(testModule).status).toBe('reviewed');
  });

  it('online: defaults to not-started for a module with no row yet', async () => {
    isSupabaseConfiguredMock.mockReturnValue(true);
    useAuthMock.mockReturnValue({ user: { id: 'u1' } });
    fetchAllModuleProgressMock.mockResolvedValue({});

    const { result } = renderHook(() => useAllModuleProgress());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.getProgress(testModule)).toEqual({
      status: 'not-started',
      addedToReview: false,
      lastReviewed: null,
    });
  });
});
