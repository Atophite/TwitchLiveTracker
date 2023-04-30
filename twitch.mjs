import os from "os"

const CLIENT_ID = "zqv4fz357qsybstqgajj9o5sne13wm";
const CLIENT_SECRET = "om975ve8kh10nvt3982hqbbhqdsh8d";
let CLIENT_TOKEN = "vwmhoyorlzf88fnign8tig1sbf4ell"
const GRANT_TYPE = "client_credentials";

function validateToken() {

    return fetch('https://id.twitch.tv/oauth2/validate', {
    headers: {
        Authorization: `Bearer ${CLIENT_TOKEN}`
    }
    })
    .then(response => response.json())
    .then((data) => {
        if(data.expires_in < 10000 || data.status == 401) {
            //renew token
            generateToken()
            return true
        }
        else {
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
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("client_secret", clientSecret);
    url.searchParams.set("grant_type", grantType);
  
    return fetch(url)
      .then((response) => response.json())
      .then((data) => {
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
    
    return fetch(endpoint, {
      headers: {
        "Client-ID": CLIENT_ID,
        "Authorization": "Bearer " + CLIENT_TOKEN
      }
    })
      .then(response => response.json())
      .then((response) => {
        response = response.data[0]
        if(response == null) {
            return false
        }
        else if(response.type == "live") {
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

    if(!validateToken()) {
        return false
    }
    
    return await fetch(endpoint, {
      headers: {
        "Client-ID": CLIENT_ID,
        "Authorization": "Bearer " + CLIENT_TOKEN
      }
    })
      .then(response => response.json())
      .then((response) => {
        response = response.data[0]
        if(response == null) {
            return false
        }
        else if (response.game_name == "Minecraft") {
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

console.log(await checkLiveAndMinecraft('xqc'))

export {checkLiveAndMinecraft, validateToken, generateToken, checkLive}