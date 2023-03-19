FROM node:alpine

RUN mkdir -p /app/
WORKDIR /app/

COPY package-lock.json /app/
COPY package.json      /app/

RUN npm ci

CMD ["node", "dist/main.js"]

COPY . /app/
