FROM node:24-alpine

RUN apk add --update --no-cache tzdata 

WORKDIR "/app"

ENV TZ=Europe/Rome

COPY package.json .

COPY . .

RUN npm i

RUN ls -la

CMD [ "npm", "run", "start" ]
