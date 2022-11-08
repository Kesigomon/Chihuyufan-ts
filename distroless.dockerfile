FROM node:18.12.0-bullseye as builder
WORKDIR /opt
COPY package.json .
RUN npm i
COPY tsconfig.json .
COPY src ./src
RUN npm run compile

FROM node:18.12.0-bullseye-slim as depender
WORKDIR /opt
ENV NODE_ENV="production"
COPY package.json .
RUN npm i

FROM gcr.io/distroless/nodejs18-debian11
WORKDIR /opt
ENV NODE_ENV="production"
COPY package.json .
COPY --from=depender /opt/node_modules /opt/node_modules
COPY --from=builder /opt/opt /opt/opt
CMD ["opt/index.js"]