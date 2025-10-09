FROM node:18-alpine
WORKDIR /usr/src/app
COPY package.json tsconfig.json ./
RUN npm install --production
COPY src ./src
RUN npm run build
EXPOSE 4100
CMD ["node", "dist/main.js"]
