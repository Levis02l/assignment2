## Distributed Systems - Event-Driven Architecture.

__Name:__ Haiqing Ji 20109223

__Demo__: https://youtu.be/xHiCKVoLOBo

This repository contains the implementation of a skeleton design for an application that manages a photo gallery, illustrated below. The app uses an event-driven architecture and is deployed on the AWS platform using the CDK framework for infrastructure provisioning.

![](./images/arch.png)

### Code Status.

Photographer features:
Log new Images
When a user uploads a .jpeg or .png file to S3, an S3→SQS notification triggers the LogImage Lambda, which writes a new item (with the image’s filename as the key) into DynamoDB. Any other file types cause the function to throw an error, routing the event to the DLQ.
Status: Completed & Tested

Metadata updating
The photographer can send metadata messages (caption, date, or name) via SNS with a metadata_type attribute. The SNS Topic forwards only those messages to the AddMetadata Lambda (filter policy on metadata_type), which updates the corresponding DynamoDB item.
Status: Completed & Tested

Invalid image removal
Messages that fail in LogImage go to the DLQ. The RemoveImage Lambda polls the DLQ, reads the event, and deletes the invalid object from the S3 bucket.
Status: Completed & Tested

Status Update Mailer
After a moderator updates an image’s status, the system publishes a second SNS message with an event_type of StatusUpdated. The ConfirmMailer Lambda subscribes only to that event, and sends a confirmation email via SES to the photographer.
Status: Completed & Tested


Moderator features:
Status updating
A moderator sends a review message (no message attribute) via SNS with a metadata_type of StatusUpdate. The UpdateStatus Lambda receives it (filter policy on metadata_type), writes the status and reason into DynamoDB, then publishes its own StatusUpdated SNS event for the mailer.
Status: Completed & Tested



__Feature:__

**Photographer**  
- Log new Images – Completed & Tested (10 marks)  
- Metadata updating – Completed & Tested (10 marks)  
- Invalid image removal – Completed & Tested (10 marks)  
- Status Update Mailer – Completed & Tested (10 marks)  

**Moderator**  
- Status updating – Completed & Tested (10 marks)  

**Cross-cutting**  
- Filtering (SNS subscription filter policies) – Completed & Tested (40 marks)  
- Messaging (end-to-end event flow) – Completed & Tested (10 marks)  

