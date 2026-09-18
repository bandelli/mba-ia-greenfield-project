import { ConfigModule, type ConfigType } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import mailConfig from './mail.config';

const ENV_KEYS = [
  'MAIL_HOST',
  'MAIL_PORT',
  'MAIL_FROM',
  'MAIL_USER',
  'MAIL_PASS',
] as const;

const loadConfig = async (
  env: Partial<Record<(typeof ENV_KEYS)[number], string>>,
): Promise<ConfigType<typeof mailConfig>> => {
  for (const key of ENV_KEYS) {
    if (env[key] !== undefined) {
      process.env[key] = env[key];
    } else {
      delete process.env[key];
    }
  }

  const module = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ ignoreEnvFile: true, load: [mailConfig] }),
    ],
  }).compile();

  const config = module.get<ConfigType<typeof mailConfig>>(mailConfig.KEY);
  await module.close();
  return config;
};

describe('mailConfig', () => {
  afterEach(() => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }
  });

  it('should return undefined user and pass when MAIL_USER/MAIL_PASS are unset', async () => {
    const config = await loadConfig({});
    expect(config.user).toBeUndefined();
    expect(config.pass).toBeUndefined();
  });

  it('should return the configured user and pass when both are set', async () => {
    const config = await loadConfig({
      MAIL_USER: 'apikey',
      MAIL_PASS: 'super-secret',
    });
    expect(config.user).toBe('apikey');
    expect(config.pass).toBe('super-secret');
  });

  it('should default host/port/from when unset', async () => {
    const config = await loadConfig({});
    expect(config.host).toBe('mailpit');
    expect(config.port).toBe(1025);
    expect(config.from).toBe('"StreamTube" <noreply@streamtube.com>');
  });
});
