import { SNSEvent } from 'aws-lambda';
import { SESClient, SendEmailCommand, SendEmailCommandInput } from '@aws-sdk/client-ses';

const ses = new SESClient({ region: process.env.SES_REGION });

export const handler = async (event: SNSEvent) => {
  for (const record of event.Records) {
    const msg = JSON.parse(record.Sns.Message) as { id: string; status: string };
    console.log(`ConfirmMailer received StatusUpdated for ${msg.id}: ${msg.status}`);

    const params: SendEmailCommandInput = {
      Source: process.env.SES_EMAIL_FROM!,
      Destination: { ToAddresses: [process.env.SES_EMAIL_TO!] },
      Message: {
        Subject: { Data: `Your photo ${msg.id} status updated` },
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: `<p>Your photo <b>${msg.id}</b> has been <b>${msg.status}</b>.</p>`,
          },
        },
      },
    };

    await ses.send(new SendEmailCommand(params));
    console.log(`Email sent to ${process.env.SES_EMAIL_TO}`);
  }
};
