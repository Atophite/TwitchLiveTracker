
import { EC2Client, RunInstancesCommand, StopInstancesCommand, TerminateInstancesCommand, DescribeInstancesCommand, StartInstancesCommand } from "@aws-sdk/client-ec2";
import { EventBridgeClient, DisableRuleCommand, EnableRuleCommand } from "@aws-sdk/client-eventbridge";
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { EmbedBuilder, WebhookClient } from 'discord.js';

export let ec2Client
export let s3Client
export let eventClient
export let dynamoClient
export let webhookClient

function getEc2Client() {
    if (ec2Client == null) {
        ec2Client = new EC2Client()
    }
    return ec2Client
}

// Function to create an EventBridge client
function getEventClient() {
    if (eventClient == null) {
        eventClient = new EventBridgeClient()
    }
    return eventClient
}

// Function to create a DynamoDB client
function getDynamoClient() {
    if (dynamoClient == null) {
        dynamoClient = new DynamoDBClient()
    }
    return dynamoClient
}

function getWebHookClient() {
    if(webhookClient == null) {
        webhookClient = new WebhookClient({ url: 'https://discord.com/api/webhooks/1100451423478628442/yqIzp1ov9D-zAMlRSa3MP2t4RIeq3NTgrRXaQS3ouBZk8epvHXsMiy68lW-Z5z2P8Pt2' });
    }
    return webhookClient
}


export {getDynamoClient, getEc2Client, getEventClient, getWebHookClient}

