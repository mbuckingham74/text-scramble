FROM node:20-alpine

WORKDIR /app

# Set production environment - triggers security checks in auth.js and db.js
ENV NODE_ENV=production

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Install build tools as virtual layer, run npm ci, then remove build tools
# This keeps the final image small by not including python3/make/g++
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci --omit=dev \
    && apk del .build-deps

# Copy source files (node_modules excluded via .dockerignore)
COPY . .

EXPOSE 3001

CMD ["node", "src/index.js"]
