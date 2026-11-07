import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'node:stream';
import type { AppConfig } from '@src/config/configuration';

/** Object payload returned to callers that stream bytes through the API. */
export interface StoredObject {
  stream: Readable;
  contentType?: string;
  contentLength?: number;
}

/**
 * Thin wrapper around the S3-compatible Garage API. Only this service knows
 * about the SDK; `FilesService` deals in storage keys and metadata.
 */
@Injectable()
export class S3StorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly defaultExpirySeconds: number;

  constructor(config: ConfigService<AppConfig, true>) {
    const storage = config.get('storage', { infer: true });

    this.bucket = storage.bucket;
    this.defaultExpirySeconds = storage.signedUrlExpirySeconds;
    this.client = new S3Client({
      endpoint: storage.endpoint,
      region: storage.region,
      credentials: {
        accessKeyId: storage.accessKeyId,
        secretAccessKey: storage.secretAccessKey,
      },
      forcePathStyle: storage.forcePathStyle,
    });
  }

  /** Uploads a buffer and returns the storage key. */
  async uploadFile(
    buffer: Buffer,
    key: string,
    mimeType: string,
  ): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    return key;
  }

  /**
   * Opens an object for streaming. Prefer this over presigned URLs for
   * user-facing reads: the bytes stay behind the API's session guard.
   */
  async getFile(key: string): Promise<StoredObject> {
    const result = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    return {
      stream: result.Body as Readable,
      contentType: result.ContentType,
      contentLength: result.ContentLength,
    };
  }

  /** Creates a short-lived presigned GET URL for a stored object. */
  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds = this.defaultExpirySeconds,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  async deleteFile(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
