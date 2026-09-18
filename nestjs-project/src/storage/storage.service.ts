import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'stream';
import storageConfig from '../config/storage.config';
import { S3_CLIENT } from './storage.constants';

@Injectable()
export class StorageService {
  constructor(
    @Inject(S3_CLIENT) private readonly s3Client: S3Client,
    @Inject(storageConfig.KEY)
    private readonly config: ConfigType<typeof storageConfig>,
  ) {}

  async putObject(
    key: string,
    body: Buffer | Uint8Array,
    contentType?: string,
  ): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async getObjectStream(key: string): Promise<Readable> {
    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );
    return response.Body as Readable;
  }

  async deleteObject(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      }),
    );
  }

  async getPresignedUrl(key: string, expiresInSeconds = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });
    return getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });
  }
}
