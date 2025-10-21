ARG NODE_VERSION=20

# Creating multi-stage build for production
FROM node:${NODE_VERSION}-alpine AS build
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git > /dev/null 2>&1
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app/
COPY package.json yarn.lock ./
RUN yarn global add node-gyp
RUN yarn config set network-timeout 600000 -g && yarn install --production
ENV PATH=/usr/src/app/node_modules/.bin:$PATH
WORKDIR /usr/src/app/
COPY . .
RUN yarn build

# Creating final production image
FROM node:${NODE_VERSION}-alpine
RUN apk add --no-cache vips-dev
ENV NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
WORKDIR /usr/src/app/
RUN chown -R node:node /usr/src/app/
COPY --from=build --chown=node:node /usr/src/app/node_modules ./node_modules
COPY --from=build --chown=node:node /usr/src/app/ ./
ENV PATH=/usr/src/app/node_modules/.bin:$PATH

USER node

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:1337/_health || exit 1

EXPOSE 1337
CMD ["yarn", "start"]
