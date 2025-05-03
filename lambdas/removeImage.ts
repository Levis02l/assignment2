import { SQSHandler }           from 'aws-lambda';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({});

export const handler: SQSHandler = async (event) => {
  for (const rec of event.Records) {
    const s3Event = JSON.parse(rec.body);
    for (const r of s3Event.Records) {
      const key = decodeURIComponent(r.s3.object.key.replace(/\+/g, ' '));
      console.log(`Removing invalid file: ${key}`);
      await s3.send(new DeleteObjectCommand({
        Bucket: process.env.BUCKET_NAME!,
        Key:    key,
      }));
    }
  }
};
