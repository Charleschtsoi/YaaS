import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config.js";

let s3: S3Client | null = null;

function getS3(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      region: "auto",
      endpoint: `https://${config.r2.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }
  return s3;
}

export async function uploadProof(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  if (!config.r2.accessKeyId || config.isDev) {
    const localUrl = `${config.publicApiUrl}/proofs/${key}`;
    await saveLocalProof(key, body);
    return localUrl;
  }

  await getS3().send(
    new PutObjectCommand({
      Bucket: config.r2.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return config.r2.publicUrl
    ? `${config.r2.publicUrl}/${key}`
    : await getSignedProofUrl(key);
}

export async function getSignedProofUrl(key: string): Promise<string> {
  if (!config.r2.accessKeyId) {
    return `${config.publicApiUrl}/proofs/${key}`;
  }

  return getSignedUrl(
    getS3(),
    new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }),
    { expiresIn: 3600 }
  );
}

const localProofs = new Map<string, Buffer>();

export async function saveLocalProof(key: string, body: Buffer): Promise<void> {
  localProofs.set(key, body);
}

export function getLocalProof(key: string): Buffer | undefined {
  return localProofs.get(key);
}
