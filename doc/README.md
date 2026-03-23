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

insert into classes(id,name,user_id) values ('5247d8d6-1a11-4924-9ec4-03c71bd2e313','一五','5247d8d6-1a01-4924-9ec4-03c71bd2e313');

insert into classes(id,name) values ('5247d8d6-1a10-4924-9ec4-03c71bd2e313','test');

e8559d22-c33a-4a05-810c-dd02302ae7b6|guest|26c6d93d816c438b213d8549aa086d4fe098e3b5e392558b6a6804e816d02c03|0|1774234150877|0

update users set is_guest=1,password_hash='' where username='guest';
update classes set user_id='e8559d22-c33a-4a05-810c-dd02302ae7b6' where name='test';
```