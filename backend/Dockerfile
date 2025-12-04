FROM node:20-alpine

WORKDIR /app

# Set production environment - triggers security checks in auth.js and db.js
ENV NODE_ENV=production

# Install build tools for native modules (bcrypt)
# These are only needed during npm ci and don't affect final image size much
# since alpine is already minimal
RUN apk add --no-cache python3 make g++

# Copy package files first for better layer caching
COPY package.json package-lock.json ./

# Use npm ci for reproducible builds from lockfile
RUN npm ci --omit=dev

# Copy source files (node_modules excluded via .dockerignore)
COPY . .

EXPOSE 3001

CMD ["node", "src/index.js"]
