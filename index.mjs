import fetch from 'node-fetch'

import { EmbedBuilder, WebhookClient } from 'discord.js';
import {EC2Client, RunInstancesCommand, StopInstancesCommand, TerminateInstancesCommand, DescribeInstancesCommand, StartInstancesCommand } from "@aws-sdk/client-ec2";
import { EventBridgeClient, DisableRuleCommand, EnableRuleCommand } from "@aws-sdk/client-eventbridge";
import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import * as clients from "./clients.mjs" 

const webhookClient = new WebhookClient({ url: 'https://discord.com/api/webhooks/1100451423478628442/yqIzp1ov9D-zAMlRSa3MP2t4RIeq3NTgrRXaQS3ouBZk8epvHXsMiy68lW-Z5z2P8Pt2' });

async function getIsLive() {
  const input = {
      TableName: "twitch_islive_table",
      Key: {
          id: {
              N: "0"
          },

      }
  }

  const command = new GetItemCommand(input);
  const response = await clients.getDynamoClient().send(command)
  const isLive = response.Item.is_live.BOOL
  console.log(response.Item)
  return isLive
}

async function updateLiveState(isLive) {
  const input = {
      ExpressionAttributeNames: {
          "#il": "is_live"
      },
      ExpressionAttributeValues: {
          ":l": {
              "BOOL": isLive
          }
      },
      TableName: "twitch_islive_table",
      Key: {
          id: {
              N: "0"
          }
      },
      ReturnValues: "ALL_NEW",
      UpdateExpression: "SET #il = :l"
  }
  const command = new UpdateItemCommand(input);
  const response = await clients.getDynamoClient().send(command)
  console.log(response)
}

async function startInstanceByTag(tagName, tagValue) {
  const describeCommand = new DescribeInstancesCommand({
    Filters: [
        { Name: `tag:${tagName}`, Values: [tagValue] },
        { Name: 'instance-state-name', Values: ['stopped'] }
    ]
  });
  
  const describeResult = await clients.getEc2Client().send(describeCommand)
  const instanceIds = describeResult.Reservations.flatMap(reservation => reservation.Instances.map(instance => instance.InstanceId));
  
  const startCommand = new StartInstancesCommand({
    
    InstanceIds: instanceIds
 
  });

  try {
    const response = await clients.getEc2Client().send(startCommand)
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
    const describeResult = await clients.getEc2Client().send(describeCommand)
    const instanceIds = describeResult.Reservations.flatMap(reservation => reservation.Instances.map(instance => instance.InstanceId));

    // If there are no instances with the specified tag, log an error message and return
    if (instanceIds.length === 0) {
        console.log(`No instances found with tag "${tagName}": "${tagValue}"`);
        return;
    }

    // Stop the instances with the retrieved instance IDs
    const stopCommand = new StopInstancesCommand({ InstanceIds: instanceIds });
    const stopResult = await clients.getEc2Client().send(stopCommand)
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
  const isLive = await getIsLive()


  if((await url.text()).includes('isLiveBroadcast') ) {

      if(isLive == false) {
        sendNotification(channelName);
        await startInstanceByTag("Name", "PaceManBot")
        await updateLiveState(true)
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
    if(isLive == true) {
      await stopInstancesByTag("Name", "PaceManBot")
      await updateLiveState(false)
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
    const response = await clients.getEventClient().send(command)
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
    const response = await clients.getEventClient().send(command)
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
    const response = await clients.getEventClient().send(command)
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
    const response = await clients.getEventClient().send(command)
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