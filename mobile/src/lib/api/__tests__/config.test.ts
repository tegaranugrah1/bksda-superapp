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

  it('uses fallback apiUrl when EXPO_PUBLIC_API_URL is missing', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    process.env.EXPO_PUBLIC_APP_ENV = 'development';

    const { config } = require('../config');
    expect(config.apiUrl).toMatch(/^http:\/\/[^/]+:8000\/api$/);
  });
  it('rejects production HTTP and missing native production configuration', () => {
    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    process.env.EXPO_PUBLIC_API_URL = 'http://api.test/api';
    expect(() => require('../config')).toThrow('HTTPS');
    jest.resetModules(); delete process.env.EXPO_PUBLIC_API_URL;
    expect(() => require('../config')).toThrow('HTTPS');
  });

});
