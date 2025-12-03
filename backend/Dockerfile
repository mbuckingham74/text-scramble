FROM node:20-alpine

WORKDIR /app

# Set production environment - triggers security checks in auth.js and db.js
ENV NODE_ENV=production

# Copy package files first for better layer caching
COPY package.json package-lock.json ./
# Use npm ci for reproducible builds from lockfile
RUN npm ci --omit=dev

COPY . .

EXPOSE 3001

CMD ["node", "src/index.js"]
