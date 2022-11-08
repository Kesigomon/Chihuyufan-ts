FROM node:18.12.0-bullseye as builder
WORKDIR /opt
RUN corepack enable pnpm
COPY package.json .
RUN pnpm i
COPY tsconfig.json .
COPY src ./src
RUN pnpm compile

FROM node:18.12.0-bullseye-slim
WORKDIR /opt
ENV NODE_ENV="production"
RUN corepack enable pnpm
COPY package.json .
RUN pnpm i
COPY --from=builder /opt/opt /opt/opt
CMD ["pnpm", "start"]
