import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

/**
 * Object storage backed by MinIO (S3-compatible). Everything here speaks plain
 * S3, so pointing at real AWS S3 later is a config change — endpoint,
 * credentials, and dropping `forcePathStyle` — with no call-site edits.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('MINIO_BUCKET') ?? 'workflowengine';
    this.client = new S3Client({
      region: this.config.get<string>('MINIO_REGION') ?? 'us-east-1',
      endpoint: this.config.get<string>('MINIO_ENDPOINT') ?? 'http://localhost:9000',
      // MinIO serves buckets as a path, not a DNS subdomain.
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('MINIO_ACCESS_KEY') ?? 'workflowengine',
        secretAccessKey: this.config.get<string>('MINIO_SECRET_KEY') ?? 'workflowengine',
      },
    });
  }

  /** Creates the bucket on boot if it isn't there yet, so a fresh clone just works. */
  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Created object storage bucket "${this.bucket}"`);
      } catch (err) {
        // Not fatal at boot — uploads will surface the problem with context.
        this.logger.warn(
          `Object storage is not reachable yet (bucket "${this.bucket}"). ` +
            `Attachments will fail until MinIO is up: ${(err as Error).message}`,
        );
      }
    }
  }

  async upload(file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
  }): Promise<{ objectKey: string }> {
    // Date-partitioned + random prefix: no collisions, and the original name is
    // never used as a path (so it cannot escape the prefix).
    const today = new Date().toISOString().slice(0, 10);
    const objectKey = `execution-reports/${today}/${randomUUID()}-${file.originalname.replace(/[^\w.-]/g, '_')}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return { objectKey };
  }

  /** Short-lived download link, so objects never need to be public. */
  getDownloadUrl(objectKey: string, expiresInSeconds = 300): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      { expiresIn: expiresInSeconds },
    );
  }
}
