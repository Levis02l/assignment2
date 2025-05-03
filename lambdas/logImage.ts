import { SQSHandler, SQSRecord } from 'aws-lambda';
import { DynamoDBClient }        from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const validSuffix = ['.png', '.jpeg'];

export const handler: SQSHandler = async (event) => {
  for (const rec of event.Records) {

    const s3Event = JSON.parse(rec.body);
    for (const r of s3Event.Records) {
      const key = decodeURIComponent(r.s3.object.key.replace(/\+/g, ' '));
      const valid = validSuffix.some(sfx => key.toLowerCase().endsWith(sfx));
      if (!valid) {
        console.log(`Invalid suffix for ${key}, throwing to DLQ`);
        throw new Error(`Unsupported file type: ${key}`);
      }

      await ddb.send(new PutCommand({
        TableName: process.env.TABLE_NAME!,
        Item: { id: key },
      }));
      console.log(`Logged image ${key}`);
    }
  }
};
