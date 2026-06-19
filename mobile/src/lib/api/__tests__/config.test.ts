/* eslint-disable @typescript-eslint/no-require-imports */
describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('loads config correctly when env is provided', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.test.com/api';
    process.env.EXPO_PUBLIC_APP_ENV = 'production';

    const { config } = require('../config');
    expect(config.apiUrl).toBe('https://api.test.com/api');
    expect(config.appEnv).toBe('production');
    expect(config.isProd).toBe(true);
    expect(config.isDev).toBe(false);
  });

  it('throws error when EXPO_PUBLIC_API_URL is missing', () => {
    delete process.env.EXPO_PUBLIC_API_URL;

    expect(() => {
      require('../config');
    }).toThrow('EXPO_PUBLIC_API_URL tidak ditemukan');
  });
});
