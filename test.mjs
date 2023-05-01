import fetch from 'node-fetch'

import {EC2Client, RunInstancesCommand, StopInstancesCommand, TerminateInstancesCommand, DescribeInstancesCommand, StartInstancesCommand } from "@aws-sdk/client-ec2";
import { EventBridgeClient, DisableRuleCommand, EnableRuleCommand } from "@aws-sdk/client-eventbridge";
import * as clients from "./clients.mjs" 
import * as twitch from "./twitch.mjs"
import * as database from "./database.mjs"

async function startInstanceByTag(tagName, tagValue) {
  const describeCommand = new DescribeInstancesCommand({
    Filters: [
        { Name: `tag:${tagName}`, Values: [tagValue] },
        { Name: 'instance-state-name', Values: ['stopped', 'running'] }
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
  clients.getWebHookClient().send({
    content: `${channelName} is live Pog!`
  });
  console.log("discord notification sent")
}

async function checkLive(channelName) {
  const isLiveFromDB = await database.getIsLiveFromDB()
  const isPlayingFromDB = await database.getIsPlayingFromDB()

  const isLiveAndMinecraft = await twitch.checkLiveAndMinecraft(channelName)
  const isLive = await twitch.checkLive(channelName)


  if(isLive) {
    if(isLiveFromDB == false) {
      await database.updateLiveState(true)
      sendNotification(channelName);
    }
  }

  if(isLiveAndMinecraft == true) {
    if(isPlayingFromDB != "Minecraft") {
      await startInstanceByTag("Name", "PaceManBot")
      await database.updateIsPlayingState("Minecraft")
      await disable5MinRule()
      await enable30MinRule()
    }
    else {
      console.log("No instances has been started")
    }
    
    
  }
  else if(isLiveAndMinecraft == false) {
    if(isPlayingFromDB == "Minecraft") {
      await stopInstancesByTag("Name", "PaceManBot")
      await database.updateIsPlayingState("Not Minecraft")
      await enable5MinRule()
      await disable30MinRule()
    }
  }

  if(isLive == false) {
    await database.updateLiveState(false)
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

async function main() {
  let isLiveBoolean = await checkLive('xqc')
  let streamerString = 'xqc'

  const response = {
      statusCode: 200,
      isLive: isLiveBoolean,
      streamer: streamerString
  };
  return response;
}

await main()
