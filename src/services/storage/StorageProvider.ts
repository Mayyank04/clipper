/**
 * VIRALCLIP STUDIO — S3-COMPATIBLE STORAGE PROVIDER
 * Authoritative production storage provider for Cloudflare R2, AWS S3, Supabase Storage, and MinIO.
 * Supports direct browser presigned uploads, streaming downloads, metadata inspection, and local dev fallback.
 */

import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl?: string;
  forcePathStyle?: boolean;
}

export interface ObjectMetadata {
  size: number;
  contentType: string;
  lastModified?: Date;
  etag?: string;
  metadata?: Record<string, string>;
}

export class StorageProvider {
  private static instance: StorageProvider | null = null;
  private s3Client: S3Client | null = null;
  private config: StorageConfig;
  private isConfiguredS3: boolean = false;
  private localFallbackDir: string;

  constructor(customConfig?: Partial<StorageConfig>) {
    const bucket =
      customConfig?.bucket ||
      process.env.STORAGE_BUCKET ||
      process.env.S3_BUCKET ||
      process.env.R2_BUCKET ||
      '';

    const accessKeyId =
      customConfig?.accessKeyId ||
      process.env.STORAGE_ACCESS_KEY ||
      process.env.STORAGE_ACCESS_KEY_ID ||
      process.env.S3_ACCESS_KEY_ID ||
      process.env.R2_ACCESS_KEY_ID ||
      '';

    const secretAccessKey =
      customConfig?.secretAccessKey ||
      process.env.STORAGE_SECRET_KEY ||
      process.env.STORAGE_SECRET_ACCESS_KEY ||
      process.env.S3_SECRET_ACCESS_KEY ||
      process.env.R2_SECRET_ACCESS_KEY ||
      '';

    const endpoint =
      customConfig?.endpoint ||
      process.env.STORAGE_ENDPOINT ||
      process.env.S3_ENDPOINT ||
      process.env.R2_ENDPOINT ||
      '';

    const region =
      customConfig?.region ||
      process.env.STORAGE_REGION ||
      process.env.S3_REGION ||
      process.env.AWS_REGION ||
      'auto';

    const publicUrl =
      customConfig?.publicUrl ||
      process.env.STORAGE_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_STORAGE_URL ||
      '';

    const forcePathStyle =
      customConfig?.forcePathStyle ??
      (process.env.STORAGE_FORCE_PATH_STYLE === 'true' || Boolean(endpoint));

    this.config = {
      bucket,
      region,
      endpoint: endpoint || undefined,
      accessKeyId,
      secretAccessKey,
      publicUrl: publicUrl || undefined,
      forcePathStyle,
    };

    this.localFallbackDir = path.resolve(process.cwd(), 'data', 'storage');

    if (this.config.bucket) {
      const clientConfig: S3ClientConfig = {
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId || 'mock_access_key',
          secretAccessKey: this.config.secretAccessKey || 'mock_secret_key',
        },
        forcePathStyle: this.config.forcePathStyle,
      };

      if (this.config.endpoint) {
        clientConfig.endpoint = this.config.endpoint;
      }

      this.s3Client = new S3Client(clientConfig);
      this.isConfiguredS3 = true;
      console.log(`[StorageProvider] Configured S3 storage (bucket: ${this.config.bucket}, region: ${this.config.region})`);
    } else {
      this.isConfiguredS3 = false;
      if (!fs.existsSync(this.localFallbackDir)) {
        fs.mkdirSync(this.localFallbackDir, { recursive: true });
      }
      console.log(`[StorageProvider] Running in local filesystem mode (dir: ${this.localFallbackDir})`);
    }
  }

  public static getInstance(config?: Partial<StorageConfig>): StorageProvider {
    if (!StorageProvider.instance) {
      StorageProvider.instance = new StorageProvider(config);
    }
    return StorageProvider.instance;
  }

  public isCloudStorage(): boolean {
    return this.isConfiguredS3;
  }

  public getBucketName(): string {
    return this.config.bucket || 'local-storage';
  }

  /**
   * Resolves and verifies that a relative key is strictly contained within the storage root.
   * Prevents directory traversal attacks escaping the localFallbackDir.
   */
  public resolveContainedPath(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    const rootPath = path.resolve(this.localFallbackDir);
    const targetPath = path.resolve(rootPath, cleanKey);

    if (targetPath !== rootPath && !targetPath.startsWith(rootPath + path.sep)) {
      throw new Error(`Access denied: Storage key "${key}" escapes storage root directory`);
    }
    return targetPath;
  }

  /**
   * Upload data directly to storage.
   */
  public async upload(
    key: string,
    body: Buffer | Uint8Array | Readable | string,
    contentType?: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    const cleanKey = key.replace(/^\/+/, '');

    if (this.isConfiguredS3 && this.s3Client) {
      let uploadBody: any = body;
      if (typeof body === 'string') {
        uploadBody = Buffer.from(body);
      }

      const cmd = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: cleanKey,
        Body: uploadBody,
        ContentType: contentType || 'application/octet-stream',
        Metadata: metadata,
      });

      await this.s3Client.send(cmd);
      return this.getPublicOrDirectUrl(cleanKey);
    }

    // Local filesystem fallback
    const targetPath = this.resolveContainedPath(cleanKey);
    const parentDir = path.dirname(targetPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    if (body instanceof Readable) {
      const writeStream = fs.createWriteStream(targetPath);
      await new Promise((resolve, reject) => {
        body.pipe(writeStream);
        writeStream.on('finish', () => resolve(undefined));
        writeStream.on('error', reject);
      });
    } else {
      fs.writeFileSync(targetPath, body as any);
    }

    // Write metadata sidecar
    const metaPath = `${targetPath}.meta.json`;
    fs.writeFileSync(
      metaPath,
      JSON.stringify({
        contentType: contentType || 'application/octet-stream',
        size: fs.statSync(targetPath).size,
        lastModified: new Date().toISOString(),
        metadata: metadata || {},
      })
    );

    return `/data/storage/${cleanKey}`;
  }

  /**
   * Download an object to memory or optional local disk path.
   */
  public async download(key: string, destinationLocalPath?: string): Promise<Buffer> {
    const cleanKey = key.replace(/^\/+/, '');

    if (this.isConfiguredS3 && this.s3Client) {
      const cmd = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: cleanKey,
      });

      const response = await this.s3Client.send(cmd);
      if (!response.Body) {
        throw new Error(`Object ${cleanKey} returned an empty body`);
      }

      const chunks: Buffer[] = [];
      const stream = response.Body as Readable;

      const buffer = await new Promise<Buffer>((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });

      if (destinationLocalPath) {
        const destDir = path.dirname(destinationLocalPath);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.writeFileSync(destinationLocalPath, buffer);
      }

      return buffer;
    }

    // Local filesystem fallback
    const sourcePath = this.resolveContainedPath(cleanKey);
    if (!fs.existsSync(sourcePath)) {
      throw new Error(`Object not found on local disk: ${cleanKey}`);
    }

    const buffer = fs.readFileSync(sourcePath);
    if (destinationLocalPath && destinationLocalPath !== sourcePath) {
      const destDir = path.dirname(destinationLocalPath);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(destinationLocalPath, buffer);
    }

    return buffer;
  }

  /**
   * Delete an object and any metadata sidecar.
   */
  public async delete(key: string): Promise<void> {
    const cleanKey = key.replace(/^\/+/, '');

    if (this.isConfiguredS3 && this.s3Client) {
      const cmd = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: cleanKey,
      });
      await this.s3Client.send(cmd);
      return;
    }

    const targetPath = this.resolveContainedPath(cleanKey);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    const metaPath = `${targetPath}.meta.json`;
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }
  }

  /**
   * Check if an object exists in storage.
   */
  public async exists(key: string): Promise<boolean> {
    const cleanKey = key.replace(/^\/+/, '');

    if (this.isConfiguredS3 && this.s3Client) {
      try {
        const cmd = new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: cleanKey,
        });
        await this.s3Client.send(cmd);
        return true;
      } catch (err: any) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
          return false;
        }
        throw err;
      }
    }

    const targetPath = this.resolveContainedPath(cleanKey);
    return fs.existsSync(targetPath);
  }

  /**
   * Generate a presigned URL for direct browser PUT upload.
   * Browser uploads directly to S3 without sending media bytes through Vercel!
   */
  public async getSignedUploadUrl(
    key: string,
    contentType: string = 'video/mp4',
    expiresInSeconds: number = 3600
  ): Promise<string> {
    const cleanKey = key.replace(/^\/+/, '');

    if (this.isConfiguredS3 && this.s3Client) {
      const cmd = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: cleanKey,
        ContentType: contentType,
      });

      return await getSignedUrl(this.s3Client, cmd, { expiresIn: expiresInSeconds });
    }

    // Local fallback: returns local API endpoint path where server receives upload
    return `/api/media/upload-direct?key=${encodeURIComponent(cleanKey)}`;
  }

  /**
   * Generate a presigned URL for secure object download.
   */
  public async getSignedDownloadUrl(
    key: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    const cleanKey = key.replace(/^\/+/, '');

    if (this.isConfiguredS3 && this.s3Client) {
      const cmd = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: cleanKey,
      });

      return await getSignedUrl(this.s3Client, cmd, { expiresIn: expiresInSeconds });
    }

    if (this.config.publicUrl) {
      return `${this.config.publicUrl.replace(/\/+$/, '')}/${cleanKey}`;
    }

    return `/data/storage/${cleanKey}`;
  }

  /**
   * Unified signed URL generator conforming to StorageProvider contract.
   */
  public async getSignedUrl(
    key: string,
    operation: 'get' | 'put' = 'get',
    expiresInSeconds: number = 3600
  ): Promise<string> {
    if (operation === 'put') {
      return this.getSignedUploadUrl(key, 'application/octet-stream', expiresInSeconds);
    }
    return this.getSignedDownloadUrl(key, expiresInSeconds);
  }

  /**
   * Retrieve validated object metadata (size, mime type, last modified).
   */
  public async getObjectMetadata(key: string): Promise<ObjectMetadata | null> {
    const cleanKey = key.replace(/^\/+/, '');

    if (this.isConfiguredS3 && this.s3Client) {
      try {
        const cmd = new HeadObjectCommand({
          Bucket: this.config.bucket,
          Key: cleanKey,
        });
        const res = await this.s3Client.send(cmd);
        return {
          size: res.ContentLength || 0,
          contentType: res.ContentType || 'application/octet-stream',
          lastModified: res.LastModified,
          etag: res.ETag,
          metadata: res.Metadata,
        };
      } catch (err: any) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
          return null;
        }
        throw err;
      }
    }

    const targetPath = this.resolveContainedPath(cleanKey);
    if (!fs.existsSync(targetPath)) {
      return null;
    }

    const stats = fs.statSync(targetPath);
    let meta: any = {};
    const metaPath = `${targetPath}.meta.json`;
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      } catch {}
    }

    return {
      size: stats.size,
      contentType: meta.contentType || 'application/octet-stream',
      lastModified: stats.mtime,
      metadata: meta.metadata,
    };
  }

  public getPublicOrDirectUrl(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    if (this.config.publicUrl) {
      return `${this.config.publicUrl.replace(/\/+$/, '')}/${cleanKey}`;
    }
    if (this.config.endpoint) {
      return `${this.config.endpoint.replace(/\/+$/, '')}/${this.config.bucket}/${cleanKey}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${cleanKey}`;
  }
}
