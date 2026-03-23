```shell
nvm use v22.15.0

npm install
cd server
npm install
npm install --registry=https://registry.npmmirror.com/
node db.js
mv pet-garden.db.bak pet-garden.db

npm start
http://localhost:3001/pet-garden/
admin
Claw2026!

huohua
huohua

guest
guest1

claude
/init
CLAUDE.md改写为中文
修改server/db.js，将dbPath调整为如果在docker中则使用容器路径

sudo docker build -t class-pet-garden -f docker/Dockerfile ./server
sudo docker run -d -p 3000:3000 -v $(pwd)/db:/db --name class-pet-garden class-pet-garden
sudo docker logs -f class-pet-garden
sudo docker stop class-pet-garden
sudo docker rm class-pet-garden
```