import { GetItemCommand, UpdateItemCommand, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb"

import * as clients from "./clients.mjs"

async function test() {
    const input = {
        TableName: "twitch_live_tracker"
    }

    const command = new ScanCommand(input);
    let response = await clients.getDynamoClient().send(command)

    //Convert dynamodb json to json
    const newResponse = response.Items.map(
        (item) => unmarshall(item)
    )
    console.log(newResponse)
    return response
}

async function getDataFromDB() {
    const input = {
        TableName: "twitch_live_tracker"
    }

    const command = new ScanCommand(input);
    const response = await clients.getDynamoClient().send(command)

    //Convert dynamodb json to json
    const newResponse = response.Items.map(
        (item) => unmarshall(item)
    )
    return newResponse
}

async function updateIsPlayingState(streamer, isPlaying) {
    const input = {
        ExpressionAttributeNames: {
            "#ip": "is_playing"
        },
        ExpressionAttributeValues: {
            ":ip": {
                "S": isPlaying
            }
        },
        TableName: "twitch_live_tracker",
        Key: {
            streamer: {
                S: streamer
            }
        },
        ReturnValues: "ALL_NEW",
        UpdateExpression: "SET #ip = :ip"
    }
    try {
        const command = new UpdateItemCommand(input);
        const response = await clients.getDynamoClient().send(command)
        console.log(`DB changed streamer ${streamer}, now playing: ${isPlaying}`)
    }
    catch(err) {
        console.log(err)
    }
    
}

async function updateLiveState(streamer, isLive) {
    const input = {
        ExpressionAttributeNames: {
            "#il": "is_live"
        },
        ExpressionAttributeValues: {
            ":l": {
                "BOOL": isLive
            }
        },
        TableName: "twitch_live_tracker",
        Key: {
            streamer: {
                S: streamer
            }
        },
        ReturnValues: "ALL_NEW",
        UpdateExpression: "SET #il = :l"
    }
    try {
        const command = new UpdateItemCommand(input);
        const response = await clients.getDynamoClient().send(command)
        console.log(`DB changed live state of ${streamer}, live: ${isLive}`)
    }
    catch(err) {
        console.log(err)
    }
    
}


export {updateLiveState, updateIsPlayingState, getDataFromDB}