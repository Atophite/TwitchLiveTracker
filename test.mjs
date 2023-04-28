import fetch, {
  Blob,
  blobFrom,
  blobFromSync,
  File,
  fileFrom,
  fileFromSync,
  FormData,
  Headers,
  Request,
  Response,
} from 'node-fetch'

import { EmbedBuilder, WebhookClient } from 'discord.js';
import {S3Client, GetObjectCommand, PutObjectCommand} from "@aws-sdk/client-s3";
import {EC2Client, RunInstancesCommand, StopInstancesCommand, TerminateInstancesCommand, DescribeInstancesCommand, StartInstancesCommand } from "@aws-sdk/client-ec2";
import { EventBridgeClient, DisableRuleCommand, EnableRuleCommand } from "@aws-sdk/client-eventbridge";
import * as fs from "fs"


const BUCKET_NAME = 'twitchtrackerbucket';
const OBJECT_KEY = 'streamer-state.json';

const webhookClient = new WebhookClient({ url: 'https://discord.com/api/webhooks/1100451423478628442/yqIzp1ov9D-zAMlRSa3MP2t4RIeq3NTgrRXaQS3ouBZk8epvHXsMiy68lW-Z5z2P8Pt2' });

const ec2Client = new EC2Client()
const s3Client = new S3Client({region: "us-east-1"})
const eventClient = new EventBridgeClient();

async function getState() {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: OBJECT_KEY,
  });
  try {
    const response = await s3Client.send(command);
    // The Body object also has 'transformToByteArray' and 'transformToWebStream' methods.
    const str = await response.Body.transformToString();
    console.log(str)

    return JSON.parse(str)
  } catch (err) {
    console.error(err);
  }

}

async function updateState(newState) {

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: OBJECT_KEY,
    Body: JSON.stringify(newState),
  });

  try {
    const response = await s3Client.send(command);
    console.log(response);
  } catch (err) {
    console.error(err);
  }
}


async function startInstanceByTag(tagName, tagValue) {
  const describeCommand = new DescribeInstancesCommand({
    Filters: [
        { Name: `tag:${tagName}`, Values: [tagValue] },
        { Name: 'instance-state-name', Values: ['stopped'] }
    ]
  });
  const describeResult = await ec2Client.send(describeCommand);
  const instanceIds = describeResult.Reservations.flatMap(reservation => reservation.Instances.map(instance => instance.InstanceId));
  
  const startCommand = new StartInstancesCommand({
    
    InstanceIds: instanceIds
 
  });

  try {
    const response = await ec2Client.send(startCommand);
    console.log(response);
  } catch (err) {
    console.error(err);
  }
}

async function stopInstancesByTag(tagName, tagValue) {
  try {
    // First, get the instance IDs that match the specified tag
    const describeCommand = new DescribeInstancesCommand({
        Filters: [
            { Name: `tag:${tagName}`, Values: [tagValue] },
            { Name: 'instance-state-name', Values: ['running', 'pending'] } // Only get instances in running or pending state
        ]
    });
    const describeResult = await ec2Client.send(describeCommand);
    const instanceIds = describeResult.Reservations.flatMap(reservation => reservation.Instances.map(instance => instance.InstanceId));

    // If there are no instances with the specified tag, log an error message and return
    if (instanceIds.length === 0) {
        console.log(`No instances found with tag "${tagName}": "${tagValue}"`);
        return;
    }

    // Stop the instances with the retrieved instance IDs
    const stopCommand = new StopInstancesCommand({ InstanceIds: instanceIds });
    const stopResult = await ec2Client.send(stopCommand);
    const stoppingInstances = stopResult.StoppingInstances.map(instance => instance.InstanceId);

    console.log(`Stopping instances: ${stoppingInstances.join(", ")}`);
  } catch (err) {
      console.error(err);
  }
}

function sendNotification(channelName) {
  webhookClient.send({
    content: `${channelName} is live Pog!`
  });
  console.log("discord notification sent")
}

async function checkLive(channelName){
  let url = await fetch(`https://www.twitch.tv/${channelName}`);
  const state = await getState()


  if((await url.text()).includes('isLiveBroadcast') ) {

      if(state.isLive == false) {
        sendNotification(channelName);
        await startInstanceByTag("Name", "PaceManBot")
        await updateState({ isLive: true, instanceId: null })
        await disable5MinRule()
        await enable30MinRule()
      }
      else {
        console.log("No instances has been started")
      }

      console.log("streamer is live")
      
      return true
  }
  else {
    console.log("streamer is not live")
    if(state.isLive == true) {
      await stopInstancesByTag("Name", "PaceManBot")
      await updateState({ isLive: false, instanceId: null })
      await enable5MinRule()
      await disable30MinRule()
    }
    
    return false
  }

}

async function disable5MinRule() {
  const input = { // DisableRuleRequest
    Name: "every5MinRule", // required
  };
  const command = new DisableRuleCommand(input);

  try {
    const response = await eventClient.send(command);
    console.log(response);
  } catch (err) {
    console.error(err);
  }
}

async function enable5MinRule() {
  const input = { // DisableRuleRequest
    Name: "every5MinRule", // required
  };
  const command = new EnableRuleCommand(input);
  try {
    const response = await eventClient.send(command);
    console.log(response);
  } catch (err) {
    console.error(err);
  }
}

async function disable30MinRule() {
  const input = { // DisableRuleRequest
    Name: "every30MinRule", // required
  };
  const command = new DisableRuleCommand(input);
  try {
    const response = await eventClient.send(command);
    console.log(response);
  } catch (err) {
    console.error(err);
  }
}

async function enable30MinRule() {
  const input = { // DisableRuleRequest
    Name: "every30MinRule", // required
  };
  const command = new EnableRuleCommand(input);
  try {
    const response = await eventClient.send(command);
    console.log(response);
  } catch (err) {
    console.error(err);
  }
}

export const handler = async(event) => {

  let isLiveBoolean = await checkLive(event['streamer'])
  let streamerString = event['streamer']

  const response = {
      statusCode: 200,
      isLive: isLiveBoolean,
      streamer: streamerString
  };
  return response;
};

async function main() {
  const describeCommand = new DescribeInstancesCommand({
    Filters: [
        { Name: `tag:Name`, Values: ["PaceManBot"] },
        { Name: 'instance-state-name', Values: ['stopped'] }
    ]
  });
  const describeResult = await ec2Client.send(describeCommand);
  console.log(describeResult.Reservations[1].Instances)
}

await main()