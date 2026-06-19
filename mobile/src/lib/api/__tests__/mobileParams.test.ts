import { withMobileParams } from '../mobileParams';

describe('withMobileParams', () => {
  it('adds mobile=true, default per_page=20, and page=1 when params are undefined or empty', () => {
    expect(withMobileParams()).toEqual({
      mobile: true,
      per_page: 20,
      page: 1,
    });

    expect(withMobileParams({})).toEqual({
      mobile: true,
      per_page: 20,
      page: 1,
    });
  });

  it('preserves existing custom query parameters', () => {
    const input = {
      search: 'hutan',
      status: 'dipinjam',
    };

    expect(withMobileParams(input)).toEqual({
      search: 'hutan',
      status: 'dipinjam',
      mobile: true,
      per_page: 20,
      page: 1,
    });
  });

  it('does not overwrite explicit page parameter', () => {
    const input = {
      page: 5,
    };

    expect(withMobileParams(input)).toEqual({
      mobile: true,
      per_page: 20,
      page: 5,
    });
  });

  it('does not overwrite explicit per_page parameter', () => {
    const input = {
      per_page: 50,
    };

    expect(withMobileParams(input)).toEqual({
      mobile: true,
      per_page: 50,
      page: 1,
    });
  });

  it('does not overwrite explicit string values for page and per_page', () => {
    const input = {
      page: '3',
      per_page: '10',
    };

    expect(withMobileParams(input)).toEqual({
      mobile: true,
      per_page: '10',
      page: '3',
    });
  });

  it('preserves explicit zero-like pagination values for backend-owned edge cases', () => {
    const input = {
      page: 0,
      per_page: 0,
    };

    expect(withMobileParams(input)).toEqual({
      mobile: true,
      per_page: 0,
      page: 0,
    });
  });

  it('always overrides mobile parameter to true even if set to false originally', () => {
    const input = {
      mobile: false,
    };

    expect(withMobileParams(input)).toEqual({
      mobile: true,
      per_page: 20,
      page: 1,
    });
  });
});
