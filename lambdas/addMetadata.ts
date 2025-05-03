import { SNSEvent } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export const handler = async (event: SNSEvent) => {
  for (const record of event.Records) {
    const msg = JSON.parse(record.Sns.Message);
    const metadataType = record.Sns.MessageAttributes['metadata_type'].Value!;
    console.log(`Adding metadata ${metadataType}=${msg.value} to ${msg.id}`);
    await ddb.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME!,
      Key: { id: msg.id },
      UpdateExpression: 'SET #m = :v',
      ExpressionAttributeNames: { '#m': metadataType },
      ExpressionAttributeValues: { ':v': msg.value },
    }));
    console.log(`Updated ${msg.id} with ${metadataType} = ${msg.value}`);
  }
};
