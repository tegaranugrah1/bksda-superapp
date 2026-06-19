import { ApiSuccess } from '@/types/api';

/**
 * Normalizes API response payload into a standardized ApiSuccess shape.
 * Handles both wrapped { data, meta, message } shapes and legacy/flat structures.
 */
export function normalizeResponse<T>(payload: any): ApiSuccess<T> {
  // If payload is null or undefined, return null data
  if (payload === null || payload === undefined) {
    return { data: null as any };
  }

  // If payload is not an object or is an array, wrap it in a data property
  if (typeof payload !== 'object' || Array.isArray(payload)) {
    return { data: payload as T };
  }

  // If payload has a 'data' field, extract it and optional metadata/messages
  if ('data' in payload) {
    let meta: ApiSuccess<T>['meta'] = undefined;

    if (payload.meta && typeof payload.meta === 'object') {
      meta = {
        current_page: payload.meta.current_page ?? payload.meta.currentPage,
        last_page: payload.meta.last_page ?? payload.meta.lastPage,
        per_page: payload.meta.per_page ?? payload.meta.perPage,
        total: payload.meta.total,
      };
    } else if (
      'current_page' in payload ||
      'last_page' in payload ||
      'per_page' in payload ||
      'total' in payload
    ) {
      meta = {
        current_page: payload.current_page,
        last_page: payload.last_page,
        per_page: payload.per_page,
        total: payload.total,
      };
    }

    return {
      data: payload.data,
      ...(meta ? { meta } : {}),
      ...(payload.message ? { message: payload.message } : {}),
    };
  }

  // Legacy top-level payload: treat the entire payload as the data
  return {
    data: payload as T,
  };
}
