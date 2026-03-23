# 使用官方 Node.js 镜像作为基础镜像
FROM node:22

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装项目依赖
RUN npm install

# 暴露容器端口
EXPOSE 3000

# 启动应用程序
CMD ["npm", "start"]