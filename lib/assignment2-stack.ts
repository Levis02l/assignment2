import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as iam from 'aws-cdk-lib/aws-iam';

export class Assignment2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'ImageTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const bucket = new s3.Bucket(this, 'PhotoStorage', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    const dlq = new sqs.Queue(this, 'ImageDLQ', {
      retentionPeriod: cdk.Duration.days(1),
    });

    const mainQueue = new sqs.Queue(this, 'ImageQueue', {
      receiveMessageWaitTime: cdk.Duration.seconds(5),
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 3,
      },
    });

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SqsDestination(mainQueue)
    );

    const logImageFn = new NodejsFunction(this, 'LogImageFn', {
      entry: `${__dirname}/../lambdas/logImage.ts`,
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: table.tableName,
        BUCKET_NAME: bucket.bucketName,
      },
    });
    logImageFn.addEventSource(new SqsEventSource(mainQueue, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(5),
    }));
    table.grantReadWriteData(logImageFn);
    bucket.grantRead(logImageFn);

    const removeImageFn = new NodejsFunction(this, 'RemoveImageFn', {
      entry: `${__dirname}/../lambdas/removeImage.ts`,
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });
    removeImageFn.addEventSource(new SqsEventSource(dlq, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(5),
    }));
    bucket.grantReadWrite(removeImageFn);

    const topic = new sns.Topic(this, 'ImageEventsTopic');

    topic.addSubscription(new subs.SqsSubscription(mainQueue));

    const addMetaFn = new NodejsFunction(this, 'AddMetadataFn', {
      entry: `${__dirname}/../lambdas/addMetadata.ts`,
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: table.tableName,
      },
    });
    topic.addSubscription(new subs.LambdaSubscription(addMetaFn, {
      filterPolicy: {
        metadata_type: sns.SubscriptionFilter.stringFilter({ allowlist: ['Caption', 'Date', 'name'] }),
      },
    }));
    table.grantReadWriteData(addMetaFn);

    const updateStatusFn = new NodejsFunction(this, 'UpdateStatusFn', {
      entry: `${__dirname}/../lambdas/updateStatus.ts`,
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: table.tableName,
        TOPIC_ARN: topic.topicArn,
      },
    });
    topic.addSubscription(new subs.LambdaSubscription(updateStatusFn, {
      filterPolicy: {
        metadata_type: sns.SubscriptionFilter.existsFilter(),
      },
    }));
    table.grantReadWriteData(updateStatusFn);
    topic.grantPublish(updateStatusFn);

    new cdk.CfnOutput(this, 'BucketName', { value: bucket.bucketName });
    new cdk.CfnOutput(this, 'QueueUrl', { value: mainQueue.queueUrl });
    new cdk.CfnOutput(this, 'DLQUrl', { value: dlq.queueUrl });
    new cdk.CfnOutput(this, 'TableName', { value: table.tableName });
    new cdk.CfnOutput(this, 'TopicArn', { value: topic.topicArn });
  }
}
