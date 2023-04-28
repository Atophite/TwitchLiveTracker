#!/bin/sh
yum update -y
yum install -y git
curl -sL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs -y
node --version
git clone https://github.com/Atophite/PaceManBot.git /home/PaceManBot/
cd /home/PaceManBot/
npm i
npm install pm2 -g
pm2 start /home/PaceManBot/index.mjs --name my_app --watch
pm2 save
pm2 startup