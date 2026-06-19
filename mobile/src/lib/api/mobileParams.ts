/**
 * Merges mobile list parameters (mobile=true, default per_page=20, page=1)
 * into a request parameter object. Does not override explicit page or per_page values if already present.
 */
export function withMobileParams(params?: Record<string, any>): Record<string, any> {
  const result = { ...params };

  // Always enforce mobile=true for API routing/filtering logic in backend
  result.mobile = true;

  // Add default pagination values only if they are not explicitly provided
  if (result.per_page === undefined || result.per_page === null) {
    result.per_page = 20;
  }

  if (result.page === undefined || result.page === null) {
    result.page = 1;
  }

  return result;
}
