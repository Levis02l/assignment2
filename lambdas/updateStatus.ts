import { SNSEvent } from 'aws-lambda';
import { DynamoDBClient }        from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

interface ReviewMsg {
  id: string;
  date: string;
  update: {
    status: 'Pass' | 'Reject';
    reason: string;
  };
}

export const handler = async (event: SNSEvent) => {
  for (const record of event.Records) {
    const msg = JSON.parse(record.Sns.Message) as ReviewMsg;

    console.log(`Review for ${msg.id}: ${msg.update.status} because "${msg.update.reason}"`);

  
    await ddb.send(new UpdateCommand({
      TableName: process.env.TABLE_NAME!,
      Key: { id: msg.id },
      UpdateExpression: 'SET #st = :s, #rs = :r',
      ExpressionAttributeNames: {
        '#st': 'status',
        '#rs': 'reason',
      },
      ExpressionAttributeValues: {
        ':s': msg.update.status,
        ':r': msg.update.reason,
      },
    }));


    await sns.send(new PublishCommand({
      TopicArn: process.env.TOPIC_ARN!,
      Message: JSON.stringify({ id: msg.id, status: msg.update.status }),
      MessageAttributes: {
        event_type: {
          DataType: 'String',
          StringValue: 'StatusUpdated',
        },
      },
    }));

    console.log(`Published StatusUpdated for ${msg.id}`);
  }
};
