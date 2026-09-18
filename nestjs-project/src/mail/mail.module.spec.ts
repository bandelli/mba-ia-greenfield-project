import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { MAILER_OPTIONS, type MailerOptions } from '@nestjs-modules/mailer';
import appConfig from '../config/app.config';
import mailConfig from '../config/mail.config';
import { MailModule } from './mail.module';

type SmtpTransportWithAuth = {
  auth?: { user: string; pass: string };
};

describe('MailModule', () => {
  afterEach(() => {
    delete process.env.MAIL_USER;
    delete process.env.MAIL_PASS;
  });

  it('should compile successfully', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [appConfig, mailConfig] }),
        MailModule,
      ],
    }).compile();

    expect(module).toBeDefined();
    await module.close();
  }, 15000);

  it('should omit transport.auth entirely when MAIL_USER/MAIL_PASS are unset', async () => {
    delete process.env.MAIL_USER;
    delete process.env.MAIL_PASS;

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [appConfig, mailConfig] }),
        MailModule,
      ],
    }).compile();

    const options = module.get<MailerOptions>(MAILER_OPTIONS);
    const transport = options.transport as SmtpTransportWithAuth;
    expect(transport.auth).toBeUndefined();
    expect('auth' in transport).toBe(false);

    await module.close();
  }, 15000);

  it('should include transport.auth when MAIL_USER/MAIL_PASS are both set', async () => {
    process.env.MAIL_USER = 'apikey';
    process.env.MAIL_PASS = 'super-secret';

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [appConfig, mailConfig] }),
        MailModule,
      ],
    }).compile();

    const options = module.get<MailerOptions>(MAILER_OPTIONS);
    const transport = options.transport as SmtpTransportWithAuth;
    expect(transport.auth).toEqual({ user: 'apikey', pass: 'super-secret' });

    await module.close();
  }, 15000);
});
