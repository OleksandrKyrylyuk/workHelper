import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import s3 from '../../config/s3.config.js';

export async function getSignedS3Url(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key,
    });
    return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}
