import { normalizeResponse } from '../normalize';

describe('normalizeResponse', () => {
  it('handles null and undefined values by returning null data', () => {
    expect(normalizeResponse(null)).toEqual({ data: null });
    expect(normalizeResponse(undefined)).toEqual({ data: null });
  });

  it('wraps arrays and primitive types directly in data', () => {
    expect(normalizeResponse('hello')).toEqual({ data: 'hello' });
    expect(normalizeResponse(42)).toEqual({ data: 42 });
    expect(normalizeResponse(true)).toEqual({ data: true });
    expect(normalizeResponse([1, 2, 3])).toEqual({ data: [1, 2, 3] });
  });

  it('normalizes standard responses with data, meta, and message keys', () => {
    const payload = {
      data: { id: 1, name: 'Test User' },
      meta: {
        current_page: 1,
        last_page: 5,
        per_page: 20,
        total: 100,
      },
      message: 'Success load user',
    };

    expect(normalizeResponse(payload)).toEqual({
      data: { id: 1, name: 'Test User' },
      meta: {
        current_page: 1,
        last_page: 5,
        per_page: 20,
        total: 100,
      },
      message: 'Success load user',
    });
  });

  it('handles camelCase metadata and normalizes to snake_case', () => {
    const payload = {
      data: { id: 1 },
      meta: {
        currentPage: 2,
        lastPage: 4,
        perPage: 15,
        total: 60,
      },
    };

    expect(normalizeResponse(payload)).toEqual({
      data: { id: 1 },
      meta: {
        current_page: 2,
        last_page: 4,
        per_page: 15,
        total: 60,
      },
    });
  });

  it('extracts top-level pagination keys when meta object is absent', () => {
    const payload = {
      data: [{ id: 1 }],
      current_page: 3,
      last_page: 10,
      per_page: 10,
      total: 100,
      message: 'Items retrieved',
    };

    expect(normalizeResponse(payload)).toEqual({
      data: [{ id: 1 }],
      meta: {
        current_page: 3,
        last_page: 10,
        per_page: 10,
        total: 100,
      },
      message: 'Items retrieved',
    });
  });

  it('treats legacy top-level payloads without data key as data directly', () => {
    const legacyPayload = {
      id: 99,
      title: 'Legacy Item',
      description: 'Some legacy data structure',
    };

    expect(normalizeResponse(legacyPayload)).toEqual({
      data: {
        id: 99,
        title: 'Legacy Item',
        description: 'Some legacy data structure',
      },
    });
  });
});
