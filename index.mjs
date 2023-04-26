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
import {EC2Client, RunInstancesCommand, TerminateInstancesCommand, DescribeInstancesCommand, StartInstancesCommand } from "@aws-sdk/client-ec2";
import * as fs from "fs"


const BUCKET_NAME = 'twitchtrackerbucket';
const OBJECT_KEY = 'streamer-state.json';

const webhookClient = new WebhookClient({ url: 'https://discord.com/api/webhooks/1100451423478628442/yqIzp1ov9D-zAMlRSa3MP2t4RIeq3NTgrRXaQS3ouBZk8epvHXsMiy68lW-Z5z2P8Pt2' });

const ec2Client = new EC2Client()
const s3Client = new S3Client({region: "us-east-1"})

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


async function createInstance() {
  const command = new RunInstancesCommand({
    // Your key pair name.
    // Your security group.
    SecurityGroupIds: ["sg-00a91da32de8b4d65"],
    // An x86_64 compatible image.
    ImageId: "ami-02396cdd13e9a1257",
    // An x86_64 compatible free-tier instance type.
    InstanceType: "t2.micro",
    // Ensure only 1 instance launches.
    MinCount: 1,
    MaxCount: 1,
    UserData: fs.readFileSync("TwitchLiveTracker/userdata.sh", {encoding: 'base64'}),
    TagSpecifications: [
        {
            ResourceType: "instance",
            'Tags': [
                {
                    'Key': 'Name',
                    'Value': 'PaceManBot'
                },
            ]
        },
    ]
  });

  try {
    const response = await ec2Client.send(command);
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
    const stopCommand = new TerminateInstancesCommand({ InstanceIds: instanceIds });
    const stopResult = await ec2Client.send(stopCommand);
    const stoppingInstances = stopResult.TerminatingInstances.map(instance => instance.InstanceId);

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
        await createInstance()
        await updateState({ isLive: true, instanceId: null })
      }
      else {
        console.log("No instances has been created")
      }

      console.log("streamer is live")
      
      return true
  }
  else {
    console.log("streamer is not live")
    if(state.isLive == true) {
      await stopInstancesByTag("Name", "PaceManBot")
      await updateState({ isLive: false, instanceId: null })
    }
    
    return false
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