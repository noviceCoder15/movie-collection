# ---- Stage 1: build and test (has dev dependencies) ----
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm test

# ---- Stage 2: runtime image (production only, small) ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_FILE=/data/movies.json
COPY package*.json ./
RUN npm ci --omit=dev
COPY app.js db.js server.js ./
COPY public ./public
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 3000
CMD ["node", "server.js"]