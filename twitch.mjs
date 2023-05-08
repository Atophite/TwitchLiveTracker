import { UpdateFunctionConfigurationCommand } from "@aws-sdk/client-lambda";
import * as clients from "./clients.mjs"
import axios from 'axios'

const CLIENT_ID = 'zqv4fz357qsybstqgajj9o5sne13wm'
const CLIENT_SECRET = 'om975ve8kh10nvt3982hqbbhqdsh8d'
let CLIENT_TOKEN = 'vwmhoyorlzf88fnign8tig1sbf4ell'
const GRANT_TYPE = "client_credentials";

function validateToken() {
  return axios.get('https://id.twitch.tv/oauth2/validate', {
      headers: {
          Authorization: "Bearer " + CLIENT_TOKEN
      }
  })
  .then(response => response.data)
  .then((data) => {
      if(data.expires_in < 10000 || data.status == 401) {
          //renew token
          console.log("generating new token")
          generateToken()
          return true
      }
      else {
          console.log("token still valid")
          return true
      }
  })
  .catch(error => {
      console.log(error)
      return false
  });
}

function generateToken() {
    const url = new URL("https://id.twitch.tv/oauth2/token");
    url.searchParams.set("client_id", CLIENT_ID);
    url.searchParams.set("client_secret", CLIENT_SECRET);
    url.searchParams.set("grant_type", GRANT_TYPE);
  
    return axios.get(url)
      .then((response) => response.data)
      .then((data) => {
        updateClientToken(data.access_token)
        CLIENT_TOKEN = data.access_token
        console.log(data);
        return CLIENT_TOKEN
      })
      .catch((error) => console.error(error));
}

function checkLive(channelName) {
    const endpoint = `https://api.twitch.tv/helix/streams?user_login=${channelName}`;

    if(!validateToken()) {
        return false
    }
    
    return axios.get(endpoint, {
      headers: {
        "Client-ID": CLIENT_ID,
        "Authorization": "Bearer vwmhoyorlzf88fnign8tig1sbf4ell"
      }
    })
      .then(response => response.data)
      .then((response) => {
        
        if(response.data == null) {
            return false
        }

        else if(response.status == 401) {
          console.log("Invalid 0Auth token")
        }
        else if(response.data[0].type == "live") {
            return true
        }
        else {
            return false
        }
      })
      .catch(error => {
        console.log(error)
        return false
      });
}

async function checkLiveAndMinecraft(channelName) {
    const endpoint = `https://api.twitch.tv/helix/streams?user_login=${channelName}`;
    
    return axios.get(endpoint, {
      headers: {
        "Client-ID": CLIENT_ID,
        "Authorization": "Bearer " + CLIENT_TOKEN
      }
    })
      .then(response => response.data)
      .then((response) => {


        
        if(response.data == null) {
            return false
        }
        else if(response.status == 401) {
          console.log("Invalid 0Auth token")
        }
        else if (response.data[0].game_name == "Minecraft") {
            return true
        }
        else {
            return false
        }
      })
      .catch(error => {
        console.log(error)
        return false
      });
}

async function updateClientToken(newToken) {
  const input = {
    FunctionName: "TwitchTracker",
    Environment: {
      Variables: {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        client_token: newToken
      }
    }
  }
  try {
    const command = new UpdateFunctionConfigurationCommand(input);
    await clients.getLambdaClient().send(command);
    
    console.log("client token is updated")
  }
  catch (err) {
    console.log(err)
  }

}


export {checkLiveAndMinecraft, validateToken, generateToken, checkLive}