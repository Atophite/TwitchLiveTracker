import {StopInstancesCommand, DescribeInstancesCommand, StartInstancesCommand } from "@aws-sdk/client-ec2";
import { DisableRuleCommand, EnableRuleCommand } from "@aws-sdk/client-eventbridge";
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

async function sendLiveNotification(channelName) {
  try {
    await clients.getWebHookClient().send({
      content: `${channelName} is live Pog!`
    });
    console.log("live notification sent")
  }
  catch(err) {
    console.log(err)
  }
  
  
}

async function sendGameNotification(channelName, gameName) {
  try {
    await clients.getWebHookClient().send({
      content: `${channelName} is playing ${gameName} Pog!`
    });
    console.log("game notification sent")
  }
  catch(err) {
    console.log(err)
  }
  
}

async function checkLive() {
  const DBData = await database.getDataFromDB()
  const channelNames = DBData.flatMap((obj) => obj.streamer)
  const isLive = await twitch.checkLive(channelNames)

  for(let dbItem of DBData) {

    for (const obj of isLive) {
      if(obj.streamer === dbItem.streamer) {
        if(obj.is_live === true) {
          
          if(dbItem.is_live === false) {
            await database.updateLiveState(dbItem.streamer, true)
            if(dbItem.live_message === true) {
              await sendLiveNotification(dbItem.streamer);
            }
          }
          else {
            console.log(obj.streamer + " is live but DB is up to date")
          }
        }
        else if(obj.is_live === false) {
          if(dbItem.is_live === true) {
            console.log("updating live state of " + dbItem.streamer)
            await database.updateLiveState(dbItem.streamer, false)
            
          }
          if(dbItem.is_playing !== "Nothing") {
            await database.updateIsPlayingState(dbItem.streamer, "Nothing")
          }
        }
      }

      

      const isPlayingGameFromDB = dbItem.games.includes(obj.is_playing)

      if(dbItem.streamer === obj.streamer && dbItem.is_playing !== obj.is_playing && obj.is_live === true) {
        if(isPlayingGameFromDB) {
          await sendGameNotification(obj.streamer, obj.is_playing);
        }
        await database.updateIsPlayingState(obj.streamer, obj.is_playing)
      }
    }
  }
  return "checked if streamers are live"
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
  const response = {
      statusCode: 200,
      status: await checkLive()
  };
  return response;
};
