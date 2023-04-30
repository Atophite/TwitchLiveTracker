import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";

import * as clients from "./clients.mjs"

async function updateIsPlayingState(isPlaying) {
    const input = {
        ExpressionAttributeNames: {
            "#ip": "is_playing"
        },
        ExpressionAttributeValues: {
            ":ip": {
                "S": isPlaying
            }
        },
        TableName: "twitch_islive_table",
        Key: {
            id: {
                N: "0"
            }
        },
        ReturnValues: "ALL_NEW",
        UpdateExpression: "SET #ip = :ip"
    }
    const command = new UpdateItemCommand(input);
    const response = await clients.getDynamoClient().send(command)
    console.log(response)
}

async function getIsPlayingFromDB() {
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
    const isPlaying = response.Item.is_playing.S
    console.log("Is Playing: " + isPlaying)
    return isPlaying
}

async function getIsLiveFromDB() {
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
    console.log("Is live: " + isLive)
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

export {updateLiveState, getIsLiveFromDB, updateIsPlayingState, getIsPlayingFromDB}