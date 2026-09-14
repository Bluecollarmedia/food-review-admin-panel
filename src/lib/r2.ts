import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// R2 (S3-compatible) object storage — same bucket as the main site. Set these
// env vars in the admin app's deploy to the same values the main site uses:
//   R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
//   NEXT_PUBLIC_R2_PUBLIC_BASE_URL (public read URL, used by getPublicFileUrl)
function client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

const BUCKET = process.env.R2_BUCKET_NAME!;

export async function getUploadUrl(key: string, contentType: string, cacheControl?: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    ...(cacheControl ? { CacheControl: cacheControl } : {}),
  });
  return getSignedUrl(client(), command, { expiresIn: 60 * 10 });
}

export async function deleteFile(key: string) {
  await client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** Server-side upload of a buffer (used for appeal selfies). */
export async function putObject(key: string, body: Uint8Array, contentType: string) {
  await client().send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType })
  );
}

export type BucketFile = { key: string; size: number; lastModified: string };

export async function listFiles(prefix: string): Promise<BucketFile[]> {
  const files: BucketFile[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await client().send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (!obj.Key) continue;
      files.push({
        key: obj.Key,
        size: obj.Size ?? 0,
        lastModified: (obj.LastModified ?? new Date()).toISOString(),
      });
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return files;
}
