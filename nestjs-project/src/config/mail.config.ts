import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.MAIL_HOST || 'mailpit',
  port: parseInt(process.env.MAIL_PORT || '1025', 10),
  from: process.env.MAIL_FROM || '"StreamTube" <noreply@streamtube.com>',
  // Optional SMTP auth for real providers (SendGrid, Postmark, SES, etc.).
  // Left unset for local Mailpit dev, which accepts unauthenticated connections.
  user: process.env.MAIL_USER,
  pass: process.env.MAIL_PASS,
}));
