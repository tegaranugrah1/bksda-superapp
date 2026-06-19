import { normalizeError } from '../errors';

describe('normalizeError', () => {
  it('normalizes 401 unauthorized errors', () => {
    const error = {
      response: {
        status: 401,
        data: { message: 'Token has expired' },
      },
    };

    expect(normalizeError(error)).toEqual({
      status: 401,
      message: 'Token has expired',
      kind: 'auth',
    });
  });

  it('normalizes 401 unauthorized errors with default message if absent', () => {
    const error = {
      response: {
        status: 401,
      },
    };

    expect(normalizeError(error)).toEqual({
      status: 401,
      message: 'Sesi Anda telah berakhir. Silakan login kembali.',
      kind: 'auth',
    });
  });

  it('normalizes 403 forbidden errors', () => {
    const error = {
      response: {
        status: 403,
        data: { message: 'Forbidden access' },
      },
    };

    expect(normalizeError(error)).toEqual({
      status: 403,
      message: 'Forbidden access',
      kind: 'forbidden',
    });
  });

  it('normalizes 404 not found errors', () => {
    const error = {
      response: {
        status: 404,
        data: { message: 'Asset not found' },
      },
    };

    expect(normalizeError(error)).toEqual({
      status: 404,
      message: 'Asset not found',
      kind: 'not_found',
    });
  });

  it('normalizes 422 validation errors with field errors mapped', () => {
    const error = {
      response: {
        status: 422,
        data: {
          message: 'The given data was invalid.',
          errors: {
            username: ['Username wajib diisi.'],
            password: ['Password minimal 8 karakter.'],
          },
        },
      },
    };

    expect(normalizeError(error)).toEqual({
      status: 422,
      message: 'The given data was invalid.',
      kind: 'validation',
      fieldErrors: {
        username: ['Username wajib diisi.'],
        password: ['Password minimal 8 karakter.'],
      },
    });
  });

  it('normalizes 429 rate limit errors with friendly message', () => {
    const error = {
      response: {
        status: 429,
        data: { message: 'Too Many Attempts.' },
      },
    };

    expect(normalizeError(error)).toEqual({
      status: 429,
      message: 'Terlalu banyak permintaan. Silakan coba beberapa saat lagi.',
      kind: 'rate_limit',
    });
  });

  it('normalizes 500 server errors and hides raw stack trace / SQL / HTML outputs', () => {
    const htmlError = {
      response: {
        status: 500,
        data: '<html><body><h1>500 Internal Server Error</h1></body></html>',
      },
    };

    const sqlError = {
      response: {
        status: 500,
        data: {
          message: 'SQLSTATE[HY000] [2002] Connection refused (SQL: select * from users)',
        },
      },
    };

    const stackTraceError = {
      response: {
        status: 500,
        data: {
          message: 'Exception: Call to a member function on null in Controller.php:32\nStack trace:\n...',
        },
      },
    };

    expect(normalizeError(htmlError)).toEqual({
      status: 500,
      message: 'Terjadi gangguan pada server. Silakan hubungi admin atau coba lagi nanti.',
      kind: 'server',
    });

    expect(normalizeError(sqlError)).toEqual({
      status: 500,
      message: 'Terjadi gangguan pada server. Silakan hubungi admin atau coba lagi nanti.',
      kind: 'server',
    });

    expect(normalizeError(stackTraceError)).toEqual({
      status: 500,
      message: 'Terjadi gangguan pada server. Silakan hubungi admin atau coba lagi nanti.',
      kind: 'server',
    });
  });

  it('normalizes network errors where request was sent but no response was received', () => {
    const error = {
      request: {},
    };

    expect(normalizeError(error)).toEqual({
      status: undefined,
      message: 'Koneksi internet terganggu. Silakan periksa koneksi Anda dan coba lagi.',
      kind: 'network',
    });
  });

  it('normalizes generic JS Network Errors', () => {
    const error = new Error('Network Error');

    expect(normalizeError(error)).toEqual({
      status: undefined,
      message: 'Koneksi internet terganggu. Silakan periksa koneksi Anda dan coba lagi.',
      kind: 'network',
    });
  });

  it('handles unknown generic Errors safely', () => {
    const error = new Error('Something went wrong');

    expect(normalizeError(error)).toEqual({
      status: undefined,
      message: 'Something went wrong',
      kind: 'unknown',
    });
  });
});
