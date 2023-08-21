# Build

FROM node:16-alpine AS builder

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install typescript -g
RUN npm ci
COPY tsconfig*.json ./
COPY src src
# COPY .env ./
RUN tsc

# Run

FROM node:16-alpine

ENV NODE_ENV=production
RUN apk add --no-cache tini
WORKDIR /usr/src/app
# RUN chown node:node .
# USER node
COPY package*.json ./
RUN npm install
COPY --from=builder /usr/src/app/dist/ dist/
# COPY --from=builder /usr/src/app/.env ./

EXPOSE 3001
ENTRYPOINT [ "/sbin/tini","--", "node", "dist/index.js" ]
