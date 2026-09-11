import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  endpoint: process.env.STORAGE_ENDPOINT!,
  region: process.env.STORAGE_REGION || 'us-east-1',
  bucket: process.env.STORAGE_BUCKET!,
  accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
  secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
  forcePathStyle: (process.env.STORAGE_FORCE_PATH_STYLE || 'true') === 'true',
}));
