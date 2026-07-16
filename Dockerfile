# Use Node.js base image
FROM node:18-alpine

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install

# Copy all files
COPY . .

# Build TypeScript
RUN pnpm run build

# Expose the port
EXPOSE 5000

# Start the app
CMD ["node", "lib/server.js"]