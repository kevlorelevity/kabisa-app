import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  fetchAllModuleProgress,
  fetchModuleProgress,
  upsertModuleProgress,
  fetchAllSRSCards,
  upsertSRSCard,
  upsertSRSCardsBatch,
} from './progress';

const { getSupabaseMock } = vi.hoisted(() => ({ getSupabaseMock: vi.fn() }));
vi.mock('./supabase', () => ({ getSupabase: getSupabaseMock }));

interface FakeQueryResult {
  data?: unknown;
  error?: unknown;
}

// Minimal fake query builder: chainable, and awaitable at any point (real
// supabase-js query builders are thenable). Keeps each mocked chain short,
// per the auth-feature test convention.
interface FakeQueryBuilder {
  select: Mock;
  eq: Mock;
  maybeSingle: Mock;
  upsert: Mock;
  then: <T>(
    onfulfilled: (value: FakeQueryResult) => T,
  ) => Promise<T>;
}

function makeBuilder(result: FakeQueryResult): FakeQueryBuilder {
  const builder: FakeQueryBuilder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(result)),
    upsert: vi.fn(() => Promise.resolve(result)),
    then: (onfulfilled) => Promise.resolve(result).then(onfulfilled),
  };
  return builder;
}

describe('lib/progress', () => {
  beforeEach(() => {
    getSupabaseMock.mockReset();
  });

  it('returns empty/null defaults and no-ops writes when Supabase is not configured', async () => {
    getSupabaseMock.mockReturnValue(null);

    expect(await fetchAllModuleProgress('u1')).toEqual({});
    expect(await fetchModuleProgress('u1', 'm1')).toBeNull();
    expect(await fetchAllSRSCards('u1')).toEqual({});
    await expect(
      upsertModuleProgress('u1', 'm1', {
        status: 'in-progress',
        addedToReview: false,
        lastReviewed: null,
      }),
    ).resolves.toBeUndefined();
  });

  it('fetchAllModuleProgress maps rows to camelCase, keyed by module_id', async () => {
    const from = vi.fn(() =>
      makeBuilder({
        data: [
          {
            module_id: 'm1',
            status: 'in-progress',
            added_to_review: false,
            last_reviewed: null,
          },
        ],
        error: null,
      }),
    );
    getSupabaseMock.mockReturnValue({ from });

    const result = await fetchAllModuleProgress('u1');
    expect(from).toHaveBeenCalledWith('module_progress');
    expect(result).toEqual({
      m1: { status: 'in-progress', addedToReview: false, lastReviewed: null },
    });
  });

  it('fetchModuleProgress returns null when no row exists', async () => {
    const from = vi.fn(() => makeBuilder({ data: null, error: null }));
    getSupabaseMock.mockReturnValue({ from });

    expect(await fetchModuleProgress('u1', 'm1')).toBeNull();
  });

  it('upsertModuleProgress upserts with the right shape and conflict target', async () => {
    const builder = makeBuilder({ error: null });
    const from = vi.fn(() => builder);
    getSupabaseMock.mockReturnValue({ from });

    await upsertModuleProgress('u1', 'm1', {
      status: 'reviewed',
      addedToReview: true,
      lastReviewed: '2026-08-21',
    });

    expect(from).toHaveBeenCalledWith('module_progress');
    expect(builder.upsert).toHaveBeenCalledWith(
      {
        account_id: 'u1',
        module_id: 'm1',
        status: 'reviewed',
        added_to_review: true,
        last_reviewed: '2026-08-21',
      },
      { onConflict: 'account_id,module_id' },
    );
  });

  it('fetchAllSRSCards maps rows to camelCase, keyed by vocab_id', async () => {
    const from = vi.fn(() =>
      makeBuilder({
        data: [
          {
            vocab_id: 'v1',
            interval_days: 6,
            ease_factor: 2.5,
            repetitions: 2,
            next_review: '2026-08-25',
          },
        ],
        error: null,
      }),
    );
    getSupabaseMock.mockReturnValue({ from });

    const result = await fetchAllSRSCards('u1');
    expect(result).toEqual({
      v1: { interval: 6, easeFactor: 2.5, repetitions: 2, nextReview: '2026-08-25' },
    });
  });

  it('upsertSRSCard upserts one row with the right conflict target', async () => {
    const builder = makeBuilder({ error: null });
    const from = vi.fn(() => builder);
    getSupabaseMock.mockReturnValue({ from });

    await upsertSRSCard('u1', 'v1', {
      interval: 1,
      easeFactor: 2.5,
      repetitions: 0,
      nextReview: '2026-08-21',
    });

    expect(from).toHaveBeenCalledWith('srs_card');
    expect(builder.upsert).toHaveBeenCalledWith(
      {
        account_id: 'u1',
        vocab_id: 'v1',
        interval_days: 1,
        ease_factor: 2.5,
        repetitions: 0,
        next_review: '2026-08-21',
      },
      { onConflict: 'account_id,vocab_id' },
    );
  });

  it('upsertSRSCardsBatch sends one call for all rows, and skips the network entirely when empty', async () => {
    const builder = makeBuilder({ error: null });
    const from = vi.fn(() => builder);
    getSupabaseMock.mockReturnValue({ from });

    const state = { interval: 1, easeFactor: 2.5, repetitions: 0, nextReview: '2026-08-21' };
    await upsertSRSCardsBatch('u1', [
      { vocabId: 'v1', state },
      { vocabId: 'v2', state },
    ]);

    expect(builder.upsert).toHaveBeenCalledTimes(1);
    expect(builder.upsert.mock.calls[0][0]).toHaveLength(2);

    from.mockClear();
    await upsertSRSCardsBatch('u1', []);
    expect(from).not.toHaveBeenCalled();
  });
});
